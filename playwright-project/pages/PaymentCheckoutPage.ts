/**
 * UTC timestamp for file headers: 2026-07-31T04:26:14+00:00
 * Test cases source file: output/testcase_generated/payment_checkout_raw_output.json
 * Page context source file: data/page_context/payment_checkout_page.json
 *
 * Selectors verified against the live automationexercise.com payment page — the
 * generated page context used data-testid placeholders that don't exist on the
 * real site; see support/selectors.ts (data-qa) for the source of truth.
 */

import { Page, Locator, expect } from '@playwright/test';
import { Selectors } from '../support/selectors';

/**
 * The final step of the checkout flow where the user enters payment details.
 */
export class PaymentCheckoutPage {
  readonly nameOnCard: Locator;
  readonly cardNumber: Locator;
  readonly cardExpiryMonth: Locator;
  readonly cardExpiryYear: Locator;
  readonly cardCvc: Locator;
  readonly submitButton: Locator;
  readonly successMessage: Locator;

  constructor(private readonly page: Page) {
    this.nameOnCard = page.locator(Selectors.payment.nameOnCard);
    this.cardNumber = page.locator(Selectors.payment.cardNumber);
    this.cardExpiryMonth = page.locator(Selectors.payment.expiryMonth);
    this.cardExpiryYear = page.locator(Selectors.payment.expiryYear);
    this.cardCvc = page.locator(Selectors.payment.cvc);
    this.submitButton = page.locator(Selectors.payment.payButton);
    this.successMessage = page.locator(Selectors.confirmation.orderPlacedHeading);
  }

  /**
   * Navigates to the payment checkout page.
   */
  async navigate() {
    await this.page.goto('/payment');
  }

  /**
   * Fills the cardholder name field.
   */
  async fillNameOnCard(value: string) {
    await this.nameOnCard.fill(value);
  }

  /**
   * Fills the card number field.
   * @param value Raw 16-digit card number string.
   */
  async fillCardNumber(value: string) {
    await this.cardNumber.fill(value);
  }

  /**
   * Fills the expiry month/year fields.
   * @param value "MM/YYYY" (the site splits this into two separate inputs).
   */
  async fillCardExpiry(value: string) {
    const [month, year] = value.split('/').map((s) => s.trim());
    await this.cardExpiryMonth.fill(month);
    await this.cardExpiryYear.fill(year);
  }

  /**
   * Fills the card CVC field.
   * @param value 3 or 4 digit security code.
   */
  async fillCardCvc(value: string) {
    await this.cardCvc.fill(value);
  }

  /**
   * Clicks the submit/pay button.
   */
  async clickSubmit() {
    await this.submitButton.click();
  }

  /**
   * Asserts that the order-confirmation heading is visible.
   */
  async assertSuccess() {
    await expect(this.successMessage).toBeVisible();
  }
}
