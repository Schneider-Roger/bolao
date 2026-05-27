import { useQuery } from "@tanstack/react-query";
import { api, BASE_URL } from "../lib/api";
import { useAuthStore } from "../stores/authStore";

interface RankingEntry {
    posicao: number;
    pontos_total: number;
    placares_exatos: number;
    acertos_resultado: number;
    nome: string;
    apelido: string;
    foto_perfil: string | null;
    setor: string;
}

function Avatar({ src, apelido, ranking, size = "md" }: { src: string | null; apelido: string; ranking?: number; size?: "sm" | "md" | "lg" }) {
    const isTop1 = ranking === 1;
    const isTop2 = ranking === 2;
    const isTop3 = ranking === 3;

    const ringClass = isTop1 
        ? "ring-2 ring-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.5)]" 
        : isTop2 
            ? "ring-2 ring-slate-300 shadow-[0_0_10px_rgba(203,213,225,0.4)]" 
            : isTop3 
                ? "ring-2 ring-amber-700 shadow-[0_0_10px_rgba(180,83,9,0.4)]" 
                : "ring-1 ring-white/10";

    const sizeClasses = {
        sm: "h-8 w-8 text-[10px]",
        md: "h-11 w-11 text-xs",
        lg: "h-20 w-20 text-2xl"
    };

    const containerSize = sizeClasses[size];

    const isValidSrc = src && src !== "null" && typeof src === "string" && src.trim() !== "";
    const imageSrc = isValidSrc 
        ? (src.startsWith('/uploads') ? `${BASE_URL}${src}` : `${BASE_URL}/uploads/${src}`)
        : "/default-avatar.png";
    return (
        <img
            src={imageSrc}
            alt={apelido}
            className={`${containerSize} rounded-full object-cover border-[3px] border-[#0b1727] ${ringClass}`}
        />
    );
}

