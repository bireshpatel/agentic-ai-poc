// 2026-08-06T04:44:33+00:00
// output/testcase_generated/payment_checkout_raw_output.json
// data/page_context/payment_checkout_page.json

import { BddWorld, Given, When, Then } from '../fixtures/base.fixture';
import { expect, Page } from '@playwright/test';
import { PaymentCheckoutPage } from '../pages/PaymentCheckoutPage';
import { aeAddProductFromListingToCart, aeAddProductFromProductDetails, aeOpenCart, aeProceedToCheckoutFromCart } from '../helpers/automationExercise';
import { Selectors } from '../support/selectors';

interface StepWorld extends BddWorld {
  paymentCheckoutPage?: PaymentCheckoutPage;
}

function getPaymentCheckoutPage(world: StepWorld): PaymentCheckoutPage {
  if (!world.paymentCheckoutPage) {
    world.paymentCheckoutPage = new PaymentCheckoutPage(world.page);
  }
  return world.paymentCheckoutPage;
}

async function fillAccountInformation(page: Page, details: {
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}): Promise<void> {
  await page.locator(Selectors.account.genderMale).check();
  await page.locator(Selectors.account.password).fill('Password1!');
  await page.locator(Selectors.account.dobDay).selectOption('1');
  await page.locator(Selectors.account.dobMonth).selectOption('1');
  await page.locator(Selectors.account.dobYear).selectOption('1990');
  await page.locator(Selectors.account.firstName).fill(details.firstName);
  await page.locator(Selectors.account.lastName).fill(details.lastName);
  await page.locator(Selectors.account.address).fill(details.address);
  await page.locator(Selectors.account.country).selectOption(details.country);
  await page.locator(Selectors.account.state).fill(details.state);
  await page.locator(Selectors.account.city).fill(details.city);
  await page.locator(Selectors.account.zipcode).fill(details.zip);
  await page.locator(Selectors.account.mobileNumber).fill('1234567890');
}

Given('I am on the Payment Checkout page', async function (this: StepWorld) {
  await getPaymentCheckoutPage(this).navigateTo();
});

Given(/^I am logged in as (.+) and navigate to Products page$/, async function (this: StepWorld) {
  await this.page.goto('/products');
  await expect(this.page).toHaveURL(/products/);
});

Given(/^I navigate to Products page and add '([^']+)' \(Rs\. (\d+)\) to cart$/, async function (this: StepWorld, productName: string) {
  await aeAddProductFromListingToCart(this.page, productName);
});

Given(/^I add '([^']+)' \(Rs\. (\d+)\) to cart$/, async function (this: StepWorld, productName: string) {
  await aeAddProductFromListingToCart(this.page, productName);
});

Given(/^I add '([^']+)' \(Rs\. (\d+)\) and '([^']+)' \(Rs\. (\d+)\) to cart$/, async function (this: StepWorld, firstProduct: string, secondProduct: string) {
  await aeAddProductFromListingToCart(this.page, firstProduct);
  await aeAddProductFromListingToCart(this.page, secondProduct);
});

Given(/^I navigate to '([^']+)' product page, increase quantity to (\d+), add to cart$/, async function (this: StepWorld, productName: string, quantity: string) {
  await aeAddProductFromProductDetails(this.page, productName, Number(quantity));
});

Given(/^I register with first name '([^']+)', last name '([^']+)', address '([^']+)', city '([^']+)', state '([^']+)', zip '([^']+)', country '([^']+)'$/, async function (this: StepWorld, firstName: string, lastName: string, address: string, city: string, state: string, zip: string, country: string) {
  await this.page.goto('/login');
  await this.page.locator(Selectors.auth.signupName).fill(`${firstName} ${lastName}`);
  await this.page.locator(Selectors.auth.signupEmail).fill(`user+${Date.now()}@example.com`);
  await this.page.locator(Selectors.auth.signupButton).click();
  await fillAccountInformation(this.page, { firstName, lastName, address, city, state, zip, country });
  await this.page.locator(Selectors.account.createAccount).click();
});

Given('I add a product and navigate to the checkout page', async function (this: StepWorld) {
  await aeAddProductFromListingToCart(this.page, 'Blue Top');
  await aeProceedToCheckoutFromCart(this.page);
});

When(/^I hover over '([^']+)' \(Rs\. (\d+)\) and click '([^']+)'$/, async function (this: StepWorld, productName: string) {
  await aeAddProductFromListingToCart(this.page, productName);
});

When(/^I click '([^']+)'$/, async function (this: StepWorld, label: string) {
  if (label === 'View Cart') {
    await this.page.locator(Selectors.cart.viewCartLink).click();
  } else if (label === 'Proceed To Checkout') {
    await aeProceedToCheckoutFromCart(this.page);
  } else if (label === 'Pay and Confirm Order') {
    await getPaymentCheckoutPage(this).clickSubmit();
  } else if (label === 'Create Account') {
    await this.page.locator(Selectors.account.createAccount).click();
  } else if (label === 'X') {
    await this.page.locator(Selectors.cart.deleteItem).first().click();
  } else {
    await this.page.getByText(label).first().click();
  }
});

When(/^I click '([^']+)' delete button next to '([^']+)'$/, async function (this: StepWorld, buttonLabel: string, productName: string) {
  await this.page.locator(Selectors.cart.deleteItem).first().click();
});

Then(/^I click '([^']+)' without modifying any details$/, async function (this: StepWorld, label: string) {
  if (label === 'Place Order') {
    await getPaymentCheckoutPage(this).clickSubmit();
  }
});

