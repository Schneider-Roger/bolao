import { Request, Response } from 'express';
import pool from '../../config/db';
import type { RowDataPacket } from 'mysql2';

export const getJogos = async (req: Request, res: Response): Promise<any> => {
  try {
    // @ts-ignore
    const userId = req.user.id;

    const [jogos] = await pool.query<RowDataPacket[]>(`
      SELECT 
        j.id, j.fase, j.rodada, j.time_a, j.time_b, 
        j.data_hora as data, j.status, j.placar_a, j.placar_b, j.encerramento_palpite, j.classificado,
        p.palpite_a, p.palpite_b, p.time_classificado_palpite, p.pontos
      FROM jogos j
      LEFT JOIN palpites p ON p.jogo_id = j.id AND p.colaborador_id = ?
      ORDER BY j.data_hora ASC
    `, [userId]);

    return res.status(200).json({ success: true, jogos });
  } catch (error) {
    console.error('Erro ao buscar jogos:', error);
    return res.status(500).json({ success: false, error: 'Erro interno ao buscar jogos' });
  }
};

export const getJogoById = async (req: Request, res: Response): Promise<any> => {
  try {
    const jogoId = req.params.id;
    // @ts-ignore
    const userId = req.user.id;

    // Busca o jogo
    const [jogos] = await pool.query<RowDataPacket[]>(`
      SELECT * FROM jogos WHERE id = ?
    `, [jogoId]);

    if (jogos.length === 0) {
      return res.status(404).json({ success: false, error: 'Jogo não encontrado' });
    }

    const jogo = jogos[0];

    // Busca palpite do usuário, se houver
    const [palpites] = await pool.query<RowDataPacket[]>(`
      SELECT palpite_a, palpite_b, time_classificado_palpite 
      FROM palpites 
      WHERE jogo_id = ? AND colaborador_id = ?
    `, [jogoId, userId]);

    // Busca se o bracket foi salvo no colaborador
    const [colaborador] = await pool.query<RowDataPacket[]>(`
      SELECT bracket_mata_mata_salvo FROM colaboradores WHERE id = ?
    `, [userId]);

    return res.status(200).json({ 
      success: true, 
      jogo, 
      palpite: palpites.length > 0 ? palpites[0] : null,
      bracketSalvo: colaborador[0]?.bracket_mata_mata_salvo ? true : false
    });

  } catch (error) {
    console.error('Erro ao buscar jogo detalhado:', error);
    return res.status(500).json({ success: false, error: 'Erro ao buscar detalhes do jogo' });
  }
};

