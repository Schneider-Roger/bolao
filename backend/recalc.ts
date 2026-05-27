import { recalcularRanking } from './src/services/pontuacaoService';
import pool from './src/config/db';

async function run() {
    console.log("Recalculando ranking...");
    await recalcularRanking();
    console.log("Ranking recalculado!");
    pool.end();
}

run().catch(console.error);
