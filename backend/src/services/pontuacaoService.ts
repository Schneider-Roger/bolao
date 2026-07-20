import pool from '../config/db';
import type { RowDataPacket } from 'mysql2';

// ============================================================
// MOTOR DE PONTUAÇÃO — Bolão Corporativo Copa 2026
// Regras conforme MVP oficial
// ============================================================

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

// Determina o resultado (V = time_a vence, E = empate, D = time_a perde)
function getResultado(a: number, b: number): 'V' | 'E' | 'D' {
  if (a > b) return 'V';
  if (a === b) return 'E';
  return 'D';
}

// Normaliza fase para comparação
function isFaseGrupo(fase: string): boolean {
  const f = fase.toLowerCase();
  return f.includes('grupo');
}

function isMataMata(fase: string): boolean {
  const f = fase.toLowerCase();
  return f.includes('16') || f.includes('avos') || f.includes('oitava') || f.includes('quarta') || f.includes('semi') || f.includes('final') || f.includes('terceiro') || f.includes('3º') || f.includes('lugar');
}

// ============================================================
// Calcula pontos de um palpite conforme o jogo
// ============================================================
export function calcularPontosPalpite(jogo: Jogo, palpite: Palpite): {
  pontos: number;
  acertou_resultado: boolean;
  acertou_placar: boolean;
  acertou_confronto: boolean;
} {
  // Se for o jogo África do Sul x Canadá (ID 97) ou Espanha x Bélgica (ID 122), força 0 pontos para todos
  if (Number(jogo.id) === 97 || Number(jogo.id) === 122) {
    return {
      pontos: 0,
      acertou_resultado: false,
      acertou_placar: false,
      acertou_confronto: false
    };
  }

  const resultadoReal = getResultado(jogo.placar_a, jogo.placar_b);
  const resultadoPalpite = getResultado(palpite.palpite_a, palpite.palpite_b);

  const acertouResultado = resultadoReal === resultadoPalpite;
  let acertouPlacar = palpite.palpite_a === jogo.placar_a && palpite.palpite_b === jogo.placar_b;

  if (isMataMata(jogo.fase)) {
    if (palpite.palpite_a !== null && palpite.palpite_b !== null && jogo.placar_a !== null && jogo.placar_b !== null && palpite.confronto_time_a && palpite.confronto_time_b && jogo.time_a && jogo.time_b) {
      const pA = palpite.confronto_time_a.toLowerCase().trim();
      const pB = palpite.confronto_time_b.toLowerCase().trim();
      const rA = jogo.time_a.toLowerCase().trim();
      const rB = jogo.time_b.toLowerCase().trim();

      if (pA === rA && pB === rB) {
        acertouPlacar = (palpite.palpite_a === jogo.placar_a && palpite.palpite_b === jogo.placar_b);
      } else if (pA === rB && pB === rA) {
        acertouPlacar = (palpite.palpite_a === jogo.placar_b && palpite.palpite_b === jogo.placar_a);
      } else if (pA === rA) {
        acertouPlacar = (palpite.palpite_a === jogo.placar_a && palpite.palpite_b === jogo.placar_b);
      } else if (pA === rB) {
        acertouPlacar = (palpite.palpite_a === jogo.placar_b && palpite.palpite_b === jogo.placar_a);
      } else if (pB === rA) {
        acertouPlacar = (palpite.palpite_b === jogo.placar_a && palpite.palpite_a === jogo.placar_b);
      } else if (pB === rB) {
        acertouPlacar = (palpite.palpite_b === jogo.placar_b && palpite.palpite_a === jogo.placar_a);
      }
    }
  }

  // Para mata-mata com empate no tempo regulamentar: valida classificado
  const eEmpateReal = resultadoReal === 'E';

  // Acertos de confronto e classificado
  let acertouConfronto = false;
  let acertouClassificado = false;

  if (isFaseGrupo(jogo.fase)) {
    if (palpite.confronto_time_a && palpite.confronto_time_b && jogo.time_a && jogo.time_b) {
      const confrontoReal = [jogo.time_a.toLowerCase().trim(), jogo.time_b.toLowerCase().trim()].sort();
      const confrontoPrev = [palpite.confronto_time_a.toLowerCase().trim(), palpite.confronto_time_b.toLowerCase().trim()].sort();
      acertouConfronto = (confrontoReal[0] === confrontoPrev[0]) && (confrontoReal[1] === confrontoPrev[1]);
    }
  } else if (isMataMata(jogo.fase)) {
    // Para mata-mata: compara se os times do palpite do usuário são os mesmos do jogo real
    if (palpite.confronto_time_a && palpite.confronto_time_b && jogo.time_a && jogo.time_b) {
      const confrontoReal = [jogo.time_a.toLowerCase().trim(), jogo.time_b.toLowerCase().trim()].sort();
      const confrontoPrev = [palpite.confronto_time_a.toLowerCase().trim(), palpite.confronto_time_b.toLowerCase().trim()].sort();
      acertouConfronto = (confrontoReal[0] === confrontoPrev[0]) && (confrontoReal[1] === confrontoPrev[1]);
    } else {
      acertouConfronto = false;
    }

    // Determina o classificado real (vencedor oficial do jogo)
    let classificadoReal = jogo.classificado;
    if (!classificadoReal && jogo.placar_a !== null && jogo.placar_b !== null) {
      const ja = Number(jogo.placar_a);
      const jb = Number(jogo.placar_b);
      if (ja > jb) {
        classificadoReal = jogo.time_a;
      } else if (jb > ja) {
        classificadoReal = jogo.time_b;
      }
    }

    // Determina o classificado previsto pelo participante (mapeado para o time real de acordo com as colunas)
    if (palpite.palpite_a !== null && palpite.palpite_b !== null && jogo.time_a && jogo.time_b) {
      const pa = Number(palpite.palpite_a);
      const pb = Number(palpite.palpite_b);
      let classificadoPalpiteSide: 'a' | 'b' | null = null;

      if (pa > pb) {
        classificadoPalpiteSide = 'a';
      } else if (pb > pa) {
        classificadoPalpiteSide = 'b';
      } else {
        // Empate no palpite: olha qual time foi configurado como classificado no palpite
        const cp = palpite.time_classificado_palpite ? palpite.time_classificado_palpite.toLowerCase().trim() : '';
        const prevA = palpite.confronto_time_a ? palpite.confronto_time_a.toLowerCase().trim() : '';
        const prevB = palpite.confronto_time_b ? palpite.confronto_time_b.toLowerCase().trim() : '';

        if (cp === prevA && prevA !== '') {
          classificadoPalpiteSide = 'a';
        } else if (cp === prevB && prevB !== '') {
          classificadoPalpiteSide = 'b';
        } else {
          // Caso genérico ou backup
          const realA = jogo.time_a.toLowerCase().trim();
          const realB = jogo.time_b.toLowerCase().trim();
          if (cp === realA) {
            classificadoPalpiteSide = 'a';
          } else if (cp === realB) {
            classificadoPalpiteSide = 'b';
          }
        }
      }

      // Primeiro verifica se o nome do classificado do palpite coincide diretamente com o classificado real
      const cpName = palpite.time_classificado_palpite ? palpite.time_classificado_palpite.toLowerCase().trim() : '';
      const crName = classificadoReal ? classificadoReal.toLowerCase().trim() : '';

      if (cpName && crName && cpName === crName) {
        acertouClassificado = true;
      } else {
        // Se os nomes não coincidem diretamente, usamos a regra do lado do chaveamento
        if (classificadoPalpiteSide && classificadoReal) {
          const classificadoRealLower = classificadoReal.toLowerCase().trim();
          const expectedRealClassificado = classificadoPalpiteSide === 'a' 
            ? jogo.time_a.toLowerCase().trim() 
            : jogo.time_b.toLowerCase().trim();
          
          acertouClassificado = (classificadoRealLower === expectedRealClassificado);
        }
      }
    }
  }

  let pontos = 0;

  if (isFaseGrupo(jogo.fase)) {
    // ── Fase de grupos ──
    // resultado + placar = 5 | apenas resultado = 2 | erro = 0
    if (acertouResultado) {
      if (acertouPlacar) {
        pontos = 5;
      } else {
        pontos = 2;
      }
    }
  } else if (isMataMata(jogo.fase)) {
    // ── Mata-mata: validação baseada no acerto do time que avança (classificado) ──
    if (acertouClassificado) {
      if (acertouConfronto && acertouPlacar) {
        pontos = 5;
      } else {
        pontos = 2;
      }
    }
  }

  const finalAcertouResultado = isMataMata(jogo.fase) ? acertouClassificado : acertouResultado;

  return { pontos, acertou_resultado: finalAcertouResultado, acertou_placar: acertouPlacar, acertou_confronto: acertouConfronto };
}

