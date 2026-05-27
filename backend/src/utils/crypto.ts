import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const ALGORITHM = 'aes-256-gcm';
// ENCRYPTION_KEY precisa ter 64 caracteres hexadecimais (32 bytes)
const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY || '', 'hex');

if (ENCRYPTION_KEY.length !== 32) {
  console.warn('Aviso: ENCRYPTION_KEY não configurada ou tamanho inválido. A criptografia falhará se usada.');
}

const HMAC_KEY = Buffer.from(process.env.HMAC_KEY || '', 'hex');
if (HMAC_KEY.length === 0) {
  console.warn('Aviso: HMAC_KEY não configurada. A geração de hashes será insegura ou falhará.');
}

/**
 * Criptografa uma string usando AES-256-GCM.
 * Retorna no formato: iv:authTag:ciphertext
 */
export const encrypt = (text: string): string => {
  if (!text) return text;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
};

/**
 * Descriptografa uma string gerada pelo método encrypt.
 */
export const decrypt = (encryptedText: string): string => {
  if (!encryptedText || !encryptedText.includes(':')) return encryptedText;

  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) return encryptedText;

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encryptedTextBuffer = Buffer.from(parts[2], 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedTextBuffer, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (err) {
    console.error('Erro ao descriptografar dado (possivelmente chave errada ou dado corrompido).');
    return encryptedText; 
  }
};

/**
 * Gera um HMAC-SHA256 determinístico para permitir buscas (WHERE field = hash)
 */
export const hmacHash = (text: string): string => {
  if (!text) return text;
  // Fallback to ENCRYPTION_KEY just in case, but prefer HMAC_KEY
  const keyToUse = HMAC_KEY.length > 0 ? HMAC_KEY : ENCRYPTION_KEY;
  return crypto.createHmac('sha256', keyToUse).update(text).digest('hex');
};

/**
 * Funções auxiliares para lidar com null/undefined
 */
export const encryptField = (value: string | null | undefined): string | null => {
  if (value === null || value === undefined || value === '') return null;
  return encrypt(String(value));
};

export const decryptField = (value: string | null | undefined): string | null => {
  if (value === null || value === undefined || value === '') return null;
  return decrypt(String(value));
};

export const hashField = (value: string | null | undefined): string | null => {
  if (value === null || value === undefined || value === '') return null;
  return hmacHash(String(value));
};

export const hashCredencial = (codigo: string | null | undefined, nascimento: string | null | undefined): string | null => {
  if (!codigo || !nascimento) return null;
  const cleanCodigo = String(codigo).trim();
  const cleanNascimento = String(nascimento).trim();
  return hmacHash(`${cleanCodigo}:${cleanNascimento}`);
};

