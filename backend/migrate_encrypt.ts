import pool from './src/config/db';
import type { RowDataPacket } from 'mysql2';
import { encryptField, hashField } from './src/utils/crypto';

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

async function migrate() {
  const conn = await pool.getConnection();
  try {
    console.log('Iniciando migração de criptografia do banco de dados...');

    // 1. Alterar o schema (se der erro aqui pode ser porque as colunas hash já existem)
    console.log('Passo 1: Alterando tipos das colunas para TEXT...');

    try {
      await conn.query(`ALTER TABLE colaboradores DROP INDEX codigo_funcionario;`);
    } catch (e) { /* ignore */ }

    try {
      await conn.query(`
        ALTER TABLE colaboradores 
        MODIFY codigo_funcionario TEXT NOT NULL,
        MODIFY nome TEXT NOT NULL,
        MODIFY data_nascimento TEXT NOT NULL,
        MODIFY setor TEXT,
        MODIFY unidade TEXT,
        MODIFY apelido TEXT,
        MODIFY email_corporativo TEXT;
      `);
    } catch (err: any) {
      console.warn('Aviso no MODIFY:', err.message);
    }

    try {
      await conn.query(`ALTER TABLE colaboradores ADD COLUMN codigo_funcionario_hash VARCHAR(64) AFTER codigo_funcionario;`);
    } catch (e: any) { console.warn('Aviso (codigo_funcionario_hash):', e.message); }

    try {
      await conn.query(`ALTER TABLE colaboradores ADD COLUMN data_nascimento_hash VARCHAR(64) AFTER data_nascimento;`);
    } catch (e: any) { console.warn('Aviso (data_nascimento_hash):', e.message); }

    try {
      await conn.query(`ALTER TABLE colaboradores ADD UNIQUE INDEX idx_codigo_hash (codigo_funcionario_hash);`);
    } catch (e) { /* ignore if already exists */ }

    // 2. Buscar todos os colaboradores
    console.log('Passo 2: Buscando colaboradores para criptografar...');
    const [rows] = await conn.query<RowDataPacket[]>('SELECT * FROM colaboradores');
    
    console.log(`Encontrados ${rows.length} colaboradores.`);
    let migrados = 0;
    let jaMigrados = 0;

    for (const user of rows) {
      // Se já tiver codigo_funcionario_hash, assumimos que já foi migrado
      if (user.codigo_funcionario_hash) {
        jaMigrados++;
        continue;
      }

      // 3. Atualizar cada um
      const hash_cod = hashField(user.codigo_funcionario);
      const hash_data = hashField(user.data_nascimento);
      const enc_cod = encryptField(user.codigo_funcionario);
      const enc_nome = encryptField(user.nome);
      const enc_data = encryptField(user.data_nascimento);
      const enc_setor = encryptField(user.setor);
      const enc_unidade = encryptField(user.unidade);
      const enc_apelido = encryptField(user.apelido);
      const enc_email = encryptField(user.email_corporativo);

      await conn.query(`
        UPDATE colaboradores SET
          codigo_funcionario = ?, codigo_funcionario_hash = ?,
          nome = ?,
          data_nascimento = ?, data_nascimento_hash = ?,
          setor = ?, unidade = ?, apelido = ?, email_corporativo = ?
        WHERE id = ?
      `, [
        enc_cod, hash_cod,
        enc_nome,
        enc_data, hash_data,
        enc_setor, enc_unidade, enc_apelido, enc_email,
        user.id
      ]);

      migrados++;
      if (migrados % 50 === 0) {
        console.log(`... ${migrados} registros criptografados.`);
      }
    }

    console.log(`Concluído! ${migrados} recém migrados. ${jaMigrados} já estavam migrados.`);
    
  } catch (error) {
    console.error('Erro durante a migração:', error);
  } finally {
    conn.release();
    process.exit(0);
  }
}

migrate();
