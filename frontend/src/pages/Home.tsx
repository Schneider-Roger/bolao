import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuthStore } from "../stores/authStore";

interface Jogo {
    id: number;
    fase: string;
    time_a: string;
    time_b: string;
    data: string;
    status: string;
    placar_a: number | null;
    placar_b: number | null;
    encerramento_palpite: string;
}

interface ResultadoRecente {
    jogo_id: number;
    time_a: string;
    time_b: string;
    placar_a: number;
    placar_b: number;
    pontos: number;
    acertou_placar: boolean;
    acertou_resultado: boolean;
}

interface EspeciaisData {
    success: boolean;
    palpiteEspecial: {
        campeao_palpite: string | null;
        vice_palpite: string | null;
        terceiro_palpite: string | null;
        quarto_palpite: string | null;
    } | null;
    expirado: boolean;
}

function formatarData(dataStr: string) {
    const d = new Date(dataStr);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) +
        " · " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function Home() {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const primeiroNome = user?.nome?.split(" ")[0] ?? user?.apelido ?? "Bem-vindo";

    // Minha posição no ranking
    const { data: minha } = useQuery({
        queryKey: ["minha-posicao"],
        queryFn: async () => {
            const res = await api.get("/ranking/minha-posicao");
            return res.data;
        },
    });

    // Próximos jogos abertos para palpite
    const { data: jogosData } = useQuery({
        queryKey: ["jogos"],
        queryFn: async () => {
            const res = await api.get("/jogos");
            return res.data.jogos as Jogo[];
        },
    });

    // Resultados recentes com meus pontos
    const { data: resultados } = useQuery({
        queryKey: ["meus-resultados"],
        queryFn: async () => {
            const res = await api.get("/jogos/meus-resultados");
            return res.data.resultados as ResultadoRecente[];
        },
    });

    // Palpites especiais
    const { data: especiais } = useQuery<EspeciaisData>({
        queryKey: ["palpites-especiais"],
        queryFn: async () => {
            const res = await api.get("/jogos/especiais");
            return res.data;
        },
    });

    const jogosAbertos = jogosData?.filter((j) =>
        j.status === "aberto" || j.status === "fecha_em_breve"
    ) ?? [];

    const pEspecial = especiais?.palpiteEspecial;
    const temPódio = pEspecial?.campeao_palpite && pEspecial?.vice_palpite && pEspecial?.terceiro_palpite && pEspecial?.quarto_palpite;

    return (
        <div className="space-y-7 px-4 md:px-[100px] pb-24 text-white">
            {/* Header com visual moderno e iniciais */}
            <header className="flex justify-between items-center bg-white/3 p-4 rounded-3xl border border-white/5 backdrop-blur-md">
                <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                        Copa do Mundo 2026
                    </p>
                    <h1 className="text-xl font-black tracking-tight">
                        Olá, {user?.apelido || primeiroNome}! 👋
                    </h1>
                </div>
                {user?.role === "ADMIN" ? (
                    <button
                        onClick={() => navigate("/admin")}
                        className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs px-4 py-2 rounded-xl transition-all shadow-[0_0_15px_rgba(245,158,11,0.3)] active:scale-95 shrink-0"
                    >
                        ⚙️ Admin
                    </button>
                ) : (
                    <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-slate-950 font-black text-sm shadow-lg">
                        {primeiroNome.slice(0, 2).toUpperCase()}
                    </div>
                )}
            </header>

            {/* Card de posição ultra premium (Glow + Gradient) */}
            <section className="rounded-[32px] bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 p-6 text-slate-950 shadow-2xl relative overflow-hidden glow-emerald">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                
                <p className="text-xs font-black uppercase tracking-wider opacity-80">Sua Posição Atual</p>
                <div className="mt-4 flex items-end justify-between">
                    <div>
                        <h2 className="text-6xl font-black tracking-tighter leading-none">
                            {minha?.posicao ? `#${minha.posicao}` : "–"}
                        </h2>
                        <p className="mt-2 text-xs font-black opacity-80 uppercase tracking-wide">Ranking Geral</p>
                        {minha?.placares_exatos > 0 && (
                            <p className="text-[10px] font-extrabold opacity-75 mt-1 bg-slate-950/10 px-2 py-0.5 rounded-full inline-block">
                                ⚽ {minha.placares_exatos} placares exatos
                            </p>
                        )}
                    </div>
                    <div className="text-right">
                        <h3 className="text-5xl font-black leading-none tracking-tight">{minha?.pontos_total ?? 0}</h3>
                        <p className="text-xs font-black opacity-80 uppercase tracking-wide">Pontos</p>
                    </div>
                </div>
            </section>

            {/* Card de Pódio Inteligente Glassmorphism */}
            <section className="rounded-3xl glass-panel p-5 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none"></div>
                
                {temPódio ? (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xs font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                                <span className="animate-pulse">🏆</span> Seu Pódio Oficial
                            </h2>
                            {!especiais?.expirado && (
                                <button
                                    onClick={() => navigate("/especiais")}
                                    className="text-xs font-bold text-slate-400 hover:text-white transition-colors"
                                >
                                    Alterar
                                </button>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                            <div className="bg-slate-950/40 p-3 rounded-2xl border border-white/5 flex items-center gap-2.5 shadow-md">
                                <span className="text-xl">🥇</span>
                                <div className="truncate">
                                    <p className="text-[9px] text-slate-500 font-black uppercase tracking-wider">Campeão</p>
                                    <p className="font-extrabold text-white text-xs truncate">{pEspecial.campeao_palpite}</p>
                                </div>
                            </div>
                            <div className="bg-slate-950/40 p-3 rounded-2xl border border-white/5 flex items-center gap-2.5 shadow-md">
                                <span className="text-xl">🥈</span>
                                <div className="truncate">
                                    <p className="text-[9px] text-slate-500 font-black uppercase tracking-wider">Vice</p>
                                    <p className="font-extrabold text-white text-xs truncate">{pEspecial.vice_palpite}</p>
                                </div>
                            </div>
                            <div className="bg-slate-950/40 p-3 rounded-2xl border border-white/5 flex items-center gap-2.5 shadow-md">
                                <span className="text-xl">🥉</span>
                                <div className="truncate">
                                    <p className="text-[9px] text-slate-500 font-black uppercase tracking-wider">3º Colocado</p>
                                    <p className="font-extrabold text-white text-xs truncate">{pEspecial.terceiro_palpite}</p>
                                </div>
                            </div>
                            <div className="bg-slate-950/40 p-3 rounded-2xl border border-white/5 flex items-center gap-2.5 shadow-md">
                                <span className="text-xl">🏅</span>
                                <div className="truncate">
                                    <p className="text-[9px] text-slate-500 font-black uppercase tracking-wider">4º Colocado</p>
                                    <p className="font-extrabold text-white text-xs truncate">{pEspecial.quarto_palpite}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <h2 className="text-xs font-black text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                                ⚠️ Pódio da Copa Pendente!
                            </h2>
                            <p className="text-xs text-slate-400 leading-relaxed">
                                Seus palpites de Campeão, Vice, 3º e 4º colocados não foram definidos! Eles servem de desempate e valem muitos pontos.
                            </p>
                        </div>
                        {!especiais?.expirado ? (
                            <button
                                onClick={() => navigate("/especiais")}
                                className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs py-3.5 rounded-2xl transition-all shadow-[0_0_20px_rgba(245,158,11,0.2)] active:scale-95 animate-pulse-subtle"
                            >
                                Definir Palpites de Pódio
                            </button>
                        ) : (
                            <p className="text-xs text-red-400 font-black">O prazo de preenchimento encerrou.</p>
                        )}
                    </div>
                )}
            </section>

            {/* Próximos jogos com visualização em lista elegante */}
            <section className="space-y-3.5">
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">Jogos Abertos</h2>
                    <button
                        onClick={() => navigate("/jogos")}
                        className="text-xs font-black text-emerald-400 tracking-wider hover:text-emerald-300"
                    >
                        Ver todos →
                    </button>
                </div>

                {jogosAbertos.length === 0 ? (
                    <div className="rounded-3xl glass-panel p-6 text-center border border-white/5">
                        <p className="text-slate-400 text-xs font-bold">Nenhum jogo aberto no momento.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {jogosAbertos.slice(0, 3).map((jogo) => (
                            <article
                                key={jogo.id}
                                className="rounded-3xl glass-panel p-4 shadow-lg flex items-center justify-between transition-all hover:border-white/10"
                            >
                                <div className="space-y-1.5 flex-1 min-w-0 pr-4">
                                    <div className="flex items-center gap-2">
                                        <span className="bg-white/10 text-[9px] px-2.5 py-0.5 rounded-full text-slate-300 font-black uppercase tracking-wider truncate">
                                            {jogo.fase}
                                        </span>
                                    </div>
                                    <h3 className="font-extrabold text-sm truncate text-white">
                                        {jogo.time_a} x {jogo.time_b}
                                    </h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                        {formatarData(jogo.data)}
                                    </p>
                                </div>

                                <button
                                    onClick={() => navigate('/jogos')}
                                    className={`
                                        rounded-2xl text-xs font-black px-4 py-3 shrink-0 transition-all active:scale-95 shadow-md
                                        ${jogo.status === "fecha_em_breve"
                                            ? "bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.25)]"
                                            : "bg-yellow-400 text-slate-950 hover:bg-yellow-300 shadow-[0_0_15px_rgba(250,204,21,0.25)]"
                                        }
                                    `}
                                >
                                    {jogo.status === "fecha_em_breve" ? "⏰ Urgente" : "Palpitar"}
                                </button>
                            </article>
                        ))}
                    </div>
                )}
            </section>

            {/* Resultados recentes integrados com status premium */}
            <section className="space-y-3.5">
                <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">Seus Resultados Recentes</h2>

                <div className="space-y-3">
                    {resultados?.slice(0, 3).map((r, i) => (
                        <article
                            key={i}
                            className="rounded-3xl glass-panel p-4 flex items-center justify-between shadow-lg transition-all hover:border-white/10"
                        >
                            <div className="min-w-0 pr-4 space-y-1">
                                <h3 className="font-extrabold text-sm truncate text-white">
                                    {r.time_a} {r.placar_a} x {r.placar_b} {r.time_b}
                                </h3>
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">
                                    {r.acertou_placar ? "⚽ Placar Exato" : r.acertou_resultado ? "Resultado Correto" : "Errou o palpite"}
                                </p>
                            </div>
                            <div className={`rounded-2xl px-4 py-2 font-black text-xs shrink-0 shadow-md ${
                                r.pontos === 5 
                                    ? "bg-emerald-500 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.2)]" 
                                    : r.pontos === 2 
                                        ? "bg-yellow-400 text-slate-950 shadow-[0_0_15px_rgba(250,204,21,0.2)]" 
                                        : "bg-slate-800 text-slate-400"
                            }`}>
                                +{r.pontos} pts
                            </div>
                        </article>
                    ))}

                    {(!resultados || resultados.length === 0) && (
                        <div className="rounded-3xl glass-panel p-6 text-center text-xs text-slate-500 font-bold border border-white/5">
                            Nenhum resultado processado ainda.
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}

export default Home;