export const salvarPalpite = async (req: Request, res: Response): Promise<any> => {
  try {
    const jogoId = req.params.id;
    // @ts-ignore
    const userId = req.user.id;
    const { palpite_a, palpite_b, classificado, time_classificado_palpite, confronto_time_a: confronto_time_a_body, confronto_time_b: confronto_time_b_body } = req.body;

    if (palpite_a === undefined || palpite_b === undefined) {
      return res.status(400).json({ success: false, error: 'Preencha os dois placares' });
    }

    if (Number(palpite_a) < 0 || Number(palpite_b) < 0 || Number(palpite_a) > 99 || Number(palpite_b) > 99) {
      return res.status(400).json({ success: false, error: 'Placar inválido. Valores devem ser entre 0 e 99.' });
    }

    // Verifica se o colaborador já salvou o bracket do mata-mata
    const [colaborador] = await pool.query<RowDataPacket[]>(`
      SELECT bracket_mata_mata_salvo FROM colaboradores WHERE id = ?
    `, [userId]);
    const bracketSalvo = colaborador[0]?.bracket_mata_mata_salvo || false;

    // Verifica se o jogo ainda permite palpites
    const [jogos] = await pool.query<RowDataPacket[]>(`
      SELECT encerramento_palpite, data_hora, fase, time_a, time_b FROM jogos WHERE id = ?
    `, [jogoId]);

    if (jogos.length === 0) {
      return res.status(404).json({ success: false, error: 'Jogo não encontrado' });
    }

    const jogo = jogos[0];
    const isMataMata = !jogo.fase.toLowerCase().includes('grupo');

    const agora = new Date();
    // Se encerramento_palpite for null, usa data_hora do jogo - 1 hora como limite
    const encerramentoVal = jogo.encerramento_palpite
      ? new Date(jogo.encerramento_palpite)
      : new Date(new Date(jogo.data_hora).getTime() - 60 * 60 * 1000);

    if (agora > encerramentoVal && Number(jogoId) !== 97) {
      return res.status(403).json({ success: false, error: 'O tempo para palpitar neste jogo já esgotou.' });
    }

    let classificadoVal = classificado || time_classificado_palpite || null;

    // Para jogos de mata-mata, preservar confronto_time_a/b já calculados (não sobrescrever com 'A Definir')
    // Prioridade: 1) valor enviado pelo frontend, 2) valor já salvo no banco, 3) jogo.time_a/b
    let confrontoA = jogo.time_a;
    let confrontoB = jogo.time_b;

    if (isMataMata) {
      // 1) Usa valores enviados pelo frontend se disponíveis e válidos
      if (confronto_time_a_body && confronto_time_a_body !== 'A Definir') {
        confrontoA = confronto_time_a_body;
      } else if (confrontoA === 'A Definir') {
        // 2) Busca confronto já salvo no banco para não sobrescrever com 'A Definir'
        const [palpiteExistente] = await pool.query<RowDataPacket[]>(
          'SELECT confronto_time_a, confronto_time_b FROM palpites WHERE colaborador_id = ? AND jogo_id = ?',
          [userId, jogoId]
        );
        if (palpiteExistente[0]?.confronto_time_a && palpiteExistente[0].confronto_time_a !== 'A Definir') {
          confrontoA = palpiteExistente[0].confronto_time_a;
        }
        if (palpiteExistente[0]?.confronto_time_b && palpiteExistente[0].confronto_time_b !== 'A Definir') {
          confrontoB = palpiteExistente[0].confronto_time_b;
        }
      }
      if (confronto_time_b_body && confronto_time_b_body !== 'A Definir') {
        confrontoB = confronto_time_b_body;
      }
    }

    if (isMataMata && (!classificadoVal || classificadoVal === 'A Definir') && 
        palpite_a !== undefined && palpite_a !== null && 
        palpite_b !== undefined && palpite_b !== null) {
      const pa = Number(palpite_a);
      const pb = Number(palpite_b);
      if (pa > pb) {
        classificadoVal = confrontoA;
      } else if (pb > pa) {
        classificadoVal = confrontoB;
      }
    }

    // Salva ou atualiza o palpite do jogo (Upsert)
    await pool.query(`
      INSERT INTO palpites (
        colaborador_id, jogo_id, palpite_a, palpite_b, 
        time_classificado_palpite, confronto_time_a, confronto_time_b
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        palpite_a = VALUES(palpite_a), 
        palpite_b = VALUES(palpite_b), 
        time_classificado_palpite = VALUES(time_classificado_palpite),
        confronto_time_a = VALUES(confronto_time_a),
        confronto_time_b = VALUES(confronto_time_b)
    `, [userId, jogoId, palpite_a, palpite_b, classificadoVal, confrontoA, confrontoB]);

    if (isMataMata) {
      // PROPAGAÇÃO RECURSIVA:
      // Busca todos os jogos do mata-mata ordenados por data_hora ASC para resolver os índices de forma dinâmica
      const [jogosMataMata] = await pool.query<RowDataPacket[]>(
        "SELECT id, fase FROM jogos WHERE fase NOT LIKE 'Grupo %' ORDER BY data_hora ASC"
      );
      
      const idToIndex = new Map<number, number>();
      const indexToId: Record<number, number> = {};
      jogosMataMata.forEach((j, idx) => {
        idToIndex.set(Number(j.id), idx);
        indexToId[idx] = Number(j.id);
      });

      const getProximoConfronto = (atualId: number): { proximoId: number; lado: 'a' | 'b' } | null => {
        // 16avos de Final -> Oitavas de Final
        const m16: Record<number, { proximoId: number; lado: 'a' | 'b' }> = {
            99: { proximoId: 113, lado: 'a' }, 102: { proximoId: 113, lado: 'b' },
            97: { proximoId: 114, lado: 'a' }, 100: { proximoId: 114, lado: 'b' },
            108: { proximoId: 115, lado: 'a' }, 107: { proximoId: 115, lado: 'b' },
            106: { proximoId: 116, lado: 'a' }, 105: { proximoId: 116, lado: 'b' },
            98: { proximoId: 117, lado: 'a' }, 101: { proximoId: 117, lado: 'b' },
            103: { proximoId: 118, lado: 'a' }, 104: { proximoId: 118, lado: 'b' },
            111: { proximoId: 119, lado: 'a' }, 110: { proximoId: 119, lado: 'b' },
            109: { proximoId: 120, lado: 'a' }, 112: { proximoId: 120, lado: 'b' }
        };
        if (m16[atualId]) return m16[atualId];
        
        // Oitavas de Final -> Quartas de Final
        const oitavas: Record<number, { proximoId: number; lado: 'a' | 'b' }> = {
            113: { proximoId: 121, lado: 'a' }, 114: { proximoId: 121, lado: 'b' },
            115: { proximoId: 122, lado: 'a' }, 116: { proximoId: 122, lado: 'b' },
            117: { proximoId: 123, lado: 'a' }, 118: { proximoId: 123, lado: 'b' },
            119: { proximoId: 124, lado: 'b' }, 120: { proximoId: 124, lado: 'a' }
        };
        if (oitavas[atualId]) return oitavas[atualId];

        // Quartas de Final -> Semifinais
        const quartas: Record<number, { proximoId: number; lado: 'a' | 'b' }> = {
            121: { proximoId: 125, lado: 'a' }, 122: { proximoId: 125, lado: 'b' },
            123: { proximoId: 126, lado: 'a' }, 124: { proximoId: 126, lado: 'b' }
        };
        if (quartas[atualId]) return quartas[atualId];
        
        return null; 
      };

      const propagar = async (atualId: number) => {
        const atualIdx = idToIndex.get(Number(atualId));
        if (atualIdx === undefined) return;

        const [palpitesAtual] = await pool.query<RowDataPacket[]>(
          'SELECT palpite_a, palpite_b, time_classificado_palpite, confronto_time_a, confronto_time_b FROM palpites WHERE colaborador_id = ? AND jogo_id = ?',
          [userId, atualId]
        );
        const p = palpitesAtual[0];
        if (!p) return;

        let vencedor: string | null = null;
        let perdedor: string | null = null;

        if (p.palpite_a !== null && p.palpite_b !== null) {
          const pa = Number(p.palpite_a);
          const pb = Number(p.palpite_b);
          if (pa > pb) {
            vencedor = p.confronto_time_a;
            perdedor = p.confronto_time_b;
          } else if (pb > pa) {
            vencedor = p.confronto_time_b;
            perdedor = p.confronto_time_a;
          } else {
            vencedor = p.time_classificado_palpite;
            perdedor = vencedor === p.confronto_time_a ? p.confronto_time_b : p.confronto_time_a;
          }
        }

        // Semifinais (125 e 126) alimentam a Final (128) e o 3º Lugar (127)
        if (atualId === 125 || atualId === 126) {
          const finalId = 128;
          const terceiroId = 127;
          const lado = atualId === 125 ? 'a' : 'b';

          if (finalId) {
            await pool.query(
              `UPDATE palpites SET confronto_time_${lado} = ? WHERE colaborador_id = ? AND jogo_id = ?`,
              [vencedor, userId, finalId]
            );
            await propagar(finalId);
          }
          if (terceiroId) {
            await pool.query(
              `UPDATE palpites SET confronto_time_${lado} = ? WHERE colaborador_id = ? AND jogo_id = ?`,
              [perdedor, userId, terceiroId]
            );
            await propagar(terceiroId);
          }
          return;
        }

        const proximo = getProximoConfronto(atualId);
        if (proximo) {
          const proximoId = proximo.proximoId;
          if (proximoId) {
            await pool.query(
              `UPDATE palpites SET confronto_time_${proximo.lado} = ? WHERE colaborador_id = ? AND jogo_id = ?`,
              [vencedor, userId, proximoId]
            );
            
            const [proximoPalpites] = await pool.query<RowDataPacket[]>(
              'SELECT palpite_a, palpite_b, time_classificado_palpite, confronto_time_a, confronto_time_b FROM palpites WHERE colaborador_id = ? AND jogo_id = ?',
              [userId, proximoId]
            );
            const nextP = proximoPalpites[0];
            if (nextP) {
              const ta = nextP.confronto_time_a;
              const tb = nextP.confronto_time_b;
              let nextClassificado = nextP.time_classificado_palpite;
              
              if (nextP.palpite_a !== null && nextP.palpite_b !== null) {
                const npa = Number(nextP.palpite_a);
                const npb = Number(nextP.palpite_b);
                if (npa > npb) nextClassificado = ta;
                else if (npb > npa) nextClassificado = tb;
                else if (nextClassificado !== ta && nextClassificado !== tb) {
                  nextClassificado = null;
                }
              } else if (nextClassificado !== ta && nextClassificado !== tb) {
                nextClassificado = null;
              }
              
              await pool.query(
                `UPDATE palpites SET time_classificado_palpite = ? WHERE colaborador_id = ? AND jogo_id = ?`,
                [nextClassificado, userId, proximoId]
              );
            }

            await propagar(proximoId);
          }
        }
      };

      await propagar(Number(jogoId));
    }

    return res.status(200).json({ success: true, message: 'Palpite salvo com sucesso!' });

  } catch (error) {
    console.error('Erro ao salvar palpite:', error);
    return res.status(500).json({ success: false, error: 'Erro ao salvar palpite' });
  }
};

