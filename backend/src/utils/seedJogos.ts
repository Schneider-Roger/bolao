import pool from '../config/db';
import dotenv from 'dotenv';
dotenv.config();

// Todos os horários em BRT (America/Sao_Paulo)
// encerramento_palpite = 1h antes do jogo
const jogos = [
  // ─── 1ª RODADA ───
  // 11/06
  { r:1, f:'Grupo A', a:'México',           b:'África do Sul',       d:'2026-06-11 16:00:00', e:'2026-06-11 15:00:00' },
  { r:1, f:'Grupo A', a:'Coreia do Sul',     b:'Tchéquia',            d:'2026-06-11 23:00:00', e:'2026-06-11 22:00:00' },
  // 12/06
  { r:1, f:'Grupo B', a:'Canadá',            b:'Bósnia & Herzegovina', d:'2026-06-12 16:00:00', e:'2026-06-12 15:00:00' },
  { r:1, f:'Grupo D', a:'Estados Unidos',    b:'Paraguai',            d:'2026-06-12 22:00:00', e:'2026-06-12 21:00:00' },
  // 13/06
  { r:1, f:'Grupo B', a:'Qatar',             b:'Suíça',               d:'2026-06-13 16:00:00', e:'2026-06-13 15:00:00' },
  { r:1, f:'Grupo C', a:'Brasil',            b:'Marrocos',            d:'2026-06-13 19:00:00', e:'2026-06-13 18:00:00' },
  { r:1, f:'Grupo C', a:'Haiti',             b:'Escócia',             d:'2026-06-13 22:00:00', e:'2026-06-13 21:00:00' },
  // 14/06
  { r:1, f:'Grupo D', a:'Austrália',         b:'Turquia',             d:'2026-06-14 01:00:00', e:'2026-06-14 00:00:00' },
  { r:1, f:'Grupo E', a:'Alemanha',          b:'Curaçao',             d:'2026-06-14 14:00:00', e:'2026-06-14 13:00:00' },
  { r:1, f:'Grupo F', a:'Holanda',           b:'Japão',               d:'2026-06-14 17:00:00', e:'2026-06-14 16:00:00' },
  { r:1, f:'Grupo E', a:'Costa do Marfim',   b:'Equador',             d:'2026-06-14 20:00:00', e:'2026-06-14 19:00:00' },
  { r:1, f:'Grupo F', a:'Suécia',            b:'Tunísia',             d:'2026-06-14 23:00:00', e:'2026-06-14 22:00:00' },
  // 15/06
  { r:1, f:'Grupo H', a:'Espanha',           b:'Cabo Verde',          d:'2026-06-15 13:00:00', e:'2026-06-15 12:00:00' },
  { r:1, f:'Grupo G', a:'Bélgica',           b:'Egito',               d:'2026-06-15 16:00:00', e:'2026-06-15 15:00:00' },
  { r:1, f:'Grupo H', a:'Arábia Saudita',    b:'Uruguai',             d:'2026-06-15 19:00:00', e:'2026-06-15 18:00:00' },
  { r:1, f:'Grupo G', a:'Irã',               b:'Nova Zelândia',       d:'2026-06-15 22:00:00', e:'2026-06-15 21:00:00' },
  // 16/06
  { r:1, f:'Grupo I', a:'França',            b:'Senegal',             d:'2026-06-16 16:00:00', e:'2026-06-16 15:00:00' },
  { r:1, f:'Grupo I', a:'Iraque',            b:'Noruega',             d:'2026-06-16 19:00:00', e:'2026-06-16 18:00:00' },
  { r:1, f:'Grupo J', a:'Argentina',         b:'Argélia',             d:'2026-06-16 22:00:00', e:'2026-06-16 21:00:00' },
  // 17/06
  { r:1, f:'Grupo J', a:'Áustria',           b:'Jordânia',            d:'2026-06-17 01:00:00', e:'2026-06-17 00:00:00' },
  { r:1, f:'Grupo K', a:'Portugal',          b:'Congo',               d:'2026-06-17 14:00:00', e:'2026-06-17 13:00:00' },
  { r:1, f:'Grupo L', a:'Inglaterra',        b:'Croácia',             d:'2026-06-17 17:00:00', e:'2026-06-17 16:00:00' },
  { r:1, f:'Grupo L', a:'Gana',              b:'Panamá',              d:'2026-06-17 20:00:00', e:'2026-06-17 19:00:00' },
  { r:1, f:'Grupo K', a:'Uzbequistão',       b:'Colômbia',            d:'2026-06-17 21:00:00', e:'2026-06-17 20:00:00' },

  // ─── 2ª RODADA ───
  // 18/06
  { r:2, f:'Grupo A', a:'Tchéquia',          b:'África do Sul',       d:'2026-06-18 13:00:00', e:'2026-06-18 12:00:00' },
  { r:2, f:'Grupo B', a:'Suíça',             b:'Bósnia & Herzegovina', d:'2026-06-18 16:00:00', e:'2026-06-18 15:00:00' },
  { r:2, f:'Grupo B', a:'Canadá',            b:'Qatar',               d:'2026-06-18 19:00:00', e:'2026-06-18 18:00:00' },
  { r:2, f:'Grupo A', a:'México',            b:'Coreia do Sul',       d:'2026-06-18 22:00:00', e:'2026-06-18 21:00:00' },
  // 19/06
  { r:2, f:'Grupo D', a:'Estados Unidos',    b:'Austrália',           d:'2026-06-19 16:00:00', e:'2026-06-19 15:00:00' },
  { r:2, f:'Grupo C', a:'Escócia',           b:'Marrocos',            d:'2026-06-19 19:00:00', e:'2026-06-19 18:00:00' },
  { r:2, f:'Grupo C', a:'Brasil',            b:'Haiti',               d:'2026-06-19 21:30:00', e:'2026-06-19 20:30:00' },
  // 20/06
  { r:2, f:'Grupo D', a:'Turquia',           b:'Paraguai',            d:'2026-06-20 00:00:00', e:'2026-06-19 23:00:00' },
  { r:2, f:'Grupo F', a:'Holanda',           b:'Suécia',              d:'2026-06-20 14:00:00', e:'2026-06-20 13:00:00' },
  { r:2, f:'Grupo E', a:'Alemanha',          b:'Costa do Marfim',     d:'2026-06-20 17:00:00', e:'2026-06-20 16:00:00' },
  { r:2, f:'Grupo E', a:'Equador',           b:'Curaçao',             d:'2026-06-20 21:00:00', e:'2026-06-20 20:00:00' },
  { r:2, f:'Grupo F', a:'Tunísia',           b:'Japão',               d:'2026-06-20 23:00:00', e:'2026-06-20 22:00:00' },
  // 21/06
  { r:2, f:'Grupo H', a:'Espanha',           b:'Arábia Saudita',      d:'2026-06-21 13:00:00', e:'2026-06-21 12:00:00' },
  { r:2, f:'Grupo G', a:'Bélgica',           b:'Irã',                 d:'2026-06-21 16:00:00', e:'2026-06-21 15:00:00' },
  { r:2, f:'Grupo H', a:'Uruguai',           b:'Cabo Verde',          d:'2026-06-21 19:00:00', e:'2026-06-21 18:00:00' },
  { r:2, f:'Grupo G', a:'Nova Zelândia',     b:'Egito',               d:'2026-06-21 22:00:00', e:'2026-06-21 21:00:00' },
  // 22/06
  { r:2, f:'Grupo J', a:'Argentina',         b:'Áustria',             d:'2026-06-22 14:00:00', e:'2026-06-22 13:00:00' },
  { r:2, f:'Grupo I', a:'França',            b:'Iraque',              d:'2026-06-22 18:00:00', e:'2026-06-22 17:00:00' },
  { r:2, f:'Grupo I', a:'Noruega',           b:'Senegal',             d:'2026-06-22 21:00:00', e:'2026-06-22 20:00:00' },
  // 23/06
  { r:2, f:'Grupo J', a:'Jordânia',          b:'Argélia',             d:'2026-06-23 00:00:00', e:'2026-06-22 23:00:00' },
  { r:2, f:'Grupo K', a:'Portugal',          b:'Uzbequistão',         d:'2026-06-23 14:00:00', e:'2026-06-23 13:00:00' },
  { r:2, f:'Grupo L', a:'Inglaterra',        b:'Gana',                d:'2026-06-23 17:00:00', e:'2026-06-23 16:00:00' },
  { r:2, f:'Grupo L', a:'Panamá',            b:'Croácia',             d:'2026-06-23 20:00:00', e:'2026-06-23 19:00:00' },
  { r:2, f:'Grupo K', a:'Colômbia',          b:'Congo',               d:'2026-06-23 23:00:00', e:'2026-06-23 22:00:00' },

  // ─── 3ª RODADA ───
  // 24/06
  { r:3, f:'Grupo B', a:'Suíça',             b:'Canadá',              d:'2026-06-24 16:00:00', e:'2026-06-24 15:00:00' },
  { r:3, f:'Grupo B', a:'Bósnia & Herzegovina', b:'Qatar',            d:'2026-06-24 16:00:00', e:'2026-06-24 15:00:00' },
  { r:3, f:'Grupo C', a:'Escócia',           b:'Brasil',              d:'2026-06-24 19:00:00', e:'2026-06-24 18:00:00' },
  { r:3, f:'Grupo C', a:'Marrocos',          b:'Haiti',               d:'2026-06-24 19:00:00', e:'2026-06-24 18:00:00' },
  { r:3, f:'Grupo A', a:'Tchéquia',          b:'México',              d:'2026-06-24 22:00:00', e:'2026-06-24 21:00:00' },
  { r:3, f:'Grupo A', a:'África do Sul',     b:'Coreia do Sul',       d:'2026-06-24 22:00:00', e:'2026-06-24 21:00:00' },
  // 25/06
  { r:3, f:'Grupo E', a:'Equador',           b:'Alemanha',            d:'2026-06-25 17:00:00', e:'2026-06-25 16:00:00' },
  { r:3, f:'Grupo E', a:'Curaçao',           b:'Costa do Marfim',     d:'2026-06-25 17:00:00', e:'2026-06-25 16:00:00' },
  { r:3, f:'Grupo F', a:'Japão',             b:'Suécia',              d:'2026-06-25 20:00:00', e:'2026-06-25 19:00:00' },
  { r:3, f:'Grupo F', a:'Tunísia',           b:'Holanda',             d:'2026-06-25 20:00:00', e:'2026-06-25 19:00:00' },
  { r:3, f:'Grupo D', a:'Turquia',           b:'Estados Unidos',      d:'2026-06-25 23:00:00', e:'2026-06-25 22:00:00' },
  { r:3, f:'Grupo D', a:'Paraguai',          b:'Austrália',           d:'2026-06-25 23:00:00', e:'2026-06-25 22:00:00' },
  // 26/06
  { r:3, f:'Grupo I', a:'Noruega',           b:'França',              d:'2026-06-26 16:00:00', e:'2026-06-26 15:00:00' },
  { r:3, f:'Grupo I', a:'Senegal',           b:'Iraque',              d:'2026-06-26 16:00:00', e:'2026-06-26 15:00:00' },
  { r:3, f:'Grupo H', a:'Cabo Verde',        b:'Arábia Saudita',      d:'2026-06-26 21:00:00', e:'2026-06-26 20:00:00' },
  { r:3, f:'Grupo H', a:'Uruguai',           b:'Espanha',             d:'2026-06-26 21:00:00', e:'2026-06-26 20:00:00' },
  // 27/06
  { r:3, f:'Grupo G', a:'Egito',             b:'Irã',                 d:'2026-06-27 00:00:00', e:'2026-06-26 23:00:00' },
  { r:3, f:'Grupo G', a:'Nova Zelândia',     b:'Bélgica',             d:'2026-06-27 00:00:00', e:'2026-06-26 23:00:00' },
  { r:3, f:'Grupo L', a:'Panamá',            b:'Inglaterra',          d:'2026-06-27 18:00:00', e:'2026-06-27 17:00:00' },
  { r:3, f:'Grupo L', a:'Croácia',           b:'Gana',                d:'2026-06-27 18:00:00', e:'2026-06-27 17:00:00' },
  { r:3, f:'Grupo K', a:'Colômbia',          b:'Portugal',            d:'2026-06-27 20:30:00', e:'2026-06-27 19:30:00' },
  { r:3, f:'Grupo K', a:'Congo',             b:'Uzbequistão',         d:'2026-06-27 20:30:00', e:'2026-06-27 19:30:00' },
  { r:3, f:'Grupo J', a:'Argélia',           b:'Áustria',             d:'2026-06-27 23:00:00', e:'2026-06-27 22:00:00' },
  { r:3, f:'Grupo J', a:'Jordânia',          b:'Argentina',           d:'2026-06-27 23:00:00', e:'2026-06-27 22:00:00' },
];

async function seed() {
  const conn = await pool.getConnection();
  try {
    // Limpa jogos existentes da fase de grupos para evitar duplicatas
    await conn.query(`DELETE FROM jogos WHERE fase LIKE 'Grupo %'`);
    console.log('🗑️  Jogos anteriores removidos.');

    for (const j of jogos) {
      await conn.query(
        `INSERT INTO jogos (fase, rodada, time_a, time_b, data_hora, encerramento_palpite, status)
         VALUES (?, ?, ?, ?, ?, ?, 'aberto')`,
        [j.f, j.r, j.a, j.b, j.d, j.e]
      );
    }

    console.log(`✅ ${jogos.length} jogos inseridos com sucesso!`);
  } finally {
    conn.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error('❌ Erro ao inserir jogos:', err);
  process.exit(1);
});
