import {
  displayR4v3Address,
  isEvmAddress,
  isLegacyAddress,
  isValidBlockchainAddress,
  normalizeAddressForApi,
  normalizeWalletAddress,
  stripR4v3AddressPrefix,
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

  it('adds and strips the R4V3 address prefix', () => {
    const raw = 'abcdef0123456789abcdef0123456789abcdef01';
    expect(displayR4v3Address(raw)).toBe(`R4V3${raw}`);
    expect(stripR4v3AddressPrefix(`R4V3${raw}`)).toBe(raw);
    expect(normalizeAddressForApi(`R4V3${raw}`)).toBe(raw);
  });
});
