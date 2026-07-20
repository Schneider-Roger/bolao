import { Request, Response } from 'express';
import pool from '../../config/db';
import type { RowDataPacket } from 'mysql2';
import { decryptField } from '../../utils/crypto';

// ── Top 10 + Últimos 4 do ranking ──
export const getRanking = async (req: Request, res: Response): Promise<any> => {
  try {
    const [todos] = await pool.query<RowDataPacket[]>(`
      SELECT 
        r.posicao,
        r.pontos_total,
        r.placares_exatos,
        r.acertos_resultado,
        c.nome,
        c.apelido,
        c.foto_perfil,
        c.setor,
        c.unidade
      FROM ranking r
      INNER JOIN colaboradores c ON c.id = r.colaborador_id
      WHERE c.ativo = 1 AND r.pontos_total > 0
      ORDER BY r.posicao ASC
    `);

    const total = todos.length;
    const top20Rows = todos.slice(0, 20);
    // Últimos 4 — mas evita duplicar quem já está no top 20
    const ultimos4Rows = total > 20 ? todos.slice(Math.max(total - 4, 20)) : [];

    const decryptRow = (r: RowDataPacket) => ({
      ...r,
      nome: decryptField(r.nome),
      apelido: decryptField(r.apelido),
      setor: decryptField(r.setor),
      unidade: decryptField(r.unidade)
    });

    const top20 = top20Rows.map(decryptRow);
    const ultimos4 = ultimos4Rows.map(decryptRow);

    return res.status(200).json({
      success: true,
      top20,
      ultimos4,
      total
    });
  } catch (error) {
    console.error('Erro ao buscar ranking:', error);
    return res.status(500).json({ success: false, error: 'Erro ao buscar ranking' });
  }
};

// ── Posição e pontos do usuário logado ──
export const getMinhaposicao = async (req: Request, res: Response): Promise<any> => {
  try {
    // @ts-ignore
    const userId = req.user.id;

    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT r.posicao, r.pontos_total, r.placares_exatos, r.acertos_resultado, r.erros, r.palpites_feitos
      FROM ranking r
      WHERE r.colaborador_id = ?
    `, [userId]);

    if (rows.length === 0) {
      return res.status(200).json({
        success: true,
        posicao: null,
        pontos_total: 0,
        placares_exatos: 0,
        acertos_resultado: 0,
        erros: 0,
        palpites_feitos: 0
      });
    }

    return res.status(200).json({ success: true, ...rows[0] });
  } catch (error) {
    console.error('Erro ao buscar minha posição:', error);
    return res.status(500).json({ success: false, error: 'Erro ao buscar posição' });
  }
};
