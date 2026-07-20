import { Request, Response } from 'express';
import pool from '../../config/db';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { encryptField, decryptField, hashCredencial } from '../../utils/crypto';
import { recalcularRanking } from '../../services/pontuacaoService';

export const primeiroAcesso = async (req: Request, res: Response): Promise<any> => {
  try {
    const colaboradorId = req.user.id;
    const { apelido, selecao_favorita, setor, nova_senha } = req.body;
    const file = req.file;

    if (!selecao_favorita) {
      return res.status(400).json({
        success: false,
        error: 'A seleção favorita é obrigatória.',
      });
    }

    if (!nova_senha || String(nova_senha).trim().length < 6) {
      return res.status(400).json({
        success: false,
        error: 'A nova senha é obrigatória e deve ter pelo menos 6 caracteres.',
      });
    }

    // Buscar codigo_funcionario e data_nascimento do banco para validação e geração do hash
    const [userRows] = await pool.execute<RowDataPacket[]>(
      'SELECT codigo_funcionario, data_nascimento FROM colaboradores WHERE id = ? LIMIT 1',
      [colaboradorId]
    );

    if (!userRows || userRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Colaborador não encontrado.',
      });
    }

    const codigoFuncionarioDecrypted = decryptField(userRows[0].codigo_funcionario);
    if (!codigoFuncionarioDecrypted) {
      return res.status(500).json({
        success: false,
        error: 'Falha interna ao processar código do funcionário.',
      });
    }

    // Verificar se a nova senha é igual à data de nascimento (proibido)
    const dataNascDecrypted = decryptField(userRows[0].data_nascimento); // formato YYYY-MM-DD
    if (dataNascDecrypted) {
      const senhaDigitada = String(nova_senha).trim();
      const senhaDigitadaLimpa = senhaDigitada.replace(/\D/g, '');
      // Formatos possíveis da data: DDMMAAAA e AAAAMMDD
      const parts = dataNascDecrypted.split('-'); // [YYYY, MM, DD]
      if (parts.length === 3) {
        const [yyyy, mm, dd] = parts;
        const formatoDDMMAAAA = `${dd}${mm}${yyyy}`; // 15011990
        const formatoAAAAMMDD = `${yyyy}${mm}${dd}`; // 19900115
        if (
          senhaDigitadaLimpa === formatoDDMMAAAA || 
          senhaDigitadaLimpa === formatoAAAAMMDD ||
          senhaDigitada === formatoDDMMAAAA ||
          senhaDigitada === formatoAAAAMMDD
        ) {
          return res.status(400).json({
            success: false,
            error: 'A nova senha não pode ser igual à sua data de nascimento. Escolha uma senha diferente.',
          });
        }
      }
    }

    const credencialHash = hashCredencial(codigoFuncionarioDecrypted, String(nova_senha).trim());

    let foto_perfil: string | null = null;
    let queryFields = 'apelido = ?, selecao_favorita = ?, setor = ?, senha_alterada = 1, credencial_hash = ?';
    let queryParams = [
      encryptField(apelido || ''), 
      selecao_favorita, 
      encryptField(setor || ''),
      credencialHash
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
