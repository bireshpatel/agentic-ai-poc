import { Page } from '@playwright/test';
import { BddWorld, Given, When, Then } from '../fixtures/base.fixture';
import { expect } from '@playwright/test';
import { PaymentCheckoutPage } from '../pages/PaymentCheckoutPage';
import { Selectors } from '../support/selectors';
import { TestCard, DefaultDeliveryComment } from '../support/testData';
import {
  aeAddProductFromListingToCart,
  aeAddProductFromProductDetails,
  aeContinueAfterAccountCreated,
  aeFillAccountInformation,
  aeGuestOpenRegisterLoginFromCheckoutModal,
  aeLogin,
  aeOpenCart,
  aeOpenCartFromModal,
  aeProceedToCheckoutFromCart,
  aeReachPaymentPageFromCart,
  aeSignupInitial,
} from '../helpers/automationExercise';

// ─── World augmentation ────────────────────────────────────────────────────────

interface StepWorld extends BddWorld {
  paymentCheckoutPage?: PaymentCheckoutPage;
  registeredAddress?: string;
  registeredMobile?: string;
  registeredFirstName?: string;
  registeredLastName?: string;
}

function paymentPage(world: StepWorld): PaymentCheckoutPage {
  if (!world.paymentCheckoutPage) world.paymentCheckoutPage = new PaymentCheckoutPage(world.page);
  return world.paymentCheckoutPage;
}

async function assertAddressSection(page: Page, sectionSelector: string, world: StepWorld): Promise<void> {
  const { registeredAddress, registeredMobile } = world;
  if (!registeredAddress || !registeredMobile) {
    throw new Error('Registered address/mobile not set — ensure the Given registration step ran first');
  }
  const digits = registeredMobile.replace(/\D/g, '');
  const text = await page.locator(sectionSelector).innerText();
  expect(text).toContain(registeredAddress);
  expect(text).toMatch(new RegExp(digits.split('').join('\\D*'), 'i'));
}

// ─── TC-001 / TC-003 shared: authenticated user ────────────────────────────────

Given('I am logged in as a registered user', async function (this: StepWorld) {
  const email = process.env.PW_TEST_EMAIL;
  const password = process.env.PW_TEST_PASSWORD;
  if (!email || !password) {
    throw new Error(
      'PW_TEST_EMAIL and PW_TEST_PASSWORD must be set in .env — never hardcode credentials in feature files',
    );
  }
  await aeLogin(this.page, email, password);
});

Given('I have {string} in my cart', async function (this: StepWorld, product: string) {
  await aeAddProductFromListingToCart(this.page, product);
});

// ─── TC-001: successful checkout ──────────────────────────────────────────────

When('I proceed to checkout with comment {string}', async function (this: StepWorld, comment: string) {
  await aeReachPaymentPageFromCart(this.page, comment);
});

When(
  'I pay with card holder {string}, card {string}, expiry {string}, and CVC {string}',
  async function (this: StepWorld, name: string, cardNumber: string, expiry: string, cvc: string) {
    const pc = paymentPage(this);
    await pc.fillNameOnCard(name);
    await pc.fillCardNumber(cardNumber);
    await pc.fillCardExpiry(expiry);
    await pc.fillCardCvc(cvc);
    await pc.clickSubmit();
  },
);

Then('the order should be placed successfully', async function (this: StepWorld) {
  await paymentPage(this).assertSuccess();
});

Then('the invoice file should be downloaded', async function (this: StepWorld) {
  const downloadPromise = this.page.waitForEvent('download');
  await this.page.locator(Selectors.confirmation.downloadInvoice).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBeTruthy();
});

// ─── TC-002: guest-user registration during checkout ──────────────────────────

Given('I am a guest user with {string} in my cart', async function (this: StepWorld, product: string) {
  await aeAddProductFromListingToCart(this.page, product);
});

When('I proceed to checkout and choose to create an account', async function (this: StepWorld) {
  await aeProceedToCheckoutFromCart(this.page);
  await aeGuestOpenRegisterLoginFromCheckoutModal(this.page);
});

When('I complete the new account registration', async function (this: StepWorld) {
  const email = `guest${Date.now()}@example.com`;
  await aeSignupInitial(this.page, 'Guest User', email);
  await aeFillAccountInformation(this.page, {
    password: 'Welcome@123',
    firstName: 'Guest',
    lastName: 'User',
    address: '1234 Main St',
    mobile: '+19720000000',
  });
});

When('I return to the cart and proceed to checkout', async function (this: StepWorld) {
  await aeContinueAfterAccountCreated(this.page);
  await this.page.locator(Selectors.cart.viewCartLink).first().click();
  await this.page.waitForURL((url) => new URL(url).pathname.replace(/\/$/, '').endsWith('/view_cart'));
});

When('I complete the payment with test card details', async function (this: StepWorld) {
  const pc = paymentPage(this);
  await aeReachPaymentPageFromCart(this.page, DefaultDeliveryComment);
  await pc.fillNameOnCard(TestCard.holderName);
  await pc.fillCardNumber(TestCard.number);
  await pc.fillCardExpiry(TestCard.expiry);
  await pc.fillCardCvc(TestCard.cvc);
  await pc.clickSubmit();
});

