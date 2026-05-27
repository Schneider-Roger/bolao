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
        j.data_hora as data, j.status, j.placar_a, j.placar_b, j.encerramento_palpite,
        p.palpite_a, p.palpite_b, p.time_classificado_palpite
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
    const { palpite_a, palpite_b, classificado, time_classificado_palpite } = req.body;

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
      SELECT encerramento_palpite, fase FROM jogos WHERE id = ?
    `, [jogoId]);

    if (jogos.length === 0) {
      return res.status(404).json({ success: false, error: 'Jogo não encontrado' });
    }

    const jogo = jogos[0];
    const isMataMata = !jogo.fase.toLowerCase().includes('grupo');

    const agora = new Date();
    const encerramento = new Date(jogo.encerramento_palpite);

    if (agora > encerramento) {
      return res.status(403).json({ success: false, error: 'O tempo para palpitar neste jogo já esgotou.' });
    }

    // Se for mata-mata e o bracket já estiver salvo, só atualiza o placar individual
    if (isMataMata && bracketSalvo) {
      await pool.query(`
        UPDATE palpites 
        SET palpite_a = ?, palpite_b = ?
        WHERE colaborador_id = ? AND jogo_id = ?
      `, [palpite_a, palpite_b, userId, jogoId]);

      return res.status(200).json({ success: true, message: 'Placar do palpite atualizado com sucesso!' });
    }

    // Salva ou atualiza normal (Upsert)
    const classificadoVal = classificado || time_classificado_palpite || null;

    await pool.query(`
      INSERT INTO palpites (colaborador_id, jogo_id, palpite_a, palpite_b, time_classificado_palpite)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        palpite_a = VALUES(palpite_a), 
        palpite_b = VALUES(palpite_b), 
        time_classificado_palpite = VALUES(time_classificado_palpite)
    `, [userId, jogoId, palpite_a, palpite_b, classificadoVal]);

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
      SELECT jogo_id, palpite_a, palpite_b, time_classificado_palpite, confronto_time_a, confronto_time_b
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

    // 0. Verifica se a fase de grupos já terminou (todos os jogos pontuados/encerrados)
    const [jogosGrupos] = await pool.query<RowDataPacket[]>(`
      SELECT id FROM jogos WHERE fase LIKE 'Grupo %' AND status NOT IN ('encerrado', 'pontuado')
    `);
    
    if (jogosGrupos.length > 0) {
      return res.status(403).json({ success: false, error: 'O mata-mata só será liberado para palpites após o término de todos os jogos da Fase de Grupos.' });
    }

    // Verifica se o prazo para o primeiro jogo do mata-mata já expirou (impede trapaças)
    const [primeiroJogoMataMata] = await pool.query<RowDataPacket[]>(`
      SELECT MIN(encerramento_palpite) as limite FROM jogos WHERE fase NOT LIKE 'Grupo %'
    `);
    
    if (primeiroJogoMataMata.length > 0 && primeiroJogoMataMata[0].limite) {
      const limite = new Date(primeiroJogoMataMata[0].limite);
      const agora = new Date();
      if (agora > limite) {
        return res.status(403).json({ success: false, error: 'O prazo para salvar seu bracket de mata-mata já expirou (o primeiro jogo já iniciou).' });
      }
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
          time_classificado_palpite || null, 
          confronto_time_a || null, 
          confronto_time_b || null
        ]);
      }

      // Marca como bracket_mata_mata_salvo no perfil do colaborador
      await conn.query(`
        UPDATE colaboradores 
        SET bracket_mata_mata_salvo = true 
        WHERE id = ?
      `, [userId]);

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
