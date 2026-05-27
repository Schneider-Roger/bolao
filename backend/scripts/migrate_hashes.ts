import pool from '../src/config/db';
import { decryptField, hashField } from '../src/utils/crypto';
import type { RowDataPacket } from 'mysql2';
import dotenv from 'dotenv';
import path from 'path';

// Carrega as variáveis de ambiente (onde está o HMAC_KEY novo)
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function migrateHashes() {
  console.log('Iniciando migração de hashes...');

  const conn = await pool.getConnection();

  try {
    // 1. Busca todos os colaboradores
    const [colaboradores] = await conn.query<RowDataPacket[]>('SELECT id, codigo_funcionario, data_nascimento FROM colaboradores');
    console.log(`Encontrados ${colaboradores.length} colaboradores para migrar.`);

    await conn.beginTransaction();

    let atualizados = 0;

    for (const colab of colaboradores) {
      // 2. Descriptografa os valores (a lógica AES continua usando ENCRYPTION_KEY e não mudou)
      const plainCodigo = decryptField(colab.codigo_funcionario);
      const plainDataNasc = decryptField(colab.data_nascimento);

      if (!plainCodigo || !plainDataNasc) {
        console.warn(`Aviso: Falha ao descriptografar dados do colaborador ID ${colab.id}. Pulando...`);
        continue;
      }

      // 3. Recalcula os hashes (agora a função hmacHash em crypto.ts usa a nova HMAC_KEY)
      const novoHashCodigo = hashField(plainCodigo);
      const novoHashDataNasc = hashField(plainDataNasc);

      // 4. Atualiza no banco
      await conn.query(
        'UPDATE colaboradores SET codigo_funcionario_hash = ?, data_nascimento_hash = ? WHERE id = ?',
        [novoHashCodigo, novoHashDataNasc, colab.id]
      );

      atualizados++;
    }

    await conn.commit();
    console.log(`Sucesso: Migração concluída! ${atualizados} colaboradores atualizados com o novo hash.`);

  } catch (error) {
    await conn.rollback();
    console.error('Erro durante a migração. Fazendo rollback...', error);
  } finally {
    conn.release();
    process.exit(0);
  }
}

migrateHashes();
