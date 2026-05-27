import pool from '../config/db';

async function updateSchema() {
  const conn = await pool.getConnection();
  try {
    console.log('Adicionando coluna bracket_mata_mata_salvo na tabela colaboradores...');
    await conn.query(`
      ALTER TABLE colaboradores 
      ADD COLUMN bracket_mata_mata_salvo BOOLEAN DEFAULT false;
    `);
    console.log('✅ Coluna adicionada com sucesso.');
  } catch (error: any) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('✅ Coluna já existe no banco de dados.');
    } else {
      console.error('❌ Erro inesperado ao adicionar coluna:', error);
    }
  } finally {
    conn.release();
    process.exit(0);
  }
}

updateSchema();
