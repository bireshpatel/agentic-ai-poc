/**
 * Payment page on https://automationexercise.com/payment
 * (data-qa attributes from live site.)
 */

import { Page, Locator, expect } from '@playwright/test';

export class PaymentCheckoutPage {
  public readonly page: Page;
  public readonly nameOnCard: Locator;
  public readonly cardNumber: Locator;
  public readonly cardCvc: Locator;
  public readonly expiryMonth: Locator;
  public readonly expiryYear: Locator;
  public readonly submitButton: Locator;
  public readonly successMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.nameOnCard = page.locator('[data-qa="name-on-card"]');
    this.cardNumber = page.locator('[data-qa="card-number"]');
    this.cardCvc = page.locator('[data-qa="cvc"]');
    this.expiryMonth = page.locator('[data-qa="expiry-month"]');
    this.expiryYear = page.locator('[data-qa="expiry-year"]');
    this.submitButton = page.locator('[data-qa="pay-button"]');
    this.successMessage = page.locator('#success_message');
  }

  async navigate(): Promise<void> {
    await this.page.goto('/payment');
  }

  async fillNameOnCard(value: string): Promise<void> {
    await this.nameOnCard.fill(value);
  }

  async fillCardNumber(value: string): Promise<void> {
    await this.cardNumber.fill(value);
  }

  async fillCardCvc(value: string): Promise<void> {
    await this.cardCvc.fill(value);
  }

  /** Accepts "MM/YYYY" or "MM/YY". */
  async fillCardExpiry(value: string): Promise<void> {
    const [mm, yy] = value.split('/').map((s) => s.trim());
    if (!mm || !yy) throw new Error(`Expected expiry like 12/2026, got: ${value}`);
    const year = yy.length === 2 ? `20${yy}` : yy;
    await this.expiryMonth.fill(mm);
    await this.expiryYear.fill(year);
  }

  async clickSubmit(): Promise<void> {
    await this.submitButton.click();
  }

  async assertSuccess(): Promise<void> {
    await expect(this.successMessage).toBeVisible();
  }
}
