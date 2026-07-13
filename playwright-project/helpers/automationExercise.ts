import { expect, Page } from '@playwright/test';
import { Selectors } from '../support/selectors';

/** Product name → numeric id on https://automationexercise.com/products (first page). */
export const AE_PRODUCT_ID: Record<string, string> = {
  'Blue Top': '1',
  'Men Tshirt': '2',
  'Stylish Dress': '4',
  'Winter Top': '5',
};

export function aeProductId(name: string): string {
  const id = AE_PRODUCT_ID[name];
  if (!id) throw new Error(`Unknown product "${name}" — add it to AE_PRODUCT_ID in automationExercise.ts`);
  return id;
}

export async function aeLogin(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.locator(Selectors.auth.loginEmail).fill(email);
  await page.locator(Selectors.auth.loginPassword).fill(password);
  await page.locator(Selectors.auth.loginButton).click();
  await page.locator(Selectors.auth.logoutLink).waitFor({ state: 'visible', timeout: 25_000 });
}

/** Navigates to /products, adds the named product to cart, and opens /view_cart. */
export async function aeAddProductFromListingToCart(page: Page, productName: string): Promise<void> {
  const id = aeProductId(productName);
  await page.goto('/products');
  await page.waitForLoadState('domcontentloaded');
  await page.locator(Selectors.addToCartById(id)).first().click();
  await page.locator(Selectors.modal.cartModal).getByRole('link', { name: 'View Cart' }).click();
  await page.waitForURL((url) => new URL(url).pathname.replace(/\/$/, '').endsWith('/view_cart'));
}

export async function aeOpenCart(page: Page): Promise<void> {
  await page.goto('/view_cart');
}

export async function aeProceedToCheckoutFromCart(page: Page): Promise<void> {
  await page.locator(Selectors.cart.checkoutButton).click();
}

/** Cart → /checkout (fill comment + place-order) → /payment. Handles sites that skip /checkout. */
export async function aeReachPaymentPageFromCart(page: Page, orderComment: string): Promise<void> {
  await aeProceedToCheckoutFromCart(page);
  await page.waitForURL(
    (url) => {
      const p = new URL(url).pathname.replace(/\/$/, '');
      return p.endsWith('/checkout') || p.endsWith('/payment');
    },
    { timeout: 25_000, waitUntil: 'commit' },
  );
  const path = new URL(page.url()).pathname.replace(/\/$/, '');
  if (path.endsWith('/checkout')) {
    await page.locator(Selectors.checkout.orderComment).fill(orderComment);
    const placeOrder = page.locator(Selectors.checkout.placeOrder);
    await placeOrder.scrollIntoViewIfNeeded();
    await Promise.all([
      page.waitForURL(
        (url) => new URL(url).pathname.replace(/\/$/, '').endsWith('/payment'),
        { timeout: 25_000, waitUntil: 'commit' },
      ),
      placeOrder.click(),
    ]);
  }
}

export async function aeGuestOpenRegisterLoginFromCheckoutModal(page: Page): Promise<void> {
  await page.locator(Selectors.modal.checkoutModal).waitFor({ state: 'visible', timeout: 15_000 });
  await page.locator(`${Selectors.modal.checkoutModal} a[href="/login"]`).click();
  await page.waitForURL((url) => new URL(url).pathname.replace(/\/$/, '').endsWith('/login'));
}

export async function aeSignupInitial(page: Page, name: string, email: string): Promise<void> {
  await page.locator(Selectors.auth.signupName).fill(name);
  await page.locator(Selectors.auth.signupEmail).fill(email);
  await page.locator(Selectors.auth.signupButton).click();
  await expect(page.getByText(/enter account information/i)).toBeVisible({ timeout: 15_000 });
}

export async function aeFillAccountInformation(
  page: Page,
  opts: {
    password: string;
    firstName: string;
    lastName: string;
    address: string;
    mobile: string;
    /** Defaults to 'United States' */
    country?: string;
    /** Defaults to 'Texas' */
    state?: string;
    /** Defaults to 'Dallas' */
    city?: string;
    /** Defaults to '75001' */
    zipcode?: string;
  },
): Promise<void> {
  await page.locator(Selectors.account.genderMale).check();
  await page.locator(Selectors.account.password).fill(opts.password);
  await page.locator(Selectors.account.dobDay).selectOption('1');
  await page.locator(Selectors.account.dobMonth).selectOption('1');
  await page.locator(Selectors.account.dobYear).selectOption('1990');
  await page.locator(Selectors.account.firstName).fill(opts.firstName);
  await page.locator(Selectors.account.lastName).fill(opts.lastName);
  await page.locator(Selectors.account.address).fill(opts.address);
  await page.locator(Selectors.account.country).selectOption(opts.country ?? 'United States');
  await page.locator(Selectors.account.state).fill(opts.state ?? 'Texas');
  await page.locator(Selectors.account.city).fill(opts.city ?? 'Dallas');
  await page.locator(Selectors.account.zipcode).fill(opts.zipcode ?? '75001');
  const digits = opts.mobile.replace(/\D/g, '');
  await page.locator(Selectors.account.mobileNumber).fill(digits.slice(-10) || '9720000000');
  await page.locator(Selectors.account.createAccount).click();
  await expect(page.locator(Selectors.account.accountCreated)).toBeVisible({ timeout: 20_000 });
}

export async function aeContinueAfterAccountCreated(page: Page): Promise<void> {
  await page.locator(Selectors.account.continueButton).click();
  await page.waitForURL(
    (url) => {
      const p = new URL(url).pathname.replace(/\/$/, '') || '/';
      return p === '' || p === '/';
    },
    { timeout: 15_000 },
  );
}

/**
 * Navigates to the product-details page, sets the given quantity, adds to cart,
 * and dismisses the modal ("Continue Shopping") so further products can be added.
 */
export async function aeAddProductFromProductDetails(
  page: Page,
  productName: string,
  quantity: number,
): Promise<void> {
  const id = aeProductId(productName);
  await page.goto(`/product_details/${id}`);
  await page.locator('#quantity').fill(String(quantity));
  await page.locator('button.cart').click();
  await page.locator(Selectors.modal.cartModal).getByRole('button', { name: 'Continue Shopping' }).click();
}

export async function aeOpenCartFromModal(page: Page): Promise<void> {
  await page.locator(Selectors.modal.cartModal).getByRole('link', { name: 'View Cart' }).click();
  await page.waitForURL((url) => new URL(url).pathname.replace(/\/$/, '').endsWith('/view_cart'));
}
