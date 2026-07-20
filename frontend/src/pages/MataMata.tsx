import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

interface Jogo {
    id: number;
    fase: string;
    rodada: number | null;
    time_a: string;
    time_b: string;
    data: string;
    status: string;
    placar_a: number | null;
    placar_b: number | null;
    encerramento_palpite: string;
}

interface Palpite {
    jogo_id: number;
    palpite_a: number | null;
    palpite_b: number | null;
    time_classificado_palpite: string | null;
    confronto_time_a: string | null;
    confronto_time_b: string | null;
    lado_classificado?: 'a' | 'b' | null;
}

interface BracketData {
    success: boolean;
    liberado: boolean;
    bracketSalvo: boolean;
    jogos: Jogo[];
    palpites: Palpite[];
}

function MataMata() {
    const queryClient = useQueryClient();
    const [bracketPalpites, setBracketPalpites] = useState<Record<number, Palpite>>({});
    const [activeTab, setActiveTab] = useState<string>("16avos");

    // 1. Busca os jogos e palpites do mata-mata
    const { data, isLoading } = useQuery<BracketData>({
        queryKey: ["bracket"],
        queryFn: async () => {
            const res = await api.get("/jogos/bracket");
            return res.data;
        }
    });

    // 2. Inicializa o estado com palpites salvos ou vazios
    useEffect(() => {
        if (data) {
            const initial: Record<number, Palpite> = {};
            
            data.palpites.forEach((p) => {
                let lado: 'a' | 'b' | null = null;
                if (p.time_classificado_palpite) {
                    if (p.time_classificado_palpite === p.confronto_time_a) lado = 'a';
                    else if (p.time_classificado_palpite === p.confronto_time_b) lado = 'b';
                }
                initial[p.jogo_id] = { ...p, lado_classificado: lado };
            });

            data.jogos.forEach((j) => {
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

            setBracketPalpites(initial);
        }
    }, [data]);

    const singleSaveMutation = useMutation({
        mutationFn: async (payload: { jogoId: number, palpiteA: number | null, palpiteB: number | null, classificado: string | null }) => {
            const res = await api.post(`/jogos/palpitar/${payload.jogoId}`, {
                palpite_a: payload.palpiteA,
                palpite_b: payload.palpiteB,
                classificado: payload.classificado
            });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["bracket"] });
        },
        onError: (err: any) => {
            alert(err.response?.data?.error || "Erro ao salvar palpite individual.");
        }
    });

    const isJogoBloqueado = (jogo: Jogo) => {
        const encerramentoTime = jogo.encerramento_palpite 
            ? new Date(jogo.encerramento_palpite).getTime() 
            : new Date(jogo.data).getTime() - 60 * 60 * 1000;
        return Date.now() > encerramentoTime || jogo.status !== 'aberto';
    };

    const handlePlacarBlur = (jogoId: number) => {
        const palpite = bracketPalpites[jogoId];
        if (!palpite || palpite.palpite_a === null || palpite.palpite_b === null) return;
        
        singleSaveMutation.mutate({
            jogoId,
            palpiteA: palpite.palpite_a,
            palpiteB: palpite.palpite_b,
            classificado: palpite.time_classificado_palpite
        });
    };

    const mutation = useMutation({
        mutationFn: async (payload: Palpite[]) => {
            return await api.post("/jogos/bracket/salvar", { palpites: payload });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["bracket"] });
        },
        onError: (err: any) => {
            alert(err.response?.data?.error || "Erro ao salvar bracket");
        }
    });

    if (isLoading || !data) {
        return (
            <div className="flex h-screen items-center justify-center text-white bg-slate-950">
                <div className="text-center space-y-4">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent mx-auto"></div>
                    <p className="font-bold text-slate-400">Carregando chaveamento da Copa...</p>
                </div>
            </div>
        );
    }

    const { jogos, bracketSalvo, liberado } = data;

    const jogos16_raw = jogos.slice(0, 16);
    // Reordena visualmente os 16-avos para que fiquem pareados conforme a árvore do bracket
    const bracketOrder16 = [
        0, 1, 2, 3, 4, 5, 6, 7, 
        8, 9, 10, 11, 12, 13, 14, 15
    ];
    const jogos16 = bracketOrder16.map(idx => jogos16_raw[idx]);
    
    const oitavas = jogos.slice(16, 24);
    const quartas = jogos.slice(24, 28);
    const semis = jogos.slice(28, 30);
    const terceiroLugar = jogos.slice(30, 31);
    const finalJogo = jogos.slice(31, 32);

    const indexToId: Record<number, number> = {};
    const idToIndex: Record<number, number> = {};
    jogos.forEach((j, idx) => {
        indexToId[idx] = j.id;
        idToIndex[j.id] = idx;
    });

    const atualizarConfrontosProximos = (currentState: Record<number, Palpite>) => {
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

    const handlePlacarChange = (jogoId: number, lado: 'a' | 'b', val: string) => {
        const jogo = listaJogos.find(j => j.id === jogoId);
        if (jogo && isJogoBloqueado(jogo)) return;

        setBracketPalpites((prev) => {
            const next = { ...prev };
            const num = val === "" ? null : parseInt(val);

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
                return atualizarConfrontosProximos(next);
            }

            return next;
        });
    };

    const handleSelectClassificado = (jogoId: number, time: string, lado: 'a' | 'b') => {
        const jogo = listaJogos.find(j => j.id === jogoId);
        if (jogo && isJogoBloqueado(jogo)) return;

        setBracketPalpites((prev) => {
            const next = { ...prev };
            if (next[jogoId]) {
                next[jogoId]!.time_classificado_palpite = time;
                next[jogoId]!.lado_classificado = lado;

                // Salva automaticamente se placares já estiverem preenchidos
                if (next[jogoId]!.palpite_a !== null && next[jogoId]!.palpite_b !== null) {
                    singleSaveMutation.mutate({
                        jogoId,
                        palpiteA: next[jogoId]!.palpite_a,
                        palpiteB: next[jogoId]!.palpite_b,
                        classificado: time
                    });
                }
            }
            return atualizarConfrontosProximos(next);
        });
    };

    const handleLimparClassificado = (jogoId: number) => {
        const jogo = listaJogos.find(j => j.id === jogoId);
        if (jogo && isJogoBloqueado(jogo)) return;

        setBracketPalpites((prev) => {
            const next = { ...prev };
            if (next[jogoId]) {
                next[jogoId]!.time_classificado_palpite = null;
                next[jogoId]!.lado_classificado = null;

                // Salva automaticamente se placares já estiverem preenchidos
                if (next[jogoId]!.palpite_a !== null && next[jogoId]!.palpite_b !== null) {
                    singleSaveMutation.mutate({
                        jogoId,
                        palpiteA: next[jogoId]!.palpite_a,
                        palpiteB: next[jogoId]!.palpite_b,
                        classificado: null
                    });
                }
            }
            return atualizarConfrontosProximos(next);
        });
    };

    const handleSave = () => {
        const payload: Palpite[] = [];
        let placaresFaltando = 0;
        let empatesSemSelecao = 0;

        Object.values(bracketPalpites).forEach((p) => {
            if (p.palpite_a === null || p.palpite_b === null) {
                placaresFaltando++;
            } else if (Number(p.palpite_a) === Number(p.palpite_b) && !p.time_classificado_palpite) {
                empatesSemSelecao++;
            }
            payload.push(p);
        });

        if (placaresFaltando > 0 || empatesSemSelecao > 0) {
            let msg = "Atenção! Seu chaveamento não pôde ser salvo pelos seguintes motivos:\n\n";
            if (placaresFaltando > 0) {
                msg += `• Faltam preencher os placares de ${placaresFaltando} jogo(s) nas fases do chaveamento (é necessário preencher todas as abas e todos os 32 confrontos até a Final).\n\n`;
            }
            if (empatesSemSelecao > 0) {
                msg += `• Há ${empatesSemSelecao} jogo(s) empatado(s) onde você não escolheu qual time avança. Clique em 'Avança' no time desejado.\n\n`;
            }
            alert(msg);
            return;
        }

        if (confirm("Atenção! Ao salvar o bracket, suas seleções de times que avançam serão bloqueadas de forma permanente e não poderão ser editadas. Você poderá atualizar apenas os placares individuais dos jogos até 1h antes do início de cada partida. Deseja prosseguir?")) {
            mutation.mutate(payload);
        }
    };

    const renderJogoCard = (jogo: Jogo) => {
        const palpite = bracketPalpites[jogo.id] || {
            palpite_a: null,
            palpite_b: null,
            time_classificado_palpite: null,
            confronto_time_a: jogo.time_a,
            confronto_time_b: jogo.time_b
        };

        const timeA = palpite.confronto_time_a || "A Definir";
        const timeB = palpite.confronto_time_b || "A Definir";

        const isEmpate = palpite.palpite_a !== null && palpite.palpite_b !== null && Number(palpite.palpite_a) === Number(palpite.palpite_b);

        return (
            <article key={jogo.id} className="rounded-3xl glass-panel p-5 space-y-4 shadow-xl border border-white/5 relative overflow-hidden transition-all hover:border-white/10 flex flex-col justify-between min-h-[200px]">
                <div>
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-slate-400">
                        <span className="bg-white/5 px-2.5 py-0.5 rounded-full border border-white/5">{jogo.fase}</span>
                        <span>{new Date(jogo.data).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</span>
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-4">
                        {/* Time A */}
                        <div className="flex-1 text-center space-y-2.5 min-w-0">
                            <div className="font-extrabold text-xs sm:text-sm truncate text-white">{timeA || "A Definir"}</div>
                        </div>

                        {/* Inputs de placar holográficos */}
                        <div className="flex items-center gap-1.5 shrink-0 px-2.5 py-1 bg-slate-950/40 rounded-2xl border border-white/5 shadow-inner">
                            <input
                                type="number"
                                min="0"
                                placeholder="-"
                                value={palpite.palpite_a !== null ? palpite.palpite_a : ""}
                                onChange={(e) => handlePlacarChange(jogo.id, 'a', e.target.value)}
                                onBlur={() => handlePlacarBlur(jogo.id)}
                                disabled={isJogoBloqueado(jogo)}
                                className="w-10 h-10 rounded-xl bg-slate-900 text-center text-lg font-black text-white outline-none border border-white/5 focus:border-emerald-500 disabled:opacity-50"
                            />
                            <span className="text-slate-600 font-black text-xs">×</span>
                            <input
                                type="number"
                                min="0"
                                placeholder="-"
                                value={palpite.palpite_b !== null ? palpite.palpite_b : ""}
                                onChange={(e) => handlePlacarChange(jogo.id, 'b', e.target.value)}
                                onBlur={() => handlePlacarBlur(jogo.id)}
                                disabled={isJogoBloqueado(jogo)}
                                className="w-10 h-10 rounded-xl bg-slate-900 text-center text-lg font-black text-white outline-none border border-white/5 focus:border-emerald-500 disabled:opacity-50"
                            />
                        </div>

                        {/* Time B */}
                        <div className="flex-1 text-center space-y-2.5 min-w-0">
                            <div className="font-extrabold text-xs sm:text-sm truncate text-white">{timeB || "A Definir"}</div>
                        </div>
                    </div>

                    {/* Botões Avança em caso de Empate */}
                    {isEmpate && (
                        <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-white/5">
                            {!isJogoBloqueado(jogo) ? (
                                <button 
                                    type="button"
                                    onClick={() => handleSelectClassificado(jogo.id, timeA || "", 'a')} 
                                    className={`flex-1 text-[10px] py-1.5 rounded-xl font-bold uppercase transition-all shadow-sm ${
                                        palpite.lado_classificado === 'a' 
                                            ? "bg-[#008237] text-white font-black shadow-[0_0_10px_rgba(0,130,55,0.3)]" 
                                            : "bg-[#2a3644] text-gray-400 hover:text-white"
                                    }`}
                                >
                                    Avança
                                </button>
                            ) : (
                                palpite.lado_classificado === 'a' && (
                                    <span className="flex-1 text-[10px] bg-[#008237]/20 text-[#008237] py-1.5 rounded-xl font-bold uppercase text-center border border-[#008237]/50">Avança</span>
                                )
                            )}

                            {!isJogoBloqueado(jogo) && palpite.lado_classificado && (
                                <button 
                                    type="button"
                                    onClick={() => handleLimparClassificado(jogo.id)} 
                                    title="Resetar escolha de avanço"
                                    className="flex items-center justify-center w-8 h-8 rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/10 transition-all active:scale-90 flex-shrink-0"
                                >
                                    <span className="material-symbols-outlined text-[16px]">restart_alt</span>
                                </button>
                            )}

                            {!isJogoBloqueado(jogo) && !palpite.lado_classificado && (
                                <div className="w-8 h-8 flex items-center justify-center text-gray-600 flex-shrink-0">
                                    <span className="material-symbols-outlined text-[16px] opacity-20">help</span>
                                </div>
                            )}

                            {!isJogoBloqueado(jogo) ? (
                                <button 
                                    type="button"
                                    onClick={() => handleSelectClassificado(jogo.id, timeB || "", 'b')} 
                                    className={`flex-1 text-[10px] py-1.5 rounded-xl font-bold uppercase transition-all shadow-sm ${
                                        palpite.lado_classificado === 'b' 
                                            ? "bg-[#008237] text-white font-black shadow-[0_0_10px_rgba(0,130,55,0.3)]" 
                                            : "bg-[#2a3644] text-gray-400 hover:text-white"
                                    }`}
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
            </article>
        );
    };

    const getTabJogos = () => {
        switch (activeTab) {
            case "16avos": return jogos16;
            case "oitavas": return oitavas;
            case "quartas": return quartas;
            case "semis": return semis;
            case "finais": return [...terceiroLugar, ...finalJogo];
            default: return jogos16;
        }
    };

    if (!liberado) {
        return (
            <div className="space-y-7 px-4 md:px-[100px] pb-28 text-white">
                <header className="bg-white/3 p-5 rounded-3xl border border-white/5 backdrop-blur-md">
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                        Chaveamento do Bolão
                    </p>
                    <h1 className="mt-1 text-2xl font-black tracking-tight">Mata-Mata</h1>
                </header>

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
            </div>
        );
    }

    return (
        <div className="space-y-7 px-4 md:px-[100px] pb-28 text-white">
            <header className="bg-white/3 p-5 rounded-3xl border border-white/5 backdrop-blur-md">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                            Chaveamento do Bolão
                        </p>
                        <h1 className="mt-1 text-2xl font-black tracking-tight">Mata-Mata</h1>
                    </div>
                    {bracketSalvo && (
                        <span className="bg-emerald-500 text-slate-950 text-[10px] px-3.5 py-1.5 rounded-full font-black uppercase tracking-wider shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                            🔒 Concluído
                        </span>
                    )}
                </div>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    Monte o seu chaveamento de forma reativa: selecione o placar e o time classificado na fase anterior para que ele avance automaticamente na árvore!
                </p>
            </header>

            {/* Abas Premium Deslizantes com Efeito de Vidro */}
            <div className="flex gap-2 overflow-x-auto py-1 scrollbar-none bg-slate-950/40 p-1.5 rounded-2xl border border-white/5 backdrop-blur">
                {[
                    { id: "16avos", label: "16avos" },
                    { id: "oitavas", label: "Oitavas" },
                    { id: "quartas", label: "Quartas" },
                    { id: "semis", label: "Semifinais" },
                    { id: "finais", label: "Finais" },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`rounded-xl px-4 py-2.5 text-xs font-black whitespace-nowrap transition-all ${
                            activeTab === tab.id
                                ? "bg-emerald-500 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                                : "text-slate-400 hover:text-white"
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Listagem de Jogos da Fase */}
            <section className="space-y-4">
                {getTabJogos().map(renderJogoCard)}
            </section>
        </div>
    );
}

export default MataMata;
