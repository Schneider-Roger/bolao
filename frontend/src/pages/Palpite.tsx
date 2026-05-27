import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { getBandeiraUrl } from "../utils/bandeiras";

function Palpite() {
    const { jogoId } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [palpiteA, setPalpiteA] = useState<string>("");
    const [palpiteB, setPalpiteB] = useState<string>("");
    const [classificado, setClassificado] = useState<string | null>(null);

    const { data, isLoading } = useQuery({
        queryKey: ["jogo", jogoId],
        queryFn: async () => {
            const response = await api.get(`/jogos/${jogoId}`);
            return response.data;
        }
    });

    useEffect(() => {
        if (data?.palpite) {
            setPalpiteA(data.palpite.palpite_a?.toString() || "");
            setPalpiteB(data.palpite.palpite_b?.toString() || "");
            setClassificado(data.palpite.time_classificado_palpite || null);
        }
    }, [data]);

    const palpiteMutation = useMutation({
        mutationFn: async () => {
            const payload = {
                palpite_a: parseInt(palpiteA),
                palpite_b: parseInt(palpiteB),
                classificado: classificado
            };
            const response = await api.post(`/jogos/${jogoId}/palpite`, payload);
            return response.data;
        },
        onSuccess: () => {
            alert("Palpite salvo com sucesso!");
            queryClient.invalidateQueries({ queryKey: ["jogos"] });
            queryClient.invalidateQueries({ queryKey: ["jogo", jogoId] });
            navigate("/jogos");
        },
        onError: (error: any) => {
            alert(error.response?.data?.error || "Erro ao salvar palpite");
        }
    });

    if (isLoading) {
        return <div className="p-4 text-center text-emerald-400 font-bold">Carregando detalhes do jogo...</div>;
    }

    if (!data?.jogo) {
        return <div className="p-4 text-center text-red-400 font-bold">Jogo não encontrado.</div>;
    }

    const { jogo, bracketSalvo } = data;
    const isFaseGrupos = jogo.fase.includes("Grupo");
    const isFechado = jogo.status !== "aberto" && jogo.status !== "fecha_em_breve";
    const classificadoDisabled = isFechado || (!isFaseGrupos && bracketSalvo);

    const handleSalvar = () => {
        if (palpiteA === "" || palpiteB === "") {
            alert("Preencha o placar dos dois times.");
            return;
        }
        if (!isFaseGrupos && palpiteA === palpiteB && !classificado) {
            alert("Em caso de empate no placar, você precisa escolher qual time vai se classificar nos pênaltis.");
            return;
        }
        palpiteMutation.mutate();
    };

    const d = new Date(jogo.data_hora);
    const dataFormatada = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) + ' • ' + 
                          d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    return (
        <div className="space-y-6 px-4 md:px-[100px] text-white">
            <header>
                <p className="text-sm font-semibold uppercase tracking-widest text-emerald-400">
                    Fazer Palpite
                </p>

                <h1 className="mt-1 text-3xl font-black">
                    {jogo.time_a} x {jogo.time_b}
                </h1>

                <p className="mt-2 text-sm text-slate-400">
                    {jogo.fase} • {dataFormatada}
                </p>
            </header>

            <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lg backdrop-blur-sm">
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                    <div className="flex flex-col items-center">
                        <img 
                            src={getBandeiraUrl(jogo.time_a)} 
                            alt={jogo.time_a}
                            className="w-12 h-12 mb-3 rounded-full object-cover border-2 border-white/10 shadow-md"
                        />
                        <label className="mb-2 block text-center text-sm font-bold">
                            {jogo.time_a}
                        </label>

                        <input
                            type="number"
                            min="0"
                            placeholder="0"
                            disabled={isFechado}
                            value={palpiteA}
                            onChange={(e) => setPalpiteA(e.target.value)}
                            className="
                                w-full max-w-[100px]
                                rounded-2xl border border-white/10
                                bg-slate-900 py-4
                                text-center text-3xl font-black text-white
                                outline-none transition-colors
                                focus:border-emerald-400 disabled:opacity-50
                            "
                        />
                    </div>

                    <div className="pt-10 text-center text-xl font-black text-slate-500">
                        X
                    </div>

                    <div className="flex flex-col items-center">
                        <img 
                            src={getBandeiraUrl(jogo.time_b)} 
                            alt={jogo.time_b}
                            className="w-12 h-12 mb-3 rounded-full object-cover border-2 border-white/10 shadow-md"
                        />
                        <label className="mb-2 block text-center text-sm font-bold">
                            {jogo.time_b}
                        </label>

                        <input
                            type="number"
                            min="0"
                            placeholder="0"
                            disabled={isFechado}
                            value={palpiteB}
                            onChange={(e) => setPalpiteB(e.target.value)}
                            className="
                                w-full max-w-[100px]
                                rounded-2xl border border-white/10
                                bg-slate-900 py-4
                                text-center text-3xl font-black text-white
                                outline-none transition-colors
                                focus:border-emerald-400 disabled:opacity-50
                            "
                        />
                    </div>
                </div>
            </section>

            {!isFaseGrupos && (
                <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lg backdrop-blur-sm">
                    <h2 className="text-lg font-bold text-white">
                        Time Classificado
                    </h2>

                    <p className="mt-2 text-sm text-slate-400">
                        {bracketSalvo 
                            ? "🔒 Suas seleções de times classificados no bracket de mata-mata já foram consolidadas."
                            : "Obrigatório em caso de empate (quem passa nos pênaltis?)."
                        }
                    </p>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                        <button
                            onClick={() => setClassificado(jogo.time_a)}
                            disabled={classificadoDisabled}
                            className={`
                                rounded-2xl border px-4 py-4 font-bold transition-all disabled:opacity-50
                                ${classificado === jogo.time_a
                                    ? "border-emerald-400 bg-emerald-500/20 text-emerald-400"
                                    : "border-white/10 bg-white/5 text-white hover:bg-white/10"
                                }
                            `}
                        >
                            {jogo.time_a}
                        </button>

                        <button
                            onClick={() => setClassificado(jogo.time_b)}
                            disabled={classificadoDisabled}
                            className={`
                                rounded-2xl border px-4 py-4 font-bold transition-all disabled:opacity-50
                                ${classificado === jogo.time_b
                                    ? "border-emerald-400 bg-emerald-500/20 text-emerald-400"
                                    : "border-white/10 bg-white/5 text-white hover:bg-white/10"
                                }
                            `}
                        >
                            {jogo.time_b}
                        </button>
                    </div>
                </section>
            )}

            <section className="rounded-3xl bg-yellow-500/10 p-4 border border-yellow-500/20">
                <p className="text-sm leading-6 text-yellow-200">
                    {isFechado 
                        ? "O tempo para palpitar neste jogo já esgotou. Agora é só torcer!" 
                        : "Os palpites encerram automaticamente 1 hora antes do início da partida."
                    }
                </p>
            </section>

            {!isFechado && (
                <button
                    onClick={handleSalvar}
                    disabled={palpiteMutation.isPending}
                    className="
                        w-full rounded-3xl bg-emerald-500 px-4 py-4 text-lg font-black text-slate-950
                        transition-all hover:scale-[1.02] active:scale-95 shadow-[0_0_20px_rgba(16,185,129,0.3)]
                        disabled:opacity-50 disabled:cursor-not-allowed
                    "
                >
                    {palpiteMutation.isPending ? "Salvando..." : "Salvar Palpite"}
                </button>
            )}
        </div>
    );
}

export default Palpite;