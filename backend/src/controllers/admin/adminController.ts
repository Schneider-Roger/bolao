import { Request, Response } from 'express';
import pool from '../../config/db';
import type { RowDataPacket } from 'mysql2';
import { pontuarJogo, recalcularRanking } from '../../services/pontuacaoService';
import { sincronizarPlacaresGE } from '../../services/geIntegrationService';
import * as XLSX from 'xlsx';
import { encryptField, decryptField, hashField, hashCredencial } from '../../utils/crypto';

// ── Salvar resultado real e pontuar automaticamente ──
export const updateResultadoJogo = async (req: Request, res: Response): Promise<any> => {
  try {
    const jogoId = parseInt(String(req.params['id']));
    const { placar_a, placar_b, classificado } = req.body;

    if (placar_a === undefined || placar_b === undefined) {
      return res.status(400).json({ success: false, error: 'Placares finais são obrigatórios' });
    }

    const classificadoVal = classificado || null;

    // 1. Salva o resultado no jogo (status → encerrado por ora, pontuarJogo vai pôr 'pontuado')
    await pool.query(`
      UPDATE jogos 
      SET placar_a = ?, placar_b = ?, classificado = ?, status = 'encerrado'
      WHERE id = ?
    `, [placar_a, placar_b, classificadoVal, jogoId]);

    // 2. Pontua todos os palpites e recalcula ranking automaticamente
    await pontuarJogo(jogoId);

    return res.status(200).json({
      success: true,
      message: 'Resultado salvo e pontuação calculada com sucesso!'
    });
  } catch (error) {
    console.error('Erro ao atualizar resultado do jogo:', error);
    return res.status(500).json({ success: false, error: 'Erro ao salvar resultado' });
  }
};

// ── Recalcular ranking manualmente (botão no painel admin) ──
export const recalcularRankingManual = async (req: Request, res: Response): Promise<any> => {
  try {
    await recalcularRanking();
    return res.status(200).json({ success: true, message: 'Ranking recalculado com sucesso!' });
  } catch (error) {
    console.error('Erro ao recalcular ranking:', error);
    return res.status(500).json({ success: false, error: 'Erro ao recalcular ranking' });
  }
};

