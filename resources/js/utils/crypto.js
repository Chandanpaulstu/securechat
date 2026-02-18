const ECDH_PARAMS = { name: 'ECDH', namedCurve: 'P-256' };
const AES_PARAMS  = { name: 'AES-GCM', length: 256 };

export async function generateKeyPair() {
    return crypto.subtle.generateKey(ECDH_PARAMS, true, ['deriveKey']);
}

export async function exportPublicKey(publicKey) {
    const raw = await crypto.subtle.exportKey('raw', publicKey);
    return btoa(String.fromCharCode(...new Uint8Array(raw)));
}

export async function importPublicKey(base64) {
    const raw = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    return crypto.subtle.importKey('raw', raw, ECDH_PARAMS, true, []);
}

export async function deriveSharedKey(privateKey, peerPublicKey) {
    return crypto.subtle.deriveKey(
        { name: 'ECDH', public: peerPublicKey },
        privateKey,
        AES_PARAMS,
        false,
        ['encrypt', 'decrypt']
    );
}

export async function encryptMessage(sharedKey, plaintext) {
    const iv      = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(plaintext);

    const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv, tagLength: 128 },
        sharedKey,
        encoded
    );

    return {
        ciphertext:     btoa(String.fromCharCode(...new Uint8Array(encrypted))),
        iv:             btoa(String.fromCharCode(...iv)),
        integrity_hash: 'aes-gcm-builtin',
    };
}

export async function decryptMessage(sharedKey, ciphertext, ivBase64) {
    const iv        = Uint8Array.from(atob(ivBase64), c => c.charCodeAt(0));
    const encrypted = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));

    const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv, tagLength: 128 },
        sharedKey,
        encrypted
    );

    return new TextDecoder().decode(decrypted);
}

// NEW: Keypair persistence helpers
export async function exportPrivateKey(privateKey) {
    const jwk = await crypto.subtle.exportKey('jwk', privateKey);
    return JSON.stringify(jwk);
}

export async function importPrivateKey(jwkString) {
    const jwk = JSON.parse(jwkString);
    return crypto.subtle.importKey('jwk', jwk, ECDH_PARAMS, true, ['deriveKey']);
}

export async function saveKeyPair(roomId, keyPair) {
    const publicKeyB64  = await exportPublicKey(keyPair.publicKey);
    const privateKeyJwk = await exportPrivateKey(keyPair.privateKey);

    localStorage.setItem(`keypair_${roomId}`, JSON.stringify({
        publicKey: publicKeyB64,
        privateKey: privateKeyJwk,
    }));
}

export async function loadKeyPair(roomId) {
    const stored = localStorage.getItem(`keypair_${roomId}`);
    if (!stored) return null;

    try {
        const { publicKey, privateKey } = JSON.parse(stored);
        return {
            publicKey:  await importPublicKey(publicKey),
            privateKey: await importPrivateKey(privateKey),
        };
    } catch (e) {
        console.error('[Keypair load failed]', e);
        return null;
    }
}
