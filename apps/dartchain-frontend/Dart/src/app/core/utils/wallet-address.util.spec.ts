import {
  isEvmAddress,
  isLegacyAddress,
  isValidBlockchainAddress,
  normalizeWalletAddress,
} from './wallet-address.util';

describe('wallet-address.util', () => {
  it('normalizes EVM addresses to lowercase 0x form', () => {
    expect(normalizeWalletAddress('0xAbCdEf0123456789AbCdEf0123456789AbCdEf01'))
      .toBe('0xabcdef0123456789abcdef0123456789abcdef01');
  });

  it('detects EVM and legacy schemes', () => {
    expect(isEvmAddress('0xabcdef0123456789abcdef0123456789abcdef01')).toBe(true);
    expect(isLegacyAddress('abcdef0123456789abcdef0123456789abcdef012345')).toBe(true);
    expect(isValidBlockchainAddress('0xabcdef0123456789abcdef0123456789abcdef01')).toBe(true);
  });
});
