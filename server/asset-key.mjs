// Portable Web Crypto keeps Node builds, Vercel and Workers byte-for-byte equal.
const encoder = new TextEncoder();
const derivedKeys = new Map();
export function base64Key(value) {
 if (typeof value !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(value.trim())) return null;
 try { const bytes = Uint8Array.from(atob(value.trim()), c => c.charCodeAt(0)); return bytes.length === 32 ? bytes : null; } catch { return null; }
}
export async function deriveAssetKey(env = {}) {
 const explicit = base64Key(env.DOCUMENTS_ASSET_SECRET), direct = base64Key(env.DOCUMENTS_SECRET);
 if (explicit || direct) return explicit || direct;
 const secret = env.DOCUMENTS_SECRET;
 if (typeof secret !== 'string' || !secret.trim()) return null;
 if (derivedKeys.has(secret)) return derivedKeys.get(secret);
 const pending = (async () => {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt:encoder.encode('homestudio-vault-asset-key-v1'),iterations:100000,hash:'SHA-256'}, key, 256));
 })();
 derivedKeys.set(secret, pending);
 while (derivedKeys.size > 8) derivedKeys.delete(derivedKeys.keys().next().value);
 try { return await pending; } catch (error) { derivedKeys.delete(secret); throw error; }
}