// ── Listar colaboradores ──
export const getColaboradores = async (req: Request, res: Response): Promise<any> => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT id, codigo_funcionario, nome, data_nascimento, setor, unidade, apelido, email_corporativo, foto_perfil, ativo, role
      FROM colaboradores
    `);

    const colaboradoresDescriptografados = rows.map(r => ({
      ...r,
      codigo_funcionario: decryptField(r.codigo_funcionario),
      nome: decryptField(r.nome),
      data_nascimento: decryptField(r.data_nascimento),
      setor: decryptField(r.setor),
      unidade: decryptField(r.unidade),
      apelido: decryptField(r.apelido),
      email_corporativo: decryptField(r.email_corporativo)
    }));

    // Ordenar em memória pois os nomes estavam criptografados no banco
    colaboradoresDescriptografados.sort((a, b) => {
      const nomeA = a.nome || '';
      const nomeB = b.nome || '';
      return nomeA.localeCompare(nomeB);
    });

    return res.status(200).json({ success: true, colaboradores: colaboradoresDescriptografados });
  } catch (error) {
    console.error('Erro ao buscar colaboradores:', error);
    return res.status(500).json({ success: false, error: 'Erro ao buscar colaboradores' });
  }
};

// ── Editar Colaborador (Admin) ──
export const editarColaborador = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { codigo_funcionario, nome, data_nascimento, setor, unidade, apelido, email_corporativo, role } = req.body;

    if (!codigo_funcionario || !nome || !data_nascimento) {
      return res.status(400).json({ success: false, error: 'Código, Nome e Data Nascimento são obrigatórios' });
    }

    const credencialHash = hashCredencial(codigo_funcionario, data_nascimento);

    await pool.query(
      `UPDATE colaboradores SET 
        codigo_funcionario = ?,
        nome = ?,
        data_nascimento = ?,
        credencial_hash = ?,
        setor = ?, unidade = ?, apelido = ?, email_corporativo = ?, role = ?
       WHERE id = ?`,
      [
        encryptField(codigo_funcionario),
        encryptField(nome),
        encryptField(data_nascimento),
        credencialHash,
        encryptField(setor), encryptField(unidade), encryptField(apelido), encryptField(email_corporativo), role,
        id
      ]
    );

    return res.status(200).json({ success: true, message: 'Colaborador atualizado com sucesso!' });
  } catch (error) {
    console.error('Erro ao editar colaborador:', error);
    return res.status(500).json({ success: false, error: 'Erro ao editar colaborador' });
  }
};

// ── Criar Colaborador (Admin) ──
export const criarColaborador = async (req: Request, res: Response): Promise<any> => {
  try {
    const { codigo_funcionario, nome, data_nascimento, setor, unidade, apelido, email_corporativo, role } = req.body;

    if (!codigo_funcionario || !nome || !data_nascimento) {
      return res.status(400).json({ success: false, error: 'Código, Nome e Data Nascimento são obrigatórios' });
    }

    const [rows] = await pool.query<RowDataPacket[]>('SELECT id, codigo_funcionario FROM colaboradores');
    const existing = rows.find(r => decryptField(r.codigo_funcionario) === codigo_funcionario);
    if (existing) {
      return res.status(400).json({ success: false, error: 'Já existe um colaborador com esse código' });
    }

    const credencialHash = hashCredencial(codigo_funcionario, data_nascimento);

    await pool.query(
      `INSERT INTO colaboradores (
        codigo_funcionario,
        nome,
        data_nascimento,
        credencial_hash,
        setor, unidade, apelido, email_corporativo, role, ativo
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        encryptField(codigo_funcionario),
        encryptField(nome),
        encryptField(data_nascimento),
        credencialHash,
        encryptField(setor), encryptField(unidade), encryptField(apelido), encryptField(email_corporativo), role || 'USER'
      ]
    );

    return res.status(201).json({ success: true, message: 'Colaborador criado com sucesso!' });
  } catch (error) {
    console.error('Erro ao criar colaborador:', error);
    return res.status(500).json({ success: false, error: 'Erro ao criar colaborador' });
  }
};

// ── Ativar / Inativar colaborador ──
export const toggleColaboradorAtivo = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { ativo } = req.body;

    await pool.query(
      'UPDATE colaboradores SET ativo = ? WHERE id = ?',
      [ativo ? 1 : 0, id]
    );

    return res.status(200).json({ success: true, message: 'Colaborador atualizado.' });
  } catch (error) {
    console.error('Erro ao atualizar colaborador:', error);
    return res.status(500).json({ success: false, error: 'Erro ao atualizar colaborador' });
  }
};

// ── Excluir colaborador (Admin) ──
export const excluirColaborador = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;

    // A constraint ON DELETE CASCADE nas tabelas filhas vai deletar
    // os palpites e os registros do ranking automaticamente.
    const [result] = await pool.query<any>(
      'DELETE FROM colaboradores WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Colaborador não encontrado.' });
    }

    return res.status(200).json({ success: true, message: 'Colaborador excluído permanentemente.' });
  } catch (error) {
    console.error('Erro ao excluir colaborador:', error);
    return res.status(500).json({ success: false, error: 'Erro ao excluir colaborador' });
  }
};

