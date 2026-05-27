import { Request, Response } from 'express';
import pool from '../../config/db';
import { ResultSetHeader } from 'mysql2';
import { encryptField } from '../../utils/crypto';
import { recalcularRanking } from '../../services/pontuacaoService';

export const primeiroAcesso = async (req: Request, res: Response): Promise<any> => {
  try {
    const colaboradorId = req.user.id;
    const { apelido, selecao_favorita, email_corporativo, setor } = req.body;
    const file = req.file;

    if (!selecao_favorita) {
      return res.status(400).json({
        success: false,
        error: 'A seleção favorita é obrigatória.',
      });
    }

    let foto_perfil: string | null = null;
    let queryFields = 'apelido = ?, selecao_favorita = ?, email_corporativo = ?, setor = ?';
    let queryParams = [
      encryptField(apelido || ''), 
      selecao_favorita, 
      encryptField(email_corporativo || ''), 
      encryptField(setor || '')
    ];

    if (file) {
      foto_perfil = `/uploads/perfis/${file.filename}`;
      queryFields += ', foto_perfil = ?';
      queryParams.push(foto_perfil);
    }

    queryParams.push(colaboradorId);

    const [result] = await pool.execute<ResultSetHeader>(
      `
      UPDATE colaboradores
      SET ${queryFields}
      WHERE id = ?
      `,
      queryParams
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Colaborador não encontrado.',
      });
    }

    // Re-calcula ranking para incluir a nova pessoa com 0 pontos
    await recalcularRanking();

    return res.status(200).json({
      success: true,
      message: 'Primeiro acesso concluído com sucesso!',
      colaborador: {
        id: colaboradorId,
        apelido,
        selecao_favorita,
        foto_perfil,
        email_corporativo,
        setor
      }
    });

  } catch (error) {
    console.error('Erro no primeiro acesso:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor ao processar o primeiro acesso.',
    });
  }
};
