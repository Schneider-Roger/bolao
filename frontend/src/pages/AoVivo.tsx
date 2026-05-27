import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { getBandeiraUrl } from "../utils/bandeiras";

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
}

interface ResultadoRecente {
    jogo_id: number;
    time_a: string;
    time_b: string;
    placar_a: number;
    placar_b: number;
    pontos: number;
    data?: string;
}

function calcularTempo(dataJogoStr: string): string {
    const dataJogo = new Date(dataJogoStr);
    const agora = new Date();
    const diffMinutos = Math.floor((agora.getTime() - dataJogo.getTime()) / 60000);

    if (diffMinutos < 0) {
        // Ainda não começou, retorna o horário HH:mm
        return dataJogo.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    }

    if (diffMinutos > 120) {
        return "Fim";
    }

    // Simulação básica de tempo corrido (descontando 15min de intervalo caso passe de 45)
    if (diffMinutos <= 45) {
        return `${diffMinutos}'`;
    } else if (diffMinutos > 45 && diffMinutos <= 60) {
        return "Intervalo";
    } else {
        const segundoTempo = diffMinutos - 15;
        return `${segundoTempo > 90 ? '90+' : segundoTempo}'`;
    }
}

function AoVivo() {
    const navigate = useNavigate();
    const [currentTime, setCurrentTime] = useState(new Date());

    // Atualiza o relógio a cada minuto para re-renderizar o cronômetro
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(new Date());
        }, 60000);
        return () => clearInterval(interval);
    }, []);

    const { data: jogosData, isLoading: isLoadingJogos } = useQuery<Jogo[]>({
        queryKey: ["jogos"],
        queryFn: async () => {
            const response = await api.get("/jogos");
            return response.data.jogos;
        },
        refetchInterval: 60000 // atualiza a cada minuto
    });

    const { data: resultadosData, isLoading: isLoadingResultados } = useQuery<ResultadoRecente[]>({
        queryKey: ["meus-resultados"],
        queryFn: async () => {
            const response = await api.get("/jogos/meus-resultados");
            return response.data.resultados;
        }
    });

    // Pegar jogos ativos (que não estão encerrados)
    // Para efeito visual, vamos ordenar pelos jogos mais próximos ou em andamento
    // FILTRO: Apenas jogos de HOJE
    const hojeStr = new Date().toDateString();

    const jogosAoVivo = (jogosData || [])
        .filter(j => j.status !== "encerrado" && j.status !== "pontuado" && new Date(j.data).toDateString() === hojeStr)
        .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime()); // Removemos o slice(0, 5) para mostrar todos os do dia

    const resultadosRecentes = (resultadosData || [])
        .filter(r => r.data && new Date(r.data).toDateString() === hojeStr);

    return (
        <main className="flex-grow w-full max-w-container-max mx-auto py-6 flex flex-col gap-6 px-4 md:px-[100px]">
            {/* Card Principal */}
            <div className="bg-[#0b1727] rounded-3xl p-6 md:p-8 shadow-xl border border-white/5 flex flex-col gap-8 min-h-[80vh]">
                
                <h1 className="text-center font-black text-xl text-white tracking-widest uppercase">
                    BOLÃO 2026
                </h1>

                {/* Seção AO VIVO */}
                <div className="flex flex-col gap-4">
                    <div className="flex justify-center items-center px-1">
                        <div className="flex items-center gap-2 text-green-500 font-black text-sm uppercase tracking-wider">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            Ao Vivo
                        </div>
                    </div>

                    {isLoadingJogos ? (
                        <div className="text-center text-gray-400 py-10">Buscando jogos...</div>
                    ) : jogosAoVivo.length === 0 ? (
                        <div className="text-center text-gray-400 py-10 bg-[#132030] rounded-2xl border border-white/5">
                            Nenhum jogo previsto para hoje.
                        </div>
                    ) : (
                        <div className="flex gap-4 overflow-x-auto pb-4 pt-1 snap-x no-scrollbar">
                            {jogosAoVivo.map(jogo => {
                                const dataObj = new Date(jogo.data);
                                const isJogando = currentTime.getTime() >= dataObj.getTime();
                                const tempoExibicao = calcularTempo(jogo.data);

                                // Se não tem placar real rolando, mostra 0x0 se já começou, ou nada se não.
                                // Na vida real, seria o placar dinâmico da API GE.
                                const placarA = isJogando ? (jogo.placar_a || 0) : "-";
                                const placarB = isJogando ? (jogo.placar_b || 0) : "-";

                                return (
                                    <div 
                                        key={jogo.id} 
                                        className="snap-start shrink-0 w-[300px] md:w-[320px] bg-[#132030] rounded-2xl p-5 border border-white/5 flex flex-col gap-4 relative shadow-lg"
                                    >
                                        <div className="flex justify-between items-center text-[10px] uppercase font-bold text-gray-400">
                                            <span className={`px-2 py-0.5 rounded-full ${isJogando ? "bg-green-500/20 text-green-400" : "bg-white/10 text-gray-300"}`}>
                                                {tempoExibicao}
                                            </span>
                                            <span>{jogo.fase}</span>
                                        </div>

                                        <div className="flex justify-between items-center mt-2">
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="w-10 h-10 rounded-full border-2 border-[#1a2634] overflow-hidden shadow-lg">
                                                    <img src={getBandeiraUrl(jogo.time_a)} alt={jogo.time_a} className="w-full h-full object-cover" />
                                                </div>
                                                <span className="text-white font-bold text-sm">{jogo.time_a.substring(0,3).toUpperCase()}</span>
                                            </div>

                                            <div className="flex-1 flex justify-center text-white font-black text-2xl">
                                                {placarA} - {placarB}
                                            </div>

                                            <div className="flex flex-col items-center gap-2">
                                                <div className="w-10 h-10 rounded-full border-2 border-[#1a2634] overflow-hidden shadow-lg">
                                                    <img src={getBandeiraUrl(jogo.time_b)} alt={jogo.time_b} className="w-full h-full object-cover" />
                                                </div>
                                                <span className="text-white font-bold text-sm">{jogo.time_b.substring(0,3).toUpperCase()}</span>
                                            </div>
                                        </div>

                                        <div className="mt-2 text-center w-full">
                                            {jogo.palpite_a !== null && jogo.palpite_b !== null ? (
                                                <div className="text-xs font-bold text-gray-400">
                                                    Seu Palpite: {jogo.palpite_a} - {jogo.palpite_b}
                                                </div>
                                            ) : (
                                                <button 
                                                    onClick={() => navigate('/jogos')}
                                                    className="w-full py-2 border border-yellow-500/50 text-yellow-500 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-yellow-500/10 transition-colors"
                                                >
                                                    Acompanhar / Palpitar
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Seção Resultados Recentes */}
                <div className="flex flex-col gap-4 mt-4">
                    <h2 className="text-white font-bold text-sm tracking-wide text-center">Resultados Recentes</h2>

                    {isLoadingResultados ? (
                        <div className="text-center text-gray-400 py-6">Carregando resultados...</div>
                    ) : resultadosRecentes.length === 0 ? (
                        <div className="text-center text-gray-400 py-6 bg-[#132030] rounded-xl border border-white/5">
                            Nenhum jogo encerrado hoje.
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            {resultadosRecentes.map((res, index) => (
                                <div key={index} className="flex items-center justify-between py-4 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors px-2 rounded-lg">
                                    <div className="flex items-center gap-3 w-[100px]">
                                        <div className="w-6 h-6 rounded-full overflow-hidden shadow-sm">
                                            <img src={getBandeiraUrl(res.time_a)} alt={res.time_a} className="w-full h-full object-cover" />
                                        </div>
                                        <span className="text-gray-300 font-bold text-sm truncate">{res.time_a}</span>
                                    </div>

                                    <div className="flex flex-col items-center px-4">
                                        <div className="text-white font-black text-xl tracking-widest bg-[#132030] px-4 py-1 rounded-lg border border-white/5">
                                            {res.placar_a} <span className="text-gray-500 mx-1 text-sm font-normal">X</span> {res.placar_b}
                                        </div>
                                        <span className="text-[9px] text-gray-500 font-bold uppercase mt-1">Encerrado</span>
                                    </div>

                                    <div className="flex items-center gap-3 w-[100px] justify-end">
                                        <span className="text-gray-300 font-bold text-sm truncate text-right">{res.time_b}</span>
                                        <div className="w-6 h-6 rounded-full overflow-hidden shadow-sm">
                                            <img src={getBandeiraUrl(res.time_b)} alt={res.time_b} className="w-full h-full object-cover" />
                                        </div>
                                    </div>
                                </div>
                            ))}

                            <div className="w-full text-center mt-4 pt-2">
                                <button 
                                    className="text-gray-400 text-xs font-bold uppercase tracking-wider hover:text-white flex items-center gap-1 mx-auto"
                                    onClick={() => navigate('/jogos')}
                                >
                                    Carregar mais <span className="material-symbols-outlined text-[14px]">expand_more</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </main>
    );
}

export default AoVivo;