// ============================================================
// Recalcula ranking completo de todos os colaboradores
// ============================================================
async function recalcularRanking(): Promise<void> {
  // Busca soma de pontos e estatísticas por colaborador (apenas jogos pontuados)
  const [rows] = await pool.query<RowDataPacket[]>(`
    SELECT 
      c.id AS colaborador_id,
      COALESCE(SUM(pj.pontos), 0) AS pontos_total,
      COALESCE(SUM(CASE WHEN pj.acertou_placar = 1 THEN 1 ELSE 0 END), 0) AS placares_exatos,
      COALESCE(SUM(CASE WHEN pj.acertou_resultado = 1 THEN 1 ELSE 0 END), 0) AS acertos_resultado,
      COALESCE(SUM(CASE WHEN pj.acertou_resultado = 0 AND pj.id IS NOT NULL THEN 1 ELSE 0 END), 0) AS erros,
      COUNT(pj.id) AS palpites_feitos
    FROM colaboradores c
    LEFT JOIN (
      SELECT p.* 
      FROM palpites p
      INNER JOIN jogos j ON j.id = p.jogo_id AND j.status = 'pontuado'
    ) pj ON pj.colaborador_id = c.id
    WHERE c.ativo = 1 AND c.apelido IS NOT NULL AND c.selecao_favorita IS NOT NULL
    GROUP BY c.id
  `);

  // Busca desempates (palpites especiais)
  const [especiais] = await pool.query<RowDataPacket[]>(`
    SELECT 
      colaborador_id,
      acertou_campeao,
      acertou_vice,
      acertou_terceiro,
      acertou_quarto
    FROM palpites_especiais
  `);

  const especiaisMap: Record<number, any> = {};
  for (const e of especiais) {
    especiaisMap[e.colaborador_id] = e;
  }

  // Monta ranking ordenado: pontos DESC, desempates oficiais
  const rankingData = rows.map((r) => {
    const e = especiaisMap[r.colaborador_id] || {};
    return {
      colaborador_id: r.colaborador_id,
      pontos_total: r.pontos_total,
      placares_exatos: r.placares_exatos,
      acertos_resultado: r.acertos_resultado,
      erros: r.erros,
      palpites_feitos: r.palpites_feitos,
      desempate_campeao: e.acertou_campeao ? 1 : 0,
      desempate_vice: e.acertou_vice ? 1 : 0,
      desempate_terceiro: e.acertou_terceiro ? 1 : 0,
      desempate_quarto: e.acertou_quarto ? 1 : 0,
    };
  });

  // Ordena por critérios de desempate oficiais
  rankingData.sort((a, b) => {
    if (b.pontos_total !== a.pontos_total) return b.pontos_total - a.pontos_total;
    if (b.desempate_campeao !== a.desempate_campeao) return b.desempate_campeao - a.desempate_campeao;
    if (b.desempate_vice !== a.desempate_vice) return b.desempate_vice - a.desempate_vice;
    if (b.desempate_terceiro !== a.desempate_terceiro) return b.desempate_terceiro - a.desempate_terceiro;
    if (b.desempate_quarto !== a.desempate_quarto) return b.desempate_quarto - a.desempate_quarto;
    if (b.placares_exatos !== a.placares_exatos) return b.placares_exatos - a.placares_exatos;
    return 0; // par ou ímpar — não implementado automaticamente
  });

  // Upsert no ranking
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Limpar o ranking para evitar sujeira de usuários que não deveriam estar
    await conn.query(`DELETE FROM ranking`);

    let currentPosition = 1;
    for (let i = 0; i < rankingData.length; i++) {
      const r = rankingData[i]!;
      if (i > 0) {
        const prev = rankingData[i - 1]!;
        const isTied =
          r.pontos_total === prev.pontos_total &&
          r.desempate_campeao === prev.desempate_campeao &&
          r.desempate_vice === prev.desempate_vice &&
          r.desempate_terceiro === prev.desempate_terceiro &&
          r.desempate_quarto === prev.desempate_quarto &&
          r.placares_exatos === prev.placares_exatos;

        if (!isTied) {
          currentPosition = i + 1;
        }
      }

      await conn.query(`
        INSERT INTO ranking (
          colaborador_id, posicao, pontos_total, placares_exatos,
          acertos_resultado, erros, palpites_feitos,
          desempate_campeao, desempate_vice, desempate_terceiro, desempate_quarto
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          posicao = VALUES(posicao),
          pontos_total = VALUES(pontos_total),
          placares_exatos = VALUES(placares_exatos),
          acertos_resultado = VALUES(acertos_resultado),
          erros = VALUES(erros),
          palpites_feitos = VALUES(palpites_feitos),
          desempate_campeao = VALUES(desempate_campeao),
          desempate_vice = VALUES(desempate_vice),
          desempate_terceiro = VALUES(desempate_terceiro),
          desempate_quarto = VALUES(desempate_quarto)
      `, [
        r.colaborador_id, currentPosition, r.pontos_total, r.placares_exatos,
        r.acertos_resultado, r.erros, r.palpites_feitos,
        r.desempate_campeao, r.desempate_vice, r.desempate_terceiro, r.desempate_quarto
      ]);
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// ============================================================
// Função principal: pontua todos os palpites de um jogo
// ============================================================
export async function pontuarJogo(jogoId: number): Promise<void> {
  const conn = await pool.getConnection();
  try {
    // Busca dados do jogo
    const [jogos] = await conn.query<RowDataPacket[]>(
      'SELECT id, fase, time_a, time_b, placar_a, placar_b, classificado FROM jogos WHERE id = ?',
      [jogoId]
    );

    if (jogos.length === 0) throw new Error('Jogo não encontrado');
    const jogo = jogos[0] as Jogo;

    // Busca todos os palpites deste jogo
    const [palpites] = await conn.query<RowDataPacket[]>(`
      SELECT id, colaborador_id, palpite_a, palpite_b,
             time_classificado_palpite, confronto_time_a, confronto_time_b
      FROM palpites WHERE jogo_id = ?
    `, [jogoId]);

    await conn.beginTransaction();

    for (const palpite of palpites) {
      const { pontos, acertou_resultado, acertou_placar, acertou_confronto } =
        calcularPontosPalpite(jogo, palpite as Palpite);

      await conn.query(`
        UPDATE palpites 
        SET pontos = ?, acertou_resultado = ?, acertou_placar = ?, acertou_confronto = ?
        WHERE id = ?
      `, [pontos, acertou_resultado ? 1 : 0, acertou_placar ? 1 : 0, acertou_confronto ? 1 : 0, palpite.id]);
    }

    // Marca jogo como 'pontuado'
    await conn.query(
      "UPDATE jogos SET status = 'pontuado' WHERE id = ?",
      [jogoId]
    );

    // Propaga classificado/vencedor real para a fase seguinte no banco
    if (isMataMata(jogo.fase)) {
      let classificadoReal = jogo.classificado;
      if (!classificadoReal && jogo.placar_a !== null && jogo.placar_b !== null) {
        const ja = Number(jogo.placar_a);
        const jb = Number(jogo.placar_b);
        if (ja > jb) {
          classificadoReal = jogo.time_a;
        } else if (jb > ja) {
          classificadoReal = jogo.time_b;
        }
      }

      if (classificadoReal) {
        const oitavas: Record<number, { proximoId: number; lado: 'a' | 'b' }> = {
          113: { proximoId: 121, lado: 'a' }, 114: { proximoId: 121, lado: 'b' },
          115: { proximoId: 122, lado: 'a' }, 116: { proximoId: 122, lado: 'b' },
          117: { proximoId: 123, lado: 'a' }, 118: { proximoId: 123, lado: 'b' },
          119: { proximoId: 124, lado: 'b' }, 120: { proximoId: 124, lado: 'a' }
        };

        const quartas: Record<number, { proximoId: number; lado: 'a' | 'b' }> = {
          121: { proximoId: 125, lado: 'a' }, 122: { proximoId: 125, lado: 'b' },
          123: { proximoId: 126, lado: 'a' }, 124: { proximoId: 126, lado: 'b' }
        };

        if (oitavas[jogoId]) {
          const { proximoId, lado } = oitavas[jogoId];
          await conn.query(
            `UPDATE jogos SET time_${lado} = ? WHERE id = ?`,
            [classificadoReal, proximoId]
          );
        } else if (quartas[jogoId]) {
          const { proximoId, lado } = quartas[jogoId];
          await conn.query(
            `UPDATE jogos SET time_${lado} = ? WHERE id = ?`,
            [classificadoReal, proximoId]
          );
        } else if (jogoId === 125 || jogoId === 126) {
          const lado = jogoId === 125 ? 'a' : 'b';
          // Vencedor vai para a Final (128)
          await conn.query(
            `UPDATE jogos SET time_${lado} = ? WHERE id = 128`,
            [classificadoReal]
          );
          // Perdedor vai para a Disputa de 3º Lugar (127)
          const perdedorReal = classificadoReal.toLowerCase().trim() === jogo.time_a.toLowerCase().trim()
            ? jogo.time_b
            : jogo.time_a;
          if (perdedorReal) {
            await conn.query(
              `UPDATE jogos SET time_${lado} = ? WHERE id = 127`,
              [perdedorReal]
            );
          }
        }
      }
    }

    await conn.commit();
    conn.release();

    // Recalcula ranking global
    await recalcularRanking();

  } catch (err) {
    await conn.rollback();
    conn.release();
    throw err;
  }
}

export { recalcularRanking };