// ── Cadastrar / Editar jogo ──
export const upsertJogo = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params; // undefined = criar novo
    const { fase, rodada, time_a, time_b, data_hora, encerramento_palpite } = req.body;

    if (!fase || !time_a || !time_b || !data_hora || !encerramento_palpite) {
      return res.status(400).json({ success: false, error: 'Campos obrigatórios: fase, time_a, time_b, data_hora, encerramento_palpite' });
    }

    if (id) {
      await pool.query(`
        UPDATE jogos SET fase=?, rodada=?, time_a=?, time_b=?, data_hora=?, encerramento_palpite=?
        WHERE id=?
      `, [fase, rodada || null, time_a, time_b, data_hora, encerramento_palpite, id]);
    } else {
      await pool.query(`
        INSERT INTO jogos (fase, rodada, time_a, time_b, data_hora, encerramento_palpite, status)
        VALUES (?, ?, ?, ?, ?, ?, 'aberto')
      `, [fase, rodada || null, time_a, time_b, data_hora, encerramento_palpite]);
    }

    return res.status(200).json({ success: true, message: id ? 'Jogo atualizado!' : 'Jogo cadastrado!' });
  } catch (error) {
    console.error('Erro ao salvar jogo:', error);
    return res.status(500).json({ success: false, error: 'Erro ao salvar jogo' });
  }
};

// ── Exportar ranking CSV ──
export const exportarRanking = async (req: Request, res: Response): Promise<any> => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT 
        r.posicao, c.nome, c.apelido, c.setor, c.unidade,
        r.pontos_total, r.placares_exatos, r.acertos_resultado, r.erros, r.palpites_feitos
      FROM ranking r
      INNER JOIN colaboradores c ON c.id = r.colaborador_id
      ORDER BY r.posicao ASC
    `);

    const escapeCsv = (str: any) => {
      if (str == null) return '';
      let s = String(str);
      // Prevenir CSV Injection escapando = + - @
      if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
      return `"${s.replace(/"/g, '""')}"`;
    };

    const header = 'Posicao,Nome,Apelido,Setor,Unidade,Pontos,PlacaresExatos,AcertosResultado,Erros,PalpitesFeitos\n';
    const csv = rows.map(r =>
      `${r.posicao},${escapeCsv(decryptField(r.nome))},${escapeCsv(decryptField(r.apelido))},${escapeCsv(decryptField(r.setor))},${escapeCsv(decryptField(r.unidade))},${r.pontos_total},${r.placares_exatos},${r.acertos_resultado},${r.erros},${r.palpites_feitos}`
    ).join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="ranking-bolao-2026.csv"');
    return res.status(200).send(header + csv);
  } catch (error) {
    console.error('Erro ao exportar ranking:', error);
    return res.status(500).json({ success: false, error: 'Erro ao exportar ranking' });
  }
};

export const sincronizarGEManual = async (req: Request, res: Response): Promise<any> => {
  try {
    const result = await sincronizarPlacaresGE();
    if (result.success) {
      return res.status(200).json({ 
        success: true, 
        message: `Sincronização com o GE realizada! ${result.atualizados} jogos atualizados e pontuados.` 
      });
    } else {
      return res.status(500).json({ success: false, error: 'Falha durante a sincronização com o GE.' });
    }
  } catch (error) {
    console.error('Erro na sincronização manual do GE:', error);
    return res.status(500).json({ success: false, error: 'Erro ao sincronizar placares com o GE' });
  }
};

