import * as secp from "https://deno.land/x/secp256k1@1.7.0/mod.ts";
import { base64 } from 'https://raw.githubusercontent.com/paulmillr/scure-base/main/mod.ts';

export default class Message {
    
    private static getNormalizedX(key: Uint8Array): Uint8Array {
        return key.slice(1, 33)
    }

    private static randomBytes(bytesLength: number = 32) {
        return crypto.getRandomValues(new Uint8Array(bytesLength));
    }

    public static async encryptMessage(to: string, message: string, _privateKey: string): Promise<string> {
        const key = secp.getSharedSecret(_privateKey, '02' + to);
        const normalizedKey = this.getNormalizedX(key);
        const encoder = new TextEncoder();
        const iv = Uint8Array.from(this.randomBytes(16));
        const plaintext = encoder.encode(message);
        const cryptoKey = await crypto.subtle.importKey(
            'raw',
            normalizedKey,
            {name: 'AES-CBC'},
            false,
            ['encrypt']
        );
        const ciphertext = await crypto.subtle.encrypt(
            {name: 'AES-CBC', iv},
            cryptoKey,
            plaintext
        );
        const toBase64 = (uInt8Array: Uint8Array) => btoa(String.fromCharCode(...uInt8Array));
        const ctb64 = toBase64(new Uint8Array(ciphertext));
        const ivb64 = toBase64(new Uint8Array(iv.buffer));
        return `${ctb64}?iv=${ivb64}`;
    }

    private static stringToBuffer(value: string): ArrayBuffer {
        let buffer = new ArrayBuffer(value.length * 2); // 2 bytes per char
        let view = new Uint16Array(buffer);
        for (let i = 0, length = value.length; i < length; i++) {
            view[i] = value.charCodeAt(i);
        }
        return buffer;
    }

    public static async decrypt(privkey: string, pubkey: string, data: string): Promise<string> {
        const [ ctb64, ivb64 ] = data.split('?iv=')
        const key = secp.getSharedSecret(privkey, '02' + pubkey)
        const normalizedKey = this.getNormalizedX(key)
          
        const cryptoKey = await crypto.subtle.importKey(
            'raw',
            normalizedKey,
            {name: 'AES-CBC'},
            false,
            ['decrypt']
        );
        const ciphertext = base64.decode(ctb64);
        const iv = base64.decode(ivb64);
        
        const plaintext = await crypto.subtle.decrypt(
            { name: 'AES-CBC', iv },
            cryptoKey,
            ciphertext
        );
          
        const txtDecode = new TextDecoder();
        const text = txtDecode.decode(plaintext)
        return text;
    }
    
} 