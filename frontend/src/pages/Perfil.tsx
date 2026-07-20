import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";
import { api, BASE_URL } from "../lib/api";
import { getBandeiraUrl, getBandeiraRetangularUrl } from "../utils/bandeiras";

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

const selecoes = [
    "África do Sul", "Alemanha", "Arábia Saudita", "Argélia", "Argentina",
    "Austrália", "Áustria", "Bélgica", "Bósnia e Herzegovina", "Brasil",
    "Cabo Verde", "Canadá", "Catar", "Colômbia", "Coreia do Sul",
    "Costa do Marfim", "Croácia", "Curaçau", "Egipto", "Equador",
    "Escócia", "Espanha", "Estados Unidos", "França", "Gana",
    "Haiti", "Holanda", "Inglaterra", "Irã", "Iraque",
    "Japão", "Jordânia", "Marrocos", "México", "Noruega",
    "Nova Zelândia", "Panamá", "Paraguai", "Portugal", "RD do Congo",
    "República Tcheca", "Senegal", "Suécia", "Suíça", "Tunísia",
    "Turquia", "Uruguai", "Uzbequistão"
];

function Perfil() {
    const { user, setPrimeiroAcessoCompleto } = useAuthStore();
    const queryClient = useQueryClient();

    const [isEditing, setIsEditing] = useState(false);

    // Form states
    const [foto, setFoto] = useState<File | null>(null);
    const [apelido, setApelido] = useState(user?.apelido || user?.nome || "");
    const [selecao, setSelecao] = useState(user?.selecao_favorita || "");
    const [departamento, setDepartamento] = useState(user?.setor || "");
    const [removerFoto, setRemoverFoto] = useState(false);

    // Iniciais do nome
    const iniciais = user?.nome
        ? user.nome.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
        : "US";

    // Dados reais do ranking do usuário
    const { data: minha } = useQuery({
        queryKey: ["minha-posicao"],
        queryFn: async () => {
            const res = await api.get("/ranking/minha-posicao");
            return res.data;
        },
    });

    // Histórico de resultados recentes
    const { data: resultados } = useQuery({
        queryKey: ["meus-resultados"],
        queryFn: async () => {
            const res = await api.get("/jogos/meus-resultados");
            return res.data.resultados as ResultadoRecente[];
        },
    });

    const editProfileMutation = useMutation({
        mutationFn: async (formData: FormData) => {
            const { data } = await api.put("/auth/editar-perfil", formData, {
                headers: {
                    "Content-Type": "multipart/form-data"
                }
            });
            return data;
        },
        onSuccess: (data) => {
            // Atualiza auth store com novos dados (especialmente foto e selecao)
            setPrimeiroAcessoCompleto({
                apelido: data.colaborador.apelido,
                selecao_favorita: data.colaborador.selecao_favorita,
                foto_perfil: data.colaborador.foto_perfil,
                setor: data.colaborador.setor
            });

            // Força a atualização dos dados se o usuário possuir queries guardadas
            queryClient.invalidateQueries({ queryKey: ["minha-posicao"] });

            alert("Perfil atualizado com sucesso!");
            setIsEditing(false);
            setFoto(null); // Reseta a foto para o estado inicial
            setRemoverFoto(false);
        },
        onError: (error: any) => {
            const message = error.response?.data?.error || "Erro ao atualizar perfil";
            alert(message);
        }
    });

    const handleSaveProfile = (e: React.FormEvent) => {
        e.preventDefault();

        if (!apelido || !selecao) {
            alert("Nome de exibição e Seleção Favorita são obrigatórios.");
            return;
        }

        const formData = new FormData();
        if (foto) formData.append("foto", foto);
        formData.append("apelido", apelido);
        formData.append("selecao_favorita", selecao);
        if (departamento) formData.append('setor', departamento);
        formData.append('remover_foto', String(removerFoto));

        editProfileMutation.mutate(formData);
    };

    const openEditModal = () => {
        setApelido(user?.apelido || user?.nome || "");
        setSelecao(user?.selecao_favorita || "");
        setDepartamento(user?.setor || "");
        setFoto(null);
        setRemoverFoto(false);
        setIsEditing(true);
    };

    const totalPalpites = minha?.palpites_feitos || 0;
    const acertosExatos = minha?.placares_exatos || 0;
    const acertosResultado = minha?.acertos_resultado || 0;
    const erros = minha?.erros || 0;
    const aproveitamento = totalPalpites > 0 ? Math.round((acertosResultado / totalPalpites) * 100) : 0;

    return (
        <div className="w-full space-y-6 px-4 md:px-[100px] text-white pb-24 relative break-words">
            {/* Cabeçalho do Perfil */}
            <section className="
    mx-2.5
    md:mx-0
    rounded-3xl 
    bg-[#0a2e1d] 
    p-6 
    shadow-2xl 
    relative
    overflow-hidden
">
                <div className="flex flex-col items-center sm:flex-row sm:items-center text-center sm:text-left gap-4 relative z-10 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                    <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/10 text-3xl font-black shadow-inner overflow-hidden border-2 border-white/20 shrink-0">
                        {user?.foto_perfil ? (
                            <img src={`${BASE_URL}${user.foto_perfil}`} alt="Foto de perfil" className="w-full h-full object-cover" />
                        ) : (
                            <img src="/default-avatar.png" alt="Foto de perfil padrão" className="w-full h-full object-cover" />
                        )}
                    </div>

                    <div className="flex-1 flex flex-col items-center sm:items-start">
                        <p className="text-xs font-bold uppercase tracking-widest opacity-90 text-emerald-400">
                            Perfil do Jogador
                        </p>

                        <h1 className="mt-1 text-2xl font-black leading-tight flex items-center justify-center sm:justify-start gap-2">
                            {user?.apelido || user?.nome || "Colaborador"}
                        </h1>

                        <p className="mt-1 text-xs font-semibold opacity-80 text-slate-300">
                            {user?.setor || "Geral"} • {user?.unidade || "Copercana"}
                        </p>
                    </div>

                    {user?.role === "ADMIN" && (
                        <Link
                            to="/admin"
                            className="self-center bg-amber-500 hover:bg-amber-400 text-slate-950 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shrink-0 shadow-lg"
                        >
                            <span className="material-symbols-outlined text-[16px]">settings</span>
                            Admin
                        </Link>
                    )}

                    <button
                        onClick={openEditModal}
                        className="self-center bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shrink-0 backdrop-blur-sm border border-white/10"
                    >
                        <span className="material-symbols-outlined text-[16px]">edit</span>
                        Editar
                    </button>
                </div>
            </section>

            {/* Ranking e Pontos */}
            <section className="grid grid-cols-2 gap-4">
                <article className="rounded-3xl bg-white/5 border border-white/5 p-5 shadow-lg">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Posição Ranking
                    </p>
                    <h2 className="mt-2 text-4xl font-black text-emerald-400">
                        {minha?.posicao ? `#${minha.posicao}` : "–"}
                    </h2>
                </article>

                <article className="rounded-3xl bg-white/5 border border-white/5 p-5 shadow-lg">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Pontos Total
                    </p>
                    <h2 className="mt-2 text-4xl font-black text-emerald-400">
                        {minha?.pontos_total ?? 0}
                    </h2>
                </article>
            </section>

            {/* Seleção Favorita */}
            <section className="space-y-4">
                <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                Seleção Favorita
                            </p>
                            <h2 className="mt-2 text-xl font-black text-white">
                                {user?.selecao_favorita || "Não definida"}
                            </h2>
                        </div>
                        {user?.selecao_favorita ? (
                            <img src={getBandeiraUrl(user.selecao_favorita)} alt={`Bandeira ${user.selecao_favorita}`} className="w-12 h-12 sm:w-16 sm:h-16 object-contain drop-shadow-md" />
                        ) : (
                            <span className="text-4xl">⚽</span>
                        )}
                    </div>
                </div>
            </section>

            {/* Estatísticas */}
            <section className="space-y-4">
                <h2 className="text-xl font-black">Estatísticas Reais</h2>

                <div className="grid grid-cols-2 gap-4">
                    <article className="rounded-3xl bg-white/5 border border-white/5 p-5 shadow-md">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                            Placares Exatos
                        </p>
                        <h3 className="mt-2 text-2xl font-black text-emerald-400">
                            {acertosExatos}
                        </h3>
                    </article>

                    <article className="rounded-3xl bg-white/5 border border-white/5 p-5 shadow-md">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                            Acertos Resultado
                        </p>
                        <h3 className="mt-2 text-2xl font-black text-emerald-400">
                            {acertosResultado}
                        </h3>
                    </article>

                    <article className="rounded-3xl bg-white/5 border border-white/5 p-5 shadow-md">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                            Erros
                        </p>
                        <h3 className="mt-2 text-2xl font-black text-red-400">
                            {erros}
                        </h3>
                    </article>

                    <article className="rounded-3xl bg-white/5 border border-white/5 p-5 shadow-md">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                            Aproveitamento
                        </p>
                        <h3 className="mt-2 text-2xl font-black text-yellow-400">
                            {aproveitamento}%
                        </h3>
                    </article>
                </div>
            </section>

            {isEditing && (
                <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-2xl bg-[#0f172a] sm:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-white/10 animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-4 duration-300">

                        <header className="bg-[#1e293b] p-5 border-b border-white/5 flex justify-between items-center shrink-0">
                            <h2 className="text-xl font-bold text-white">Editar Perfil</h2>
                            <button
                                onClick={() => setIsEditing(false)}
                                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                            >
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </header>

                        <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
                            <form id="editProfileForm" onSubmit={handleSaveProfile} className="flex flex-col gap-6">

                                {/* Avatar */}
                                <section className="flex flex-col items-center">
                                    <div className="relative group cursor-pointer">
                                        <label className="block w-24 h-24 rounded-full bg-[#1e293b] border-2 border-[#008237] overflow-hidden relative shadow-md cursor-pointer">
                                            {foto ? (
                                                <img src={URL.createObjectURL(foto)} alt="Preview" className="w-full h-full object-cover" />
                                            ) : (user?.foto_perfil && user.foto_perfil !== "null" && typeof user.foto_perfil === "string" && user.foto_perfil.trim() !== "" && !removerFoto) ? (
                                                <img src={user.foto_perfil.startsWith('/uploads') ? `${BASE_URL}${user.foto_perfil}` : `${BASE_URL}/uploads/${user.foto_perfil}`} alt="Atual" className="w-full h-full object-cover transition-opacity group-hover:opacity-40" />
                                            ) : (
                                                <img src="/default-avatar.png" alt="Padrão" className="w-full h-full object-cover transition-opacity group-hover:opacity-40" />
                                            )}
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50">
                                                <span className="material-symbols-outlined text-white text-xl">photo_camera</span>
                                            </div>
                                            <input 
                                                type="file" 
                                                accept="image/jpeg, image/png" 
                                                className="hidden" 
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0] || null;
                                                    setFoto(file);
                                                    if (file) setRemoverFoto(false);
                                                }} 
                                            />
                                        </label>
                                    </div>
                                    <p className="mt-2 text-[10px] uppercase tracking-wider text-gray-400 font-bold">Trocar foto</p>
                                    {((user?.foto_perfil && !removerFoto) || foto) && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setFoto(null);
                                                setRemoverFoto(true);
                                            }}
                                            className="mt-1 text-[8px] uppercase tracking-wider text-red-400 hover:text-red-300 font-bold transition-colors cursor-pointer"
                                        >
                                            Remover foto
                                        </button>
                                    )}
                                </section>

                                {/* Nome */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Nome de Exibição / Apelido</label>
                                    <input
                                        className="bg-[#1e293b] border border-white/5 rounded-xl text-gray-400 text-sm py-3 px-4 w-full outline-none opacity-70 cursor-not-allowed"
                                        type="text"
                                        value={apelido}
                                        readOnly
                                        disabled
                                    />
                                </div>


                                {/* Departamento */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Departamento / Setor</label>
                                    <input
                                        className="bg-[#1e293b] border border-white/5 rounded-xl text-white text-sm py-3 px-4 w-full focus:ring-2 focus:ring-emerald-500 outline-none"
                                        type="text"
                                        value={departamento}
                                        onChange={(e) => setDepartamento(e.target.value)}
                                        placeholder="Ex: TI"
                                    />
                                </div>

                                {/* Seleção */}
                                <div className="flex flex-col gap-1.5 pb-4">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Seleção do Coração</label>
                                    <select
                                        className="bg-[#1e293b] border border-white/5 rounded-xl text-white text-sm py-3 px-4 w-full focus:ring-2 focus:ring-emerald-500 outline-none appearance-none"
                                        value={selecao}
                                        onChange={(e) => setSelecao(e.target.value)}
                                        required
                                        style={{
                                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23ffffff'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                                            backgroundRepeat: 'no-repeat',
                                            backgroundPosition: 'right 16px center',
                                            backgroundSize: '16px'
                                        }}
                                    >
                                        <option disabled value="" className="text-slate-900 bg-white">Selecione um país...</option>
                                        {selecoes.map(s => (
                                            <option key={s} value={s} className="text-slate-900 bg-white">{s}</option>
                                        ))}
                                    </select>
                                </div>

                            </form>
                        </div>

                        <footer className="bg-[#1e293b] p-5 border-t border-white/5 shrink-0">
                            <button
                                type="submit"
                                form="editProfileForm"
                                disabled={editProfileMutation.isPending}
                                className="w-full bg-emerald-500 text-slate-950 font-black uppercase tracking-wider py-4 rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:bg-emerald-400 transition-all active:scale-95 disabled:opacity-50"
                            >
                                {editProfileMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                            </button>
                        </footer>

                    </div>
                </div>
            )}
        </div>
    );
}

export default Perfil;