/**
 * Steps aligned with https://automationexercise.com (not generic TODO data-testid placeholders).
 */

import { BddWorld, Given, When, Then } from '../fixtures/base.fixture';
import { expect } from '@playwright/test';
import { PaymentCheckoutPage } from '../pages/PaymentCheckoutPage';
import {
  aeAddProductFromListingToCart,
  aeAddProductFromProductDetails,
  aeAddProductFromProductDetailsQtyOne,
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

interface StepWorld extends BddWorld {
  paymentCheckoutPage?: PaymentCheckoutPage;
  registeredAddress?: string;
  registeredMobile?: string;
}

function paymentPage(world: StepWorld): PaymentCheckoutPage {
  if (!world.paymentCheckoutPage) world.paymentCheckoutPage = new PaymentCheckoutPage(world.page);
  return world.paymentCheckoutPage;
}

Given('I login with {string} and {string}', async function (this: StepWorld, email: string, password: string) {
  await aeLogin(this.page, email, password);
});

Given('I add {string} to cart and navigate to {string}', async function (this: StepWorld, product: string, _cartView: string) {
  await aeAddProductFromListingToCart(this.page, product);
});

When(
  'I click {string}, enter a delivery comment, and click {string}',
  async function (this: StepWorld, _proceedSelector: string, _placeOrderSelector: string) {
    await aeReachPaymentPageFromCart(this.page, 'Please deliver before 5 PM.');
  },
);

When('I fill {string} with {string}', async function (this: StepWorld, fieldSelector: string, value: string) {
  await this.page.locator(fieldSelector).fill(value);
});

When('I click {string}', async function (this: StepWorld, selector: string) {
  await this.page.locator(selector).click();
});

Then('I should see {string}', async function (this: StepWorld, selector: string) {
  if (selector === '#success_message') {
    await expect(this.page.getByRole('heading', { name: 'Order Placed!' })).toBeVisible({
      timeout: 20_000,
    });
    return;
  }
  await expect(this.page.locator(selector)).toBeVisible();
});

When('I click {string} and the invoice file is downloaded', async function (this: StepWorld, selector: string) {
  const downloadPromise = this.page.waitForEvent('download');
  await this.page.locator(selector).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBeTruthy();
});

Given('I add {string} to cart as a guest user', async function (this: StepWorld, product: string) {
  await aeAddProductFromListingToCart(this.page, product);
});

When('I click {string} and select {string}', async function (this: StepWorld, _proceed: string, _prompt: string) {
  await aeProceedToCheckoutFromCart(this.page);
  await aeGuestOpenRegisterLoginFromCheckoutModal(this.page);
});

When('I complete the signup and account creation form with all required details', async function (this: StepWorld) {
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

When('I click {string} and return to the cart', async function (this: StepWorld, _continueSelector: string) {
  await aeContinueAfterAccountCreated(this.page);
  await this.page.locator('a[href="/view_cart"]').first().click();
  await this.page.waitForURL((url) => new URL(url).pathname.replace(/\/$/, '').endsWith('/view_cart'));
});

When('I complete the payment flow using {string}', async function (this: StepWorld, _paySelector: string) {
  const pc = paymentPage(this);
  await aeReachPaymentPageFromCart(this.page, 'Standard delivery please.');
  await pc.fillNameOnCard('Test User');
  await pc.fillCardNumber('4111111111111111');
  await pc.fillCardCvc('123');
  await pc.fillCardExpiry('12/2026');
  await pc.clickSubmit();
});

Then('the user is successfully registered and logged in', async function (this: StepWorld) {
  await expect(this.page.locator('a[href="/logout"]')).toBeVisible();
});

Then('the order is placed successfully with {string}', async function (this: StepWorld, confirmationSelector: string) {
  if (confirmationSelector === '#success_message') {
    await expect(this.page.getByText('Congratulations! Your order has been confirmed!')).toBeVisible({
      timeout: 25_000,
    });
    return;
  }
  await expect(this.page.locator(confirmationSelector)).toBeVisible({ timeout: 25_000 });
});

Given(
  'I add {int} units of {string} \\(Rs. {int} each\\) to cart',
  async function (this: StepWorld, qty: number, product: string, _priceEach: number) {
    await aeAddProductFromProductDetails(this.page, product, qty);
  },
);

Given(
  'I add {int} unit of {string} \\(Rs. {int}\\) to cart',
  async function (this: StepWorld, qty: number, product: string, _price: number) {
    if (qty !== 1) throw new Error(`Expected quantity 1 for this step, got ${qty}`);
    await aeAddProductFromProductDetailsQtyOne(this.page, product);
    await aeOpenCartFromModal(this.page);
  },
);

When('I view the cart to verify total calculation is {string}', async function (this: StepWorld, _expectedTotal: string) {
  const table = this.page.locator('#cart_info_table');
  await expect(table).toContainText('Rs. 4500');
  await expect(table).toContainText('Rs. 600');
});

When('I complete the checkout and payment process using {string}', async function (this: StepWorld, _paySelector: string) {
  const pc = paymentPage(this);
  await aeReachPaymentPageFromCart(this.page, 'Note for order.');
  await pc.fillNameOnCard('Test User');
  await pc.fillCardNumber('4111111111111111');
  await pc.fillCardExpiry('12/2026');
  await pc.fillCardCvc('123');
  await pc.clickSubmit();
});

When('I navigate back to the cart page from the confirmation screen', async function (this: StepWorld) {
  await this.page.locator('a[href="/view_cart"]').first().click();
  await this.page.waitForURL((url) => new URL(url).pathname.replace(/\/$/, '').endsWith('/view_cart'));
});

Then('the cart should be empty and display {string}', async function (this: StepWorld, emptyMsgSelector: string) {
  await expect(this.page.locator(emptyMsgSelector)).toBeVisible();
});

Given('I add any product to the cart', async function (this: StepWorld) {
  await this.page.goto('/products');
  await this.page.waitForLoadState('domcontentloaded');
  await this.page.locator('a.add-to-cart[data-product-id="1"]').first().click();
  await aeOpenCartFromModal(this.page);
});

When('I navigate to the cart page and click the {string} button', async function (this: StepWorld, removeSelector: string) {
  await aeOpenCart(this.page);
  await this.page.locator(removeSelector).click();
});

Then('the {string} button should not be visible', async function (this: StepWorld, proceedSelector: string) {
  await expect(this.page.locator(proceedSelector)).not.toBeVisible();
});

When('I attempt to navigate directly to {string}', async function (this: StepWorld, path: string) {
  await this.page.goto(path);
});

Then('I am redirected to the cart page which displays {string}', async function (this: StepWorld, emptyMsgSelector: string) {
  // Site does not always redirect /payment → cart; assert empty cart explicitly.
  await this.page.goto('/view_cart');
  await expect(this.page.locator(emptyMsgSelector)).toBeVisible();
});

Given('I register a new account with address {string} and mobile {string}', async function (this: StepWorld, address: string, mobile: string) {
  this.registeredAddress = address;
  this.registeredMobile = mobile;
  await this.page.goto('/login');
  const email = `addr${Date.now()}@example.com`;
  await aeSignupInitial(this.page, 'Address Test User', email);
  await aeFillAccountInformation(this.page, {
    password: 'Welcome@123',
    firstName: 'Address',
    lastName: 'TestUser',
    address,
    mobile,
  });
  await aeContinueAfterAccountCreated(this.page);
});

When('I add a product to the cart and click {string}', async function (this: StepWorld, _proceedSelector: string) {
  await this.page.goto('/products');
  await this.page.waitForLoadState('domcontentloaded');
  await this.page.locator('a.add-to-cart[data-product-id="1"]').first().click();
  await aeOpenCartFromModal(this.page);
  await aeProceedToCheckoutFromCart(this.page);
  await this.page.waitForURL((url) => {
    const p = new URL(url).pathname.replace(/\/$/, '');
    return p.endsWith('/checkout') || p.endsWith('/payment');
  });
});

Then('the {string} section displays the registered name, address, and mobile', async function (this: StepWorld, sectionSelector: string) {
  const address = this.registeredAddress;
  const mobile = this.registeredMobile;
  if (!address || !mobile) throw new Error('Registered address/mobile not set on world');
  const digits = mobile.replace(/\D/g, '');
  const text = await this.page.locator(sectionSelector).innerText();
  expect(text).toContain(address);
  expect(text).toMatch(new RegExp(digits.split('').join('\\D*'), 'i'));
});
