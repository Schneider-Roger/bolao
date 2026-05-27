import pool from './src/config/db';

async function resetDb() {
  const conn = await pool.getConnection();
  try {
    console.log('Resetting jogos...');
    await conn.query(`UPDATE jogos SET placar_a = NULL, placar_b = NULL, status = 'aberto'`);
    
    console.log('Resetting palpites...');
    await conn.query(`UPDATE palpites SET pontos = 0, acertou_resultado = false, acertou_placar = false, acertou_confronto = false`);
    
    console.log('Resetting ranking...');
    await conn.query(`TRUNCATE TABLE ranking`);
    
    console.log('Reset complete!');
  } catch (error) {
    console.error('Error resetting db:', error);
  } finally {
    conn.release();
    process.exit(0);
  }
}

resetDb();