export const getMeusResultados = async (req: Request, res: Response): Promise<any> => {
  try {
    // @ts-ignore
    const userId = req.user.id;

    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT 
        p.jogo_id,
        j.time_a, j.time_b, j.placar_a, j.placar_b, j.data_hora as data,
        p.pontos, p.acertou_placar, p.acertou_resultado
      FROM palpites p
      INNER JOIN jogos j ON j.id = p.jogo_id
      WHERE p.colaborador_id = ? AND j.status IN ('encerrado', 'pontuado')
      ORDER BY j.data_hora DESC
      LIMIT 10
    `, [userId]);

    return res.status(200).json({ success: true, resultados: rows });
  } catch (error) {
    console.error('Erro ao buscar resultados:', error);
    return res.status(500).json({ success: false, error: 'Erro ao buscar resultados' });
  }
};

export const getBracket = async (req: Request, res: Response): Promise<any> => {
  try {
    // @ts-ignore
    const userId = req.user.id;

    // 0. Verifica se a fase de grupos já terminou para liberar o mata-mata
    const [jogosGrupos] = await pool.query<RowDataPacket[]>(`
      SELECT id FROM jogos WHERE fase LIKE 'Grupo %' AND status NOT IN ('encerrado', 'pontuado')
    `);
    const liberado = jogosGrupos.length === 0;

    // 1. Busca os jogos do mata-mata
    const [jogos] = await pool.query<RowDataPacket[]>(`
      SELECT 
        id, fase, rodada, time_a, time_b, 
        data_hora as data, status, placar_a, placar_b, encerramento_palpite
      FROM jogos
      WHERE fase NOT LIKE 'Grupo %'
      ORDER BY data_hora ASC
    `);

    // 2. Busca os palpites do usuário para o mata-mata
    const [palpites] = await pool.query<RowDataPacket[]>(`
      SELECT jogo_id, palpite_a, palpite_b, time_classificado_palpite, confronto_time_a, confronto_time_b, pontos
      FROM palpites
      WHERE colaborador_id = ? AND jogo_id IN (
        SELECT id FROM jogos WHERE fase NOT LIKE 'Grupo %'
      )
    `, [userId]);

    // 3. Busca se o bracket foi salvo no colaborador
    const [colaborador] = await pool.query<RowDataPacket[]>(`
      SELECT bracket_mata_mata_salvo FROM colaboradores WHERE id = ?
    `, [userId]);

    return res.status(200).json({
      success: true,
      liberado,
      bracketSalvo: colaborador[0]?.bracket_mata_mata_salvo ? true : false,
      jogos,
      palpites
    });

  } catch (error) {
    console.error('Erro ao buscar bracket:', error);
    return res.status(500).json({ success: false, error: 'Erro ao buscar bracket' });
  }
};

export const salvarBracket = async (req: Request, res: Response): Promise<any> => {
  try {
    // @ts-ignore
    const userId = req.user.id;
    const { palpites } = req.body;

    if (!palpites || !Array.isArray(palpites)) {
      return res.status(400).json({ success: false, error: 'Lista de palpites inválida' });
    }

    // Valida números negativos e absurdos
    for (const p of palpites) {
      if (p.palpite_a !== undefined && p.palpite_a !== null && (Number(p.palpite_a) < 0 || Number(p.palpite_a) > 99)) {
        return res.status(400).json({ success: false, error: 'Placar inválido no bracket.' });
      }
      if (p.palpite_b !== undefined && p.palpite_b !== null && (Number(p.palpite_b) < 0 || Number(p.palpite_b) > 99)) {
        return res.status(400).json({ success: false, error: 'Placar inválido no bracket.' });
      }
    }

    // 0. Verifica se a fase de grupos já terminou (so pode ser liberada quando acabar a fase de grupo)
    const [jogosGrupos] = await pool.query<RowDataPacket[]>(`
      SELECT id FROM jogos WHERE fase LIKE 'Grupo %' AND status NOT IN ('encerrado', 'pontuado')
    `);
    
    if (jogosGrupos.length > 0) {
      return res.status(403).json({ success: false, error: 'O mata-mata só será liberado para palpites após o término de todos os jogos da Fase de Grupos.' });
    }


    // 1. Verifica se já foi salvo anteriormente
    const [colaborador] = await pool.query<RowDataPacket[]>(`
      SELECT bracket_mata_mata_salvo FROM colaboradores WHERE id = ?
    `, [userId]);

    if (colaborador[0]?.bracket_mata_mata_salvo) {
      return res.status(400).json({ success: false, error: 'Seu bracket de mata-mata já foi salvo e não pode ser reconfigurado por completo.' });
    }

    // 2. Salva todos os palpites do mata-mata
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      for (const p of palpites) {
        const { jogo_id, palpite_a, palpite_b, time_classificado_palpite, confronto_time_a, confronto_time_b } = p;

        // Verifica se o prazo para este jogo individual já expirou
        const [jogoRows] = await conn.query<RowDataPacket[]>(`
          SELECT encerramento_palpite, data_hora FROM jogos WHERE id = ?
        `, [jogo_id]);
        
        if (jogoRows[0]) {
          const limiteJogo = jogoRows[0].encerramento_palpite
            ? new Date(jogoRows[0].encerramento_palpite)
            : new Date(new Date(jogoRows[0].data_hora).getTime() - 60 * 60 * 1000);
          const agora = new Date();
          if (agora > limiteJogo && Number(jogo_id) !== 97) {
            // Se o jogo já iniciou, ignoramos a atualização deste palpite (a menos que seja o jogo 97)
            continue;
          }
        }

        let finalClassificado = time_classificado_palpite || null;
        if ((!finalClassificado || finalClassificado === 'A Definir') && 
            palpite_a !== undefined && palpite_a !== null && 
            palpite_b !== undefined && palpite_b !== null) {
          const pa = Number(palpite_a);
          const pb = Number(palpite_b);
          if (pa > pb) {
            finalClassificado = confronto_time_a || null;
          } else if (pb > pa) {
            finalClassificado = confronto_time_b || null;
          }
        }

        await conn.query(`
          INSERT INTO palpites (
            colaborador_id, jogo_id, palpite_a, palpite_b, 
            time_classificado_palpite, confronto_time_a, confronto_time_b
          )
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE 
            palpite_a = VALUES(palpite_a), 
            palpite_b = VALUES(palpite_b), 
            time_classificado_palpite = VALUES(time_classificado_palpite),
            confronto_time_a = VALUES(confronto_time_a),
            confronto_time_b = VALUES(confronto_time_b)
        `, [
          userId, 
          jogo_id, 
          palpite_a !== undefined && palpite_a !== null ? palpite_a : null, 
          palpite_b !== undefined && palpite_b !== null ? palpite_b : null, 
          finalClassificado, 
          confronto_time_a || null, 
          confronto_time_b || null
        ]);
      }

      // Marca como bracket_mata_mata_salvo no perfil do colaborador apenas se estiver salvando os jogos finais
      const [finalJogos] = await conn.query<RowDataPacket[]>(`SELECT id FROM jogos WHERE fase = 'Final' LIMIT 1`);
      const finalJogoId = finalJogos[0]?.id || null;
      const temFinalSalva = palpites.some(p => finalJogoId && Number(p.jogo_id) === Number(finalJogoId) && p.time_classificado_palpite !== null);
      if (temFinalSalva) {
        await conn.query(`
          UPDATE colaboradores 
          SET bracket_mata_mata_salvo = true 
          WHERE id = ?
        `, [userId]);
      }

      await conn.commit();
      return res.status(200).json({ success: true, message: 'Bracket de mata-mata salvo com sucesso!' });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

  } catch (error) {
    console.error('Erro ao salvar bracket:', error);
    return res.status(500).json({ success: false, error: 'Erro ao salvar bracket' });
  }
};

export const getPalpitesEspeciais = async (req: Request, res: Response): Promise<any> => {
  try {
    // @ts-ignore
    const userId = req.user.id;

    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT campeao_palpite, vice_palpite, terceiro_palpite, quarto_palpite
      FROM palpites_especiais
      WHERE colaborador_id = ?
    `, [userId]);

    // Limite de envio: 1h antes do primeiro jogo da Copa (11/06/2026 às 16h)
    const limiteCopa = new Date('2026-06-11T15:00:00-03:00');
    const agora = new Date();
    const expirado = agora > limiteCopa;

    return res.status(200).json({
      success: true,
      palpiteEspecial: rows.length > 0 ? rows[0] : null,
      expirado
    });
  } catch (error) {
    console.error('Erro ao buscar palpites especiais:', error);
    return res.status(500).json({ success: false, error: 'Erro ao buscar palpites especiais' });
  }
};

