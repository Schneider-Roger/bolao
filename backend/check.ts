import pool from './src/config/db';
async function run() {
    const [rows] = await pool.query('SELECT id, fase, time_a, time_b, status, placar_a, placar_b FROM jogos WHERE status != "aberto"');
    console.table(rows);
    process.exit(0);
}
run();
