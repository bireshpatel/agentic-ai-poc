import { expect, Page } from '@playwright/test';

/** Product name → id on https://automationexercise.com/products (first page). */
export const AE_PRODUCT_ID: Record<string, string> = {
  'Blue Top': '1',
  'Men Tshirt': '2',
  'Stylish Dress': '4',
  'Winter Top': '5',
};

export function aeProductId(name: string): string {
  const id = AE_PRODUCT_ID[name];
  if (!id) throw new Error(`Unknown product for Automation Exercise listing: "${name}"`);
  return id;
}

export async function aeLogin(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.locator('[data-qa="login-email"]').fill(email);
  await page.locator('[data-qa="login-password"]').fill(password);
  await page.locator('[data-qa="login-button"]').click();
  await page.locator('a[href="/logout"]').waitFor({ state: 'visible', timeout: 25_000 });
}

export async function aeAddProductFromListingToCart(page: Page, productName: string): Promise<void> {
  const id = aeProductId(productName);
  await page.goto('/products');
  await page.waitForLoadState('domcontentloaded');
  await page.locator(`a.add-to-cart[data-product-id="${id}"]`).first().click();
  await page.locator('#cartModal').getByRole('link', { name: 'View Cart' }).click();
  await page.waitForURL((url) => new URL(url).pathname.replace(/\/$/, '').endsWith('/view_cart'));
}

export async function aeOpenCart(page: Page): Promise<void> {
  await page.goto('/view_cart');
}

export async function aeProceedToCheckoutFromCart(page: Page): Promise<void> {
  await page.locator('a.btn.btn-default.check_out').click();
}

/** Cart → checkout (address/review) and/or payment; some sessions skip /checkout. */
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
    await page.locator('textarea[name="message"]').fill(orderComment);
    const placeOrder = page.locator('a.check_out[href="/payment"]');
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
  await page.locator('#checkoutModal').waitFor({ state: 'visible', timeout: 15_000 });
  await page.locator('#checkoutModal a[href="/login"]').click();
  await page.waitForURL((url) => new URL(url).pathname.replace(/\/$/, '').endsWith('/login'));
}

export async function aeSignupInitial(page: Page, name: string, email: string): Promise<void> {
  await page.locator('[data-qa="signup-name"]').fill(name);
  await page.locator('[data-qa="signup-email"]').fill(email);
  await page.locator('[data-qa="signup-button"]').click();
  await expect(page.getByText(/enter account information/i)).toBeVisible({ timeout: 15_000 });
}

export async function aeFillAccountInformation(
  page: Page,
  opts: { password: string; firstName: string; lastName: string; address: string; mobile: string },
): Promise<void> {
  await page.locator('#id_gender1').check();
  await page.locator('[data-qa="password"]').fill(opts.password);
  await page.locator('[data-qa="days"]').selectOption('1');
  await page.locator('[data-qa="months"]').selectOption('1');
  await page.locator('[data-qa="years"]').selectOption('1990');
  await page.locator('[data-qa="first_name"]').fill(opts.firstName);
  await page.locator('[data-qa="last_name"]').fill(opts.lastName);
  await page.locator('[data-qa="address"]').fill(opts.address);
  await page.locator('[data-qa="country"]').selectOption('United States');
  await page.locator('[data-qa="state"]').fill('Texas');
  await page.locator('[data-qa="city"]').fill('Dallas');
  await page.locator('[data-qa="zipcode"]').fill('75001');
  const digits = opts.mobile.replace(/\D/g, '');
  await page.locator('[data-qa="mobile_number"]').fill(digits.slice(-10) || '9720000000');
  await page.locator('[data-qa="create-account"]').click();
  await expect(page.locator('[data-qa="account-created"]')).toBeVisible({ timeout: 20_000 });
}

export async function aeContinueAfterAccountCreated(page: Page): Promise<void> {
  await page.locator('[data-qa="continue-button"]').click();
  await page.waitForURL((url) => {
    const p = new URL(url).pathname.replace(/\/$/, '') || '/';
    return p === '' || p === '/';
  }, { timeout: 15_000 });
}

export async function aeAddProductFromProductDetails(page: Page, productName: string, quantity: number): Promise<void> {
  const id = aeProductId(productName);
  await page.goto(`/product_details/${id}`);
  await page.locator('#quantity').fill(String(quantity));
  await page.locator('button.cart').click();
  await page.locator('#cartModal').getByRole('button', { name: 'Continue Shopping' }).click();
}

export async function aeAddProductFromProductDetailsQtyOne(page: Page, productName: string): Promise<void> {
  const id = aeProductId(productName);
  await page.goto(`/product_details/${id}`);
  await page.locator('button.cart').click();
}

export async function aeOpenCartFromModal(page: Page): Promise<void> {
  await page.locator('#cartModal').getByRole('link', { name: 'View Cart' }).click();
  await page.waitForURL((url) => new URL(url).pathname.replace(/\/$/, '').endsWith('/view_cart'));
}
