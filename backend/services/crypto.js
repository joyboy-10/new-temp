const crypto = require('crypto');

const PASSPHRASE = process.env.JWT_SECRET || 'fallback-secret-key';
const IVLEN = 16; // AES-256-GCM 12 is common; we'll use 16 for IV with GCM

function encrypt(text) {
  const iv = crypto.randomBytes(IVLEN);
  const key = crypto.createHash('sha256').update(PASSPHRASE).digest();
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

function decrypt(b64) {
  const raw = Buffer.from(b64, 'base64');
  const iv = raw.subarray(0, IVLEN);
  const tag = raw.subarray(IVLEN, IVLEN + 16);
  const enc = raw.subarray(IVLEN + 16);
  const key = crypto.createHash('sha256').update(PASSPHRASE).digest();
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return dec.toString('utf8');
}

module.exports = { encrypt, decrypt };
