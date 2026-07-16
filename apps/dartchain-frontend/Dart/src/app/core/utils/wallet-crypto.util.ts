export interface GeneratedWalletKeyPair {
  address: string;
  publicKey: string;
  privateKey: string;
  signingModel: 'client-ecdsa';
}

export interface SignedTransactionDraft {
  senderAddress: string;
  senderPublicKey: string;
  recipientAddress: string;
  amount: number;
  memo?: string;
  timestamp: number;
  payload: string;
  signature: string;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

/** Aligné sur {@code TransactionPayloadBuilder} backend. */
export function formatTransactionAmount(amount: number): string {
  if (!Number.isFinite(amount)) {
    return '0';
  }

  const fixed = amount.toFixed(8);
  return fixed.replace(/\.?0+$/, '') || '0';
}

export function buildTransactionPayload(
  senderAddress: string,
  recipientAddress: string,
  amount: number,
  timestamp: number,
  memo?: string
): string {
  const normalizedMemo = memo?.trim() ?? '';
  let payload = `${senderAddress}|${recipientAddress}|${formatTransactionAmount(amount)}|${timestamp}`;

  if (normalizedMemo) {
    payload += `|${normalizedMemo}`;
  }

  return payload;
}

export async function addressFromPublicKeyBase64(publicKeyBase64: string): Promise<string> {
  const hash = await sha256Hex(publicKeyBase64);
  return hash.substring(0, 40);
}

export async function generateWalletKeyPair(): Promise<GeneratedWalletKeyPair> {
  const keyPair = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify']
  );

  const publicKeyBytes = new Uint8Array(
    await crypto.subtle.exportKey('spki', keyPair.publicKey)
  );
  const privateKeyBytes = new Uint8Array(
    await crypto.subtle.exportKey('pkcs8', keyPair.privateKey)
  );

  const publicKey = bytesToBase64(publicKeyBytes);
  const privateKey = bytesToBase64(privateKeyBytes);
  const address = await addressFromPublicKeyBase64(publicKey);

  return {
    address,
    publicKey,
    privateKey,
    signingModel: 'client-ecdsa',
  };
}

export async function signTransactionPayload(
  payload: string,
  privateKeyBase64: string
): Promise<string> {
  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    base64ToBytes(privateKeyBase64) as BufferSource,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    new TextEncoder().encode(payload)
  );

  return bytesToBase64(new Uint8Array(signature));
}

export async function verifyTransactionPayload(
  payload: string,
  signatureBase64: string,
  publicKeyBase64: string
): Promise<boolean> {
  const publicKey = await crypto.subtle.importKey(
    'spki',
    base64ToBytes(publicKeyBase64) as BufferSource,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['verify']
  );

  return crypto.subtle.verify(
    { name: 'ECDSA', hash: 'SHA-256' },
    publicKey,
    base64ToBytes(signatureBase64) as BufferSource,
    new TextEncoder().encode(payload)
  );
}

export async function signTransactionDraft(input: {
  senderAddress: string;
  senderPublicKey: string;
  senderPrivateKey: string;
  recipientAddress: string;
  amount: number;
  memo?: string;
  timestamp?: number;
}): Promise<SignedTransactionDraft> {
  const timestamp = input.timestamp ?? Date.now();
  const payload = buildTransactionPayload(
    input.senderAddress,
    input.recipientAddress,
    input.amount,
    timestamp,
    input.memo
  );
  const signature = await signTransactionPayload(payload, input.senderPrivateKey);

  return {
    senderAddress: input.senderAddress,
    senderPublicKey: input.senderPublicKey,
    recipientAddress: input.recipientAddress,
    amount: input.amount,
    memo: input.memo?.trim() || undefined,
    timestamp,
    payload,
    signature,
  };
}