export const salvarPalpitesEspeciais = async (req: Request, res: Response): Promise<any> => {
  try {
    // @ts-ignore
    const userId = req.user.id;
    const { campeao, vice, terceiro, quarto } = req.body;

    if (!campeao || !vice || !terceiro || !quarto) {
      return res.status(400).json({ success: false, error: 'Preencha todo o pódio (Campeão, Vice, 3º e 4º lugares)' });
    }

    // Valida limite de tempo (antes de começar a Copa)
    const limiteCopa = new Date('2026-06-11T15:00:00-03:00');
    const agora = new Date();
    if (agora > limiteCopa) {
      return res.status(403).json({ success: false, error: 'O tempo para definir seus palpites especiais expirou (a Copa do Mundo 2026 já começou!).' });
    }

    await pool.query(`
      INSERT INTO palpites_especiais (colaborador_id, campeao_palpite, vice_palpite, terceiro_palpite, quarto_palpite)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        campeao_palpite = VALUES(campeao_palpite),
        vice_palpite = VALUES(vice_palpite),
        terceiro_palpite = VALUES(terceiro_palpite),
        quarto_palpite = VALUES(quarto_palpite)
    `, [userId, campeao, vice, terceiro, quarto]);

    return res.status(200).json({ success: true, message: 'Seus palpites de pódio da Copa do Mundo foram salvos!' });
  } catch (error) {
    console.error('Erro ao salvar palpites especiais:', error);
    return res.status(500).json({ success: false, error: 'Erro ao salvar palpites especiais' });
  }
};
