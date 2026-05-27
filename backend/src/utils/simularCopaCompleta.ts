import pool from '../config/db';
import { pontuarJogo } from '../services/pontuacaoService';
import type { RowDataPacket } from 'mysql2';

async function simular() {
    console.log("Iniciando simulação completa da Copa (104 jogos)...");
    const conn = await pool.getConnection();

    try {
        // 1. Pega o primeiro usuário do banco (para ser o testador principal)
        const [users] = await conn.query<RowDataPacket[]>('SELECT id, apelido FROM colaboradores LIMIT 1');
        if (users.length === 0) {
            console.log("Nenhum usuário encontrado no banco! Crie uma conta no app primeiro.");
            process.exit(1);
        }
        const userId = users[0].id;
        console.log(`Simulando palpites para o usuário: ${users[0].apelido} (ID: ${userId})`);

        // 2. Pega todos os jogos da copa
        const [jogos] = await conn.query<RowDataPacket[]>('SELECT id, time_a, time_b, fase FROM jogos ORDER BY id ASC');
        console.log(`Encontrados ${jogos.length} jogos no banco.`);

        // 3. Preencher palpites e resultados reais
        for (const jogo of jogos) {
            // --- RESULTADO REAL DO JOGO ---
            // Gera um placar real aleatório entre 0 e 3
            const pA = Math.floor(Math.random() * 4);
            const pB = Math.floor(Math.random() * 4);
            const isEmpate = pA === pB;
            
            let classificado = null;
            // Se for mata-mata e empatar, temos que ter um vencedor nos pênaltis
            const isMataMata = !jogo.fase.toLowerCase().includes('grupo') && !jogo.fase.toLowerCase().includes('16');
            if (isMataMata && isEmpate) {
                classificado = Math.random() > 0.5 ? jogo.time_a : jogo.time_b;
            }

            // Atualiza o jogo na tabela "jogos" como se tivesse acontecido na vida real
            await conn.query(`UPDATE jogos SET placar_a = ?, placar_b = ?, classificado = ? WHERE id = ?`, 
                [pA, pB, classificado, jogo.id]);

            // --- PALPITE DO USUÁRIO ---
            // Gera um palpite aleatório (para não acertar tudo e a pontuação ficar realista)
            const palpiteA = Math.floor(Math.random() * 4);
            const palpiteB = Math.floor(Math.random() * 4);
            let palpiteClassificado = null;
            
            if (isMataMata && palpiteA === palpiteB) {
                 palpiteClassificado = Math.random() > 0.5 ? jogo.time_a : jogo.time_b;
            }

            // Insere o palpite no banco
            await conn.query(`
                INSERT INTO palpites (colaborador_id, jogo_id, confronto_time_a, confronto_time_b, palpite_a, palpite_b, time_classificado_palpite)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE 
                confronto_time_a = VALUES(confronto_time_a), confronto_time_b = VALUES(confronto_time_b),
                palpite_a = VALUES(palpite_a), palpite_b = VALUES(palpite_b), time_classificado_palpite = VALUES(time_classificado_palpite)
            `, [userId, jogo.id, jogo.time_a, jogo.time_b, palpiteA, palpiteB, palpiteClassificado]);

            // Roda o motor de pontuação para este jogo!
            await pontuarJogo(jogo.id);
            console.log(`Jogo ${jogo.id} (${jogo.time_a} x ${jogo.time_b}) - Simulado e Pontuado!`);
        }

        console.log("\n==============================================");
        console.log("SUCESSO! O banco de dados foi totalmente preenchido.");
        console.log("Vá para o aplicativo e navegue pelas telas (Ranking, Histórico, Perfil) para ver a copa completa!");
        console.log("==============================================");
    } catch (error) {
        console.error("Erro na simulação:", error);
    } finally {
        conn.release();
        process.exit(0);
    }
}

simular();
