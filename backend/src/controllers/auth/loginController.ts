import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import pool from '../../config/db';
import { RowDataPacket } from 'mysql2';
import { hashCredencial, decryptField, decrypt } from '../../utils/crypto';

export const login = async (req: Request, res: Response): Promise<any> => {
  try {
    const { codigo_funcionario, data_nascimento } = req.body;

    if (!codigo_funcionario || !data_nascimento) {
      return res.status(400).json({
        success: false,
        error: "Dados obrigatórios não enviados",
      });
    }

    const credencial_hash = hashCredencial(codigo_funcionario, data_nascimento);

    const [rows] = await pool.execute<RowDataPacket[]>(
      `
      SELECT *
      FROM colaboradores
      WHERE credencial_hash = ?
      AND ativo = 1
      LIMIT 1
      `,
      [credencial_hash]
    );

    let colaborador = rows[0];

    if (!colaborador) {
      return res.status(401).json({
        success: false,
        error: "Credenciais inválidas",
      });
    }

    // Descriptografar codigo_funcionario para injetar no token
    const codigoFuncionarioDecrypted = decryptField(colaborador.codigo_funcionario);

    const token = jwt.sign(
      {
        id: colaborador.id,
        codigo_funcionario: codigoFuncionarioDecrypted,
        role: colaborador.role,
      },
      process.env.JWT_SECRET as jwt.Secret,
      {
        expiresIn: (process.env.JWT_EXPIRES || '7d') as any,
      }
    );

    // Set HTTPOnly cookie as per MVP
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });

    // Check if user needs to go through first access
    const isPrimeiroAcesso = !colaborador.apelido || !colaborador.selecao_favorita;

    return res.status(200).json({
      success: true,
      message: "Login realizado com sucesso",
      primeiro_acesso: isPrimeiroAcesso,
      colaborador: {
        id: colaborador.id,
        nome: decryptField(colaborador.nome),
        apelido: decryptField(colaborador.apelido),
        foto_perfil: colaborador.foto_perfil,
        selecao_favorita: colaborador.selecao_favorita,
        setor: decryptField(colaborador.setor),
        email_corporativo: decryptField(colaborador.email_corporativo),
        role: colaborador.role,
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      error: "Erro interno do servidor",
    });
  }
};

export const me = async (req: Request, res: Response): Promise<any> => {
  try {
    // @ts-ignore
    const userPayload = req.user;
    if (!userPayload) {
      return res.status(401).json({ success: false, error: 'Não autorizado' });
    }

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT id, nome, apelido, foto_perfil, selecao_favorita, setor, email_corporativo, role FROM colaboradores WHERE id = ? AND ativo = 1 LIMIT 1`,
      [userPayload.id]
    );

    const colaborador = rows[0];
    if (!colaborador) {
      return res.status(401).json({ success: false, error: 'Usuário não encontrado' });
    }

    return res.status(200).json({
      success: true,
      colaborador: {
        id: colaborador.id,
        nome: decryptField(colaborador.nome),
        apelido: decryptField(colaborador.apelido),
        foto_perfil: colaborador.foto_perfil,
        selecao_favorita: colaborador.selecao_favorita,
        setor: decryptField(colaborador.setor),
        email_corporativo: decryptField(colaborador.email_corporativo),
        role: colaborador.role,
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: "Erro interno" });
  }
};
