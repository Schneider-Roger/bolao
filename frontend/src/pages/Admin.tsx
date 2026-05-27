import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
}

interface Colaborador {
    id: number;
    codigo_funcionario: string;
    nome: string;
    data_nascimento: string;
    setor: string;
    unidade: string;
    apelido: string;
    email_corporativo: string;
    role: string;
    ativo: number;
}

function Admin() {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    if (user?.role !== "ADMIN") {
        return (
            <div className="flex h-screen flex-col items-center justify-center p-6 text-center text-white bg-[#0b1727]">
                <h1 className="text-3xl font-black text-red-500 uppercase tracking-widest">Acesso Negado</h1>
                <p className="mt-4 text-gray-400 text-sm max-w-xs">Você não tem privilégios administrativos para visualizar esta página.</p>
                <button onClick={() => navigate("/home")} className="mt-6 rounded-2xl bg-[#008237] px-6 py-3.5 font-black text-xs uppercase tracking-wider text-white shadow-lg active:scale-95 transition-all">
                    Voltar para Home
                </button>
            </div>
        );
    }

    const { data: jogos, isLoading } = useQuery({
        queryKey: ["jogos-admin"],
        queryFn: async () => {
            const res = await api.get("/jogos");
            return res.data.jogos as Jogo[];
        }
    });

    const { data: colaboradores, isLoading: isLoadingColabs } = useQuery({
        queryKey: ["admin-colaboradores"],
        queryFn: async () => {
            const res = await api.get("/admin/colaboradores");
            return res.data.colaboradores as Colaborador[];
        }
    });

    const [editColab, setEditColab] = useState<Colaborador | null>(null);
    const [isCreatingColab, setIsCreatingColab] = useState(false);
    const [newColab, setNewColab] = useState<Partial<Colaborador>>({ role: 'USER' });
    const [activeTab, setActiveTab] = useState<'jogos' | 'usuarios'>('jogos');
    const [buscaUsuario, setBuscaUsuario] = useState("");

    const createColabMutation = useMutation({
        mutationFn: async (data: Partial<Colaborador>) => {
            await api.post(`/admin/colaboradores`, data);
        },
        onSuccess: () => {
            alert("Colaborador criado com sucesso!");
            setIsCreatingColab(false);
            setNewColab({ role: 'USER' });
            queryClient.invalidateQueries({ queryKey: ["admin-colaboradores"] });
        },
        onError: (err: any) => {
            alert(err.response?.data?.error || "Erro ao criar colaborador");
        }
    });

    const handleCreateChange = (field: keyof Colaborador, value: any) => {
        setNewColab(prev => ({ ...prev, [field]: value }));
    };

    const editColabMutation = useMutation({
        mutationFn: async (data: Colaborador) => {
            await api.put(`/admin/colaboradores/${data.id}`, data);
        },
        onSuccess: () => {
            alert("Colaborador atualizado com sucesso!");
            setEditColab(null);
            queryClient.invalidateQueries({ queryKey: ["admin-colaboradores"] });
        },
        onError: (err: any) => {
            alert(err.response?.data?.error || "Erro ao editar colaborador");
        }
    });

    const handleEditChange = (field: keyof Colaborador, value: any) => {
        if (editColab) {
            setEditColab({ ...editColab, [field]: value });
        }
    };

    const deleteColabMutation = useMutation({
        mutationFn: async (id: number) => {
            await api.delete(`/admin/colaboradores/${id}`);
        },
        onSuccess: () => {
            alert("Colaborador excluído permanentemente!");
            queryClient.invalidateQueries({ queryKey: ["admin-colaboradores"] });
        },
        onError: (err: any) => {
            alert(err.response?.data?.error || "Erro ao excluir colaborador");
        }
    });

    const handleDeleteColab = (id: number, nome: string) => {
        if (window.confirm(`Tem certeza absoluta que deseja excluir o colaborador "${nome}"? Esta ação removerá também todos os palpites e pontuações deste usuário e não pode ser desfeita.`)) {
            deleteColabMutation.mutate(id);
        }
    };

    const [placares, setPlacares] = useState<Record<number, { a: string, b: string }>>({});
    const [sincronizando, setSincronizando] = useState(false);
    const [recalculando, setRecalculando] = useState(false);
    const [arquivoExcel, setArquivoExcel] = useState<File | null>(null);
    const [importando, setImportando] = useState(false);
    const [resultadoImportacao, setResultadoImportacao] = useState<{
        sucesso: boolean;
        cadastrados: number;
        atualizados: number;
        erros: number;
        logErros: string[];
    } | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setArquivoExcel(e.target.files[0]);
            setResultadoImportacao(null);
        }
    };

    const handleImportarExcel = async () => {
        if (!arquivoExcel) {
            alert("Por favor, selecione um arquivo Excel para importar.");
            return;
        }

        setImportando(true);
        setResultadoImportacao(null);

        try {
            const formData = new FormData();
            formData.append("planilha", arquivoExcel);

            const res = await api.post("/admin/colaboradores/importar", formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });

            const data = res.data;
            setResultadoImportacao({
                sucesso: true,
                cadastrados: data.cadastrados,
                atualizados: data.atualizados,
                erros: data.erros,
                logErros: data.logErros || [],
            });

            alert("Planilha de colaboradores processada com sucesso!");
            setArquivoExcel(null);
            
            const fileInput = document.getElementById("excel-input-file") as HTMLInputElement;
            if (fileInput) fileInput.value = "";

        } catch (error: any) {
            const errMsg = error.response?.data?.error || "Falha ao processar planilha Excel";
            alert(errMsg);
            setResultadoImportacao({
                sucesso: false,
                cadastrados: 0,
                atualizados: 0,
                erros: 1,
                logErros: [errMsg],
            });
        } finally {
            setImportando(false);
        }
    };

    const handleChangePlacar = (jogoId: number, tipo: 'a' | 'b', valor: string) => {
        setPlacares(prev => ({
            ...prev,
            [jogoId]: {
                ...prev[jogoId] || { a: "", b: "" },
                [tipo]: valor
            }
        }));
    };

    // Mutação para salvar placar individual manual
    const resultadoMutation = useMutation({
        mutationFn: async ({ id, placarA, placarB }: { id: number, placarA: number, placarB: number }) => {
            await api.put(`/admin/jogos/${id}/resultado`, {
                placar_a: placarA,
                placar_b: placarB
            });
        },
        onSuccess: () => {
            alert("Placar REAL do jogo salvo e palpites recalculados!");
            queryClient.invalidateQueries({ queryKey: ["jogos-admin"] });
            queryClient.invalidateQueries({ queryKey: ["jogos"] });
        },
        onError: (err: any) => {
            alert(err.response?.data?.error || "Erro ao salvar resultado");
        }
    });

    // Função para disparar a sincronização automática com a API do GE
    const handleSincronizarGE = async () => {
        setSincronizando(true);
        try {
            const res = await api.post("/admin/sincronizar-ge");
            alert(res.data.message || "Sincronização com o GE concluída!");
            queryClient.invalidateQueries({ queryKey: ["jogos-admin"] });
            queryClient.invalidateQueries({ queryKey: ["jogos"] });
        } catch (error: any) {
            alert(error.response?.data?.error || "Falha ao conectar na API do GE");
        } finally {
            setSincronizando(false);
        }
    };

    // Função para recalcular o ranking manualmente
    const handleRecalcularRanking = async () => {
        setRecalculando(true);
        try {
            const res = await api.post("/admin/ranking/recalcular");
            alert(res.data.message || "Ranking recalculado com sucesso!");
        } catch (error: any) {
            alert(error.response?.data?.error || "Falha ao recalcular ranking");
        } finally {
            setRecalculando(false);
        }
    };

    const handleSalvar = (jogoId: number, placarAAtual: number | null, placarBAtual: number | null) => {
        const p = placares[jogoId];
        
        let finalA = p?.a !== undefined ? p.a : placarAAtual?.toString();
        let finalB = p?.b !== undefined ? p.b : placarBAtual?.toString();

        if (finalA === "" || finalA === undefined || finalB === "" || finalB === undefined) {
            alert("Preencha os dois placares");
            return;
        }
        resultadoMutation.mutate({ id: jogoId, placarA: parseInt(finalA), placarB: parseInt(finalB) });
    };

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-[#0b1727] text-white">
                <div className="text-center space-y-4">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#008237] border-t-transparent mx-auto"></div>
                    <p className="font-bold text-gray-400">Carregando painel de controle...</p>
                </div>
            </div>
        );
    }

    const colaboradoresFiltrados = colaboradores?.filter(c => {
        const termo = buscaUsuario.toLowerCase();
        return (
            (c.nome && c.nome.toLowerCase().includes(termo)) ||
            (c.codigo_funcionario && c.codigo_funcionario.includes(termo)) ||
            (c.setor && c.setor.toLowerCase().includes(termo)) ||
            (c.apelido && c.apelido.toLowerCase().includes(termo))
        );
    });

    return (
        <main className="flex-grow w-full max-w-[1400px] mx-auto py-6 flex flex-col gap-6 px-4 md:px-[100px]">
            
            <div className="bg-[#0b1727] rounded-3xl p-6 shadow-xl border border-white/5 flex flex-col gap-8 min-h-[80vh]">
                
                {/* Header do Admin */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="text-center md:text-left">
                        <p className="text-[#008237] text-xs font-bold uppercase tracking-widest">Área Restrita do Admin</p>
                        <h1 className="text-2xl font-bold text-white mt-1">Painel Geral</h1>
                    </div>
                    <div className="flex gap-4">
                        <button onClick={() => setIsCreatingColab(true)} className="bg-[#008237] text-white font-bold px-4 py-2 rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-2 text-sm">
                            <span className="material-symbols-outlined text-[18px]">person_add</span>
                            Novo Colaborador
                        </button>
                        <button onClick={() => navigate("/home")} className="bg-[#1f2b38] text-gray-300 font-bold px-5 py-2 rounded-lg hover:bg-[#2a3644] transition-colors active:scale-95">Voltar</button>
                    </div>
                </div>

                {/* Tabs de Navegação */}
                <div className="flex gap-4 border-b border-white/5 pb-4 overflow-x-auto">
                    <button 
                        onClick={() => setActiveTab('jogos')} 
                        className={`px-6 py-3 rounded-xl font-bold text-sm transition-all shrink-0 ${activeTab === 'jogos' ? 'bg-[#008237] text-white shadow-lg' : 'bg-[#1a2634] text-gray-400 hover:bg-[#2a3644] border border-white/5'}`}
                    >
                        Gestão de Jogos
                    </button>
                    <button 
                        onClick={() => setActiveTab('usuarios')} 
                        className={`px-6 py-3 rounded-xl font-bold text-sm transition-all shrink-0 ${activeTab === 'usuarios' ? 'bg-[#008237] text-white shadow-lg' : 'bg-[#1a2634] text-gray-400 hover:bg-[#2a3644] border border-white/5'}`}
                    >
                        Gestão de Usuários
                    </button>
                </div>

                {activeTab === 'jogos' ? (
                    <div className="space-y-8 animate-in fade-in duration-300">
                        {/* Ações Avançadas e Integração Automatizada com a API do GE */}
                <section className="bg-[#1a2634] border border-white/5 p-6 rounded-2xl space-y-4 shadow-lg">
                    <h2 className="text-white font-bold text-lg">Controles & Integração GE</h2>
                    <p className="text-gray-400 text-sm leading-relaxed">
                        Sincronize placares diretamente do feed de resultados da API do Globo Esporte para automatizar totalmente a pontuação e atualização dos desempates em background.
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        <button onClick={handleSincronizarGE} disabled={sincronizando} className="bg-[#008237] text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all hover:brightness-110 disabled:opacity-50 shadow-md active:scale-95">
                            <span className={`material-symbols-outlined ${sincronizando ? 'animate-spin' : ''}`}>sync</span>
                            {sincronizando ? "Sincronizando..." : "Sincronizar GE"}
                        </button>
                        <button onClick={handleRecalcularRanking} disabled={recalculando} className="bg-[#1f2b38] text-gray-300 hover:text-white border border-white/5 font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all hover:bg-[#2a3644] disabled:opacity-50 shadow-md active:scale-95">
                            <span className="material-symbols-outlined">leaderboard</span>
                            {recalculando ? "Calculando..." : "Recalcular Ranking"}
                        </button>
                    </div>
                    </section>

                    {/* Listagem de Confrontos */}
                    <section className="space-y-4">
                        <h2 className="text-white font-bold text-lg border-b border-white/5 pb-2">Controle Manual de Placares</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {jogos?.map((jogo) => {
                                const p = placares[jogo.id] || { a: jogo.placar_a !== null ? jogo.placar_a.toString() : "", b: jogo.placar_b !== null ? jogo.placar_b.toString() : "" };
                                const estaPontuado = jogo.status === 'pontuado' || jogo.status === 'encerrado';

                                return (
                                    <article key={jogo.id} className="bg-[#1a2634] rounded-2xl p-5 shadow-lg border border-white/5 flex flex-col gap-4">
                                        <div className="flex justify-between items-center text-xs font-bold border-b border-white/5 pb-3">
                                            <span className="bg-[#2a3644] text-gray-300 px-3 py-1 rounded-full">{jogo.fase}</span>
                                            <span className={estaPontuado ? 'bg-[#008237]/20 text-[#008237] px-3 py-1 rounded-full border border-[#008237]/50 flex items-center gap-1' : 'bg-[#2a3644] text-gray-400 px-3 py-1 rounded-full'}>
                                                {estaPontuado && <span className="material-symbols-outlined text-[12px]">check_circle</span>}
                                                {jogo.status.toUpperCase()}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between gap-2 py-2">
                                            <div className="flex-1 text-center font-bold text-sm text-white truncate">{jogo.time_a}</div>
                                            
                                            <div className="flex items-center bg-[#0b1727] rounded-xl px-2 py-1.5 border border-[#2a3644] shadow-inner gap-2 shrink-0">
                                                <input type="number" min="0" max="99" placeholder="-" value={p.a} onChange={(e) => handleChangePlacar(jogo.id, 'a', e.target.value)} className="w-8 h-10 bg-transparent text-white text-center font-bold text-xl outline-none placeholder:text-gray-600 disabled:opacity-50" />
                                                <span className="text-gray-500 font-bold">X</span>
                                                <input type="number" min="0" max="99" placeholder="-" value={p.b} onChange={(e) => handleChangePlacar(jogo.id, 'b', e.target.value)} className="w-8 h-10 bg-transparent text-white text-center font-bold text-xl outline-none placeholder:text-gray-600 disabled:opacity-50" />
                                            </div>

                                            <div className="flex-1 text-center font-bold text-sm text-white truncate">{jogo.time_b}</div>
                                        </div>

                                        <button onClick={() => handleSalvar(jogo.id, jogo.placar_a, jogo.placar_b)} disabled={resultadoMutation.isPending} className={`mt-2 py-3 rounded-xl font-bold text-sm transition-all shadow-md w-full ${estaPontuado ? "bg-[#2a3644] text-gray-400 hover:text-white" : "bg-[#FDE01A] text-[#061423] hover:brightness-110 active:scale-95"}`}>
                                            {estaPontuado ? 'Atualizar Placar' : 'Salvar Placar Final'}
                                        </button>
                                    </article>
                                );
                            })}
                        </div>
                    </section>
                </div>
                ) : (
                <div className="space-y-8 animate-in fade-in duration-300">
                    {/* Importação de Colaboradores via Excel */}
                    <section className="bg-[#1a2634] border border-white/5 p-6 rounded-2xl space-y-4 shadow-lg">
                        <h2 className="text-white font-bold text-lg">📥 Importar Base de Colaboradores</h2>
                        <p className="text-gray-400 text-sm leading-relaxed">
                            Carregue a planilha Excel dos funcionários para cadastrá-los em lote.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 items-center">
                            <label htmlFor="excel-input-file" className="w-full sm:flex-1 cursor-pointer bg-[#0b1727] hover:bg-[#132030] border border-dashed border-[#008237]/50 hover:border-[#008237] rounded-xl p-6 flex flex-col items-center justify-center gap-2 transition-all text-center">
                                <span className="material-symbols-outlined text-3xl text-gray-400">upload_file</span>
                                <span className="text-white font-bold text-sm">
                                    {arquivoExcel ? arquivoExcel.name : "Selecionar arquivo Excel"}
                                </span>
                                <input type="file" id="excel-input-file" accept=".xlsx, .xls" onChange={handleFileChange} className="hidden" />
                            </label>

                            <button onClick={handleImportarExcel} disabled={importando || !arquivoExcel} className="w-full sm:w-auto bg-[#FDE01A] text-[#061423] hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed font-bold py-4 px-6 rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 shrink-0">
                                <span className={`material-symbols-outlined ${importando ? 'animate-spin' : ''}`}>{importando ? 'sync' : 'upload'}</span>
                                <span>{importando ? "Importando..." : "Confirmar"}</span>
                            </button>
                        </div>

                        {resultadoImportacao && (
                            <div className={`p-4 rounded-xl border ${resultadoImportacao.sucesso ? 'bg-[#008237]/20 border-[#008237]/50' : 'bg-red-500/20 border-red-500/50'} space-y-3 mt-4`}>
                                <p className={`font-bold text-sm uppercase ${resultadoImportacao.sucesso ? 'text-[#008237]' : 'text-red-500'}`}>📋 Relatório:</p>
                                <div className="grid grid-cols-3 gap-4 text-center">
                                    <div className="bg-[#0b1727] p-3 rounded-lg border border-white/5">
                                        <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Novos</span>
                                        <span className="text-white text-lg font-bold">{resultadoImportacao.cadastrados}</span>
                                    </div>
                                    <div className="bg-[#0b1727] p-3 rounded-lg border border-white/5">
                                        <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Atualizados</span>
                                        <span className="text-white text-lg font-bold">{resultadoImportacao.atualizados}</span>
                                    </div>
                                    <div className="bg-[#0b1727] p-3 rounded-lg border border-white/5">
                                        <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Falhas</span>
                                        <span className="text-red-500 text-lg font-bold">{resultadoImportacao.erros}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </section>

                    {/* Gestão de Usuários */}
                    <section className="space-y-4">
                        <div className="flex flex-col md:flex-row justify-between items-center border-b border-white/5 pb-4 gap-4">
                            <h2 className="text-white font-bold text-lg">Gestão de Colaboradores</h2>
                            
                            <div className="relative w-full md:w-auto">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                                <input 
                                    type="text" 
                                    placeholder="Buscar por nome, código ou setor..." 
                                    value={buscaUsuario}
                                    onChange={(e) => setBuscaUsuario(e.target.value)}
                                    className="w-full md:w-[300px] bg-[#0b1727] text-white pl-10 pr-4 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-[#008237] border border-white/5 transition-all text-sm placeholder:text-gray-500"
                                />
                            </div>
                        </div>

                        <div className="bg-[#1a2634] rounded-2xl overflow-hidden shadow-lg border border-white/5">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm text-gray-300">
                                    <thead className="bg-[#0b1727] text-xs uppercase text-gray-400">
                                        <tr>
                                            <th className="px-4 py-3">Código</th>
                                            <th className="px-4 py-3">Nome</th>
                                            <th className="px-4 py-3">Setor</th>
                                            <th className="px-4 py-3">Role</th>
                                            <th className="px-4 py-3 text-right">Ação</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {colaboradoresFiltrados?.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">Nenhum colaborador encontrado para essa busca.</td>
                                            </tr>
                                        ) : (
                                            colaboradoresFiltrados?.map(c => (
                                                <tr key={c.id} className="border-b border-white/5 hover:bg-[#2a3644]/50 transition-colors">
                                                    <td className="px-4 py-3 font-mono">{c.codigo_funcionario}</td>
                                                    <td className="px-4 py-3 font-bold text-white">{c.nome}</td>
                                                    <td className="px-4 py-3">{c.setor}</td>
                                                    <td className="px-4 py-3">{c.role}</td>
                                                    <td className="px-4 py-3 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <button onClick={() => setEditColab(c)} className="bg-[#0b1727] text-[#008237] hover:bg-[#008237] hover:text-white px-3 py-1.5 rounded-lg font-bold text-xs transition-colors border border-[#008237]/50" title="Editar">
                                                                Editar
                                                            </button>
                                                            <button 
                                                                onClick={() => handleDeleteColab(c.id, c.nome)} 
                                                                disabled={deleteColabMutation.isPending}
                                                                className="bg-[#0b1727] text-red-500 hover:bg-red-500 hover:text-white px-3 py-1.5 rounded-lg font-bold text-xs transition-colors border border-red-500/50 flex items-center justify-center disabled:opacity-50"
                                                                title="Excluir Permanentemente"
                                                            >
                                                                <span className="material-symbols-outlined text-[16px]">delete</span>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </section>
                </div>
                )}
                {editColab && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                        <div className="bg-[#1a2634] rounded-3xl p-6 w-full max-w-lg border border-white/10 shadow-2xl">
                            <h3 className="text-white font-bold text-xl mb-4 border-b border-white/5 pb-2">Editar Colaborador</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Nome Completo</label>
                                    <input type="text" value={editColab.nome || ''} onChange={e => handleEditChange('nome', e.target.value)} className="w-full bg-[#0b1727] text-white px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-[#008237] border border-white/5 transition-all" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Código</label>
                                        <input type="text" value={editColab.codigo_funcionario || ''} onChange={e => handleEditChange('codigo_funcionario', e.target.value)} className="w-full bg-[#0b1727] text-white px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-[#008237] border border-white/5 transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Nascimento (YYYY-MM-DD)</label>
                                        <input type="text" value={editColab.data_nascimento || ''} onChange={e => handleEditChange('data_nascimento', e.target.value)} className="w-full bg-[#0b1727] text-white px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-[#008237] border border-white/5 transition-all" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Setor</label>
                                        <input type="text" value={editColab.setor || ''} onChange={e => handleEditChange('setor', e.target.value)} className="w-full bg-[#0b1727] text-white px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-[#008237] border border-white/5 transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Unidade</label>
                                        <input type="text" value={editColab.unidade || ''} onChange={e => handleEditChange('unidade', e.target.value)} className="w-full bg-[#0b1727] text-white px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-[#008237] border border-white/5 transition-all" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Apelido</label>
                                        <input type="text" value={editColab.apelido || ''} onChange={e => handleEditChange('apelido', e.target.value)} className="w-full bg-[#0b1727] text-white px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-[#008237] border border-white/5 transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">E-mail Corporativo</label>
                                        <input type="text" value={editColab.email_corporativo || ''} onChange={e => handleEditChange('email_corporativo', e.target.value)} className="w-full bg-[#0b1727] text-white px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-[#008237] border border-white/5 transition-all" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Role (Nível de Acesso)</label>
                                    <select value={editColab.role || 'USER'} onChange={e => handleEditChange('role', e.target.value)} className="w-full bg-[#0b1727] text-white px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-[#008237] border border-white/5 transition-all">
                                        <option value="USER">USER (Padrão)</option>
                                        <option value="ADMIN">ADMIN</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex gap-4 mt-6">
                                <button onClick={() => setEditColab(null)} className="flex-1 bg-[#2a3644] hover:bg-[#3a4654] text-white font-bold py-3 rounded-xl transition-colors">Cancelar</button>
                                <button onClick={() => editColabMutation.mutate(editColab)} disabled={editColabMutation.isPending} className="flex-1 bg-[#008237] hover:brightness-110 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all shadow-lg flex justify-center items-center gap-2">
                                    {editColabMutation.isPending ? <span className="material-symbols-outlined animate-spin text-[20px]">sync</span> : <span className="material-symbols-outlined text-[20px]">save</span>}
                                    Salvar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal de Criação */}
                {isCreatingColab && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                        <div className="bg-[#1a2634] rounded-3xl p-6 w-full max-w-lg border border-white/10 shadow-2xl">
                            <h3 className="text-white font-bold text-xl mb-4 border-b border-white/5 pb-2">Novo Colaborador</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Nome Completo</label>
                                    <input type="text" value={newColab.nome || ''} onChange={e => handleCreateChange('nome', e.target.value)} className="w-full bg-[#0b1727] text-white px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-[#008237] border border-white/5 transition-all" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Código</label>
                                        <input type="text" value={newColab.codigo_funcionario || ''} onChange={e => handleCreateChange('codigo_funcionario', e.target.value)} className="w-full bg-[#0b1727] text-white px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-[#008237] border border-white/5 transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Nascimento (YYYY-MM-DD)</label>
                                        <input type="text" value={newColab.data_nascimento || ''} onChange={e => handleCreateChange('data_nascimento', e.target.value)} placeholder="Ex: 1990-05-20" className="w-full bg-[#0b1727] text-white px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-[#008237] border border-white/5 transition-all" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Setor</label>
                                        <input type="text" value={newColab.setor || ''} onChange={e => handleCreateChange('setor', e.target.value)} className="w-full bg-[#0b1727] text-white px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-[#008237] border border-white/5 transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Unidade</label>
                                        <input type="text" value={newColab.unidade || ''} onChange={e => handleCreateChange('unidade', e.target.value)} className="w-full bg-[#0b1727] text-white px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-[#008237] border border-white/5 transition-all" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Apelido</label>
                                        <input type="text" value={newColab.apelido || ''} onChange={e => handleCreateChange('apelido', e.target.value)} className="w-full bg-[#0b1727] text-white px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-[#008237] border border-white/5 transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">E-mail Corporativo</label>
                                        <input type="email" value={newColab.email_corporativo || ''} onChange={e => handleCreateChange('email_corporativo', e.target.value)} className="w-full bg-[#0b1727] text-white px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-[#008237] border border-white/5 transition-all" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Role (Nível de Acesso)</label>
                                    <select value={newColab.role || 'USER'} onChange={e => handleCreateChange('role', e.target.value)} className="w-full bg-[#0b1727] text-white px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-[#008237] border border-white/5 transition-all">
                                        <option value="USER">USER (Padrão)</option>
                                        <option value="ADMIN">ADMIN</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex gap-4 mt-6">
                                <button onClick={() => setIsCreatingColab(false)} className="flex-1 bg-[#2a3644] hover:bg-[#3a4654] text-white font-bold py-3 rounded-xl transition-colors">Cancelar</button>
                                <button onClick={() => createColabMutation.mutate(newColab)} disabled={createColabMutation.isPending} className="flex-1 bg-[#008237] hover:brightness-110 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all shadow-lg flex justify-center items-center gap-2">
                                    {createColabMutation.isPending ? <span className="material-symbols-outlined animate-spin text-[20px]">sync</span> : <span className="material-symbols-outlined text-[20px]">save</span>}
                                    Criar
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}

export default Admin;