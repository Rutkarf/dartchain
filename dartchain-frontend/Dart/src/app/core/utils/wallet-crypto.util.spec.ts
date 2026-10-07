import {
  buildTransactionPayload,
  formatTransactionAmount,
  generateWalletKeyPair,
  signTransactionDraft,
  verifyTransactionPayload,
} from './wallet-crypto.util';

describe('wallet-crypto.util', () => {
  it('formats amounts like the Java payload builder', () => {
    expect(formatTransactionAmount(0.1)).toBe('0.1');
    expect(formatTransactionAmount(1)).toBe('1');
    expect(formatTransactionAmount(10.5)).toBe('10.5');
  });

  it('builds memo-aware payloads', () => {
    expect(
      buildTransactionPayload('sender', 'recipient', 1, 123, 'memo')
    ).toBe('sender|recipient|1|123|memo');
    expect(buildTransactionPayload('sender', 'recipient', 1, 123)).toBe(
      'sender|recipient|1|123'
    );
  });

  it('generates wallets and signs payloads with Web Crypto', async () => {
    const wallet = await generateWalletKeyPair();
    expect(wallet.address).toHaveLength(40);
    expect(wallet.publicKey.length).toBeGreaterThan(20);
    expect(wallet.privateKey.length).toBeGreaterThan(20);

    const draft = await signTransactionDraft({
      senderAddress: wallet.address,
      senderPublicKey: wallet.publicKey,
      senderPrivateKey: wallet.privateKey,
      recipientAddress: 'recipient1234567890abcdef',
      amount: 0.5,
      memo: 'phase-m',
      timestamp: 42,
    });

    expect(draft.payload).toBe(
      `${wallet.address}|recipient1234567890abcdef|0.5|42|phase-m`
    );

    const valid = await verifyTransactionPayload(
      draft.payload,
      draft.signature,
      wallet.publicKey
    );

    expect(valid).toBe(true);
  });
});
