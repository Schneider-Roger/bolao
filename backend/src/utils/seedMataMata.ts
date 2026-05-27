import pool from '../config/db';
import dotenv from 'dotenv';
dotenv.config();

// Mata-mata Copa 2026 — Horários em BRT (America/Sao_Paulo)
// Times "A Definir" — admin atualiza após fase de grupos
// encerramento_palpite = 1h antes do jogo

const jogos = [
  // ─── SEGUNDAS DE FINAL (Round of 32) — 16 jogos ───
  // 28/06
  { r:null, f:'16avos de Final', a:'2º Grupo A',  b:'2º Grupo B',        d:'2026-06-28 18:00:00', e:'2026-06-28 17:00:00' },
  // 29/06
  { r:null, f:'16avos de Final', a:'1º Grupo F',  b:'Melhor 3º ABCDF',   d:'2026-06-29 14:00:00', e:'2026-06-29 13:00:00' },
  { r:null, f:'16avos de Final', a:'1º Grupo C',  b:'2º Grupo F',        d:'2026-06-29 17:30:00', e:'2026-06-29 16:30:00' },
  { r:null, f:'16avos de Final', a:'1º Grupo E',  b:'2º Grupo D',        d:'2026-06-29 22:00:00', e:'2026-06-29 21:00:00' },
  // 30/06
  { r:null, f:'16avos de Final', a:'1º Grupo B',  b:'2º Grupo A',        d:'2026-06-30 14:00:00', e:'2026-06-30 13:00:00' },
  { r:null, f:'16avos de Final', a:'1º Grupo I',  b:'Melhor 3º CDFGHI',  d:'2026-06-30 18:00:00', e:'2026-06-30 17:00:00' },
  { r:null, f:'16avos de Final', a:'1º Grupo A',  b:'Melhor 3º EFGHIJK', d:'2026-06-30 22:00:00', e:'2026-06-30 21:00:00' },
  // 01/07
  { r:null, f:'16avos de Final', a:'1º Grupo L',  b:'Melhor 3º DJLK',    d:'2026-07-01 13:00:00', e:'2026-07-01 12:00:00' },
  { r:null, f:'16avos de Final', a:'1º Grupo C',  b:'3º Grupo AFHIJ',    d:'2026-07-01 17:00:00', e:'2026-07-01 16:00:00' },
  { r:null, f:'16avos de Final', a:'1º Grupo L',  b:'3º Grupo DLTIJ',    d:'2026-07-01 21:30:00', e:'2026-07-01 20:30:00' },
  // 02/07
  { r:null, f:'16avos de Final', a:'2º Grupo K',  b:'2º Grupo L',        d:'2026-07-02 20:00:00', e:'2026-07-02 19:00:00' },
  // 03/07
  { r:null, f:'16avos de Final', a:'2º Grupo G',  b:'Melhor 3º GHIJKL', d:'2026-07-03 00:00:00', e:'2026-07-02 23:00:00' },
  { r:null, f:'16avos de Final', a:'1º Grupo J',  b:'2º Grupo G',        d:'2026-07-03 13:00:00', e:'2026-07-03 12:00:00' },
  { r:null, f:'16avos de Final', a:'1º Grupo D',  b:'2º Grupo E',        d:'2026-07-03 15:00:00', e:'2026-07-03 14:00:00' },
  { r:null, f:'16avos de Final', a:'1º Grupo H',  b:'2º Grupo J',        d:'2026-07-03 16:00:00', e:'2026-07-03 15:00:00' },
  { r:null, f:'16avos de Final', a:'1º Grupo K',  b:'2º Grupo H',        d:'2026-07-03 22:30:00', e:'2026-07-03 21:30:00' },

  // ─── OITAVAS DE FINAL (Round of 16) — 8 jogos ───
  // 04/07
  { r:null, f:'Oitavas de Final', a:'A Definir', b:'A Definir', d:'2026-07-04 14:00:00', e:'2026-07-04 13:00:00' },
  { r:null, f:'Oitavas de Final', a:'A Definir', b:'A Definir', d:'2026-07-04 18:00:00', e:'2026-07-04 17:00:00' },
  // 05/07
  { r:null, f:'Oitavas de Final', a:'A Definir', b:'A Definir', d:'2026-07-05 17:00:00', e:'2026-07-05 16:00:00' },
  { r:null, f:'Oitavas de Final', a:'A Definir', b:'A Definir', d:'2026-07-05 21:00:00', e:'2026-07-05 20:00:00' },
  // 07/07
  { r:null, f:'Oitavas de Final', a:'A Definir', b:'A Definir', d:'2026-07-07 13:00:00', e:'2026-07-07 12:00:00' },
  { r:null, f:'Oitavas de Final', a:'A Definir', b:'A Definir', d:'2026-07-07 17:00:00', e:'2026-07-07 16:00:00' },
  // 08/07
  { r:null, f:'Oitavas de Final', a:'A Definir', b:'A Definir', d:'2026-07-08 16:00:00', e:'2026-07-08 15:00:00' },
  { r:null, f:'Oitavas de Final', a:'A Definir', b:'A Definir', d:'2026-07-08 21:00:00', e:'2026-07-08 20:00:00' },

  // ─── QUARTAS DE FINAL — 4 jogos ───
  { r:null, f:'Quartas de Final', a:'A Definir', b:'A Definir', d:'2026-07-09 17:00:00', e:'2026-07-09 16:00:00' },
  { r:null, f:'Quartas de Final', a:'A Definir', b:'A Definir', d:'2026-07-10 16:00:00', e:'2026-07-10 15:00:00' },
  { r:null, f:'Quartas de Final', a:'A Definir', b:'A Definir', d:'2026-07-11 18:00:00', e:'2026-07-11 17:00:00' },
  { r:null, f:'Quartas de Final', a:'A Definir', b:'A Definir', d:'2026-07-11 22:00:00', e:'2026-07-11 21:00:00' },

  // ─── SEMIFINAIS — 2 jogos ───
  { r:null, f:'Semifinal', a:'A Definir', b:'A Definir', d:'2026-07-14 18:00:00', e:'2026-07-14 17:00:00' },
  { r:null, f:'Semifinal', a:'A Definir', b:'A Definir', d:'2026-07-15 16:00:00', e:'2026-07-15 15:00:00' },

  // ─── DISPUTA DO 3º LUGAR ───
  { r:null, f:'Disputa 3º Lugar', a:'A Definir', b:'A Definir', d:'2026-07-18 18:00:00', e:'2026-07-18 17:00:00' },

  // ─── FINAL ───
  { r:null, f:'Final', a:'A Definir', b:'A Definir', d:'2026-07-19 18:00:00', e:'2026-07-19 17:00:00' },
];

async function seed() {
  const conn = await pool.getConnection();
  try {
    // Remove mata-mata anterior
    await conn.query(`DELETE FROM jogos WHERE fase NOT LIKE 'Grupo %'`);
    console.log('🗑️  Mata-mata anterior removido.');

    for (const j of jogos) {
      await conn.query(
        `INSERT INTO jogos (fase, rodada, time_a, time_b, data_hora, encerramento_palpite, status)
         VALUES (?, ?, ?, ?, ?, ?, 'bloqueado')`,
        [j.f, j.r, j.a, j.b, j.d, j.e]
      );
    }

    console.log(`✅ ${jogos.length} jogos do mata-mata inseridos!`);
    console.log('ℹ️  Status: bloqueado — admin libera/atualiza times conforme grupos finalizam.');
  } finally {
    conn.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error('❌ Erro:', err);
  process.exit(1);
});
