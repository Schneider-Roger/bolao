import { Request, Response } from 'express';
import pool from '../../config/db';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { encryptField } from '../../utils/crypto';
import fs from 'fs';
import path from 'path';

export const editarPerfil = async (req: Request, res: Response): Promise<any> => {
  try {
    // @ts-ignore
    const colaboradorId = req.user.id;
    const { apelido, selecao_favorita, setor, remover_foto } = req.body;
    const file = req.file;

    if (!apelido || !selecao_favorita) {
      return res.status(400).json({
        success: false,
        error: 'Nome de exibição e seleção favorita são obrigatórios.',
      });
    }

    // Buscar foto_perfil atual
    const [currentRows] = await pool.execute<RowDataPacket[]>(
      'SELECT foto_perfil FROM colaboradores WHERE id = ? LIMIT 1',
      [colaboradorId]
    );
    const oldFoto = currentRows[0]?.foto_perfil || null;
    let foto_perfil = oldFoto;

    let query = `
      UPDATE colaboradores
      SET apelido = ?, selecao_favorita = ?, setor = ?
    `;
    const params: any[] = [encryptField(apelido), selecao_favorita, encryptField(setor)];

    let deveDeletarFotoAntiga = false;

    if (file) {
      foto_perfil = `/uploads/perfis/${file.filename}`;
      query += `, foto_perfil = ?`;
      params.push(foto_perfil);
      if (oldFoto) {
        deveDeletarFotoAntiga = true;
      }
    } else if (remover_foto === 'true' || remover_foto === true) {
      foto_perfil = null;
      query += `, foto_perfil = NULL`;
      if (oldFoto) {
        deveDeletarFotoAntiga = true;
      }
    }

    if (deveDeletarFotoAntiga && oldFoto) {
      try {
        const normalizedPath = oldFoto.startsWith('/') ? oldFoto.substring(1) : oldFoto;
        const absolutePath = path.join(__dirname, '..', '..', '..', normalizedPath);
        if (fs.existsSync(absolutePath)) {
          fs.unlinkSync(absolutePath);
        }
      } catch (err) {
        console.error('Erro ao deletar foto antiga do perfil:', err);
      }
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

