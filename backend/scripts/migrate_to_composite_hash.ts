import pool from '../src/config/db';
import { decryptField, hashCredencial } from '../src/utils/crypto';
import type { RowDataPacket } from 'mysql2';
import dotenv from 'dotenv';
import path from 'path';

// Carrega as variáveis de ambiente do backend
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function migrate() {
  console.log('Iniciando migração para credencial_hash composto...');
  const conn = await pool.getConnection();

  try {
    // 1. Verificar se a coluna credencial_hash já existe, se não, adicioná-la
    const [columns] = await conn.query<RowDataPacket[]>(
      "SHOW COLUMNS FROM colaboradores LIKE 'credencial_hash'"
    );

    if (columns.length === 0) {
      console.log('Passo 1: Adicionando coluna credencial_hash...');
      await conn.query(
        "ALTER TABLE colaboradores ADD COLUMN credencial_hash VARCHAR(64) AFTER data_nascimento"
      );
      console.log('Coluna credencial_hash adicionada com sucesso.');
    } else {
      console.log('Aviso: Coluna credencial_hash já existe.');
    }

    // 2. Buscar todos os colaboradores para migrar seus hashes
    console.log('Passo 2: Buscando colaboradores...');
    const [colaboradores] = await conn.query<RowDataPacket[]>(
      'SELECT id, codigo_funcionario, data_nascimento, credencial_hash FROM colaboradores'
    );
    console.log(`Encontrados ${colaboradores.length} colaboradores.`);

    await conn.beginTransaction();
    let atualizados = 0;

    for (const colab of colaboradores) {
      // Se já tiver credencial_hash preenchido, podemos pular ou recalcular. Recalcular garante integridade.
      const plainCodigo = decryptField(colab.codigo_funcionario);
      const plainDataNasc = decryptField(colab.data_nascimento);

      if (!plainCodigo || !plainDataNasc) {
        console.warn(`Aviso: Falha ao descriptografar colaborador ID ${colab.id}. Pulando...`);
        continue;
      }

      const credHash = hashCredencial(plainCodigo, plainDataNasc);

      await conn.query(
        'UPDATE colaboradores SET credencial_hash = ? WHERE id = ?',
        [credHash, colab.id]
      );
      atualizados++;
    }

    await conn.commit();
    console.log(`Sucesso: Hashes compostos calculados e salvos para ${atualizados} colaboradores.`);

    // 3. Adicionar UNIQUE INDEX na nova coluna credencial_hash (se não existir)
    console.log('Passo 3: Criando índice UNIQUE para credencial_hash...');
    try {
      await conn.query(
        'ALTER TABLE colaboradores ADD UNIQUE INDEX idx_credencial_hash (credencial_hash)'
      );
      console.log('Índice UNIQUE idx_credencial_hash criado.');
    } catch (e: any) {
      console.log('Aviso ao criar índice UNIQUE (talvez já exista):', e.message);
    }

    // 4. Remover as colunas de hashes determinísticas antigas e seus índices
    console.log('Passo 4: Removendo colunas de hash antigas...');
    
    // Remover índice antigo do código hash se existir
    try {
      await conn.query('ALTER TABLE colaboradores DROP INDEX idx_codigo_hash');
      console.log('Índice antigo idx_codigo_hash removido.');
    } catch (e: any) {
      // Ignorar se não existir
    }

    try {
      await conn.query('ALTER TABLE colaboradores DROP COLUMN codigo_funcionario_hash');
      console.log('Coluna codigo_funcionario_hash removida.');
    } catch (e: any) {
      console.warn('Erro ao remover codigo_funcionario_hash:', e.message);
    }

    try {
      await conn.query('ALTER TABLE colaboradores DROP COLUMN data_nascimento_hash');
      console.log('Coluna data_nascimento_hash removida.');
    } catch (e: any) {
      console.warn('Erro ao remover data_nascimento_hash:', e.message);
    }

    console.log('=== Migração Concluída com Sucesso! ===');

  } catch (error) {
    await conn.rollback();
    console.error('Erro crítico durante a migração. Fazendo rollback...', error);
  } finally {
    conn.release();
    process.exit(0);
  }
}

migrate();
