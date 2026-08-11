import {
  displayR4v3Address,
  extractWalletHash,
  formatUserWalletAddress,
  isEvmAddress,
  isLegacyAddress,
  isValidBlockchainAddress,
  normalizeAddressForApi,
  normalizeWalletAddress,
  stripR4v3AddressPrefix,
  toDisplayWalletAddress,
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

  it('formats user wallet addresses without @', () => {
    const hash = 'abcdef0123456789abcdef0123456789abcdef01';
    expect(formatUserWalletAddress('rutkarf', hash)).toBe(`rutkarfR4V3${hash}`);
    expect(formatUserWalletAddress('@rutkarf', `R4V3${hash}`)).toBe(`rutkarfR4V3${hash}`);
    expect(formatUserWalletAddress(null, hash)).toBe(`R4V3${hash}`);
  });

  it('normalizes display addresses to usernameR4V3 form', () => {
    const hash = 'abcdef0123456789abcdef0123456789abcdef01';
    expect(toDisplayWalletAddress(`R4V3${hash}`, 'rutkarf')).toBe(`rutkarfR4V3${hash}`);
    expect(toDisplayWalletAddress(`@alice+R4V3+${hash}`, 'rutkarf')).toBe(`aliceR4V3${hash}`);
  });

  it('extracts hash from user and legacy display forms', () => {
    const hash = 'abcdef0123456789abcdef0123456789abcdef01';
    expect(extractWalletHash(`rutkarfR4V3${hash}`)).toBe(hash);
    expect(extractWalletHash(`@rutkarfR4V3${hash}`)).toBe(hash);
    expect(extractWalletHash(`@rutkarf+R4V3+${hash}`)).toBe(hash);
    expect(extractWalletHash(`R4V3${hash}`)).toBe(hash);
    expect(normalizeAddressForApi(`rutkarfR4V3${hash}`)).toBe(hash);
  });
});
