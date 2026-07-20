import { useEffect } from "react";

function Regras() {
    // Rola para o topo ao carregar a página
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const sections = [
        { id: "sobre", title: "1. O que é o Bolão?" },
        { id: "participar", title: "2. Quem pode participar?" },
        { id: "funcionamento", title: "3. Como funciona?" },
        { id: "palpites", title: "4. Os palpites" },
        { id: "pontuacao", title: "5. Pontuação" },
        { id: "ranking", title: "6. Ranking" },
        { id: "desempate", title: "7. Critérios de Desempate" },
        { id: "premiacao", title: "8. Premiação" },
        { id: "disposicoes", title: "9. Disposições Gerais" },
    ];

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    };

    return (
        <main className="flex-grow w-full max-w-container-max mx-auto py-6 flex flex-col lg:flex-row gap-8 px-4 md:px-[100px] text-white pb-24">

            {/* Sidebar de Navegação Rápida (Desktop) */}
            <aside className="hidden lg:block w-64 shrink-0">
                <div className="sticky top-24 bg-[#0b1727] border border-white/5 rounded-3xl p-5 shadow-xl flex flex-col gap-4">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-emerald-400 border-b border-white/10 pb-2">
                        Navegação Rápida
                    </h3>
                    <nav className="flex flex-col gap-2">
                        {sections.map((s) => (
                            <button
                                key={s.id}
                                onClick={() => scrollToSection(s.id)}
                                className="text-left text-xs font-semibold text-gray-400 hover:text-emerald-400 transition-colors py-1 cursor-pointer truncate"
                            >
                                {s.title}
                            </button>
                        ))}
                    </nav>
                </div>
            </aside>

            {/* Conteúdo Principal do Regulamento */}
            <section className="flex-grow flex flex-col gap-6">

                {/* Header Card */}
                <div className="bg-gradient-to-r from-emerald-950 to-[#0b1727] border border-emerald-500/20 rounded-3xl p-6 md:p-8 shadow-xl text-center md:text-left relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
                    <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-emerald-500/30">
                        Regulamento Oficial
                    </span>
                    <h1 className="text-3xl md:text-4xl font-black text-white mt-3 tracking-tight">
                        BOLÃO COPERCANA 2026
                    </h1>
                    <p className="text-gray-400 text-sm mt-2 max-w-xl">
                        Confira as regras e critérios de pontuação oficiais do bolão corporativo para comemorar a Copa do Mundo de 2026!
                    </p>
                </div>

                {/* 1. O QUE É O BOLÃO */}
                <article id="sobre" className="bg-[#0b1727] border border-white/5 rounded-3xl p-6 shadow-md flex flex-col gap-3 scroll-mt-24">
                    <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                        <span className="material-symbols-outlined text-emerald-400">help</span>
                        <h2 className="text-lg font-black text-white">1. O que é o Bolão Copercana?</h2>
                    </div>
                    <p className="text-gray-300 text-sm leading-relaxed">
                        É uma ação realizada pela <strong>Copercana</strong>, através do departamento de <strong>Cultura & Marca</strong>, para celebrar a Copa do Mundo de 2026 com todos os colaboradores. A ação acontece de <strong>1º de junho a 20 de julho de 2026</strong>.
                    </p>
                </article>

                {/* 2. QUEM PODE PARTICIPAR */}
                <article id="participar" className="bg-[#0b1727] border border-white/5 rounded-3xl p-6 shadow-md flex flex-col gap-3 scroll-mt-24">
                    <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                        <span className="material-symbols-outlined text-emerald-400">groups</span>
                        <h2 className="text-lg font-black text-white">2. Quem pode participar?</h2>
                    </div>
                    <p className="text-gray-300 text-sm leading-relaxed">
                        Todos os colaboradores da Copercana. A participação é <strong>100% voluntária</strong> e gratuita.
                    </p>
                </article>

                {/* 3. COMO FUNCIONA */}
                <article id="funcionamento" className="bg-[#0b1727] border border-white/5 rounded-3xl p-6 shadow-md flex flex-col gap-3 scroll-mt-24">
                    <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                        <span className="material-symbols-outlined text-emerald-400">settings</span>
                        <h2 className="text-lg font-black text-white">3. Como funciona?</h2>
                    </div>
                    <p className="text-gray-300 text-sm leading-relaxed">
                        A plataforma do Bolão da Copa estará disponível durante todo o período da Copa pelo endereço <a href="https://bolaocopercana.framer.ai" className="text-emerald-400 underline">bolaocopercana.framer.ai</a>. O acesso é feito de forma simples com o seu <strong>código de funcionário</strong> e <strong>senha</strong> (no primeiro acesso é a <strong>data de nascimento</strong>).
                    </p>
                    <p className="text-gray-300 text-sm leading-relaxed">
                        O colaborador poderá registrar seus palpites para os jogos, acompanhar os resultados em tempo real e verificar sua posição no ranking atualizado.
                    </p>
                    <div className="bg-emerald-500/10 border-l-4 border-emerald-500 p-4 rounded-r-xl">
                        <p className="text-emerald-300 text-xs font-bold uppercase tracking-wider mb-1">Dica de Campeão</p>
                        <p className="text-gray-300 text-xs leading-relaxed">
                            Recomendamos que você preencha o maior número de palpites possível! Quanto mais jogos você palpitar, maiores serão as suas chances de somar pontos e alcançar uma boa colocação no ranking final.
                        </p>
                    </div>
                </article>

                {/* 4. OS PALPITES */}
                <article id="palpites" className="bg-[#0b1727] border border-white/5 rounded-3xl p-6 shadow-md flex flex-col gap-4 scroll-mt-24">
                    <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                        <span className="material-symbols-outlined text-emerald-400">sports_soccer</span>
                        <h2 className="text-lg font-black text-white">4. Os palpites</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                            <h4 className="text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 text-emerald-400">
                                <span className="material-symbols-outlined text-sm">schedule</span> 4.1 Prazo
                            </h4>
                            <p className="text-gray-300 text-xs leading-relaxed mt-2">
                                Os palpites podem ser feitos ou editados até <strong>1 hora antes</strong> do início de cada jogo. Após esse prazo, o palpite fica bloqueado automaticamente e não pode mais ser alterado.
                            </p>
                        </div>

                        <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                            <h4 className="text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 text-yellow-400">
                                <span className="material-symbols-outlined text-sm">warning</span> 4.2 Sem Palpite
                            </h4>
                            <p className="text-gray-300 text-xs leading-relaxed mt-2">
                                Caso o colaborador não registre o palpite no prazo, o jogo simplesmente <strong>não pontua (0 pontos)</strong>.
                            </p>
                        </div>

                        <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                            <h4 className="text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 text-blue-400">
                                <span className="material-symbols-outlined text-sm">format_list_bulleted</span> 4.3 Fases
                            </h4>
                            <p className="text-gray-300 text-xs leading-relaxed mt-2">
                                Os palpites são divididos em duas etapas:
                                <br />• <strong>Fase de Grupos:</strong> 72 jogos
                                <br />• <strong>Mata-Mata:</strong> 32 jogos (incluindo disputa de 3º lugar)
                            </p>
                        </div>
                    </div>
                </article>

                {/* 5. PONTUAÇÃO */}
                <article id="pontuacao" className="bg-[#0b1727] border border-white/5 rounded-3xl p-6 shadow-md flex flex-col gap-4 scroll-mt-24">
                    <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                        <span className="material-symbols-outlined text-emerald-400">emoji_events</span>
                        <h2 className="text-lg font-black text-white">5. Pontuação</h2>
                    </div>
                    <p className="text-gray-300 text-sm leading-relaxed">
                        A pontuação é baseada, antes de tudo, no acerto do <strong>resultado final do jogo</strong> (ou seja, em qual time avança ou vence a partida, ou se haverá empate).
                    </p>

                    {/* Tabela de Pontos */}
                    <div className="bg-[#132030] rounded-2xl overflow-hidden border border-white/5 my-2">
                        <div className="grid grid-cols-3 px-4 py-3 border-b border-white/5 text-[10px] uppercase font-bold text-gray-400">
                            <div className="col-span-2">Cenário / Resultado do Jogo</div>
                            <div className="text-right">Pontos</div>
                        </div>
                        <div className="flex flex-col">
                            <div className="grid grid-cols-3 items-center px-4 py-3 border-b border-white/5 last:border-none">
                                <div className="col-span-2 text-white font-semibold text-xs flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]"></span>
                                    Acertou o time vencedor (ou empate) <strong>+</strong> Placar exato
                                </div>
                                <div className="text-right font-black text-emerald-400 text-sm">5 pts</div>
                            </div>
                            <div className="grid grid-cols-3 items-center px-4 py-3 border-b border-white/5 last:border-none">
                                <div className="col-span-2 text-white font-semibold text-xs flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
                                    Acertou apenas o time vencedor (ou empate) <strong>-</strong> Placar incorreto
                                </div>
                                <div className="text-right font-black text-yellow-400 text-sm">2 pts</div>
                            </div>
                            <div className="grid grid-cols-3 items-center px-4 py-3 border-b border-white/5 last:border-none">
                                <div className="col-span-2 text-white font-semibold text-xs flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-red-400"></span>
                                    Errou o resultado da partida completamente
                                </div>
                                <div className="text-right font-black text-red-400 text-sm">0 pts</div>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-white/5 pt-4 flex flex-col gap-3">
                        <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-emerald-400 text-lg font-bold">military_tech</span>
                            5.1 Regra especial no Mata-Mata
                        </h3>
                        <p className="text-gray-300 text-xs leading-relaxed">
                            No mata-mata, os confrontos são definidos conforme os times se classificam. A pontuação segue a mesma lógica da fase de grupos: primeiro o resultado, depois o placar.
                        </p>
                        <ul className="list-disc list-inside text-gray-300 text-xs space-y-1.5 pl-2">
                            <li><strong>Acertou o time que avança + acertou o placar exato do confronto:</strong> 5 pontos</li>
                            <li><strong>Acertou o time que avança, mas errou o adversário ou o placar:</strong> 2 pontos</li>
                            <li><strong>Errou o time que avança:</strong> 0 pontos</li>
                        </ul>

                        <div className="bg-[#132030] p-4 rounded-2xl border border-white/5 flex flex-col gap-2 mt-2">
                            <p className="text-yellow-400 text-xs font-bold uppercase tracking-wider">Atenção ao Placar Exato!</p>
                            <p className="text-gray-300 text-xs leading-relaxed">
                                O placar exato só é considerado válido quando o confronto palpitado (os dois times) corresponde <strong>exatamente</strong> ao que ocorreu de verdade. Se o adversário estiver errado, você não receberá a pontuação do placar perfeito, mesmo que os números coincidam.
                            </p>
                            <div className="border-t border-white/5 pt-2 mt-1 flex flex-col gap-1 text-[11px]">
                                <p className="text-gray-400"><strong>Exemplos:</strong></p>
                                <p className="text-gray-300">• Palpitou <em>Brasil 2x1 Argentina</em>. Jogo real: <em>Brasil 2x1 Argentina</em> ➜ <strong>5 pontos</strong> (confronto e placar corretos).</p>
                                <p className="text-gray-300">• Palpitou <em>Brasil 2x1 Argentina</em>. Jogo real: <em>Brasil 2x1 Espanha</em> ➜ <strong>2 pontos</strong> (acertou que o Brasil avança, mas errou o adversário).</p>
                                <p className="text-gray-300">• Palpitou <em>Brasil 2x1 Argentina</em>. Jogo real: <em>França 2x1 Argentina</em> ➜ <strong>0 pontos</strong> (errou o time que avança).</p>
                            </div>
                        </div>
                    </div>
                </article>

                {/* 6. RANKING */}
                <article id="ranking" className="bg-[#0b1727] border border-white/5 rounded-3xl p-6 shadow-md flex flex-col gap-3 scroll-mt-24">
                    <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                        <span className="material-symbols-outlined text-emerald-400">leaderboard</span>
                        <h2 className="text-lg font-black text-white">6. Ranking</h2>
                    </div>
                    <p className="text-gray-300 text-sm leading-relaxed">
                        O ranking geral fica disponível na plataforma e é atualizado ao longo de toda a competição.
                    </p>
                    <p className="text-gray-300 text-sm leading-relaxed">
                        A tela principal exibe os <strong>10 primeiros</strong> colocados e os <strong>3 últimos</strong> colocados. O colaborador logado sempre verá sua própria posição.
                    </p>
                    <p className="text-gray-300 text-sm leading-relaxed">
                        Caso você não esteja entre os 10 primeiros nem entre os 3 últimos, sua posição aparecerá <strong>destacada de forma isolada</strong> entre esses dois grupos, para que você sempre saiba exatamente onde está no campeonato!
                    </p>
                </article>

                {/* 7. CRITÉRIO DE DESEMPATE */}
                <article id="desempate" className="bg-[#0b1727] border border-white/5 rounded-3xl p-6 shadow-md flex flex-col gap-4 scroll-mt-24">
                    <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                        <span className="material-symbols-outlined text-emerald-400">rule</span>
                        <h2 className="text-lg font-black text-white">7. Critérios de Desempate</h2>
                    </div>
                    <p className="text-gray-300 text-sm leading-relaxed">
                        Em caso de empate na pontuação final entre dois ou mais participantes, a classificação final será definida rigorosamente pela seguinte ordem de critérios (eliminatórios):
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2 text-xs">
                        <div className="flex items-center gap-3 bg-[#132030] p-3 rounded-xl border border-white/5">
                            <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black">1</span>
                            <span className="text-gray-200">Acertou o campeão do torneio</span>
                        </div>
                        <div className="flex items-center gap-3 bg-[#132030] p-3 rounded-xl border border-white/5">
                            <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black">2</span>
                            <span className="text-gray-200">Acertou o vice-campeão</span>
                        </div>
                        <div className="flex items-center gap-3 bg-[#132030] p-3 rounded-xl border border-white/5">
                            <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black">3</span>
                            <span className="text-gray-200">Acertou o terceiro colocado</span>
                        </div>
                        <div className="flex items-center gap-3 bg-[#132030] p-3 rounded-xl border border-white/5">
                            <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black">4</span>
                            <span className="text-gray-200">Acertou o quarto colocado</span>
                        </div>
                        <div className="flex items-center gap-3 bg-[#132030] p-3 rounded-xl border border-white/5">
                            <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black">5</span>
                            <span className="text-gray-200">Maior número de placares exatos (resultado + placar correto)</span>
                        </div>
                        <div className="flex items-center gap-3 bg-[#132030] p-3 rounded-xl border border-white/5">
                            <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black">6</span>
                            <span className="text-gray-200">Sorteio (a ser definido pela organização)</span>
                        </div>
                    </div>
                </article>

                {/* 8. PREMIAÇÃO */}
                <article id="premiacao" className="bg-[#0b1727] border border-white/5 rounded-3xl p-6 shadow-md flex flex-col gap-4 scroll-mt-24">
                    <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                        <span className="material-symbols-outlined text-[#ffdb3c]">stars</span>
                        <h2 className="text-lg font-black text-white">8. Premiação</h2>
                    </div>
                    <p className="text-gray-300 text-sm leading-relaxed">
                        Os <strong>5 primeiros colocados</strong> ao final da competição serão premiados. Os prêmios serão entregues em data a ser divulgada após o encerramento oficial da Copa do Mundo 2026.
                    </p>

                    {/* Tabela de Prêmios */}
                    <div className="bg-[#132030] rounded-2xl overflow-hidden border border-white/5">
                        <div className="grid grid-cols-3 px-4 py-3 border-b border-white/5 text-[10px] uppercase font-bold text-gray-400">
                            <div>Colocação</div>
                            <div className="col-span-2">Prêmio</div>
                        </div>
                        <div className="flex flex-col">
                            <div className="grid grid-cols-3 items-center px-4 py-3.5 border-b border-white/5 last:border-none">
                                <div className="text-yellow-400 font-black text-xs flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm">emoji_events</span>
                                    1º Lugar
                                </div>
                                <div className="col-span-2 text-white font-bold text-sm">TV 50” 4K</div>
                            </div>
                            <div className="grid grid-cols-3 items-center px-4 py-3.5 border-b border-white/5 last:border-none">
                                <div className="text-slate-300 font-bold text-xs flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm">emoji_events</span>
                                    2º Lugar
                                </div>
                                <div className="col-span-2 text-white font-bold text-sm">Caixa de Som Polyvox Boombox 140W</div>
                            </div>
                            <div className="grid grid-cols-3 items-center px-4 py-3.5 border-b border-white/5 last:border-none">
                                <div className="text-amber-700 font-bold text-xs flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm">emoji_events</span>
                                    3º Lugar
                                </div>
                                <div className="col-span-2 text-white font-bold text-sm">Lavadora de Alta Pressão Karcher</div>
                            </div>
                            <div className="grid grid-cols-3 items-center px-4 py-3.5 border-b border-white/5 last:border-none">
                                <div className="text-emerald-400 font-bold text-xs flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm">emoji_events</span>
                                    4º Lugar
                                </div>
                                <div className="col-span-2 text-white font-bold text-sm">Panela Elétrica Multifuncional</div>
                            </div>
                            <div className="grid grid-cols-3 items-center px-4 py-3.5 border-b border-white/5 last:border-none">
                                <div className="text-emerald-400 font-bold text-xs flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm">emoji_events</span>
                                    5º Lugar
                                </div>
                                <div className="col-span-2 text-white font-bold text-sm">Panela Elétrica Multifuncional</div>
                            </div>
                        </div>
                    </div>
                </article>

                {/* 9. DISPOSIÇÕES GERAIS */}
                <article id="disposicoes" className="bg-[#0b1727] border border-white/5 rounded-3xl p-6 shadow-md flex flex-col gap-3 scroll-mt-24">
                    <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                        <span className="material-symbols-outlined text-emerald-400">gavel</span>
                        <h2 className="text-lg font-black text-white">9. Disposições Gerais</h2>
                    </div>
                    <ul className="list-disc list-inside text-gray-300 text-sm space-y-2 leading-relaxed">
                        <li>A organização do Bolão da Copa é de inteira responsabilidade do departamento de <strong>Cultura & Marca da Copercana</strong>.</li>
                        <li>Casos omissos ou situações não previstas neste regulamento serão resolvidos exclusivamente pelo departamento de <strong>Cultura & Marca em conjunto com a diretoria</strong>, cuja decisão é soberana e definitiva.</li>
                        <li>A Copercana reserva-se o direito de encerrar ou suspender a ação em caso de extrema necessidade, com comunicação prévia e transparente a todos os participantes.</li>
                    </ul>
                </article>

                {/* Footer Dúvidas */}
                <div className="bg-[#0b1727] border border-white/5 rounded-3xl p-6 shadow-md text-center flex flex-col items-center gap-3">
                    <span className="material-symbols-outlined text-emerald-400 text-4xl">contact_support</span>
                    <h3 className="text-lg font-bold text-white">Ficou com alguma dúvida?</h3>
                    <p className="text-gray-400 text-sm max-w-md">
                        Entre em contato diretamente com o departamento de <strong>Cultura & Marca</strong> pelos canais oficiais:
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 mt-2 text-xs">
                        <div className="flex items-center gap-2 bg-[#132030] px-4 py-3 rounded-2xl border border-white/5">
                            <span className="material-symbols-outlined text-emerald-400 text-sm">mail</span>
                            <a href="mailto:cultura@copercana.com.br" className="text-white font-semibold hover:underline">cultura@copercana.com.br</a>
                        </div>
                        <div className="flex items-center gap-2 bg-[#132030] px-4 py-3 rounded-2xl border border-white/5">
                            <span className="material-symbols-outlined text-emerald-400 text-sm">call</span>
                            <span className="text-white font-semibold">(16) 3946-3300 – ramal 9166</span>
                        </div>
                    </div>
                </div>

            </section>
        </main>
    );
}

export default Regras;