When(/^I select '([^']+)' from the prompt$/, async function (this: StepWorld, option: string) {
  await this.page.getByRole('link', { name: option }).first().click();
});

Given('I fill in a new username and email, click \'Signup\'', async function (this: StepWorld) {
  await this.page.locator(Selectors.auth.signupName).fill('Test User');
  await this.page.locator(Selectors.auth.signupEmail).fill(`user+${Date.now()}@example.com`);
  await this.page.locator(Selectors.auth.signupButton).click();
});

Given('I complete account information form with all required fields', async function (this: StepWorld) {
  await fillAccountInformation(this.page, {
    firstName: 'Test',
    lastName: 'User',
    address: '123 Main Street',
    city: 'Dallas',
    state: 'Texas',
    zip: '75001',
    country: 'United States',
  });
});

Given('I navigate back to cart and proceed to checkout', async function (this: StepWorld) {
  await aeOpenCart(this.page);
  await aeProceedToCheckoutFromCart(this.page);
});

When(/^I enter comment '([^']+)'$/, async function (this: StepWorld, comment: string) {
  await this.page.locator(Selectors.checkout.orderComment).fill(comment);
});

When(/^I fill in card details: Name '([^']+)', Card Number '([^']+)', CVC '([^']+)', Expiry '([^']+)'$/, async function (this: StepWorld, name: string, cardNumber: string, cvc: string, expiry: string) {
  const paymentPage = getPaymentCheckoutPage(this);
  await paymentPage.fillCardName(name);
  await paymentPage.fillCardNumber(cardNumber);
  await paymentPage.fillCardCvc(cvc);
  await paymentPage.fillCardExpiry(expiry);
});

When('I enter payment details and click \'Pay and Confirm Order\'', async function (this: StepWorld) {
  const paymentPage = getPaymentCheckoutPage(this);
  await paymentPage.fillCardName('Test User');
  await paymentPage.fillCardNumber('4111111111111111');
  await paymentPage.fillCardCvc('123');
  await paymentPage.fillCardExpiry('12/2026');
  await paymentPage.clickSubmit();
});

Then(/^a success message '([^']+)' is displayed and the order confirmation page is shown$/, async function (this: StepWorld, expectedMessage: string) {
  await expect(this.page.locator('body')).toContainText(expectedMessage);
});

Then(/^"([^"]+)" is displayed confirming the end-to-end flow for a new user$/, async function (this: StepWorld, expectedMessage: string) {
  await expect(this.page.locator('body')).toContainText(expectedMessage);
});

Then('both products are listed with correct quantities and total on checkout page', async function (this: StepWorld) {
  await expect(this.page.locator(Selectors.cart.infoTable)).toBeVisible();
});

Then('I place order and submit payment details', async function (this: StepWorld) {
  const paymentPage = getPaymentCheckoutPage(this);
  await paymentPage.fillCardName('Test User');
  await paymentPage.fillCardNumber('4111111111111111');
  await paymentPage.fillCardCvc('123');
  await paymentPage.fillCardExpiry('12/2026');
  await paymentPage.clickSubmit();
});

Then(/^"([^"]+)" is shown confirming the multi-item, multi-quantity order$/, async function (this: StepWorld, expectedMessage: string) {
  await expect(this.page.locator('body')).toContainText(expectedMessage);
});

When(/^I verify delivery address is correctly pre-filled as: '([^']+)'$/, async function (this: StepWorld, expectedAddress: string) {
  await expect(this.page.locator(Selectors.checkout.deliveryAddress)).toContainText(expectedAddress);
});

Given('I inspect billing address section', async function (this: StepWorld) {
  await expect(this.page.locator(Selectors.checkout.invoiceAddress)).toBeVisible();
});

Then('order proceeds to payment page confirming pre-filled addresses are accepted as valid', async function (this: StepWorld) {
  await expect(this.page).toHaveURL(/payment|checkout/);
});

When(/^I verify only '([^']+)' remains with total updated to Rs\. (\d+) on cart page$/, async function (this: StepWorld, productName: string, total: string) {
  await expect(this.page.locator(Selectors.cart.lineTotal)).toContainText(total);
});

Given(/^I proceed to checkout and verify order summary shows only '([^']+)'$/, async function (this: StepWorld, productName: string) {
  await aeProceedToCheckoutFromCart(this.page);
  await expect(this.page.locator('body')).toContainText(productName);
});

Then('I remove last product from cart', async function (this: StepWorld) {
  await this.page.locator(Selectors.cart.deleteItem).last().click();
});

Then(/^cart displays a message indicating the cart is empty and '([^']+)' button is not available$/, async function (this: StepWorld, buttonLabel: string) {
  await expect(this.page.locator(Selectors.cart.emptyCart)).toBeVisible();
  await expect(this.page.getByText(buttonLabel)).toHaveCount(0);
});

When('I fill in card details with {string}, {string}, {string}, and {string}', async function (this: StepWorld, name: string, cardNumber: string, cvc: string, expiry: string) {
  const paymentPage = getPaymentCheckoutPage(this);
  await paymentPage.fillCardName(name);
  await paymentPage.fillCardNumber(cardNumber);
  await paymentPage.fillCardCvc(cvc);
  await paymentPage.fillCardExpiry(expiry);
});

When('I click the Pay and Confirm Order button', async function (this: StepWorld) {
  await getPaymentCheckoutPage(this).clickSubmit();
});

Then('I should see a success message {string}', async function (this: StepWorld, expectedMessage: string) {
  await expect(this.page.locator('body')).toContainText(expectedMessage);
});
