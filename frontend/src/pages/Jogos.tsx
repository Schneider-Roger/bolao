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
}

interface BracketData {
    success: boolean;
    bracketSalvo: boolean;
    jogos: Jogo[];
    palpites: PalpiteMataMata[];
}

function Jogos() {
    const queryClient = useQueryClient();

    // Filtro principal da página
    const [abaPrincipal, setAbaPrincipal] = useState<"grupos" | "matamata">("grupos");
    const [rodadaAtiva, setRodadaAtiva] = useState<number>(1);

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
            palpiteMutation.mutate({
                jogoId: jogo.id,
                palpiteA: local.palpite_a,
                palpiteB: local.palpite_b,
                classificado: local.time_classificado_palpite
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
        const input = document.getElementById(`input-a-${jogoId}`);
        if (input) {
            input.focus();
            (input as HTMLInputElement).select();
        }
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
        mutationFn: async ({ jogoId, palpiteA, palpiteB, classificado }: { jogoId: number; palpiteA: number; palpiteB: number; classificado: string | null }) => {
            return await api.post(`/jogos/${jogoId}/palpite`, {
                palpite_a: palpiteA,
                palpite_b: palpiteB,
                time_classificado_palpite: classificado
            });
        },
        onSuccess: () => {
            alert("Seu palpite foi registrado com sucesso!");
            queryClient.invalidateQueries({ queryKey: ["jogos"] });
            queryClient.invalidateQueries({ queryKey: ["minha-posicao"] });
            queryClient.invalidateQueries({ queryKey: ["meus-resultados"] });
            queryClient.invalidateQueries({ queryKey: ["bracket"] });
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

    useEffect(() => {
        if (bracketData) {
            const initial: Record<number, PalpiteMataMata> = {};
            bracketData.palpites.forEach((p) => {
                initial[p.jogo_id] = { ...p };
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
                    };
                }
            });
            setBracketPalpites(initial);
        }
    }, [bracketData]);

    const bracketMutation = useMutation({
        mutationFn: async (payload: PalpiteMataMata[]) => {
            return await api.post("/jogos/bracket/salvar", { palpites: payload });
        },
        onSuccess: () => {
            alert("Bracket de mata-mata salvo com sucesso!");
            queryClient.invalidateQueries({ queryKey: ["bracket"] });
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
        const feed16toOitavas = [
            { oitavasId: 89, timeAFrom: 73, timeBFrom: 74 }, { oitavasId: 90, timeAFrom: 75, timeBFrom: 76 },
            { oitavasId: 91, timeAFrom: 77, timeBFrom: 78 }, { oitavasId: 92, timeAFrom: 79, timeBFrom: 80 },
            { oitavasId: 93, timeAFrom: 81, timeBFrom: 82 }, { oitavasId: 94, timeAFrom: 83, timeBFrom: 84 },
            { oitavasId: 95, timeAFrom: 85, timeBFrom: 86 }, { oitavasId: 96, timeAFrom: 87, timeBFrom: 88 },
        ];
        feed16toOitavas.forEach(({ oitavasId, timeAFrom, timeBFrom }) => {
            if (updated[oitavasId]) {
                updated[oitavasId]!.confronto_time_a = getVencedor(timeAFrom) || "A Definir";
                updated[oitavasId]!.confronto_time_b = getVencedor(timeBFrom) || "A Definir";
            }
        });
        const feedOitavasToQuartas = [
            { quartasId: 97, timeAFrom: 89, timeBFrom: 90 }, { quartasId: 98, timeAFrom: 91, timeBFrom: 92 },
            { quartasId: 99, timeAFrom: 93, timeBFrom: 94 }, { quartasId: 100, timeAFrom: 95, timeBFrom: 96 },
        ];
        feedOitavasToQuartas.forEach(({ quartasId, timeAFrom, timeBFrom }) => {
            if (updated[quartasId]) {
                updated[quartasId]!.confronto_time_a = getVencedor(timeAFrom) || "A Definir";
                updated[quartasId]!.confronto_time_b = getVencedor(timeBFrom) || "A Definir";
            }
        });
        const feedQuartasToSemis = [
            { semisId: 101, timeAFrom: 97, timeBFrom: 98 }, { semisId: 102, timeAFrom: 99, timeBFrom: 100 },
        ];
        feedQuartasToSemis.forEach(({ semisId, timeAFrom, timeBFrom }) => {
            if (updated[semisId]) {
                updated[semisId]!.confronto_time_a = getVencedor(timeAFrom) || "A Definir";
                updated[semisId]!.confronto_time_b = getVencedor(timeBFrom) || "A Definir";
            }
        });
        if (updated[104]) {
            updated[104]!.confronto_time_a = getVencedor(101) || "A Definir";
            updated[104]!.confronto_time_b = getVencedor(102) || "A Definir";
        }
        if (updated[103]) {
            updated[103]!.confronto_time_a = getPerdedor(101) || "A Definir";
            updated[103]!.confronto_time_b = getPerdedor(102) || "A Definir";
        }
        return updated;
    };

    const handlePlacarChangeMataMata = (jogoId: number, lado: 'a' | 'b', val: string) => {
        if (bracketData?.bracketSalvo) {
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
                    } else if (Number(next[jogoId]!.palpite_b) > Number(next[jogoId]!.palpite_a)) {
                        next[jogoId]!.time_classificado_palpite = next[jogoId]!.confronto_time_b;
                    }
                }
            }
            return atualizarConfrontosProximos(next);
        });
    };

    const handleSelectClassificadoMataMata = (jogoId: number, time: string) => {
        if (bracketData?.bracketSalvo) return;
        setBracketPalpites((prev) => {
            const next = { ...prev };
            if (next[jogoId]) {
                next[jogoId]!.time_classificado_palpite = time;
            }
            return atualizarConfrontosProximos(next);
        });
    };

    const handleSaveBracketMataMata = () => {
        const payload: PalpiteMataMata[] = [];
        let valid = true;
        Object.values(bracketPalpites).forEach((p) => {
            if (p.palpite_a === null || p.palpite_b === null) valid = false;
            if (p.palpite_a === p.palpite_b && !p.time_classificado_palpite) valid = false;
            payload.push(p);
        });
        if (!valid) {
            alert("Por favor, preencha todos os placares e selecione o classificado em caso de empate antes de salvar seu bracket.");
            return;
        }
        if (confirm("Atenção! Ao salvar o bracket, suas seleções de times que avançam serão bloqueadas de forma permanente. Você poderá atualizar apenas os placares individuais dos jogos até 1h antes do início de cada partida. Deseja prosseguir?")) {
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
        let ids: number[] = [];
        if (fase === "16avos") { for (let i = 73; i <= 88; i++) ids.push(i); }
        else if (fase === "oitavas") { for (let i = 89; i <= 96; i++) ids.push(i); }
        else if (fase === "quartas") { for (let i = 97; i <= 100; i++) ids.push(i); }
        else if (fase === "semis") { for (let i = 101; i <= 102; i++) ids.push(i); }

        return ids.every((id) => {
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

    const limiteMataMataExpirado = useMemo(() => {
        if (!bracketData?.jogos || bracketData.jogos.length === 0) return false;
        const tempos = bracketData.jogos
            .map(j => j.encerramento_palpite ? new Date(j.encerramento_palpite).getTime() : 0)
            .filter(t => t > 0);
        if (tempos.length === 0) return false;
        return Date.now() > Math.min(...tempos);
    }, [bracketData]);

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
                        {/* Legend */}
                        <div className="flex flex-wrap justify-center gap-4 items-center bg-[#132030] px-4 py-2 rounded-full border border-white/5">
                            <div className="flex items-center gap-1.5 text-xs text-gray-300 font-medium">
                                <span className="material-symbols-outlined text-green-500 text-[14px]">check_circle</span> 5 pts
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-gray-300 font-medium">
                                <div className="w-3 h-3 rounded-full bg-yellow-500"></div> 2 pts
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-gray-300 font-medium">
                                <span className="material-symbols-outlined text-red-500 text-[14px]">cancel</span> 0 pts
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-gray-300 font-medium">
                                <span className="material-symbols-outlined text-gray-400 text-[14px]">schedule</span> Pendente
                            </div>
                        </div>
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
                                const jogosG = (jogosGrupos || []).filter(j => j.fase.includes("Grupo"));
                                const gruposTerminados = jogosG.length > 0 && jogosG.every(j => j.status === 'pontuado' || j.status === 'encerrado');
                                
                                if (!gruposTerminados) {
                                    alert("O Mata-mata só será liberado após o término de todos os jogos da Fase de Grupos.");
                                    return;
                                }
                                setAbaPrincipal("matamata");
                            }}
                            className={`flex-1 py-3 font-semibold text-sm rounded-lg transition-colors text-center flex justify-center items-center gap-1 ${abaPrincipal === "matamata" ? "text-white bg-[#008237]" : "text-gray-400 hover:text-white bg-transparent"} ${!(jogosGrupos || []).filter(j => j.fase.includes("Grupo")).every(j => j.status === 'pontuado' || j.status === 'encerrado') ? "opacity-60 cursor-not-allowed" : ""}`}
                        >
                            Mata-mata {!(jogosGrupos || []).filter(j => j.fase.includes("Grupo")).every(j => j.status === 'pontuado' || j.status === 'encerrado') && <span className="material-symbols-outlined text-[16px]">lock</span>}
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
                                                                        disabled={fechadoParaEditar}
                                                                        className="w-8 bg-transparent text-white text-center font-bold text-xl outline-none placeholder:text-gray-600 p-0 disabled:opacity-70"
                                                                    />
                                                                    <span className="text-gray-500 font-bold">X</span>
                                                                    <input 
                                                                        id={`input-b-${jogo.id}`}
                                                                        type="number" min="0" max="99" placeholder="-"
                                                                        value={local.b} onChange={(e) => handleInputChange(jogo.id, 'b', e.target.value)}
                                                                        disabled={fechadoParaEditar}
                                                                        className="w-8 bg-transparent text-white text-center font-bold text-xl outline-none placeholder:text-gray-600 p-0 disabled:opacity-70"
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
                                                                    Você marcou: {jogo.pontos !== undefined ? jogo.pontos : 0} pts
                                                                </div>
                                                            </div>
                                                        ) : fechadoParaEditar ? (
                                                            <div className="mt-2 text-center text-gray-500 font-bold text-sm py-2">
                                                                Aguardando resultado...
                                                            </div>
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
                        ) : (
                            <>
                                <div className="flex gap-3 overflow-x-auto py-2 no-scrollbar bg-[#132030] p-2 rounded-xl border border-white/5">
                                    {(() => {
                                        const oitavasLiberadas = verificarFaseConcluida("16avos");
                                        const quartasLiberadas = oitavasLiberadas && verificarFaseConcluida("oitavas");
                                        const semisLiberadas = quartasLiberadas && verificarFaseConcluida("quartas");
                                        const finaisLiberadas = semisLiberadas && verificarFaseConcluida("semis");

                                        const abasConfig = [
                                            { id: "16avos", label: "16avos", liberada: true, dependente: "" },
                                            { id: "oitavas", label: "Oitavas", liberada: oitavasLiberadas, dependente: "16avos" },
                                            { id: "quartas", label: "Quartas", liberada: quartasLiberadas, dependente: "Oitavas" },
                                            { id: "semis", label: "Semifinais", liberada: semisLiberadas, dependente: "Quartas" },
                                            { id: "finais", label: "Finais", liberada: finaisLiberadas, dependente: "Semifinais" },
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
                                            const timeA = bracketData.bracketSalvo ? (jogo.time_a !== "A Definir" ? jogo.time_a : palpite.confronto_time_a) : palpite.confronto_time_a;
                                            const timeB = bracketData.bracketSalvo ? (jogo.time_b !== "A Definir" ? jogo.time_b : palpite.confronto_time_b) : palpite.confronto_time_b;
                                            const isEmpateMataMata = palpite.palpite_a !== null && palpite.palpite_b !== null && Number(palpite.palpite_a) === Number(palpite.palpite_b);

                                            const encerramentoTime = jogo.encerramento_palpite 
                                                ? new Date(jogo.encerramento_palpite).getTime() 
                                                : new Date(jogo.data).getTime() - 60 * 60 * 1000;
                                            const fechadoParaEditar = Date.now() > encerramentoTime || jogo.status !== 'aberto';
                                            const inputsDisabled = bracketData.bracketSalvo ? fechadoParaEditar : false;

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
                                                                {isEmpateMataMata && !bracketData.bracketSalvo && (
                                                                    <button onClick={() => handleSelectClassificadoMataMata(jogo.id, timeA || "")} className={`text-[10px] px-3 py-1.5 rounded-full font-bold uppercase transition-all shadow-sm ${palpite.time_classificado_palpite === timeA ? "bg-[#008237] text-white" : "bg-[#2a3644] text-gray-400"}`}>Avança</button>
                                                                )}
                                                                {isEmpateMataMata && bracketData.bracketSalvo && palpite.time_classificado_palpite === timeA && (
                                                                    <span className="text-[10px] bg-[#008237]/20 text-[#008237] px-3 py-1.5 rounded-full font-bold uppercase border border-[#008237]/50">Avança</span>
                                                                )}
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
                                                                {isEmpateMataMata && !bracketData.bracketSalvo && (
                                                                    <button onClick={() => handleSelectClassificadoMataMata(jogo.id, timeB || "")} className={`text-[10px] px-3 py-1.5 rounded-full font-bold uppercase transition-all shadow-sm ${palpite.time_classificado_palpite === timeB ? "bg-[#008237] text-white" : "bg-[#2a3644] text-gray-400"}`}>Avança</button>
                                                                )}
                                                                {isEmpateMataMata && bracketData.bracketSalvo && palpite.time_classificado_palpite === timeB && (
                                                                    <span className="text-[10px] bg-[#008237]/20 text-[#008237] px-3 py-1.5 rounded-full font-bold uppercase border border-[#008237]/50">Avança</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Bottom Action Area for Mata-Mata after saving bracket */}
                                                    {bracketData.bracketSalvo && (
                                                        <div className="mt-4 border-t border-white/5 pt-4">
                                                            {jogo.status === 'pontuado' ? (
                                                                <div className="flex flex-col items-center gap-1 bg-[#132030] py-2 rounded-xl border border-white/5">
                                                                    <span className="text-xs text-gray-400 font-bold uppercase">Resultado Real</span>
                                                                    <span className="text-white font-bold">{jogo.placar_a} x {jogo.placar_b}</span>
                                                                    <div className="flex items-center gap-1 text-[#FDE01A] font-bold text-xs mt-1">
                                                                        <span className="material-symbols-outlined text-[14px]">stars</span>
                                                                        Você marcou: {jogo.pontos !== undefined ? jogo.pontos : 0} pts
                                                                    </div>
                                                                </div>
                                                            ) : fechadoParaEditar ? (
                                                                <div className="text-center text-gray-500 font-bold text-sm py-2">
                                                                    Aguardando resultado...
                                                                </div>
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
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                </div>

                                {!bracketData.bracketSalvo && (
                                    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-full max-w-md p-5 bg-[#0b1727]/95 backdrop-blur-lg border border-[#2a3644] flex justify-between items-center gap-4 shadow-2xl z-50 rounded-2xl">
                                        {limiteMataMataExpirado ? (
                                            <div className="text-xs text-red-400 font-bold uppercase w-full text-center leading-tight">
                                                🚨 O prazo para enviar seu chaveamento expirou!
                                            </div>
                                        ) : (
                                            <>
                                                <div className="text-xs text-gray-400 font-bold uppercase max-w-[180px] leading-tight">
                                                    Preencha até as Finais para salvar.
                                                </div>
                                                <button onClick={handleSaveBracketMataMata} disabled={bracketMutation.isPending} className="bg-[#facc15] text-[#061423] hover:brightness-110 font-bold text-sm px-6 py-3 rounded-xl transition-all active:scale-95 disabled:opacity-50 shrink-0 shadow-lg">
                                                    {bracketMutation.isPending ? "Salvando..." : "Salvar Chaveamento"}
                                                </button>
                                            </>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </section>
                )}
            </div>
        </main>
    );
}

export default Jogos;