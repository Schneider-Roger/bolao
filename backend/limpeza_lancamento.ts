import pool from './src/config/db';
import type { RowDataPacket } from 'mysql2';

async function limpezaGeral() {
  const conn = await pool.getConnection();
  try {
    console.log("🧹 LIMPEZA GERAL PARA LANÇAMENTO");
    console.log("=".repeat(50));

    // 1. Limpar TODOS os palpites (fase de grupos)
    const [palpites] = await conn.query<RowDataPacket[]>('SELECT COUNT(*) as total FROM palpites');
    console.log(`\n1️⃣  Palpites encontrados: ${palpites[0].total}`);
    await conn.query('DELETE FROM palpites');
    console.log("   ✅ Todos os palpites removidos.");

    // 2. Limpar palpites especiais (mata-mata bracket)
    const [especiais] = await conn.query<RowDataPacket[]>('SELECT COUNT(*) as total FROM palpites_especiais');
    console.log(`\n2️⃣  Palpites especiais encontrados: ${especiais[0].total}`);
    await conn.query('DELETE FROM palpites_especiais');
    console.log("   ✅ Todos os palpites especiais removidos.");

    // 3. Limpar ranking
    const [ranking] = await conn.query<RowDataPacket[]>('SELECT COUNT(*) as total FROM ranking');
    console.log(`\n3️⃣  Entradas no ranking: ${ranking[0].total}`);
    await conn.query('DELETE FROM ranking');
    console.log("   ✅ Ranking zerado.");

    // 4. Resetar TODOS os jogos para status 'aberto' e sem placar
    const [jogos] = await conn.query<RowDataPacket[]>('SELECT COUNT(*) as total FROM jogos WHERE status != "aberto"');
    console.log(`\n4️⃣  Jogos com status diferente de 'aberto': ${jogos[0].total}`);
    await conn.query(`
      UPDATE jogos 
      SET placar_a = NULL, 
          placar_b = NULL, 
          status = 'aberto', 
          classificado = NULL
    `);
    console.log("   ✅ Todos os jogos resetados para 'aberto'.");

    // 5. Limpar dados de primeiro acesso fictícios (apelido, selecao, foto)
    // Mantém apenas dados reais da planilha (nome, codigo, data_nasc, setor, etc.)
    const [perfis] = await conn.query<RowDataPacket[]>('SELECT COUNT(*) as total FROM colaboradores WHERE apelido IS NOT NULL');
    console.log(`\n5️⃣  Colaboradores com perfil preenchido: ${perfis[0].total}`);
    await conn.query(`
      UPDATE colaboradores 
      SET apelido = NULL, 
          selecao_favorita = NULL, 
          foto_perfil = NULL
    `);
    console.log("   ✅ Perfis de primeiro acesso limpos (apelido, seleção, foto).");

    // 6. Verificar totais finais
    const [totalColab] = await conn.query<RowDataPacket[]>('SELECT COUNT(*) as total FROM colaboradores WHERE ativo = 1');
    const [totalJogos] = await conn.query<RowDataPacket[]>('SELECT COUNT(*) as total FROM jogos');
    const [totalPalpites] = await conn.query<RowDataPacket[]>('SELECT COUNT(*) as total FROM palpites');
    const [totalRanking] = await conn.query<RowDataPacket[]>('SELECT COUNT(*) as total FROM ranking');

    console.log("\n" + "=".repeat(50));
    console.log("📊 RESUMO FINAL:");
    console.log(`   Colaboradores ativos: ${totalColab[0].total}`);
    console.log(`   Jogos cadastrados: ${totalJogos[0].total}`);
    console.log(`   Palpites: ${totalPalpites[0].total}`);
    console.log(`   Ranking: ${totalRanking[0].total}`);
    console.log("\n🚀 Sistema pronto para o lançamento!");

  } catch (e) {
    console.error("❌ Erro na limpeza:", e);
  } finally {
    conn.release();
    process.exit(0);
  }
}

limpezaGeral();
