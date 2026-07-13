/**
 * Page Object for https://automationexercise.com/payment
 */
import { Page, Locator, expect } from '@playwright/test';
import { Selectors } from '../support/selectors';

export class PaymentCheckoutPage {
  public readonly page: Page;
  public readonly nameOnCard: Locator;
  public readonly cardNumber: Locator;
  public readonly cardCvc: Locator;
  public readonly expiryMonth: Locator;
  public readonly expiryYear: Locator;
  public readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.nameOnCard = page.locator(Selectors.payment.nameOnCard);
    this.cardNumber = page.locator(Selectors.payment.cardNumber);
    this.cardCvc = page.locator(Selectors.payment.cvc);
    this.expiryMonth = page.locator(Selectors.payment.expiryMonth);
    this.expiryYear = page.locator(Selectors.payment.expiryYear);
    this.submitButton = page.locator(Selectors.payment.payButton);
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
    if (!mm || !yy) throw new Error(`Expected expiry in MM/YYYY format, got: "${value}"`);
    const year = yy.length === 2 ? `20${yy}` : yy;
    await this.expiryMonth.fill(mm);
    await this.expiryYear.fill(year);
  }

  async clickSubmit(): Promise<void> {
    await this.submitButton.click();
  }

  /** Asserts the "Order Placed!" confirmation heading is visible. */
  async assertSuccess(timeout = 25_000): Promise<void> {
    await expect(
      this.page.getByRole('heading', { name: Selectors.confirmation.orderPlacedHeading }),
    ).toBeVisible({ timeout });
  }
}
