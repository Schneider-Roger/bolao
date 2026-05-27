import pool from './src/config/db';

async function resetGames() {
    try {
        console.log("Limpando os placares e voltando os status para 'aberto'...");
        await pool.query(`
            UPDATE jogos 
            SET placar_a = NULL, 
                placar_b = NULL, 
                status = 'aberto', 
                classificado = NULL
            WHERE status = 'pontuado' OR status = 'encerrado'
        `);
        console.log("Jogos resetados com sucesso.");
    } catch (e) {
        console.error("Erro ao resetar:", e);
    } finally {
        process.exit(0);
    }
}
resetGames();
