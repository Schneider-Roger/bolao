import { Request, Response } from 'express';
import pool from '../../config/db';
import { ResultSetHeader } from 'mysql2';
import { encryptField } from '../../utils/crypto';

export const editarPerfil = async (req: Request, res: Response): Promise<any> => {
  try {
    // @ts-ignore
    const colaboradorId = req.user.id;
    const { apelido, selecao_favorita, email_corporativo, setor } = req.body;
    const file = req.file;

    if (!apelido || !selecao_favorita) {
      return res.status(400).json({
        success: false,
        error: 'Nome de exibição e seleção favorita são obrigatórios.',
      });
    }

    let query = `
      UPDATE colaboradores
      SET apelido = ?, selecao_favorita = ?, email_corporativo = ?, setor = ?
    `;
    const params: any[] = [encryptField(apelido), selecao_favorita, encryptField(email_corporativo), encryptField(setor)];

    let foto_perfil = null;
    if (file) {
      foto_perfil = `/uploads/perfis/${file.filename}`;
      query += `, foto_perfil = ?`;
      params.push(foto_perfil);
    }

    query += ` WHERE id = ?`;
    params.push(colaboradorId);

    const [result] = await pool.execute<ResultSetHeader>(query, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Colaborador não encontrado.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Perfil atualizado com sucesso!',
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
    console.error('Erro ao editar perfil:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor ao atualizar o perfil.',
    });
  }
};
