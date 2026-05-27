import { calcularPontosPalpite } from './src/services/pontuacaoService';

// Tipagem baseada nas interfaces do pontuacaoService
interface Jogo {
  id: number;
  fase: string;
  time_a: string;
  time_b: string;
  placar_a: number;
  placar_b: number;
  classificado: string | null;
}

interface Palpite {
  id: number;
  colaborador_id: number;
  palpite_a: number;
  palpite_b: number;
  time_classificado_palpite: string | null;
  confronto_time_a: string | null;
  confronto_time_b: string | null;
}

function printSimulation(title: string, jogo: Jogo, palpite: Palpite) {
  console.log(`\n======================================================`);
  console.log(`CENÁRIO: ${title}`);
  console.log(`------------------------------------------------------`);
  console.log(`JOGO REAL: ${jogo.fase}`);
  console.log(`Confronto Real: ${jogo.time_a} ${jogo.placar_a} x ${jogo.placar_b} ${jogo.time_b}`);
  if (jogo.classificado) console.log(`Classificado Real: ${jogo.classificado}`);
  
  console.log(`\nPALPITE DO USUÁRIO:`);
  console.log(`Confronto Previsto: ${palpite.confronto_time_a} ${palpite.palpite_a} x ${palpite.palpite_b} ${palpite.confronto_time_b}`);
  if (palpite.time_classificado_palpite) console.log(`Classificado Previsto: ${palpite.time_classificado_palpite}`);
  
  const result = calcularPontosPalpite(jogo, palpite);
  console.log(`\n-> RESULTADO: ${result.pontos} PONTOS`);
  console.log(`(Acertou Resultado: ${result.acertou_resultado} | Acertou Placar: ${result.acertou_placar} | Acertou Confronto: ${result.acertou_confronto})`);
  console.log(`======================================================`);
}

// ----------------------------------------------------------------------------------
// Cenas de 16avos de Final
// ----------------------------------------------------------------------------------

// 1. 16avos: Acerta Placar Exato -> 5 pontos
printSimulation("16avos de final - Acertou Resultado e Placar na mosca",
  { id: 1, fase: '16avos de Final', time_a: 'Brasil', time_b: 'Sérvia', placar_a: 3, placar_b: 0, classificado: 'Brasil' },
  { id: 1, colaborador_id: 1, confronto_time_a: 'Brasil', confronto_time_b: 'Sérvia', palpite_a: 3, palpite_b: 0, time_classificado_palpite: null }
);

// 2. 16avos: Acerta Resultado, Erra Placar -> 2 pontos
printSimulation("16avos de final - Acertou quem venceu, mas errou o placar",
  { id: 2, fase: '16avos de Final', time_a: 'Argentina', time_b: 'México', placar_a: 2, placar_b: 0, classificado: 'Argentina' },
  { id: 2, colaborador_id: 1, confronto_time_a: 'Argentina', confronto_time_b: 'México', palpite_a: 1, palpite_b: 0, time_classificado_palpite: null }
);

// ----------------------------------------------------------------------------------
// Cenas de Oitavas (Sem Empate)
// ----------------------------------------------------------------------------------

// 3. Oitavas: Acerta Resultado, Acerta Confronto, Acerta Placar -> 5 pontos
printSimulation("Oitavas - Acertou Resultado, Confronto exato e Placar exato",
  { id: 3, fase: 'Oitavas de Final', time_a: 'Brasil', time_b: 'Uruguai', placar_a: 2, placar_b: 0, classificado: 'Brasil' },
  { id: 3, colaborador_id: 1, confronto_time_a: 'Brasil', confronto_time_b: 'Uruguai', palpite_a: 2, palpite_b: 0, time_classificado_palpite: null }
);

// 4. Oitavas: Acerta Resultado, Erra Confronto (adversário diferente), Acerta Placar -> 2 pontos
printSimulation("Oitavas - Acertou Resultado e Placar numérico, mas ERROU o Confronto (Adversário era outro)",
  { id: 4, fase: 'Oitavas de Final', time_a: 'Brasil', time_b: 'Holanda', placar_a: 2, placar_b: 0, classificado: 'Brasil' },
  { id: 4, colaborador_id: 1, confronto_time_a: 'Brasil', confronto_time_b: 'Argentina', palpite_a: 2, palpite_b: 0, time_classificado_palpite: null }
);

// 5. Oitavas: Acerta Resultado, Acerta Confronto, Erra Placar -> 2 pontos
printSimulation("Oitavas - Acertou Resultado e Confronto, mas errou Placar numérico",
  { id: 5, fase: 'Oitavas de Final', time_a: 'França', time_b: 'Inglaterra', placar_a: 3, placar_b: 1, classificado: 'França' },
  { id: 5, colaborador_id: 1, confronto_time_a: 'França', confronto_time_b: 'Inglaterra', palpite_a: 2, palpite_b: 0, time_classificado_palpite: null }
);

// ----------------------------------------------------------------------------------
// Cenas de Mata-Mata com Empate (Pênaltis)
// ----------------------------------------------------------------------------------

// 6. Quartas Empate: Acertou quem passou (classificado) + Placar exato do empate -> 5 pontos
printSimulation("Quartas de Final (Empate) - Acertou classificado e o placar exato do empate",
  { id: 6, fase: 'Quartas de Final', time_a: 'Espanha', time_b: 'Itália', placar_a: 1, placar_b: 1, classificado: 'Espanha' },
  { id: 6, colaborador_id: 1, confronto_time_a: 'Espanha', confronto_time_b: 'Itália', palpite_a: 1, palpite_b: 1, time_classificado_palpite: 'Espanha' }
);

// 7. Semifinal Empate: Acertou quem passou (classificado), mas errou placar do empate -> 2 pontos
printSimulation("Semifinal (Empate) - Acertou classificado, mas errou o placar exato do empate",
  { id: 7, fase: 'Semifinal', time_a: 'Brasil', time_b: 'França', placar_a: 2, placar_b: 2, classificado: 'Brasil' },
  { id: 7, colaborador_id: 1, confronto_time_a: 'Brasil', confronto_time_b: 'França', palpite_a: 1, palpite_b: 1, time_classificado_palpite: 'Brasil' }
);

// 8. Final Empate: Errou quem passou (classificado), mesmo acertando placar do empate -> 0 pontos
printSimulation("Final (Empate) - Errou o classificado, mas acertou o placar numérico do empate",
  { id: 8, fase: 'Final', time_a: 'Brasil', time_b: 'Argentina', placar_a: 0, placar_b: 0, classificado: 'Argentina' },
  { id: 8, colaborador_id: 1, confronto_time_a: 'Brasil', confronto_time_b: 'Argentina', palpite_a: 0, palpite_b: 0, time_classificado_palpite: 'Brasil' }
);

