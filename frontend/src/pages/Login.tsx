import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuthStore } from "../stores/authStore";

function Login() {
    const [codigo, setCodigo] = useState("");
    const [dataNascimento, setDataNascimento] = useState("");
    const navigate = useNavigate();
    const loginStore = useAuthStore((state) => state.login);

    const loginMutation = useMutation({
        mutationFn: async (credentials: { codigo_funcionario: string; data_nascimento: string }) => {
            const { data } = await api.post("/auth/login", credentials);
            return data;
        },
        onSuccess: (data) => {
            loginStore(data.colaborador);

            if (data.primeiro_acesso) {
                navigate("/primeiro-acesso");
            } else {
                navigate("/perfil");
            }
        },
        onError: (error: any) => {
            const message = error.response?.data?.error || "Erro ao fazer login";
            alert(message);
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!codigo || !dataNascimento) {
            alert("Preencha todos os campos!");
            return;
        }

        // Se a data vier no formato DDMMAAAA ou com barras/traços, vamos limpar e formatar para YYYY-MM-DD
        const cleanDate = dataNascimento.replace(/\D/g, "");
        let formattedDate = cleanDate;
        if (cleanDate.length === 8) {
            const d = cleanDate.substring(0, 2);
            const m = cleanDate.substring(2, 4);
            const y = cleanDate.substring(4, 8);
            formattedDate = `${y}-${m}-${d}`;
        }

        loginMutation.mutate({
            codigo_funcionario: codigo,
            data_nascimento: formattedDate,
        });
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden font-sans w-full bg-[#061423]">
            {/* Imagem de Fundo (nova) */}
            <div
                className="absolute inset-0 z-0 bg-center bg-cover bg-no-repeat"
                style={{ backgroundImage: "url('/login-bg.jpg')" }}
            >
            </div>

            {/* Login Card Container */}
            <main className="relative z-10 w-full max-w-[420px] px-4 md:px-0">
                <div className="bg-[#0b1727]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-10 shadow-2xl flex flex-col gap-8 w-full animate-in fade-in slide-in-from-bottom-8 duration-500">

                    {/* Brand / Header Section */}
                    <div className="flex flex-col items-center text-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-[#1a2634] border border-white/5 flex items-center justify-center shadow-inner relative overflow-hidden">
                            <span className="material-symbols-outlined text-4xl text-[#008237] drop-shadow-[0_0_8px_rgba(0,130,55,0.5)]">sports_soccer</span>
                        </div>
                        <div className="flex flex-col gap-1">
                            <h2 className="text-xs text-gray-400 font-bold tracking-widest uppercase">Copercana</h2>
                            <h1 className="text-3xl font-black text-white tracking-tighter">
                                BOLÃO <span className="text-[#008237]">2026</span>
                            </h1>
                        </div>
                        <p className="text-sm text-gray-400 max-w-[280px]">
                            Acesse com suas credenciais corporativas para participar.
                        </p>
                    </div>

                    {/* Login Form */}
                    <form className="flex flex-col gap-5 w-full" onSubmit={handleSubmit}>
                        {/* Input: Código do Funcionário */}
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-gray-300 uppercase tracking-wider pl-1" htmlFor="empCode">Código do funcionário</label>
                            <div className="relative group">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-500 group-focus-within:text-[#008237] transition-colors">badge</span>
                                <input
                                    className="w-full pl-12 pr-4 py-4 bg-[#1a2634] border border-white/5 rounded-xl text-white placeholder:text-gray-600 focus:outline-none focus:border-[#008237] focus:ring-1 focus:ring-[#008237] transition-all shadow-inner"
                                    id="empCode"
                                    name="empCode"
                                    placeholder=""
                                    required
                                    type="text"
                                    autoComplete="off"
                                    value={codigo}
                                    onChange={(e) => setCodigo(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Input: Senha */}
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-gray-300 uppercase tracking-wider pl-1" htmlFor="password">Senha</label>
                            <div className="relative group">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-500 group-focus-within:text-[#008237] transition-colors">lock</span>
                                <input
                                    className="w-full pl-12 pr-4 py-4 bg-[#1a2634] border border-white/5 rounded-xl text-white placeholder:text-gray-600 focus:outline-none focus:border-[#008237] focus:ring-1 focus:ring-[#008237] transition-all shadow-inner"
                                    id="password"
                                    name="password"
                                    placeholder=""
                                    required
                                    type="password"
                                    autoComplete="new-password"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    value={dataNascimento}
                                    onChange={(e) => setDataNascimento(e.target.value)}
                                />
                            </div>
                            <p className="text-[11px] text-gray-500 pl-1 mt-1"></p>
                        </div>

                        {/* Submit Button */}
                        <button
                            className="mt-4 w-full py-4 bg-[#FDE01A] text-[#061423] font-black uppercase tracking-wider rounded-xl hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-[0_4px_15px_rgba(253,224,26,0.3)] disabled:opacity-50 group"
                            type="submit"
                            disabled={loginMutation.isPending}
                        >
                            <span>{loginMutation.isPending ? "Entrando..." : "Entrar no Jogo"}</span>
                            <span className="material-symbols-outlined text-[20px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
                        </button>
                    </form>
                </div>
            </main>
        </div>
    );
}

export default Login;