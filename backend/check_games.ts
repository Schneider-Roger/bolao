import pool from './src/config/db';

async function checkBracket() {
    const [jogosGrupos] = await pool.query(`
      SELECT id FROM jogos WHERE fase LIKE 'Grupo %' AND status NOT IN ('encerrado', 'pontuado')
    `);
    console.log("Count of incomplete group games:", (jogosGrupos as any[]).length);
    console.log("Is it liberado?", (jogosGrupos as any[]).length === 0);
    process.exit(0);
}
checkBracket();
