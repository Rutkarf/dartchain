import {
  canStartInquiry,
  inquiryDedupeKey,
  lockInquiry,
  unlockInquiry,
  type InquiryLockState,
} from './placement-inquiry.guard';

describe('placement-inquiry.guard', () => {
  const idle: InquiryLockState = {
    inFlightPlacementId: null,
    lastSubmittedKey: null,
  };

  it('bloque un second envoi tant que la requête est en vol', () => {
    const locked = lockInquiry(idle, 'dev-placement-01');
    expect(
      canStartInquiry(locked, 'dev-placement-02', true)
    ).toEqual({ ok: false, reason: 'in-flight' });
  });

  it('bloque le CTA désactivé', () => {
    expect(canStartInquiry(idle, 'dev-placement-01', false)).toEqual({
      ok: false,
      reason: 'cta-disabled',
    });
  });

  it('empêche le doublon placement+email après succès', () => {
    const key = inquiryDedupeKey('dev-placement-01', 'Ada@Example.com');
    expect(key).toBe('dev-placement-01:ada@example.com');
    const afterSuccess = unlockInquiry(
      lockInquiry(idle, 'dev-placement-01'),
      key
    );
    expect(
      canStartInquiry(afterSuccess, 'dev-placement-01', true, 'ada@example.com')
    ).toEqual({ ok: false, reason: 'duplicate-key' });
    expect(
      canStartInquiry(afterSuccess, 'dev-placement-01', true, 'other@example.com')
    ).toEqual({ ok: true });
  });

  it('autorise un nouvel essai après échec (pas de clé enregistrée)', () => {
    const afterFail = unlockInquiry(lockInquiry(idle, 'dev-placement-01'));
    expect(afterFail.inFlightPlacementId).toBeNull();
    expect(canStartInquiry(afterFail, 'dev-placement-01', true)).toEqual({
      ok: true,
    });
  });
});
