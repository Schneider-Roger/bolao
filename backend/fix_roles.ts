import pool from './src/config/db';
import { decryptField } from './src/utils/crypto';

async function fix() {
  await pool.query("UPDATE colaboradores SET role = 'USER'");
  const [rows] = await pool.query<any[]>("SELECT id, codigo_funcionario FROM colaboradores");
  const adminUser = rows.find(r => decryptField(r.codigo_funcionario) === '17866');
  if (adminUser) {
    await pool.query("UPDATE colaboradores SET role = 'ADMIN' WHERE id = ?", [adminUser.id]);
    console.log('Fixed admin role');
  } else {
    console.log('User not found');
  }
  process.exit(0);
}
fix();
