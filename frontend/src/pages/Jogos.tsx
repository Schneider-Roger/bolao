import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { getBandeiraUrl } from "../utils/bandeiras";

// ── Interfaces ──
interface Jogo {
    id: number;
    fase: string;
    rodada: number;
    time_a: string;
    time_b: string;
    data: string;
    status: "aberto" | "fecha_em_breve" | "bloqueado" | "encerrado" | "pontuado";
    placar_a: number | null;
    placar_b: number | null;
    palpite_a: number | null;
    palpite_b: number | null;
    time_classificado_palpite: string | null;
    encerramento_palpite?: string;
    pontos?: number;
}

interface PalpiteMataMata {
    jogo_id: number;
    palpite_a: number | null;
    palpite_b: number | null;
    time_classificado_palpite: string | null;
    confronto_time_a: string | null;
    confronto_time_b: string | null;
    lado_classificado?: 'a' | 'b' | null;
    pontos?: number;
}

interface BracketData {
    success: boolean;
    liberado: boolean;
    bracketSalvo: boolean;
    jogos: Jogo[];
    palpites: PalpiteMataMata[];
}

function Jogos() {
    const queryClient = useQueryClient();

    // Filtro principal da página
    const [abaPrincipal, setAbaPrincipal] = useState<"grupos" | "matamata">("grupos");
    const [rodadaAtiva, setRodadaAtiva] = useState<number>(1);
    const [jogosEmEdicao, setJogosEmEdicao] = useState<Record<number, boolean>>({});

    // ── ESTADO FASE DE GRUPOS ──
    const [palpitesLocais, setPalpitesLocais] = useState<Record<number, { a: string; b: string; classificado: string | null }>>({});

    const { data: jogosGrupos, isLoading: isLoadingGrupos } = useQuery<Jogo[]>({
        queryKey: ["jogos"],
        queryFn: async () => {
            const response = await api.get("/jogos");
            return response.data.jogos as Jogo[];
        }
    });

    const listaJogos = jogosGrupos || [];

    const faseGruposTerminou = useMemo(() => {
        if (listaJogos.length === 0) return false;
        const jogosDeGrupo = listaJogos.filter(j => j.fase.toLowerCase().includes("grupo"));
        if (jogosDeGrupo.length === 0) return false;
        return jogosDeGrupo.every(j => j.status === "encerrado" || j.status === "pontuado");
    }, [listaJogos]);

    const handleInputChange = (jogoId: number, lado: 'a' | 'b', val: string) => {
        setPalpitesLocais(prev => ({
            ...prev,
            [jogoId]: {
                ...prev[jogoId],
                [lado]: val
            }
        }));
    };

    const handleSalvarPalpiteCard = (jogo: Jogo) => {
        const isMataMata = !jogo.fase.toLowerCase().includes('grupo');
        if (isMataMata) {
            const local = bracketPalpites[jogo.id];
            if (!local || local.palpite_a === null || local.palpite_b === null) {
                alert("Por favor, preencha ambos os placares antes de salvar.");
                return;
            }
            if (Number(local.palpite_a) === Number(local.palpite_b) && !local.time_classificado_palpite) {
                alert("Em caso de empate, escolha quem avança clicando em 'Avança' antes de salvar o jogo.");
                return;
            }
            palpiteMutation.mutate({
                jogoId: jogo.id,
                palpiteA: local.palpite_a,
                palpiteB: local.palpite_b,
                classificado: local.time_classificado_palpite,
                confrontoTimeA: local.confronto_time_a || null,
                confrontoTimeB: local.confronto_time_b || null,
            });
        } else {
            const local = palpitesLocais[jogo.id];
            if (!local || local.a === "" || local.b === "") {
                alert("Por favor, preencha ambos os placares antes de salvar.");
                return;
            }
            palpiteMutation.mutate({
                jogoId: jogo.id,
                palpiteA: parseInt(local.a),
                palpiteB: parseInt(local.b),
                classificado: local.classificado
            });
        }
    };

    const handleEditarClick = (jogoId: number) => {
        setJogosEmEdicao(prev => ({ ...prev, [jogoId]: true }));
        setTimeout(() => {
            const input = document.getElementById(`input-a-${jogoId}`);
            if (input) {
                input.focus();
                (input as HTMLInputElement).select();
            }
        }, 50);
    };

    useEffect(() => {
        if (jogosGrupos) {
            const initial: Record<number, { a: string; b: string; classificado: string | null }> = {};
            jogosGrupos.forEach((j) => {
                initial[j.id] = {
                    a: j.palpite_a !== null ? j.palpite_a.toString() : "",
                    b: j.palpite_b !== null ? j.palpite_b.toString() : "",
                    classificado: j.time_classificado_palpite
                };
            });
            setPalpitesLocais(initial);
        }
    }, [jogosGrupos]);

    // Mutação para salvar palpite individual direto do card
    const palpiteMutation = useMutation({
        mutationFn: async ({ jogoId, palpiteA, palpiteB, classificado, confrontoTimeA, confrontoTimeB }: { jogoId: number; palpiteA: number; palpiteB: number; classificado: string | null; confrontoTimeA?: string | null; confrontoTimeB?: string | null }) => {
            return await api.post(`/jogos/${jogoId}/palpite`, {
                palpite_a: palpiteA,
                palpite_b: palpiteB,
                time_classificado_palpite: classificado,
                confronto_time_a: confrontoTimeA || undefined,
                confronto_time_b: confrontoTimeB || undefined,
            });
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ["jogos"] });
            queryClient.invalidateQueries({ queryKey: ["minha-posicao"] });
            queryClient.invalidateQueries({ queryKey: ["meus-resultados"] });
            queryClient.invalidateQueries({ queryKey: ["bracket"] });
            setJogosEmEdicao(prev => ({ ...prev, [variables.jogoId]: false }));
        },
        onError: (err: any) => {
            alert(err.response?.data?.error || "Erro ao salvar seu palpite");
        }
    });

    // ── ESTADO MATA-MATA ──
    const [bracketPalpites, setBracketPalpites] = useState<Record<number, PalpiteMataMata>>({});
    const [activeTabMataMata, setActiveTabMataMata] = useState<string>("16avos");

    const { data: bracketData, isLoading: isLoadingBracket } = useQuery<BracketData>({
        queryKey: ["bracket"],
        queryFn: async () => {
            const res = await api.get("/jogos/bracket");
            return res.data;
        },
        enabled: abaPrincipal === "matamata"
    });

    const { indexToId, idToIndex } = useMemo(() => {
        const indexToIdMap: Record<number, number> = {};
        const idToIndexMap: Record<number, number> = {};
        if (bracketData?.jogos) {
            bracketData.jogos.forEach((j, idx) => {
                indexToIdMap[idx] = j.id;
                idToIndexMap[j.id] = idx;
            });
        }
        return { indexToId: indexToIdMap, idToIndex: idToIndexMap };
    }, [bracketData?.jogos]);

    const bracketMutation = useMutation({
        mutationFn: async (payload: PalpiteMataMata[]) => {
            return await api.post("/jogos/bracket/salvar", { palpites: payload });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["bracket"] });
            // Avança automaticamente para a próxima aba se aplicável
            setActiveTabMataMata((prev) => {
                if (prev === "16avos") return "oitavas";
                if (prev === "oitavas") return "quartas";
                if (prev === "quartas") return "semis";
                if (prev === "semis") return "finais";
                return prev;
            });
        },
        onError: (err: any) => {
            alert(err.response?.data?.error || "Erro ao salvar bracket");
        }
    });

    const atualizarConfrontosProximos = (currentState: Record<number, PalpiteMataMata>) => {
        const updated = { ...currentState };
        const getVencedor = (jogoId: number): string | null => {
            const p = updated[jogoId];
            if (!p) return null;
            if (p.palpite_a !== null && p.palpite_b !== null) {
                if (Number(p.palpite_a) > Number(p.palpite_b)) return p.confronto_time_a;
                if (Number(p.palpite_b) > Number(p.palpite_a)) return p.confronto_time_b;
                return p.time_classificado_palpite;
            }
            return null;
        };
        const getPerdedor = (jogoId: number): string | null => {
            const p = updated[jogoId];
            if (!p) return null;
            if (p.palpite_a !== null && p.palpite_b !== null) {
                if (Number(p.palpite_a) > Number(p.palpite_b)) return p.confronto_time_b;
                if (Number(p.palpite_b) > Number(p.palpite_a)) return p.confronto_time_a;
                if (p.time_classificado_palpite === p.confronto_time_a) return p.confronto_time_b;
                if (p.time_classificado_palpite === p.confronto_time_b) return p.confronto_time_a;
            }
            return null;
        };
        
        // Mapeamento explícito por ID para garantir a ordem independentemente de data_hora
        const feed16toOitavasIds = [
            { oitavasId: 113, timeAFromId: 99, timeBFromId: 102 }, // O1: Alemanha x Paraguai vs França x Suécia
            { oitavasId: 114, timeAFromId: 97, timeBFromId: 100 }, // O2: África do Sul x Canadá vs Holanda x Marrocos
            { oitavasId: 115, timeAFromId: 108, timeBFromId: 107 }, // O3: Portugal x Croácia vs Espanha x Áustria
            { oitavasId: 116, timeAFromId: 106, timeBFromId: 105 }, // O4: EUA x Bósnia vs Bélgica x Senegal
            { oitavasId: 117, timeAFromId: 98, timeBFromId: 101 }, // O5: Brasil x Japão vs C. do Marfim x Noruega
            { oitavasId: 118, timeAFromId: 103, timeBFromId: 104 }, // O6: México x Equador vs Inglaterra x RD Congo
            { oitavasId: 119, timeAFromId: 111, timeBFromId: 110 }, // O7: Argentina x Cabo Verde vs Austrália x Egito
            { oitavasId: 120, timeAFromId: 109, timeBFromId: 112 }, // O8: Suíça x Argélia vs Colômbia x Gana
        ];

        feed16toOitavasIds.forEach(({ oitavasId, timeAFromId, timeBFromId }) => {
            if (oitavasId && timeAFromId && timeBFromId && updated[oitavasId]) {
                updated[oitavasId]!.confronto_time_a = getVencedor(timeAFromId) || "A Definir";
                updated[oitavasId]!.confronto_time_b = getVencedor(timeBFromId) || "A Definir";
            }
        });

        const feedOitavasToQuartasIds = [
            { quartasId: 121, timeAFromId: 114, timeBFromId: 113 }, // Q1: O2 vs O1
            { quartasId: 122, timeAFromId: 116, timeBFromId: 115 }, // Q2: O4 vs O3
            { quartasId: 123, timeAFromId: 117, timeBFromId: 118 }, // Q3: O5 vs O6
            { quartasId: 124, timeAFromId: 120, timeBFromId: 119 }, // Q4: O8 vs O7
        ];

        feedOitavasToQuartasIds.forEach(({ quartasId, timeAFromId, timeBFromId }) => {
            if (quartasId && timeAFromId && timeBFromId && updated[quartasId]) {
                updated[quartasId]!.confronto_time_a = getVencedor(timeAFromId) || "A Definir";
                updated[quartasId]!.confronto_time_b = getVencedor(timeBFromId) || "A Definir";
            }
        });

        const feedQuartasToSemisIds = [
            { semisId: 125, timeAFromId: 121, timeBFromId: 122 }, // S1: Q1 vs Q2
            { semisId: 126, timeAFromId: 123, timeBFromId: 124 }, // S2: Q3 vs Q4
        ];

        feedQuartasToSemisIds.forEach(({ semisId, timeAFromId, timeBFromId }) => {
            if (semisId && timeAFromId && timeBFromId && updated[semisId]) {
                updated[semisId]!.confronto_time_a = getVencedor(timeAFromId) || "A Definir";
                updated[semisId]!.confronto_time_b = getVencedor(timeBFromId) || "A Definir";
            }
        });

        const finalId = 128;
        const terceiroId = 127;
        const semi1Id = 125;
        const semi2Id = 126;

        if (finalId && semi1Id && semi2Id && updated[finalId]) {
            updated[finalId]!.confronto_time_a = getVencedor(semi1Id) || "A Definir";
            updated[finalId]!.confronto_time_b = getVencedor(semi2Id) || "A Definir";
        }
        if (terceiroId && semi1Id && semi2Id && updated[terceiroId]) {
            updated[terceiroId]!.confronto_time_a = getPerdedor(semi1Id) || "A Definir";
            updated[terceiroId]!.confronto_time_b = getPerdedor(semi2Id) || "A Definir";
        }

        return updated;
    };

    useEffect(() => {
        if (bracketData) {
            const initial: Record<number, PalpiteMataMata> = {};
            bracketData.palpites.forEach((p) => {
                let lado: 'a' | 'b' | null = null;
                if (p.time_classificado_palpite) {
                    if (p.time_classificado_palpite === p.confronto_time_a) lado = 'a';
                    else if (p.time_classificado_palpite === p.confronto_time_b) lado = 'b';
                }
                initial[p.jogo_id] = { ...p, lado_classificado: lado };
            });
            bracketData.jogos.forEach((j) => {
                if (!initial[j.id]) {
                    initial[j.id] = {
                        jogo_id: j.id,
                        palpite_a: null,
                        palpite_b: null,
                        time_classificado_palpite: null,
                        confronto_time_a: j.time_a,
                        confronto_time_b: j.time_b,
                        lado_classificado: null,
                    };
                }
            });
            setBracketPalpites(atualizarConfrontosProximos(initial));
        }
    }, [bracketData]);

    const handlePlacarChangeMataMata = (jogoId: number, lado: 'a' | 'b', val: string) => {
        const isEditingSaved = bracketData?.bracketSalvo && jogosEmEdicao[jogoId];
        const shouldRunCalculation = !bracketData?.bracketSalvo || isEditingSaved;

        if (bracketData?.bracketSalvo && !isEditingSaved) {
            setBracketPalpites((prev) => {
                const next = { ...prev };
                const num = val === "" ? null : val === "-" ? null : parseInt(val);
                if (next[jogoId]) {
                    if (lado === 'a') next[jogoId]!.palpite_a = num;
                    else next[jogoId]!.palpite_b = num;
                }
                return next;
            });
            return;
        }

        setBracketPalpites((prev) => {
            const next = { ...prev };
            const num = val === "" ? null : val === "-" ? null : parseInt(val);
            if (next[jogoId]) {
                if (lado === 'a') next[jogoId]!.palpite_a = num;
                else next[jogoId]!.palpite_b = num;
                if (next[jogoId]!.palpite_a !== null && next[jogoId]!.palpite_b !== null) {
                    if (Number(next[jogoId]!.palpite_a) > Number(next[jogoId]!.palpite_b)) {
                        next[jogoId]!.time_classificado_palpite = next[jogoId]!.confronto_time_a;
                        next[jogoId]!.lado_classificado = 'a';
                    } else if (Number(next[jogoId]!.palpite_b) > Number(next[jogoId]!.palpite_a)) {
                        next[jogoId]!.time_classificado_palpite = next[jogoId]!.confronto_time_b;
                        next[jogoId]!.lado_classificado = 'b';
                    } else {
                        // Empate limpa seleção automática
                        next[jogoId]!.time_classificado_palpite = null;
                        next[jogoId]!.lado_classificado = null;
                    }
                }
            }
            return atualizarConfrontosProximos(next);
        });
    };

    const handleSelectClassificadoMataMata = (jogoId: number, time: string, lado: 'a' | 'b') => {
        if (bracketData?.bracketSalvo && !jogosEmEdicao[jogoId]) return;
        setBracketPalpites((prev) => {
            const next = { ...prev };
            if (next[jogoId]) {
                next[jogoId]!.time_classificado_palpite = time;
                next[jogoId]!.lado_classificado = lado;
            }
            return atualizarConfrontosProximos(next);
        });
    };

    const handleLimparClassificadoMataMata = (jogoId: number) => {
        if (bracketData?.bracketSalvo && !jogosEmEdicao[jogoId]) return;
        setBracketPalpites((prev) => {
            const next = { ...prev };
            if (next[jogoId]) {
                next[jogoId]!.time_classificado_palpite = null;
                next[jogoId]!.lado_classificado = null;
            }
            return atualizarConfrontosProximos(next);
        });
    };

    const handleSaveBracketMataMata = () => {
        let indicesFaseAtiva: number[] = [];
        if (activeTabMataMata === "16avos") { for (let i = 0; i <= 15; i++) indicesFaseAtiva.push(i); }
        else if (activeTabMataMata === "oitavas") { for (let i = 16; i <= 23; i++) indicesFaseAtiva.push(i); }
        else if (activeTabMataMata === "quartas") { for (let i = 24; i <= 27; i++) indicesFaseAtiva.push(i); }
        else if (activeTabMataMata === "semis") { for (let i = 28; i <= 29; i++) indicesFaseAtiva.push(i); }
        else if (activeTabMataMata === "finais") { for (let i = 30; i <= 31; i++) indicesFaseAtiva.push(i); }

        const payload: PalpiteMataMata[] = [];
        let placaresFaltando = 0;
        let empatesSemSelecao = 0;

        indicesFaseAtiva.forEach((idx) => {
            const id = indexToId[idx];
            if (!id) return;
            const p = bracketPalpites[id];
            if (!p || p.palpite_a === null || p.palpite_b === null) {
                placaresFaltando++;
            } else {
                if (Number(p.palpite_a) === Number(p.palpite_b) && !p.time_classificado_palpite) {
                    empatesSemSelecao++;
                }
                payload.push(p);
            }
        });

        const nomeFase = activeTabMataMata === "16avos" ? "16avos" : activeTabMataMata === "oitavas" ? "Oitavas" : activeTabMataMata === "quartas" ? "Quartas" : activeTabMataMata === "semis" ? "Semifinais" : "Finais";

        if (placaresFaltando > 0 || empatesSemSelecao > 0) {
            let msg = `Atenção! A fase de ${nomeFase} não pôde ser salva pelos seguintes motivos:\n\n`;
            if (placaresFaltando > 0) {
                msg += `• Faltam preencher os placares de ${placaresFaltando} jogo(s) nesta etapa.\n\n`;
            }
            if (empatesSemSelecao > 0) {
                msg += `• Há ${empatesSemSelecao} jogo(s) empatado(s) onde você não escolheu qual time avança. Clique em 'Avança' no time desejado.\n\n`;
            }
            alert(msg);
            return;
        }

        const confirmMsg = activeTabMataMata === "finais" 
            ? "Atenção! Ao salvar a fase Final, seu chaveamento de mata-mata completo será consolidado e bloqueado de forma permanente. Deseja prosseguir?"
            : `Deseja salvar todos os palpites da fase de ${nomeFase}? Isso liberará a próxima etapa para palpitar.`;

        if (confirm(confirmMsg)) {
            bracketMutation.mutate(payload);
        }
    };

    const formatData = (isoString: string) => {
        const d = new Date(isoString);
        let dia = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        // Simplified date formatting similar to mockup
        const hoje = new Date();
        const amanha = new Date();
        amanha.setDate(hoje.getDate() + 1);
        if (d.toDateString() === hoje.toDateString()) dia = "Hoje";
        else if (d.toDateString() === amanha.toDateString()) dia = "Amanhã";
        
        return `${dia}, ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    };

    const formatDataMataMata = (isoString: string) => {
        const d = new Date(isoString);
        return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
    };

    const verificarFaseConcluida = (fase: "16avos" | "oitavas" | "quartas" | "semis") => {
        let indices: number[] = [];
        if (fase === "16avos") { for (let i = 0; i <= 15; i++) indices.push(i); }
        else if (fase === "oitavas") { for (let i = 16; i <= 23; i++) indices.push(i); }
        else if (fase === "quartas") { for (let i = 24; i <= 27; i++) indices.push(i); }
        else if (fase === "semis") { for (let i = 28; i <= 29; i++) indices.push(i); }

        return indices.every((idx) => {
            const id = indexToId[idx];
            if (!id) return false;
            const p = bracketPalpites[id];
            if (!p) return false;
            if (p.palpite_a === null || p.palpite_b === null) return false;
            if (Number(p.palpite_a) === Number(p.palpite_b) && !p.time_classificado_palpite) return false;
            return true;
        });
    };

    // Logic for separating Games and History
    const jogosDaFaseGrupos = listaJogos.filter((j) => j.fase.includes("Grupo"));
    const jogosHistoricoGrupos = jogosDaFaseGrupos.filter(j => j.status === 'pontuado' || j.status === 'encerrado').sort((a,b) => new Date(b.data).getTime() - new Date(a.data).getTime());

    const limiteMataMataExpirado = false;

    // Grouping All Games in the Round
    const jogosPorRodadaAtivos = jogosDaFaseGrupos.filter(j => j.rodada === rodadaAtiva);
    const gruposUnicos = Array.from(new Set(jogosPorRodadaAtivos.map(j => j.fase))).sort();

    return (
        <main className="flex-grow w-full max-w-container-max mx-auto py-6 flex flex-col gap-6 px-4 md:px-[100px]">
            
            {/* Dark Card Container */}
            <div className="bg-[#0b1727] rounded-3xl p-6 shadow-xl border border-white/5 flex flex-col gap-8 min-h-[80vh]">
                
                {/* Header Section */}
                <div className="flex flex-col gap-6">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <h2 className="font-headline-md text-2xl font-bold text-white text-center">Meus Palpites</h2>
                    </div>

                    {/* Segmented Control */}
                    <div className="flex w-full bg-[#132030] rounded-xl p-1 border border-white/5">
                        <button 
                            onClick={() => setAbaPrincipal("grupos")}
                            className={`flex-1 py-3 font-semibold text-sm rounded-lg transition-colors text-center ${abaPrincipal === "grupos" ? "text-white bg-[#008237]" : "text-gray-400 hover:text-white bg-transparent"}`}
                        >
                            Fase de Grupos
                        </button>
                        <button 
                            onClick={() => {
                                if (!faseGruposTerminou) {
                                    alert("🔒 A fase Mata-mata está bloqueada. Ela será liberada para palpites assim que todos os jogos da Fase de Grupos forem encerrados.");
                                    return;
                                }
                                setAbaPrincipal("matamata");
                            }}
                            className={`flex-1 py-3 font-semibold text-sm rounded-lg transition-all text-center flex justify-center items-center gap-1.5 ${
                                abaPrincipal === "matamata" 
                                    ? "text-white bg-[#008237]" 
                                    : !faseGruposTerminou 
                                        ? "text-gray-600 bg-transparent cursor-not-allowed" 
                                        : "text-gray-400 hover:text-white bg-transparent"
                            }`}
                        >
                            {!faseGruposTerminou && <span className="material-symbols-outlined text-[16px] text-gray-600">lock</span>}
                            Mata-mata
                        </button>
                    </div>
                </div>

                {/* ── FASE DE GRUPOS ── */}
                {abaPrincipal === "grupos" && (
                    <div className="flex flex-col gap-6">
                        {/* Rodadas Pills */}
                        <div className="flex justify-center gap-3">
                            {[1, 2, 3].map(rodada => (
                                <button 
                                    key={rodada}
                                    onClick={() => setRodadaAtiva(rodada)}
                                    className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${rodadaAtiva === rodada ? "bg-[#008237] text-white" : "bg-[#1f2b38] text-gray-300 hover:bg-[#2a3644]"}`}
                                >
                                    Rodada {rodada}
                                </button>
                            ))}
                        </div>

                        {isLoadingGrupos ? (
                            <div className="text-center py-12"><p className="text-gray-400">Carregando...</p></div>
                        ) : (
                            <div className="flex flex-col gap-8">
                                {gruposUnicos.map(grupoNome => (
                                    <div key={grupoNome} className="flex flex-col gap-4">
                                        <div className="flex justify-center items-center gap-2">
                                            <div className="w-1 h-5 bg-[#008237] rounded-full"></div>
                                            <h3 className="text-white font-bold text-lg text-center">{grupoNome}</h3>
                                        </div>
                                        
                                        <div className="flex flex-wrap justify-center gap-6">
                                            {jogosPorRodadaAtivos.filter(j => j.fase === grupoNome).map((jogo) => {
                                                const local = palpitesLocais[jogo.id] || { a: "", b: "", classificado: null };
                                                const estaSalvoNoBanco = jogo.palpite_a !== null && jogo.palpite_b !== null;
                                                const estaEditando = !estaSalvoNoBanco || jogosEmEdicao[jogo.id];
                                                const alterouPlacar = local.a !== (jogo.palpite_a !== null ? jogo.palpite_a.toString() : "") ||
                                                                      local.b !== (jogo.palpite_b !== null ? jogo.palpite_b.toString() : "");
                                                
                                                const encerramentoTime = jogo.encerramento_palpite 
                                                    ? new Date(jogo.encerramento_palpite).getTime() 
                                                    : new Date(jogo.data).getTime() - 60 * 60 * 1000;
                                                const fechadoParaEditar = Date.now() > encerramentoTime || jogo.status !== 'aberto';

                                                return (
                                                    <div key={jogo.id} className="w-full md:w-[calc(50%-0.75rem)] lg:w-[calc(33.333%-1rem)] max-w-[450px] bg-[#1a2634] rounded-2xl p-5 flex flex-col gap-4 relative shadow-lg">
                                                        {/* Status Pill */}
                                                        <div className="flex justify-between items-center text-xs font-bold">
                                                            <span className="text-gray-400">{formatData(jogo.data)}</span>
                                                            {jogo.status === 'pontuado' ? (
                                                                <span className="bg-[#008237]/20 text-[#008237] px-3 py-1 rounded-full flex items-center gap-1 border border-[#008237]/50">
                                                                    <span className="material-symbols-outlined text-[12px]">check_circle</span> Finalizado
                                                                </span>
                                                            ) : fechadoParaEditar ? (
                                                                <span className="bg-[#2a3644] text-gray-300 px-3 py-1 rounded-full flex items-center gap-1">
                                                                    <span className="material-symbols-outlined text-[12px]">lock</span> Fechado
                                                                </span>
                                                            ) : (
                                                                <span className="bg-[#2a3644] text-gray-300 px-3 py-1 rounded-full flex items-center gap-1">
                                                                    <span className="material-symbols-outlined text-[12px]">schedule</span> Pendente
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Teams & Inputs */}
                                                        <div className="flex items-center justify-between mt-2">
                                                            <div className="flex flex-col items-center gap-2 w-24 text-center min-w-0">
                                                                <div className="w-10 h-10 rounded-full bg-surface-container-highest border border-white/20 overflow-hidden shadow-md flex-shrink-0">
                                                                    <img src={getBandeiraUrl(jogo.time_a)} alt={jogo.time_a} className="w-full h-full object-cover" />
                                                                </div>
                                                                <span className="text-white font-bold text-xs md:text-sm truncate w-full" title={jogo.time_a}>{jogo.time_a}</span>
                                                            </div>

                                                            <div className="flex-1 flex flex-col justify-center items-center gap-2">
                                                                <div className="bg-[#0b1727] rounded-xl flex items-center px-4 py-2 border border-[#2a3644] shadow-inner gap-3">
                                                                    <input 
                                                                        id={`input-a-${jogo.id}`}
                                                                        type="number" min="0" max="99" placeholder="-"
                                                                        value={local.a} onChange={(e) => handleInputChange(jogo.id, 'a', e.target.value)}
                                                                        disabled={fechadoParaEditar || !estaEditando}
                                                                        className="w-8 bg-transparent text-white text-center font-bold text-xl outline-none placeholder:text-gray-600 p-0 disabled:opacity-50"
                                                                    />
                                                                    <span className="text-gray-500 font-bold">X</span>
                                                                    <input 
                                                                        id={`input-b-${jogo.id}`}
                                                                        type="number" min="0" max="99" placeholder="-"
                                                                        value={local.b} onChange={(e) => handleInputChange(jogo.id, 'b', e.target.value)}
                                                                        disabled={fechadoParaEditar || !estaEditando}
                                                                        className="w-8 bg-transparent text-white text-center font-bold text-xl outline-none placeholder:text-gray-600 p-0 disabled:opacity-50"
                                                                    />
                                                                </div>
                                                            </div>

                                                            <div className="flex flex-col items-center gap-2 w-24 text-center min-w-0">
                                                                <div className="w-10 h-10 rounded-full bg-surface-container-highest border border-white/20 overflow-hidden shadow-md flex-shrink-0">
                                                                    <img src={getBandeiraUrl(jogo.time_b)} alt={jogo.time_b} className="w-full h-full object-cover" />
                                                                </div>
                                                                <span className="text-white font-bold text-xs md:text-sm truncate w-full" title={jogo.time_b}>{jogo.time_b}</span>
                                                            </div>
                                                        </div>

                                                        {/* Action Button / Result */}
                                                        {jogo.status === 'pontuado' ? (
                                                            <div className="mt-2 flex flex-col items-center gap-1 bg-[#132030] py-2 rounded-xl border border-white/5">
                                                                <span className="text-xs text-gray-400 font-bold uppercase">Resultado Real</span>
                                                                <span className="text-white font-bold">{jogo.placar_a} x {jogo.placar_b}</span>
                                                                <div className="flex items-center gap-1 text-[#FDE01A] font-bold text-xs mt-1">
                                                                    <span className="material-symbols-outlined text-[14px]">stars</span>
                                                                    Você marcou: {jogo.pontos || 0} pts
                                                                </div>
                                                            </div>
                                                        ) : fechadoParaEditar ? (
                                                            jogo.placar_a !== null && jogo.placar_b !== null ? (
                                                                <div className="mt-2 flex flex-col items-center gap-1 bg-[#132030]/50 py-2 rounded-xl border border-white/5 w-full">
                                                                    <span className="text-[10px] text-amber-500 font-bold uppercase flex items-center gap-1">
                                                                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                                                                        Placar ao Vivo (GE)
                                                                    </span>
                                                                    <span className="text-white font-bold text-sm">{jogo.placar_a} x {jogo.placar_b}</span>
                                                                    <span className="text-[9px] text-gray-500 italic">Aguardando encerramento oficial...</span>
                                                                </div>
                                                            ) : (
                                                                <div className="mt-2 text-center text-gray-500 font-bold text-sm py-2">
                                                                    Aguardando resultado...
                                                                </div>
                                                            )
                                                        ) : (
                                                            <button 
                                                                onClick={() => {
                                                                    if (alterouPlacar || !estaSalvoNoBanco) {
                                                                        handleSalvarPalpiteCard(jogo);
                                                                    } else {
                                                                        handleEditarClick(jogo.id);
                                                                    }
                                                                }}
                                                                disabled={palpiteMutation.isPending}
                                                                className={`mt-2 py-3 rounded-xl font-bold text-sm transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5 w-full
                                                                    ${alterouPlacar || !estaSalvoNoBanco 
                                                                        ? "bg-[#FDE01A] text-[#061423] hover:brightness-110" 
                                                                        : "bg-white/10 text-white hover:bg-white/20 border border-white/10"}`}
                                                            >
                                                                {alterouPlacar ? (
                                                                    <>
                                                                        <span className="material-symbols-outlined text-[16px]">save</span>
                                                                        Salvar Palpite
                                                                    </>
                                                                ) : estaSalvoNoBanco ? (
                                                                    <>
                                                                        <span className="material-symbols-outlined text-[16px]">edit</span>
                                                                        Editar Palpite
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <span className="material-symbols-outlined text-[16px]">sports_soccer</span>
                                                                        Salvar Palpite
                                                                    </>
                                                                )}
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}

                                {gruposUnicos.length === 0 && (
                                    <div className="text-center py-8 text-gray-400">Nenhum jogo pendente nesta rodada.</div>
                                )}
                            </div>
                        )}

                        {/* Histórico de Palpites */}
                        {jogosHistoricoGrupos.length > 0 && (
                            <div className="mt-8 flex flex-col gap-4">
                                <h3 className="text-white font-bold text-xl mb-2">Histórico de Palpites</h3>
                                <div className="flex flex-col gap-4">
                                    {jogosHistoricoGrupos.map(jogo => {
                                        let badgeCor = "text-red-500";
                                        let badgeIcon = "cancel";
                                        if (jogo.pontos === 5) { badgeCor = "text-green-500"; badgeIcon = "check_circle"; }
                                        else if (jogo.pontos === 2) { badgeCor = "text-yellow-500"; badgeIcon = "circle"; }

                                        return (
                                            <div key={jogo.id} className="bg-[#132030] rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between border border-white/5 gap-4">
                                                <div className="text-gray-400 text-xs font-bold w-24">
                                                    {formatData(jogo.data).split(',')[0]}
                                                </div>
                                                <div className="flex-1 flex flex-col items-center">
                                                    <div className="flex items-center gap-2 md:gap-4 justify-between w-full max-w-[500px] mx-auto min-w-0">
                                                        <span className="text-white font-bold text-xs md:text-sm truncate max-w-[85px] md:max-w-[150px] text-right flex-1" title={jogo.time_a}>{jogo.time_a}</span>
                                                        <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                                                            <img src={getBandeiraUrl(jogo.time_a)} alt="" className="w-full h-full object-cover" />
                                                        </div>
                                                        <div className="flex flex-col items-center gap-1 mx-2 flex-shrink-0 w-24">
                                                            <span className="text-[#008237] text-[10px] font-bold uppercase tracking-wider">Seu Palpite</span>
                                                            <span className="text-white font-black text-lg md:text-xl">
                                                                {jogo.palpite_a !== null ? jogo.palpite_a : "-"} <span className="text-gray-500 font-normal px-1">X</span> {jogo.palpite_b !== null ? jogo.palpite_b : "-"}
                                                            </span>
                                                        </div>
                                                        <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                                                            <img src={getBandeiraUrl(jogo.time_b)} alt="" className="w-full h-full object-cover" />
                                                        </div>
                                                        <span className="text-white font-bold text-xs md:text-sm truncate max-w-[85px] md:max-w-[150px] text-left flex-1" title={jogo.time_b}>{jogo.time_b}</span>
                                                    </div>
                                                    <div className="text-gray-500 text-[11px] font-bold mt-2">
                                                        Resultado: {jogo.placar_a !== null ? jogo.placar_a : "?"} x {jogo.placar_b !== null ? jogo.placar_b : "?"}
                                                    </div>
                                                </div>
                                                <div className={`flex items-center justify-end gap-1 font-bold text-sm ${badgeCor} w-24`}>
                                                    {jogo.pontos !== undefined ? (
                                                        <>
                                                            <span className="material-symbols-outlined text-[16px]">{badgeIcon}</span>
                                                            {jogo.pontos > 0 ? `+${jogo.pontos}` : jogo.pontos} pts
                                                        </>
                                                    ) : (
                                                        <span className="text-gray-400 font-normal">Aguardando</span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ── MATA MATA ── */}
                {abaPrincipal === "matamata" && (
                    <section className="space-y-6">
                        {isLoadingBracket || !bracketData ? (
                            <div className="text-center py-12"><p className="text-gray-400">Carregando chaveamento...</p></div>
                        ) : !bracketData.liberado ? (
                            <div className="rounded-[32px] bg-slate-900/60 border border-white/5 p-8 text-center shadow-2xl relative overflow-hidden backdrop-blur-md max-w-xl mx-auto mt-10">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                                <div className="h-16 w-16 mx-auto bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.1)] mb-5">
                                    <span className="material-symbols-outlined text-[32px]">lock</span>
                                </div>
                                <h2 className="text-lg font-black tracking-tight text-white uppercase">Mata-Mata Bloqueado</h2>
                                <p className="mt-3 text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
                                    O chaveamento do Mata-Mata só será liberado para palpites após o término oficial de todos os jogos da Fase de Grupos.
                                </p>
                            </div>
                        ) : (
                            <>
                                <div className="flex gap-3 overflow-x-auto py-2 no-scrollbar bg-[#132030] p-2 rounded-xl border border-white/5">
                                    {(() => {
                                        const abasConfig = [
                                            { id: "16avos", label: "16avos", liberada: true, dependente: "" },
                                            { id: "oitavas", label: "Oitavas", liberada: true, dependente: "16avos" },
                                            { id: "quartas", label: "Quartas", liberada: true, dependente: "Oitavas" },
                                            { id: "semis", label: "Semifinais", liberada: true, dependente: "Quartas" },
                                            { id: "finais", label: "Finais", liberada: true, dependente: "Semifinais" },
                                        ];

                                        return abasConfig.map((tab) => {
                                            const ativa = activeTabMataMata === tab.id;
                                            const handleClickTab = () => {
                                                if (!tab.liberada) {
                                                    alert(`🔒 Acesso bloqueado! Você precisa preencher todos os confrontos da fase de ${tab.dependente} antes de liberar esta aba.`);
                                                    return;
                                                }
                                                setActiveTabMataMata(tab.id);
                                            };

                                            return (
                                                <button
                                                    key={tab.id}
                                                    onClick={handleClickTab}
                                                    className={`rounded-lg px-5 py-2 font-bold text-sm whitespace-nowrap transition-all flex items-center gap-2 active:scale-95 ${
                                                        ativa
                                                            ? "bg-[#008237] text-white"
                                                            : tab.liberada
                                                                ? "text-gray-400 hover:text-white bg-transparent"
                                                                : "text-gray-600 bg-transparent cursor-not-allowed"
                                                    }`}
                                                >
                                                    {!tab.liberada && <span className="material-symbols-outlined text-[14px]">lock</span>}
                                                    {tab.label}
                                                </button>
                                            );
                                        });
                                    })()}
                                </div>

                                <div className="flex flex-wrap justify-center gap-6">
                                    {bracketData.jogos
                                        .slice(
                                            activeTabMataMata === "16avos" ? 0 :
                                            activeTabMataMata === "oitavas" ? 16 :
                                            activeTabMataMata === "quartas" ? 24 :
                                            activeTabMataMata === "semis" ? 28 : 30,
                                            activeTabMataMata === "16avos" ? 16 :
                                            activeTabMataMata === "oitavas" ? 24 :
                                            activeTabMataMata === "quartas" ? 28 :
                                            activeTabMataMata === "semis" ? 30 : 32
                                        )
                                        .map((jogo) => {
                                            const palpite = bracketPalpites[jogo.id] || {
                                                palpite_a: null, palpite_b: null, time_classificado_palpite: null,
                                                confronto_time_a: jogo.time_a, confronto_time_b: jogo.time_b
                                            };
                                            const timeA = palpite.confronto_time_a || "A Definir";
                                            const timeB = palpite.confronto_time_b || "A Definir";
                                            const isEmpateMataMata = palpite.palpite_a !== null && palpite.palpite_b !== null && Number(palpite.palpite_a) === Number(palpite.palpite_b);

                                            const encerramentoTime = jogo.encerramento_palpite 
                                                ? new Date(jogo.encerramento_palpite).getTime() 
                                                : new Date(jogo.data).getTime() - 60 * 60 * 1000;
                                            const fechadoParaEditar = (Date.now() > encerramentoTime && jogo.id !== 97) || jogo.status !== 'aberto';
                                            
                                            const dbPalp = bracketData.palpites.find(p => p.jogo_id === jogo.id);
                                            const estaSalvoNoBancoMataMata = dbPalp && dbPalp.palpite_a !== null && dbPalp.palpite_b !== null;
                                            const estaEditandoMataMata = !estaSalvoNoBancoMataMata || jogosEmEdicao[jogo.id];
                                            const inputsDisabled = fechadoParaEditar || !estaEditandoMataMata;

                                            return (
                                                <div key={jogo.id} className="w-full md:w-[calc(50%-0.75rem)] lg:w-[calc(33.333%-1rem)] max-w-[450px] bg-[#1a2634] rounded-2xl p-5 shadow-lg border border-white/5 relative overflow-hidden group transition-colors flex flex-col justify-between min-h-[220px]">
                                                    <div>
                                                        <div className="flex justify-between items-center text-xs font-bold text-gray-400 border-b border-white/5 pb-3">
                                                            <span className="bg-[#2a3644] text-gray-300 px-3 py-1 rounded-full">{jogo.fase}</span>
                                                            <span>{formatDataMataMata(jogo.data)}</span>
                                                        </div>
                                                        <div className="flex items-center justify-between gap-3 pt-5">
                                                            <div className="flex-1 text-center space-y-3 min-w-0 flex flex-col items-center">
                                                                <div className="w-10 h-10 rounded-full bg-surface-container-highest border border-white/20 overflow-hidden shadow-md">
                                                                    {timeA && timeA !== "A Definir" ? <img src={getBandeiraUrl(timeA)} alt={timeA} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gray-700"></div>}
                                                                </div>
                                                                <div className="font-bold text-sm text-white truncate w-full">{timeA || "A Definir"}</div>
                                                            </div>
                                                            <div className="flex items-center bg-[#0b1727] rounded-xl px-3 py-2 border border-[#2a3644] shadow-inner gap-2 shrink-0">
                                                                <input id={`input-a-${jogo.id}`} type="number" min="0" placeholder="-" value={palpite.palpite_a !== null ? palpite.palpite_a : ""} onChange={(e) => handlePlacarChangeMataMata(jogo.id, 'a', e.target.value)} disabled={inputsDisabled} className="w-8 bg-transparent text-white text-center font-bold text-xl outline-none placeholder:text-gray-600 p-0 disabled:opacity-50" />
                                                                <span className="text-gray-500 font-bold">X</span>
                                                                <input id={`input-b-${jogo.id}`} type="number" min="0" placeholder="-" value={palpite.palpite_b !== null ? palpite.palpite_b : ""} onChange={(e) => handlePlacarChangeMataMata(jogo.id, 'b', e.target.value)} disabled={inputsDisabled} className="w-8 bg-transparent text-white text-center font-bold text-xl outline-none placeholder:text-gray-600 p-0 disabled:opacity-50" />
                                                            </div>
                                                            <div className="flex-1 text-center space-y-3 min-w-0 flex flex-col items-center">
                                                                <div className="w-10 h-10 rounded-full bg-surface-container-highest border border-white/20 overflow-hidden shadow-md">
                                                                    {timeB && timeB !== "A Definir" ? <img src={getBandeiraUrl(timeB)} alt={timeB} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gray-700"></div>}
                                                                </div>
                                                                <div className="font-bold text-sm text-white truncate w-full">{timeB || "A Definir"}</div>
                                                            </div>
                                                        </div>

                                                        {/* Botões Avança em caso de Empate */}
                                                        {isEmpateMataMata && (
                                                            <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-white/5">
                                                                {!bracketData.bracketSalvo || estaEditandoMataMata ? (
                                                                    <button 
                                                                        type="button"
                                                                        onClick={() => {
                                                                            if (inputsDisabled) return;
                                                                            handleSelectClassificadoMataMata(jogo.id, timeA || "A Definir", 'a');
                                                                        }} 
                                                                        disabled={inputsDisabled}
                                                                        className={`flex-1 text-[10px] py-1.5 rounded-xl font-bold uppercase transition-all shadow-sm ${
                                                                            palpite.lado_classificado === 'a' 
                                                                                ? "bg-[#008237] text-white font-black shadow-[0_0_10px_rgba(0,130,55,0.3)]" 
                                                                                : "bg-[#2a3644] text-gray-400 hover:text-white"
                                                                        } disabled:opacity-60 disabled:cursor-not-allowed`}
                                                                    >
                                                                        Avança
                                                                    </button>
                                                                ) : (
                                                                    palpite.lado_classificado === 'a' && (
                                                                        <span className="flex-1 text-[10px] bg-[#008237]/20 text-[#008237] py-1.5 rounded-xl font-bold uppercase text-center border border-[#008237]/50">Avança</span>
                                                                    )
                                                                )}

                                                                {(!bracketData.bracketSalvo || estaEditandoMataMata) && palpite.lado_classificado && (
                                                                    <button 
                                                                        type="button"
                                                                        onClick={() => {
                                                                            if (inputsDisabled) return;
                                                                            handleLimparClassificadoMataMata(jogo.id);
                                                                        }} 
                                                                        disabled={inputsDisabled}
                                                                        title="Resetar escolha de avanço"
                                                                        className="flex items-center justify-center w-8 h-8 rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/10 transition-all active:scale-90 flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                                                                    >
                                                                        <span className="material-symbols-outlined text-[16px]">restart_alt</span>
                                                                    </button>
                                                                )}

                                                                {(!bracketData.bracketSalvo || estaEditandoMataMata) && !palpite.lado_classificado && (
                                                                    <div className="w-8 h-8 flex items-center justify-center text-gray-600 flex-shrink-0">
                                                                        <span className="material-symbols-outlined text-[16px] opacity-20">help</span>
                                                                    </div>
                                                                )}

                                                                {!bracketData.bracketSalvo || estaEditandoMataMata ? (
                                                                    <button 
                                                                        type="button"
                                                                        onClick={() => {
                                                                            if (inputsDisabled) return;
                                                                            handleSelectClassificadoMataMata(jogo.id, timeB || "A Definir", 'b');
                                                                        }} 
                                                                        disabled={inputsDisabled}
                                                                        className={`flex-1 text-[10px] py-1.5 rounded-xl font-bold uppercase transition-all shadow-sm ${
                                                                            palpite.lado_classificado === 'b' 
                                                                                ? "bg-[#008237] text-white font-black shadow-[0_0_10px_rgba(0,130,55,0.3)]" 
                                                                                : "bg-[#2a3644] text-gray-400 hover:text-white"
                                                                        } disabled:opacity-60 disabled:cursor-not-allowed`}
                                                                    >
                                                                        Avança
                                                                    </button>
                                                                ) : (
                                                                    palpite.lado_classificado === 'b' && (
                                                                        <span className="flex-1 text-[10px] bg-[#008237]/20 text-[#008237] py-1.5 rounded-xl font-bold uppercase text-center border border-[#008237]/50">Avança</span>
                                                                    )
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Bottom Action Area for Mata-Mata */}
                                                    <div className="mt-4 border-t border-white/5 pt-4">
                                                        {jogo.status === 'pontuado' || jogo.status === 'encerrado' ? (
                                                            <div className="flex flex-col items-center gap-1 bg-[#132030] py-2 rounded-xl border border-white/5 w-full">
                                                                <span className="text-xs text-gray-400 font-bold uppercase">Resultado Real</span>
                                                                <span className="text-white font-bold text-center px-2">
                                                                    {jogo.time_a} {jogo.placar_a} x {jogo.placar_b} {jogo.time_b}
                                                                </span>
                                                                {jogo.status === 'pontuado' && (
                                                                    Number(jogo.id) === 122 || Number(jogo.id) === 97 ? (
                                                                        <div className="flex items-center gap-1 text-red-400 font-bold text-xs mt-1 uppercase">
                                                                            <span className="material-symbols-outlined text-[14px]">warning</span>
                                                                            Este jogo não vale pontos
                                                                        </div>
                                                                    ) : (
                                                                        <div className="flex items-center gap-1 text-[#FDE01A] font-bold text-xs mt-1">
                                                                            <span className="material-symbols-outlined text-[14px]">stars</span>
                                                                            Você marcou: {palpite.pontos || 0} pts
                                                                        </div>
                                                                    )
                                                                )}
                                                            </div>
                                                        ) : bracketData.bracketSalvo ? (
                                                            // Se o bracket estiver salvo, exibe o status real / pontuação ou o botão de atualizar placar individual
                                                            fechadoParaEditar ? (
                                                                 jogo.placar_a !== null && jogo.placar_b !== null ? (
                                                                     <div className="flex flex-col items-center gap-1 bg-[#132030]/50 py-2 rounded-xl border border-white/5 w-full">
                                                                         <span className="text-[10px] text-amber-500 font-bold uppercase flex items-center gap-1">
                                                                             <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                                                                             Placar ao Vivo (GE)
                                                                         </span>
                                                                         <span className="text-white font-bold text-sm text-center px-2">
                                                                             {jogo.time_a} {jogo.placar_a} x {jogo.placar_b} {jogo.time_b}
                                                                         </span>
                                                                         <span className="text-[9px] text-gray-500 italic">Aguardando encerramento oficial...</span>
                                                                     </div>
                                                                 ) : (
                                                                    <div className="text-center text-gray-500 font-bold text-sm py-2">
                                                                        Aguardando resultado...
                                                                    </div>
                                                                 )
                                                            ) : (
                                                                <button 
                                                                    onClick={() => {
                                                                        const dbPalp = bracketData.palpites.find(p => p.jogo_id === jogo.id);
                                                                        const estaSalvoNoBancoMataMata = dbPalp && dbPalp.palpite_a !== null && dbPalp.palpite_b !== null;
                                                                        const alterouPlacarMataMata = palpite && dbPalp && (
                                                                            palpite.palpite_a !== dbPalp.palpite_a ||
                                                                            palpite.palpite_b !== dbPalp.palpite_b
                                                                        );

                                                                        if (alterouPlacarMataMata || !estaSalvoNoBancoMataMata) {
                                                                            handleSalvarPalpiteCard(jogo);
                                                                        } else {
                                                                            handleEditarClick(jogo.id);
                                                                        }
                                                                    }}
                                                                    disabled={palpiteMutation.isPending}
                                                                    className={`py-3 rounded-xl font-bold text-sm transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5 w-full
                                                                        ${(() => {
                                                                            const dbPalp = bracketData.palpites.find(p => p.jogo_id === jogo.id);
                                                                            const estaSalvoNoBancoMataMata = dbPalp && dbPalp.palpite_a !== null && dbPalp.palpite_b !== null;
                                                                            const alterouPlacarMataMata = palpite && dbPalp && (
                                                                                palpite.palpite_a !== dbPalp.palpite_a ||
                                                                                palpite.palpite_b !== dbPalp.palpite_b
                                                                            );
                                                                            return alterouPlacarMataMata || !estaSalvoNoBancoMataMata;
                                                                        })()
                                                                            ? "bg-[#FDE01A] text-[#061423] hover:brightness-110" 
                                                                            : "bg-white/10 text-white hover:bg-white/20 border border-white/10"}`}
                                                                >
                                                                    {(() => {
                                                                        const dbPalp = bracketData.palpites.find(p => p.jogo_id === jogo.id);
                                                                        const estaSalvoNoBancoMataMata = dbPalp && dbPalp.palpite_a !== null && dbPalp.palpite_b !== null;
                                                                        const alterouPlacarMataMata = palpite && dbPalp && (
                                                                            palpite.palpite_a !== dbPalp.palpite_a ||
                                                                            palpite.palpite_b !== dbPalp.palpite_b
                                                                        );

                                                                        if (alterouPlacarMataMata) {
                                                                            return (
                                                                                <>
                                                                                    <span className="material-symbols-outlined text-[16px]">save</span>
                                                                                    Salvar Palpite
                                                                                </>
                                                                            );
                                                                        } else if (estaSalvoNoBancoMataMata) {
                                                                            return (
                                                                                <>
                                                                                    <span className="material-symbols-outlined text-[16px]">edit</span>
                                                                                    Editar Palpite
                                                                                </>
                                                                            );
                                                                        } else {
                                                                            return (
                                                                                <>
                                                                                    <span className="material-symbols-outlined text-[16px]">sports_soccer</span>
                                                                                    Salvar Palpite
                                                                                </>
                                                                            );
                                                                        }
                                                                    })()}
                                                                </button>
                                                            )
                                                        ) : (
                                                            // Se o bracket NÃO estiver salvo (fase de palpites do chaveamento ativo)
                                                            fechadoParaEditar ? (
                                                                <div className="text-center text-gray-500 font-bold text-sm py-2">
                                                                    Chaveamento fechado
                                                                </div>
                                                            ) : (
                                                                <button 
                                                                    onClick={() => {
                                                                        const dbPalp = bracketData.palpites.find(p => p.jogo_id === jogo.id);
                                                                        const estaSalvoNoBancoMataMata = dbPalp && dbPalp.palpite_a !== null && dbPalp.palpite_b !== null;
                                                                        
                                                                        const alterouPlacarMataMata = palpite && dbPalp && (
                                                                            palpite.palpite_a !== dbPalp.palpite_a ||
                                                                            palpite.palpite_b !== dbPalp.palpite_b ||
                                                                            palpite.time_classificado_palpite !== dbPalp.time_classificado_palpite
                                                                        );

                                                                        if (alterouPlacarMataMata || !estaSalvoNoBancoMataMata) {
                                                                            handleSalvarPalpiteCard(jogo);
                                                                        } else {
                                                                            handleEditarClick(jogo.id);
                                                                        }
                                                                    }}
                                                                    disabled={palpiteMutation.isPending}
                                                                    className={`py-3 rounded-xl font-bold text-sm transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5 w-full
                                                                        ${(() => {
                                                                            const dbPalp = bracketData.palpites.find(p => p.jogo_id === jogo.id);
                                                                            const estaSalvoNoBancoMataMata = dbPalp && dbPalp.palpite_a !== null && dbPalp.palpite_b !== null;
                                                                            const alterouPlacarMataMata = palpite && dbPalp && (
                                                                                palpite.palpite_a !== dbPalp.palpite_a ||
                                                                                palpite.palpite_b !== dbPalp.palpite_b ||
                                                                                palpite.time_classificado_palpite !== dbPalp.time_classificado_palpite
                                                                            );
                                                                            return alterouPlacarMataMata || !estaSalvoNoBancoMataMata;
                                                                        })()
                                                                            ? "bg-[#FDE01A] text-[#061423] hover:brightness-110" 
                                                                            : "bg-white/10 text-white hover:bg-white/20 border border-white/10"}`}
                                                                >
                                                                    {(() => {
                                                                        const dbPalp = bracketData.palpites.find(p => p.jogo_id === jogo.id);
                                                                        const estaSalvoNoBancoMataMata = dbPalp && dbPalp.palpite_a !== null && dbPalp.palpite_b !== null;
                                                                        const alterouPlacarMataMata = palpite && dbPalp && (
                                                                            palpite.palpite_a !== dbPalp.palpite_a ||
                                                                            palpite.palpite_b !== dbPalp.palpite_b ||
                                                                            palpite.time_classificado_palpite !== dbPalp.time_classificado_palpite
                                                                        );

                                                                        if (alterouPlacarMataMata) {
                                                                            return (
                                                                                <>
                                                                                    <span className="material-symbols-outlined text-[16px]">save</span>
                                                                                    Salvar Palpite
                                                                                </>
                                                                            );
                                                                        } else if (estaSalvoNoBancoMataMata) {
                                                                            return (
                                                                                <>
                                                                                    <span className="material-symbols-outlined text-[16px]">edit</span>
                                                                                    Editar Palpite
                                                                                </>
                                                                            );
                                                                        } else {
                                                                            return (
                                                                                <>
                                                                                    <span className="material-symbols-outlined text-[16px]">sports_soccer</span>
                                                                                    Salvar Palpite
                                                                                </>
                                                                            );
                                                                        }
                                                                    })()}
                                                                </button>
                                                            )
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>
                            </>
                        )}
                    </section>
                )}
            </div>
        </main>
    );
}

export default Jogos;