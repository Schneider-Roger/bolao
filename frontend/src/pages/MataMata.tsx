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
}

interface BracketData {
    success: boolean;
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
                initial[p.jogo_id] = { ...p };
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
                    };
                }
            });

            setBracketPalpites(initial);
        }
    }, [data]);

    const mutation = useMutation({
        mutationFn: async (payload: Palpite[]) => {
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

    const { jogos, bracketSalvo } = data;

    const jogos16 = jogos.slice(0, 16);
    const oitavas = jogos.slice(16, 24);
    const quartas = jogos.slice(24, 28);
    const semis = jogos.slice(28, 30);
    const terceiroLugar = jogos.slice(30, 31);
    const finalJogo = jogos.slice(31, 32);

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

        const feed16toOitavas = [
            { oitavasId: 89, timeAFrom: 73, timeBFrom: 74 },
            { oitavasId: 90, timeAFrom: 75, timeBFrom: 76 },
            { oitavasId: 91, timeAFrom: 77, timeBFrom: 78 },
            { oitavasId: 92, timeAFrom: 79, timeBFrom: 80 },
            { oitavasId: 93, timeAFrom: 81, timeBFrom: 82 },
            { oitavasId: 94, timeAFrom: 83, timeBFrom: 84 },
            { oitavasId: 95, timeAFrom: 85, timeBFrom: 86 },
            { oitavasId: 96, timeAFrom: 87, timeBFrom: 88 },
        ];

        feed16toOitavas.forEach(({ oitavasId, timeAFrom, timeBFrom }) => {
            if (updated[oitavasId]) {
                updated[oitavasId]!.confronto_time_a = getVencedor(timeAFrom) || "A Definir";
                updated[oitavasId]!.confronto_time_b = getVencedor(timeBFrom) || "A Definir";
            }
        });

        const feedOitavasToQuartas = [
            { quartasId: 97, timeAFrom: 89, timeBFrom: 90 },
            { quartasId: 98, timeAFrom: 91, timeBFrom: 92 },
            { quartasId: 99, timeAFrom: 93, timeBFrom: 94 },
            { quartasId: 100, timeAFrom: 95, timeBFrom: 96 },
        ];

        feedOitavasToQuartas.forEach(({ quartasId, timeAFrom, timeBFrom }) => {
            if (updated[quartasId]) {
                updated[quartasId]!.confronto_time_a = getVencedor(timeAFrom) || "A Definir";
                updated[quartasId]!.confronto_time_b = getVencedor(timeBFrom) || "A Definir";
            }
        });

        const feedQuartasToSemis = [
            { semisId: 101, timeAFrom: 97, timeBFrom: 98 },
            { semisId: 102, timeAFrom: 99, timeBFrom: 100 },
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

    const handlePlacarChange = (jogoId: number, lado: 'a' | 'b', val: string) => {
        if (bracketSalvo) return;

        setBracketPalpites((prev) => {
            const next = { ...prev };
            const num = val === "" ? null : parseInt(val);

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

    const handleSelectClassificado = (jogoId: number, time: string) => {
        if (bracketSalvo) return;

        setBracketPalpites((prev) => {
            const next = { ...prev };
            if (next[jogoId]) {
                next[jogoId]!.time_classificado_palpite = time;
            }
            return atualizarConfrontosProximos(next);
        });
    };

    const handleSave = () => {
        const payload: Palpite[] = [];
        let valid = true;

        Object.values(bracketPalpites).forEach((p) => {
            if (p.palpite_a === null || p.palpite_b === null) {
                valid = false;
            }
            if (p.palpite_a === p.palpite_b && !p.time_classificado_palpite) {
                valid = false;
            }
            payload.push(p);
        });

        if (!valid) {
            alert("Por favor, preencha todos os placares e selecione o classificado em caso de empate antes de salvar seu bracket.");
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

        const timeA = bracketSalvo ? (jogo.time_a !== "A Definir" ? jogo.time_a : palpite.confronto_time_a) : palpite.confronto_time_a;
        const timeB = bracketSalvo ? (jogo.time_b !== "A Definir" ? jogo.time_b : palpite.confronto_time_b) : palpite.confronto_time_b;

        const isEmpate = palpite.palpite_a !== null && palpite.palpite_b !== null && Number(palpite.palpite_a) === Number(palpite.palpite_b);

        return (
            <article key={jogo.id} className="rounded-3xl glass-panel p-5 space-y-4 shadow-xl border border-white/5 relative overflow-hidden transition-all hover:border-white/10">
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-slate-400">
                    <span className="bg-white/5 px-2.5 py-0.5 rounded-full border border-white/5">{jogo.fase}</span>
                    <span>{new Date(jogo.data).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</span>
                </div>

                <div className="flex items-center justify-between gap-3 pt-2">
                    {/* Time A */}
                    <div className="flex-1 text-center space-y-2.5 min-w-0">
                        <div className="font-extrabold text-xs sm:text-sm truncate text-white">{timeA || "A Definir"}</div>
                        {isEmpate && !bracketSalvo && (
                            <button
                                onClick={() => handleSelectClassificado(jogo.id, timeA || "")}
                                className={`text-[9px] px-2.5 py-1 rounded-xl font-black uppercase transition-all shadow-sm ${
                                    palpite.time_classificado_palpite === timeA
                                        ? "bg-emerald-500 text-slate-950 font-black shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                                        : "bg-white/5 text-slate-400 border border-white/5 hover:bg-white/10"
                                }`}
                            >
                                Avança
                            </button>
                        )}
                        {isEmpate && bracketSalvo && palpite.time_classificado_palpite === timeA && (
                            <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-xl border border-emerald-500/10 font-black uppercase">
                                Avança
                            </span>
                        )}
                    </div>

                    {/* Inputs de placar holográficos */}
                    <div className="flex items-center gap-1.5 shrink-0 px-2.5 py-1 bg-slate-950/40 rounded-2xl border border-white/5 shadow-inner">
                        <input
                            type="number"
                            min="0"
                            placeholder="-"
                            value={palpite.palpite_a !== null ? palpite.palpite_a : ""}
                            onChange={(e) => handlePlacarChange(jogo.id, 'a', e.target.value)}
                            disabled={bracketSalvo}
                            className="w-10 h-10 rounded-xl bg-slate-900 text-center text-lg font-black text-white outline-none border border-white/5 focus:border-emerald-500 disabled:opacity-50"
                        />
                        <span className="text-slate-600 font-black text-xs">×</span>
                        <input
                            type="number"
                            min="0"
                            placeholder="-"
                            value={palpite.palpite_b !== null ? palpite.palpite_b : ""}
                            onChange={(e) => handlePlacarChange(jogo.id, 'b', e.target.value)}
                            disabled={bracketSalvo}
                            className="w-10 h-10 rounded-xl bg-slate-900 text-center text-lg font-black text-white outline-none border border-white/5 focus:border-emerald-500 disabled:opacity-50"
                        />
                    </div>

                    {/* Time B */}
                    <div className="flex-1 text-center space-y-2.5 min-w-0">
                        <div className="font-extrabold text-xs sm:text-sm truncate text-white">{timeB || "A Definir"}</div>
                        {isEmpate && !bracketSalvo && (
                            <button
                                onClick={() => handleSelectClassificado(jogo.id, timeB || "")}
                                className={`text-[9px] px-2.5 py-1 rounded-xl font-black uppercase transition-all shadow-sm ${
                                    palpite.time_classificado_palpite === timeB
                                        ? "bg-emerald-500 text-slate-950 font-black shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                                        : "bg-white/5 text-slate-400 border border-white/5 hover:bg-white/10"
                                }`}
                            >
                                Avança
                            </button>
                        )}
                        {isEmpate && bracketSalvo && palpite.time_classificado_palpite === timeB && (
                            <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-xl border border-emerald-500/10 font-black uppercase">
                                Avança
                            </span>
                        )}
                    </div>
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
                    {bracketSalvo 
                        ? "Suas seleções de times classificados foram salvas e consolidadas. Você pode continuar atualizando apenas os placares individuais nas respectivas chaves até 1h antes do jogo." 
                        : "Monte o seu chaveamento de forma reativa: selecione o placar e o time classificado na fase anterior para que ele avance automaticamente na árvore!"}
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

            {/* Alerta de Envio Fixo Elegante */}
            {!bracketSalvo && (
                <div className="fixed bottom-20 left-1/2 -translate-x-1/2 w-full max-w-md p-4 bg-slate-950/90 backdrop-blur-lg border-t border-white/10 flex justify-between items-center gap-4 shadow-2xl z-50">
                    <div className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider leading-relaxed max-w-[180px]">
                        Preencha todas as abas até a final para poder enviar.
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={mutation.isPending}
                        className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs px-5 py-3.5 rounded-2xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] active:scale-95 disabled:opacity-50 shrink-0"
                    >
                        {mutation.isPending ? "Salvando..." : "Salvar Chaveamento"}
                    </button>
                </div>
            )}
        </div>
    );
}

export default MataMata;
