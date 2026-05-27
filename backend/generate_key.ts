import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// Gera uma chave aleatória de 32 bytes e a converte para hexadecimal (64 caracteres)
const key = crypto.randomBytes(32).toString('hex');
console.log('Chave gerada (AES-256-GCM):', key);

const envPath = path.join(__dirname, '.env');
const envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

if (envContent.includes('ENCRYPTION_KEY=')) {
  console.log('ENCRYPTION_KEY já existe no .env. Não foi substituída.');
} else {
  fs.appendFileSync(envPath, `\n# Chave usada para criptografia de dados (AES-256-GCM) - NÃO PERCA!\nENCRYPTION_KEY=${key}\n`);
  console.log('A chave foi salva no arquivo .env com sucesso!');
}
