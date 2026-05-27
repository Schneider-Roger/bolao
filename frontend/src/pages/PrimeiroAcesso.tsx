import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuthStore } from "../stores/authStore";
import { getBandeiraUrl } from "../utils/bandeiras";

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

function PrimeiroAcesso() {
    const { user, setPrimeiroAcessoCompleto } = useAuthStore();
    const [foto, setFoto] = useState<File | null>(null);
    const [apelido, setApelido] = useState(user?.apelido || user?.nome || "");
    const [selecao, setSelecao] = useState(user?.selecao_favorita || "");
    const [emailCorporativo, setEmailCorporativo] = useState(user?.email_corporativo || "");
    const [departamento, setDepartamento] = useState(user?.setor || "");

    const navigate = useNavigate();

    const primeiroAcessoMutation = useMutation({
        mutationFn: async (formData: FormData) => {
            const { data } = await api.post("/auth/primeiro-acesso", formData, {
                headers: {
                    "Content-Type": "multipart/form-data"
                }
            });
            return data;
        },
        onSuccess: (data) => {
            setPrimeiroAcessoCompleto({
                apelido: data.colaborador.apelido,
                selecao_favorita: data.colaborador.selecao_favorita,
                foto_perfil: data.colaborador.foto_perfil
            });

            navigate("/perfil");
        },
        onError: (error: any) => {
            const message = error.response?.data?.error || "Erro ao salvar perfil";
            alert(message);
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!apelido || !selecao) {
            alert("Por favor, preencha o Nome de Exibição e a Seleção do Coração.");
            return;
        }

        const formData = new FormData();
        if (foto) formData.append("foto", foto);
        formData.append("apelido", apelido || user?.nome || "");
        formData.append("selecao_favorita", selecao);
        if (emailCorporativo) formData.append('email_corporativo', emailCorporativo);
        if (departamento) formData.append('setor', departamento);

        primeiroAcessoMutation.mutate(formData);
    };

    return (
        <div className="min-h-screen flex flex-col antialiased items-center justify-center p-4 sm:p-8 bg-[#eef0f2]">
            {/* White Card Container */}
            <main className="w-full max-w-2xl bg-white rounded-[24px] shadow-2xl flex flex-col relative pb-8">
                
                {/* Top Header */}
                <header className="bg-[#334155] w-full flex flex-col p-5 rounded-t-[24px]">
                    <h1 className="font-headline-md text-xl font-bold text-white">Editar Perfil</h1>
                </header>

                <form className="flex-grow flex flex-col gap-6 px-6 sm:px-12 mt-8" onSubmit={handleSubmit}>
                    {/* Avatar Section */}
                    <section className="flex flex-col items-center">
                        <div className="relative group cursor-pointer">
                            <label className="block w-28 h-28 rounded-full bg-[#0f172a] border-4 border-white overflow-hidden relative shadow-md cursor-pointer">
                                {foto ? (
                                    <img src={URL.createObjectURL(foto)} alt="Preview" className="w-full h-full object-cover transition-opacity group-hover:opacity-40" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <span className="material-symbols-outlined text-[#008237] text-4xl">person</span>
                                    </div>
                                )}
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="bg-black/50 p-2 rounded-full">
                                        <span className="material-symbols-outlined text-white text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>photo_camera</span>
                                    </div>
                                </div>
                                <input type="file" accept="image/jpeg, image/png" className="hidden" onChange={(e) => setFoto(e.target.files?.[0] || null)} />
                            </label>
                            <div className="absolute bottom-0 right-0 bg-[#008237] text-white rounded-full w-8 h-8 flex items-center justify-center border-2 border-white shadow-sm pointer-events-none">
                                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>add</span>
                            </div>
                        </div>
                        <p className="mt-3 text-sm text-gray-400 font-medium text-center">Toque para mudar a foto</p>
                    </section>

                    {/* Form Section */}
                    <section className="flex flex-col gap-4">
                        {/* Nome de Exibição */}
                        <div className="bg-[#64748b] p-4 rounded-xl flex flex-col gap-3 shadow-sm opacity-80">
                            <div className="flex flex-col gap-2">
                                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-200">Nome de Exibição</label>
                                <input 
                                    className="bg-[#0f172a] border-none rounded-lg text-gray-400 text-sm py-3 px-4 w-full outline-none cursor-not-allowed" 
                                    placeholder="Seu nome" 
                                    type="text" 
                                    value={apelido}
                                    readOnly
                                    disabled
                                />
                            </div>
                        </div>

                        {/* E-mail */}
                        <div className="bg-[#64748b] p-4 rounded-xl flex flex-col gap-3 shadow-sm opacity-80">
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2 text-gray-200">
                                    <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 0" }}>mail</span>
                                    <label className="text-[11px] font-bold uppercase tracking-wider">E-mail</label>
                                </div>
                                <input 
                                    className="bg-[#0f172a] border-none rounded-lg text-gray-400 text-sm py-3 px-4 w-full outline-none cursor-not-allowed" 
                                    placeholder="Sem e-mail cadastrado" 
                                    type="email" 
                                    value={emailCorporativo}
                                    readOnly
                                    disabled
                                />
                            </div>
                        </div>

                        {/* Departamento */}
                        <div className="bg-[#64748b] p-4 rounded-xl flex flex-col gap-3 shadow-sm">
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2 text-gray-200">
                                    <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 0" }}>business</span>
                                    <label className="text-[11px] font-bold uppercase tracking-wider">Departamento</label>
                                </div>
                                <input 
                                    className="bg-[#0f172a] border-none rounded-lg text-white text-sm py-3 px-4 w-full focus:ring-2 focus:ring-[#008237] outline-none" 
                                    placeholder="Ex: Recursos Humanos" 
                                    type="text" 
                                    value={departamento}
                                    onChange={(e) => setDepartamento(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Seleção do Coração */}
                        <div className="bg-[#475569] p-5 rounded-xl border-t-4 border-t-[#008237] shadow-md flex flex-col gap-3">
                            <div className="flex items-center gap-2 text-white">
                                <span className="material-symbols-outlined text-[#ffdb3c]" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
                                <h2 className="text-base font-bold">Seleção do Coração</h2>
                            </div>
                            <p className="text-gray-300 text-xs mb-1">Escolha o país que você apoia. Isso personalizará sua experiência no ranking.</p>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                                    <span className="material-symbols-outlined text-[#008237] text-[18px]" style={{ fontVariationSettings: "'FILL' 0" }}>public</span>
                                </div>
                                <select 
                                    className="w-full bg-[#0f172a] border border-white/10 rounded-lg text-white text-sm py-3 pl-11 pr-10 focus:ring-2 focus:ring-[#008237] outline-none appearance-none"
                                    value={selecao}
                                    onChange={(e) => setSelecao(e.target.value)}
                                    style={{
                                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23ffffff'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                                        backgroundRepeat: 'no-repeat',
                                        backgroundPosition: 'right 12px center',
                                        backgroundSize: '16px'
                                    }}
                                >
                                    <option className="text-slate-900 bg-white" disabled value="">Selecione um país...</option>
                                    {selecoes.map(s => (
                                        <option className="text-slate-900 bg-white" key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Selected Country Preview Tag */}
                            {selecao && (
                                <div className="mt-2 flex items-center gap-3 bg-[#334155] p-3 rounded-lg shadow-inner">
                                    <img 
                                        src={getBandeiraUrl(selecao)} 
                                        alt={`Bandeira ${selecao}`} 
                                        className="w-6 h-6 rounded-full object-cover border border-white/20 shadow-sm flex-shrink-0"
                                    />
                                    <span className="text-sm font-bold text-white">{selecao} Selecionado</span>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Action Area */}
                    <div className="mt-4 flex flex-col items-center">
                        <button 
                            type="submit"
                            disabled={primeiroAcessoMutation.isPending}
                            className="w-full bg-[#008237] text-white font-bold py-4 rounded-full shadow-lg hover:bg-[#006e2d] transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            <span>{primeiroAcessoMutation.isPending ? "Salvando..." : "Salvar Perfil"}</span>
                            <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                        </button>
                    </div>
                </form>
            </main>
        </div>
    );
}

export default PrimeiroAcesso;