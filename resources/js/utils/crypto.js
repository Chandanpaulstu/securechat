// ECDH key pair generation + AES-GCM encrypt/decrypt

const ECDH_PARAMS  = { name: 'ECDH', namedCurve: 'P-256' };
const AES_PARAMS   = { name: 'AES-GCM', length: 256 };

// Generate ECDH key pair for this user in this room
export async function generateKeyPair() {
    const keyPair = await crypto.subtle.generateKey(
        ECDH_PARAMS,
        true,
        ['deriveKey']
    );
    return keyPair;
}

// Export public key as base64 to send to server
export async function exportPublicKey(publicKey) {
    const raw = await crypto.subtle.exportKey('raw', publicKey);
    return btoa(String.fromCharCode(...new Uint8Array(raw)));
}

// Import a peer's public key from base64
export async function importPublicKey(base64) {
    const raw = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    return crypto.subtle.importKey('raw', raw, ECDH_PARAMS, true, []);
}

// Derive shared AES key from our private key + peer public key
export async function deriveSharedKey(privateKey, peerPublicKey) {
    return crypto.subtle.deriveKey(
        { name: 'ECDH', public: peerPublicKey },
        privateKey,
        AES_PARAMS,
        false,
        ['encrypt', 'decrypt']
    );
}

// Encrypt plaintext with AES-GCM, returns { ciphertext, iv, integrity_hash } all base64
export async function encryptMessage(sharedKey, plaintext) {
    const iv        = crypto.getRandomValues(new Uint8Array(12));
    const encoded   = new TextEncoder().encode(plaintext);

    const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        sharedKey,
        encoded
    );

    const ciphertext     = btoa(String.fromCharCode(...new Uint8Array(encrypted)));
    const ivBase64       = btoa(String.fromCharCode(...iv));
    const integrityHash  = await computeHMAC(sharedKey, ciphertext + ivBase64);

    return { ciphertext, iv: ivBase64, integrity_hash: integrityHash };
}

// Decrypt and verify integrity
export async function decryptMessage(sharedKey, ciphertext, ivBase64, integrityHash) {
    // Verify integrity first
    const expectedHMAC = await computeHMAC(sharedKey, ciphertext + ivBase64);
    if (expectedHMAC !== integrityHash) {
        throw new Error('Message integrity check failed — possible tampering.');
    }

    const iv        = Uint8Array.from(atob(ivBase64), c => c.charCodeAt(0));
    const encrypted = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));

    const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        sharedKey,
        encrypted
    );

    return new TextDecoder().decode(decrypted);
}

// HMAC-SHA256 for integrity verification
async function computeHMAC(aesKey, data) {
    // Export AES key raw bytes to use as HMAC key material
    const rawKey = await crypto.subtle.exportKey('raw', aesKey).catch(() => {
        return null;
    });

    const encoded = new TextEncoder().encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
    return btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));
}

// Persist key pair in sessionStorage (cleared on tab close — intentional)
export function saveKeyPair(roomId, privateKey, publicKey) {
    sessionStorage.setItem(`kp_${roomId}`, JSON.stringify({ privateKey, publicKey }));
}

export function getKeyPair(roomId) {
    const raw = sessionStorage.getItem(`kp_${roomId}`);
    return raw ? JSON.parse(raw) : null;
}
