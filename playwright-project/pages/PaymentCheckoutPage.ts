/**
 * PaymentCheckoutPage.ts
 *
 * UTC timestamp: 2026-08-06T04:44:43+00:00
 * Test cases source file: output/testcase_generated/payment_checkout_raw_output.json
 * Page context source file: data/page_context/payment_checkout_page.json
 */

import { Page, Locator, expect } from '@playwright/test';
import { Selectors } from '../support/selectors';

export class PaymentCheckoutPage {
  readonly page: Page;
  readonly cardName: Locator;
  readonly cardNumber: Locator;
  readonly cardCvc: Locator;
  readonly submitButton: Locator;
  readonly successMessage: Locator;
  readonly errorMessage: Locator;
  readonly loadingSpinner: Locator;

  constructor(page: Page) {
    this.page = page;
    this.cardName = page.locator(Selectors.payment.nameOnCard);
    this.cardNumber = page.locator(Selectors.payment.cardNumber);
    this.cardCvc = page.locator(Selectors.payment.cvc);
    this.submitButton = page.locator(Selectors.payment.payButton);
    this.successMessage = page.locator(Selectors.confirmation.orderPlacedHeading);
    this.errorMessage = page.locator('[data-testid="payment-error-msg"]');
    this.loadingSpinner = page.locator('[data-testid="payment-loading"]');
  }

  async navigateTo() {
    await this.page.goto('/payment');
  }

  private async fillField(locator: Locator, value: string) {
    await locator.scrollIntoViewIfNeeded();
    await locator.waitFor({ state: 'visible', timeout: 15_000 });
    await locator.fill(value);
  }

  async fillCardName(value: string) {
    await this.fillField(this.cardName, value);
  }

  async fillCardNumber(value: string) {
    await this.fillField(this.cardNumber, value);
  }

  async fillCardExpiry(value: string) {
    const [month, year] = value.split('/');
    if (month) {
      await this.fillField(this.page.locator(Selectors.payment.expiryMonth), month);
    }
    if (year) {
      await this.fillField(this.page.locator(Selectors.payment.expiryYear), year);
    }
  }

  async fillCardCvc(value: string) {
    await this.fillField(this.cardCvc, value);
  }

  async clickSubmit() {
    await this.submitButton.scrollIntoViewIfNeeded();
    await expect(this.submitButton).toBeEnabled({ timeout: 10_000 });
    await this.submitButton.click();
  }

  async assertSuccess() {
    await expect(this.successMessage).toBeVisible();
  }

  async assertError() {
    await expect(this.errorMessage).toBeVisible();
  }
}
