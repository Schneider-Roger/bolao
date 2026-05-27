import pool from './src/config/db';

async function checkGames() {
    const [rows] = await pool.query('SELECT * FROM jogos WHERE rodada = 1 ORDER BY data_hora');
    console.table(rows);
    process.exit(0);
}
checkGames();
