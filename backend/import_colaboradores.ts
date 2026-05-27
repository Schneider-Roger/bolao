import * as xlsx from 'xlsx';
import pool from './src/config/db';
import { encryptField, decryptField, hashCredencial } from './src/utils/crypto';

function excelDateToJSDate(serial: number) {
  const utc_days  = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;                                        
  const date_info = new Date(utc_value * 1000);

  const fractional_day = serial - Math.floor(serial) + 0.0000001;
  let total_seconds = Math.floor(86400 * fractional_day);
  const seconds = total_seconds % 60;
  total_seconds -= seconds;
  const hours = Math.floor(total_seconds / (60 * 60));
  const minutes = Math.floor(total_seconds / 60) % 60;

  return new Date(Date.UTC(date_info.getUTCFullYear(), date_info.getUTCMonth(), date_info.getUTCDate(), hours, minutes, seconds));
}

function formatDate(date: Date) {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

async function importData() {
  try {
    const workbook = xlsx.readFile('base copercana.xlsx');
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

    // Skip header
    const rows = data.slice(1);

    const conn = await pool.getConnection();
    
    // Buscar todos os colaboradores existentes para mapear duplicados em memória de forma performática
    const [existingRows] = await conn.query<any[]>('SELECT id, codigo_funcionario FROM colaboradores');
    const colaboradoresMap = new Map<string, number>();
    for (const r of existingRows) {
      const decCodigo = decryptField(r.codigo_funcionario);
      if (decCodigo) {
        colaboradoresMap.set(decCodigo, r.id);
      }
    }

    let count = 0;

    for (const row of rows) {
      if (!row || row.length === 0) continue;

      const codigo = row[4];
      const nome = row[5];
      
      // Puxando o Depto/Filial (row 2) ao invés do Cargo (row 8) e pegando só as letras
      const deptoOriginal = row[2];
      const setor = deptoOriginal ? String(deptoOriginal).replace(/[0-9\-]/g, '').trim().replace(/\s+/g, ' ') : null;
      
      const unidade = row[2];
      const status = row[17];
      const email = row[19] || null;
      const dataNascSerial = row[22];

      if (!codigo || !nome || !dataNascSerial) {
        continue;
      }

      let dataNasc = null;
      if (typeof dataNascSerial === 'number') {
        const d = excelDateToJSDate(dataNascSerial);
        dataNasc = formatDate(d);
      } else {
        // If it's already a string, try to parse or keep it (assuming it's a number)
        dataNasc = dataNascSerial; 
      }

      const ativo = status === 'A' ? 1 : 0;

      const existingId = colaboradoresMap.get(String(codigo));
      const credHash = hashCredencial(String(codigo), String(dataNasc));

      if (existingId !== undefined) {
        await conn.query(`
          UPDATE colaboradores SET
            nome = ?,
            data_nascimento = ?,
            credencial_hash = ?,
            setor = ?,
            unidade = ?,
            ativo = ?,
            email_corporativo = ?
          WHERE id = ?
        `, [
          encryptField(String(nome)),
          encryptField(String(dataNasc)),
          credHash,
          encryptField(String(setor)),
          encryptField(String(unidade)),
          ativo,
          encryptField(email),
          existingId
        ]);
      } else {
        await conn.query(`
          INSERT INTO colaboradores (codigo_funcionario, nome, data_nascimento, credencial_hash, setor, unidade, ativo, email_corporativo)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          encryptField(String(codigo)),
          encryptField(String(nome)),
          encryptField(String(dataNasc)),
          credHash,
          encryptField(String(setor)),
          encryptField(String(unidade)),
          ativo,
          encryptField(email)
        ]);
        colaboradoresMap.set(String(codigo), 0);
      }
      
      count++;
      if (count % 100 === 0) {
        console.log(`Importados ${count} registros...`);
      }
    }

    conn.release();
    console.log(`Importação concluída! Total de registros inseridos/atualizados: ${count}`);
    process.exit(0);
  } catch (error) {
    console.error('Erro na importação:', error);
    process.exit(1);
  }
}

importData();
