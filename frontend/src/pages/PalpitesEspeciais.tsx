import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";

const selecoesParticipantes = [
    "África do Sul", "Alemanha", "Arábia Saudita", "Argélia", "Argentina", "Austrália", 
    "Áustria", "Bélgica", "Bósnia & Herzegovina", "Brasil", "Cabo Verde", "Canadá", 
    "Colômbia", "Congo", "Coreia do Sul", "Costa do Marfim", "Croácia", "Curaçao", 
    "Egito", "Equador", "Escócia", "Espanha", "Estados Unidos", "França", "Gana", 
    "Haiti", "Holanda", "Inglaterra", "Irã", "Iraque", "Japão", "Jordânia", 
    "Marrocos", "México", "Noruega", "Nova Zelândia", "Panamá", "Paraguai", 
    "Portugal", "Qatar", "Senegal", "Suécia", "Suíça", "Tchéquia", "Tunísia", 
    "Turquia", "Uruguai", "Uzbequistão"
].sort((a, b) => a.localeCompare(b));

interface PalpitesEspeciaisData {
    success: boolean;
    palpiteEspecial: {
        campeao_palpite: string | null;
        vice_palpite: string | null;
        terceiro_palpite: string | null;
        quarto_palpite: string | null;
    } | null;
    expirado: boolean;
}

function PalpitesEspeciais() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [campeao, setCampeao] = useState<string>("");
    const [vice, setVice] = useState<string>("");
    const [terceiro, setTerceiro] = useState<string>("");
    const [quarto, setQuarto] = useState<string>("");

    const { data, isLoading } = useQuery<PalpitesEspeciaisData>({
        queryKey: ["palpites-especiais"],
        queryFn: async () => {
            const res = await api.get("/jogos/especiais");
            return res.data;
        }
    });

    useEffect(() => {
        if (data?.palpiteEspecial) {
            setCampeao(data.palpiteEspecial.campeao_palpite || "");
            setVice(data.palpiteEspecial.vice_palpite || "");
            setTerceiro(data.palpiteEspecial.terceiro_palpite || "");
            setQuarto(data.palpiteEspecial.quarto_palpite || "");
        }
    }, [data]);

    const mutation = useMutation({
        mutationFn: async (payload: { campeao: string; vice: string; terceiro: string; quarto: string }) => {
            return await api.post("/jogos/especiais", payload);
        },
        onSuccess: () => {
            alert("Seus palpites de pódio foram salvos com sucesso!");
            queryClient.invalidateQueries({ queryKey: ["palpites-especiais"] });
            navigate("/home");
        },
        onError: (err: any) => {
            alert(err.response?.data?.error || "Erro ao salvar palpites de pódio");
        }
    });

    const handleSalvar = () => {
        if (!campeao || !vice || !terceiro || !quarto) {
            alert("Por favor, selecione as 4 posições do pódio!");
            return;
        }

        // Valida seleções duplicadas
        const podio = [campeao, vice, terceiro, quarto];
        const unicos = new Set(podio);
        if (unicos.size !== 4) {
            alert("Você não pode selecionar a mesma seleção para posições diferentes do pódio!");
            return;
        }

        mutation.mutate({ campeao, vice, terceiro, quarto });
    };

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center text-white bg-slate-950">
                <div className="text-center space-y-4">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent mx-auto"></div>
                    <p className="font-bold text-slate-400">Carregando palpites especiais...</p>
                </div>
            </div>
        );
    }

    const expirado = data?.expirado || false;

    return (
        <div className="space-y-6 px-4 md:px-[100px] text-white">
            <header className="space-y-2">
                <p className="text-sm font-semibold uppercase tracking-widest text-emerald-400">
                    Palpites Especiais
                </p>
                <h1 className="text-3xl font-black">Pódio da Copa</h1>
                <p className="text-sm text-slate-400">
                    Defina quem será o Campeão, Vice, 3º e 4º colocados da Copa do Mundo 2026. Estes palpites valem pontos extras cruciais e são o principal critério de desempate no ranking geral!
                </p>
            </header>

            {expirado && (
                <div className="rounded-3xl bg-red-500/10 p-5 border border-red-500/20 text-sm leading-6 text-red-200">
                    ⚠️ A Copa do Mundo 2026 já começou! Os palpites de pódio estão congelados de forma definitiva.
                </div>
            )}

            <section className="space-y-5 rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur-sm">
                {/* 1º Lugar */}
                <div className="space-y-2">
                    <label className="block text-sm font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
                        🏆 1º Lugar (Campeão — 10 pts)
                    </label>
                    <select
                        value={campeao}
                        disabled={expirado}
                        onChange={(e) => setCampeao(e.target.value)}
                        className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-4 text-white outline-none focus:border-emerald-400 disabled:opacity-50"
                    >
                        <option value="">Selecione o Campeão...</option>
                        {selecoesParticipantes.map((s) => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                </div>

                {/* 2º Lugar */}
                <div className="space-y-2">
                    <label className="block text-sm font-black text-slate-300 uppercase tracking-wider flex items-center gap-2">
                        🥈 2º Lugar (Vice-campeão — 8 pts)
                    </label>
                    <select
                        value={vice}
                        disabled={expirado}
                        onChange={(e) => setVice(e.target.value)}
                        className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-4 text-white outline-none focus:border-emerald-400 disabled:opacity-50"
                    >
                        <option value="">Selecione o Vice...</option>
                        {selecoesParticipantes.map((s) => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                </div>

                {/* 3º Lugar */}
                <div className="space-y-2">
                    <label className="block text-sm font-black text-amber-700 uppercase tracking-wider flex items-center gap-2">
                        🥉 3º Lugar (3º Colocado — 5 pts)
                    </label>
                    <select
                        value={terceiro}
                        disabled={expirado}
                        onChange={(e) => setTerceiro(e.target.value)}
                        className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-4 text-white outline-none focus:border-emerald-400 disabled:opacity-50"
                    >
                        <option value="">Selecione o 3º colocado...</option>
                        {selecoesParticipantes.map((s) => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                </div>

                {/* 4º Lugar */}
                <div className="space-y-2">
                    <label className="block text-sm font-black text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                        🏅 4º Lugar (4º Colocado — 3 pts)
                    </label>
                    <select
                        value={quarto}
                        disabled={expirado}
                        onChange={(e) => setQuarto(e.target.value)}
                        className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-4 text-white outline-none focus:border-emerald-400 disabled:opacity-50"
                    >
                        <option value="">Selecione o 4º colocado...</option>
                        {selecoesParticipantes.map((s) => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                </div>
            </section>

            {!expirado && (
                <button
                    onClick={handleSalvar}
                    disabled={mutation.isPending}
                    className="w-full rounded-3xl bg-emerald-500 hover:bg-emerald-400 px-4 py-4 text-lg font-black text-slate-950 shadow-2xl transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                >
                    {mutation.isPending ? "Salvando..." : "Salvar Pódio"}
                </button>
            )}
        </div>
    );
}

export default PalpitesEspeciais;