function PodiumAvatar({ user, ranking }: { user: RankingEntry; ranking: number }) {
    const isTop1 = ranking === 1;
    const size = isTop1 ? "lg" : "md";
    const badgeColor = isTop1 ? "bg-yellow-400 text-black" : ranking === 2 ? "bg-slate-300 text-black" : "bg-amber-700 text-white";

    return (
        <div className={`flex flex-col items-center ${isTop1 ? "z-10 -mt-8" : "z-0 mt-4"}`}>
            <div className="relative">
                <Avatar src={user.foto_perfil} apelido={user.apelido} ranking={ranking} size={size} />
                <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 ${badgeColor} text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-[#0b1727]`}>
                    {ranking}º
                </div>
            </div>
            <div className={`mt-4 bg-[#1a2634] border border-white/5 rounded-xl px-4 py-3 flex flex-col items-center shadow-lg ${isTop1 ? "w-32" : "w-28"}`}>
                <span className="text-white font-bold text-sm truncate w-full text-center" title={user.apelido || user.nome}>{user.apelido || user.nome}</span>
                {user.setor && <span className="text-gray-400 text-[10px] truncate w-full text-center">{user.setor}</span>}
                <span className={`${isTop1 ? "text-yellow-400 font-black" : "text-gray-300 font-bold"} text-xs mt-1`}>{user.pontos_total} pts</span>
            </div>
        </div>
    );
}

function Ranking() {
    const { user } = useAuthStore();

    const { data, isLoading } = useQuery({
        queryKey: ["ranking"],
        queryFn: async () => {
            const res = await api.get("/ranking");
            return res.data as { top20: RankingEntry[]; ultimos4: RankingEntry[]; total: number };
        },
        refetchInterval: 60_000,
    });

    const { data: minha } = useQuery({
        queryKey: ["minha-posicao"],
        queryFn: async () => {
            const res = await api.get("/ranking/minha-posicao");
            return res.data;
        },
    });

    const top20 = data?.top20 ?? [];
    const ultimos4 = data?.ultimos4 ?? [];
    const total = data?.total ?? 0;

    const top1 = top20[0];
    const top2 = top20[1];
    const top3 = top20[2];
    const restanteTop20 = top20.slice(3);

    const estaNoTop20 = top20.some((u) => u.apelido === user?.apelido || u.nome === user?.nome);
    const estaNosUltimos4 = ultimos4.some((u) => u.apelido === user?.apelido || u.nome === user?.nome);
    const mostrarMinhaPosicaoIsolada = minha?.posicao && !estaNoTop20 && !estaNosUltimos4;

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-[#061423] text-white">
                <div className="text-center space-y-4">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#008237] border-t-transparent mx-auto"></div>
                    <p className="font-bold text-gray-400">Carregando classificação...</p>
                </div>
            </div>
        );
    }

    return (
        <main className="flex-grow w-full max-w-container-max mx-auto py-6 flex flex-col gap-6 px-4 md:px-[100px]">
            {/* Dark Card Container */}
            <div className="bg-[#0b1727] rounded-3xl p-6 shadow-xl border border-white/5 flex flex-col gap-8 min-h-[80vh]">
                
                {/* Header Section */}
                <div className="flex flex-col items-center gap-2 pt-2">
                    <h1 className="text-3xl font-bold text-white tracking-tight">Ranking Geral</h1>
                    <p className="text-gray-400 text-sm">Os melhores palpites do campeonato</p>
                </div>

                {/* Pódio Top 3 */}
                {(top1 || top2 || top3) && (
                    <div className="flex justify-center items-end gap-4 md:gap-8 my-6">
                        {top2 && <PodiumAvatar user={top2} ranking={2} />}
                        {top1 && <PodiumAvatar user={top1} ranking={1} />}
                        {top3 && <PodiumAvatar user={top3} ranking={3} />}
                    </div>
                )}

                {/* Tabela do Top 20 (Posições 4 a 20) */}
                {restanteTop20.length > 0 && (
                    <div className="flex flex-col bg-[#132030] rounded-2xl overflow-hidden border border-white/5">
                        <div className="flex px-4 py-3 border-b border-white/5 text-[10px] uppercase font-bold text-gray-400">
                            <div className="w-12 text-center">#</div>
                            <div className="flex-1">Participante</div>
                            <div className="w-16 text-right">Pontos</div>
                        </div>
                        <div className="flex flex-col">
                            {restanteTop20.map((u) => {
                                const isMe = u.apelido === user?.apelido || u.nome === user?.nome;
                                return (
                                    <div 
                                        key={u.posicao} 
                                        className={`flex items-center px-4 py-3 border-b border-white/5 last:border-none transition-colors
                                            ${isMe ? "bg-[#0a2e1d] border-l-4 border-l-green-500 pl-3" : "hover:bg-white/5 pl-4"}
                                        `}
                                    >
                                        <div className="w-12 text-center text-white font-bold text-sm">
                                            {u.posicao}
                                        </div>
                                        <div className="flex-1 flex items-center gap-3">
                                            <Avatar src={u.foto_perfil} apelido={u.apelido} size="sm" />
                                            <div className="flex flex-col">
                                                <span className="text-white font-bold text-sm flex items-center gap-2">
                                                    {isMe ? "Você" : (u.apelido || u.nome)}
                                                </span>
                                                {u.setor && <span className="text-gray-500 text-[10px]">{u.setor}</span>}
                                            </div>
                                        </div>
                                        <div className="w-16 text-right font-bold text-green-400 text-sm">
                                            {u.pontos_total}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {mostrarMinhaPosicaoIsolada && minha && (
                    <div className="flex items-center px-4 py-3 bg-[#0a2e1d] border-l-4 border-l-green-500 border-r border-y border-white/5 rounded-r-2xl pl-3 shadow-lg my-2">
                        <div className="w-12 text-center text-white font-bold text-sm">
                            {minha.posicao}
                        </div>
                        <div className="flex-1 flex items-center gap-3">
                            <Avatar src={user?.foto_perfil || null} apelido={user?.apelido || ""} size="sm" />
                            <div className="flex flex-col">
                                <span className="text-white font-bold text-sm">Você</span>
                                {(user?.setor) && <span className="text-gray-500 text-[10px]">{user?.setor}</span>}
                            </div>
                        </div>
                        <div className="w-16 text-right font-bold text-green-400 text-sm">
                            {minha.pontos_total}
                        </div>
                    </div>
                )}

                {/* Zika da Rodada */}
                {ultimos4.length > 0 && (
                    <div className="mt-4 flex flex-col gap-4">
                        <div className="flex items-center gap-2 text-red-400 font-bold">
                            <span className="material-symbols-outlined text-[18px]">warning</span>
                            Zika da Rodada
                        </div>
                        <div className="flex flex-col bg-[#132030] rounded-2xl overflow-hidden border border-white/5">
                            {ultimos4.map((u, index) => {
                                const isUltimo = index === ultimos4.length - 1;
                                const isMe = u.apelido === user?.apelido || u.nome === user?.nome;

                                return (
                                    <div 
                                        key={u.posicao} 
                                        className={`flex items-center px-4 py-4 border-b border-white/5 last:border-none transition-colors
                                            ${isUltimo ? "bg-[#330f14]" : "hover:bg-white/5"}
                                            ${isMe && !isUltimo ? "bg-[#0a2e1d] border-l-4 border-l-green-500 pl-3" : "pl-4"}
                                        `}
                                    >
                                        <div className="w-12 text-center text-gray-400 font-bold text-sm">
                                            {u.posicao}
                                        </div>
                                        <div className="flex-1 flex flex-col">
                                            <div className="flex items-center gap-2">
                                                <span className="text-white font-bold text-sm">{isMe ? "Você" : (u.apelido || u.nome)}</span>
                                                {isUltimo && (
                                                    <span className="bg-[#f06e6e] text-[#4a1010] text-[8px] font-black uppercase px-1.5 py-0.5 rounded-sm ml-1">Pé Frio</span>
                                                )}
                                            </div>
                                            {u.setor && <span className="text-gray-500 text-[10px] truncate">{u.setor}</span>}
                                            {isUltimo && (
                                                <span className="text-xs text-gray-400 mt-0.5">Não acertou nem o hino nacional</span>
                                            )}
                                        </div>
                                        <div className={`w-16 text-right font-bold text-sm ${isUltimo ? "text-red-400" : "text-gray-300"}`}>
                                            {u.pontos_total}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Premiação */}
                <div className="mt-6 flex flex-col gap-4">
                    <div className="flex items-center gap-2 text-yellow-500 font-bold">
                        <span className="material-symbols-outlined text-[18px]">emoji_events</span>
                        Premiação
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                        {/* 1º Lugar */}
                        <div className="bg-[#1a2634] rounded-xl p-4 border border-white/5 flex flex-col items-center text-center relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-yellow-400"></div>
                            <div className="w-7 h-7 rounded-full bg-yellow-400/20 text-yellow-400 flex items-center justify-center font-bold text-xs mb-3 border border-yellow-400/30">1º</div>
                            <h4 className="text-white font-bold text-xs mb-1">TV 50” 4K</h4>
                            <p className="text-gray-400 text-[9px] leading-relaxed">Smart TV de alta definição para acompanhar os melhores jogos.</p>
                        </div>
                        {/* 2º Lugar */}
                        <div className="bg-[#1a2634] rounded-xl p-4 border border-white/5 flex flex-col items-center text-center relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-slate-300"></div>
                            <div className="w-7 h-7 rounded-full bg-slate-300/20 text-slate-300 flex items-center justify-center font-bold text-xs mb-3 border border-slate-300/30">2º</div>
                            <h4 className="text-white font-bold text-xs mb-1">Boombox Polyvox</h4>
                            <p className="text-gray-400 text-[9px] leading-relaxed">Caixa de som potente de 140W com alta fidelidade sonora.</p>
                        </div>
                        {/* 3º Lugar */}
                        <div className="bg-[#1a2634] rounded-xl p-4 border border-white/5 flex flex-col items-center text-center relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-amber-700"></div>
                            <div className="w-7 h-7 rounded-full bg-amber-700/20 text-amber-700 flex items-center justify-center font-bold text-xs mb-3 border border-amber-700/30">3º</div>
                            <h4 className="text-white font-bold text-xs mb-1">Lava Jato Karcher</h4>
                            <p className="text-gray-400 text-[9px] leading-relaxed">Lavadora de alta pressão eficiente para limpeza e economia.</p>
                        </div>
                        {/* 4º Lugar */}
                        <div className="bg-[#1a2634] rounded-xl p-4 border border-white/5 flex flex-col items-center text-center relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></div>
                            <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs mb-3 border border-emerald-500/30">4º</div>
                            <h4 className="text-white font-bold text-xs mb-1">Panela Elétrica</h4>
                            <p className="text-gray-400 text-[9px] leading-relaxed">Panela elétrica multifuncional com super praticidade.</p>
                        </div>
                        {/* 5º Lugar */}
                        <div className="bg-[#1a2634] rounded-xl p-4 border border-white/5 flex flex-col items-center text-center relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></div>
                            <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs mb-3 border border-emerald-500/30">5º</div>
                            <h4 className="text-white font-bold text-xs mb-1">Panela Elétrica</h4>
                            <p className="text-gray-400 text-[9px] leading-relaxed">Panela elétrica multifuncional com super praticidade.</p>
                        </div>
                    </div>
                </div>

                {!isLoading && top20.length === 0 && (
                    <div className="text-center py-12">
                        <p className="text-gray-400">O ranking será atualizado após os primeiros jogos pontuados.</p>
                    </div>
                )}
            </div>
        </main>
    );
}

export default Ranking;