export const importarColaboradoresExcel = async (req: Request, res: Response): Promise<any> => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Por favor, envie um arquivo Excel (.xlsx ou .xls)' });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    const rows = XLSX.utils.sheet_to_json<any>(worksheet);

    if (rows.length === 0) {
      return res.status(400).json({ success: false, error: 'A planilha enviada está vazia.' });
    }

    // Carregar colaboradores existentes para verificar duplicidade em memória de forma performática
    const [existingRows] = await pool.query<RowDataPacket[]>('SELECT id, codigo_funcionario FROM colaboradores');
    const colaboradoresMap = new Map<string, number>();
    for (const r of existingRows) {
      const decCodigo = decryptField(r.codigo_funcionario);
      if (decCodigo) {
        colaboradoresMap.set(decCodigo, r.id);
      }
    }

    let cadastrados = 0;
    let atualizados = 0;
    let erros = 0;
    const logErros: string[] = [];

    const parseDataExcel = (val: any): string => {
      if (!val) throw new Error("Data de nascimento vazia ou inválida");
      if (val instanceof Date) {
        // Corrige fuso horário do Excel date parser
        const offset = val.getTimezoneOffset();
        const adjusted = new Date(val.getTime() + (offset * 60 * 1000));
        return adjusted.toISOString().split('T')[0];
      }
      if (typeof val === 'number') {
        const date = new Date((val - 25569) * 86400 * 1000);
        const offset = date.getTimezoneOffset();
        const adjusted = new Date(date.getTime() + (offset * 60 * 1000));
        return adjusted.toISOString().split('T')[0];
      }
      if (typeof val === 'string') {
        const clean = val.trim();
        const dmyMatch = clean.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
        if (dmyMatch) {
          const [, day, month, year] = dmyMatch;
          return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
        const ymdMatch = clean.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
        if (ymdMatch) {
          const [, year, month, day] = ymdMatch;
          return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
      }
      throw new Error(`Formato de data inválido: ${val}`);
    };

    for (const row of rows) {
      try {
        const chaves = Object.keys(row);
        const keyCodigo = chaves.find(k => k.toLowerCase().match(/cod|matricula|registro|registro_funcionario/));
        const keyNome = chaves.find(k => k.toLowerCase().match(/nome|funcionario|colaborador/));
        const keyDataNasc = chaves.find(k => k.toLowerCase().match(/nasc|data|aniversario/));
        const keySetor = chaves.find(k => k.toLowerCase().match(/setor|dpto|departamento|area/));
        const keyUnidade = chaves.find(k => k.toLowerCase().match(/unid|filial|local|estabelecimento/));

        if (!keyCodigo || !keyNome || !keyDataNasc) {
          throw new Error('Faltam colunas essenciais na linha (Código, Nome ou Data de Nascimento).');
        }

        const codigo_funcionario = String(row[keyCodigo]).trim();
        const nome = String(row[keyNome]).trim();
        const rawData = row[keyDataNasc];
        const setor = keySetor ? String(row[keySetor]).trim() : null;
        const unidade = keyUnidade ? String(row[keyUnidade]).trim() : null;

        if (!codigo_funcionario || !nome) {
          throw new Error('Código do Funcionário ou Nome vazios nesta linha.');
        }

        const data_nascimento = parseDataExcel(rawData);

        const existingId = colaboradoresMap.get(codigo_funcionario);
        const credencialHash = hashCredencial(codigo_funcionario, data_nascimento);

        if (existingId !== undefined) {
          await pool.query(
            `UPDATE colaboradores 
             SET nome = ?, data_nascimento = ?, credencial_hash = ?, setor = ?, unidade = ?
             WHERE id = ?`,
            [encryptField(nome), encryptField(data_nascimento), credencialHash, encryptField(setor), encryptField(unidade), existingId]
          );
          atualizados++;
        } else {
          await pool.query(
            `INSERT INTO colaboradores (codigo_funcionario, nome, data_nascimento, credencial_hash, setor, unidade, ativo)
             VALUES (?, ?, ?, ?, ?, ?, 1)`,
            [encryptField(codigo_funcionario), encryptField(nome), encryptField(data_nascimento), credencialHash, encryptField(setor), encryptField(unidade)]
          );
          // Adiciona ao map em memória caso existam duplicados no próprio lote Excel
          colaboradoresMap.set(codigo_funcionario, 0); 
          cadastrados++;
        }
      } catch (err: any) {
        erros++;
        logErros.push(`Linha ${cadastrados + atualizados + erros + 1}: ${err.message || err}`);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Planilha processada com sucesso!',
      cadastrados,
      atualizados,
      erros,
      logErros
    });
  } catch (error: any) {
    console.error('Erro na importação de Excel de colaboradores:', error);
    return res.status(500).json({ success: false, error: 'Erro ao importar planilha de colaboradores.' });
  }
};
