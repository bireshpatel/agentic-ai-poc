/**
 * Static test-data constants shared across all payment-checkout steps.
 *
 * Card data uses Stripe's standard test Visa number so it is safe to commit.
 * Credentials are NOT stored here — they come from .env (PW_TEST_EMAIL / PW_TEST_PASSWORD).
 */
export const TestCard = {
  holderName: 'Test User',
  number: '4111111111111111',
  expiry: '12/2026',
  cvc: '123',
} as const;

export const DefaultDeliveryComment = 'Standard delivery please.';