Then('I should be logged in', async function (this: StepWorld) {
  await expect(this.page.locator(Selectors.auth.logoutLink)).toBeVisible();
});

// ─── TC-003: cart totals + post-order clearance ────────────────────────────────

Given(/^I have (\d+) units? of "([^"]*)" in my cart$/, async function (this: StepWorld, qty: number, product: string) {
  await aeAddProductFromProductDetails(this.page, product, Number(qty));
});

When('I view the cart', async function (this: StepWorld) {
  await aeOpenCart(this.page);
});

/**
 * Sums every line-total cell in the cart table and compares to the expected value.
 * This uses the actual DOM values rather than hard-coded numbers so the assertion
 * stays correct even if product prices change on the site.
 */
Then('the cart total should be {string}', async function (this: StepWorld, expectedTotal: string) {
  const lineTotals = await this.page.locator(Selectors.cart.lineTotal).allInnerTexts();
  const grandTotal = lineTotals.reduce((sum, text) => {
    const amount = parseFloat(text.replace(/[^0-9.]/g, ''));
    return sum + (isNaN(amount) ? 0 : amount);
  }, 0);
  const expectedAmount = parseFloat(expectedTotal.replace(/[^0-9.]/g, ''));
  expect(grandTotal).toBe(expectedAmount);
});

When('I complete checkout and payment', async function (this: StepWorld) {
  const pc = paymentPage(this);
  await aeReachPaymentPageFromCart(this.page, DefaultDeliveryComment);
  await pc.fillNameOnCard(TestCard.holderName);
  await pc.fillCardNumber(TestCard.number);
  await pc.fillCardExpiry(TestCard.expiry);
  await pc.fillCardCvc(TestCard.cvc);
  await pc.clickSubmit();
  await pc.assertSuccess();
});

When('I navigate back to the cart', async function (this: StepWorld) {
  await this.page.locator(Selectors.cart.viewCartLink).first().click();
  await this.page.waitForURL((url) => new URL(url).pathname.replace(/\/$/, '').endsWith('/view_cart'));
});

Then('the cart should be empty', async function (this: StepWorld) {
  await expect(this.page.locator(Selectors.cart.emptyCart)).toBeVisible();
});

// ─── TC-004: empty-cart checkout prevention ────────────────────────────────────

Given('I have a product in my cart', async function (this: StepWorld) {
  await this.page.goto('/products');
  await this.page.waitForLoadState('domcontentloaded');
  await this.page.locator(Selectors.addToCartById('1')).first().click();
  await aeOpenCartFromModal(this.page);
});

When('I remove all items from the cart', async function (this: StepWorld) {
  await aeOpenCart(this.page);
  await this.page.locator(Selectors.cart.deleteItem).first().click();
  // Wait for the cart to reflect the removal before asserting.
  await this.page.waitForLoadState('networkidle').catch(() => {});
});

Then('the checkout button should not be visible', async function (this: StepWorld) {
  await expect(this.page.locator(Selectors.cart.checkoutButton)).not.toBeVisible();
});

When('I navigate directly to the payment page', async function (this: StepWorld) {
  await this.page.goto('/payment');
});

/**
 * Asserts the site redirects an unauthenticated / cart-less /payment visit back
 * to /view_cart.  If the redirect does not happen within 10 s the test fails —
 * that is intentional: a missing redirect is the bug this scenario catches.
 */
Then('I should be redirected to the cart page', async function (this: StepWorld) {
  await this.page.waitForURL(
    (url) => new URL(url).pathname.replace(/\/$/, '').endsWith('/view_cart'),
    { timeout: 10_000 },
  );
});

// ─── TC-005: address pre-fill ──────────────────────────────────────────────────

Given(
  'I have registered with address {string} and mobile {string}',
  async function (this: StepWorld, address: string, mobile: string) {
    this.registeredAddress = address;
    this.registeredMobile = mobile;
    this.registeredFirstName = 'Address';
    this.registeredLastName = 'User';
    await this.page.goto('/login');
    const email = `addr${Date.now()}@example.com`;
    await aeSignupInitial(this.page, `${this.registeredFirstName} ${this.registeredLastName}`, email);
    await aeFillAccountInformation(this.page, {
      password: 'Welcome@123',
      firstName: this.registeredFirstName,
      lastName: this.registeredLastName,
      address,
      mobile,
    });
    await aeContinueAfterAccountCreated(this.page);
  },
);

When('I proceed to checkout', async function (this: StepWorld) {
  await aeProceedToCheckoutFromCart(this.page);
  await this.page.waitForURL(
    (url) => {
      const p = new URL(url).pathname.replace(/\/$/, '');
      return p.endsWith('/checkout') || p.endsWith('/payment');
    },
    { timeout: 25_000 },
  );
});

Then('the delivery address section should display my registered details', async function (this: StepWorld) {
  await assertAddressSection(this.page, Selectors.checkout.deliveryAddress, this);
});

Then('the billing address section should display my registered details', async function (this: StepWorld) {
  await assertAddressSection(this.page, Selectors.checkout.invoiceAddress, this);
});
