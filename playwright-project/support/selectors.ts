/**
 * Centralized selector constants for automationexercise.com.
 *
 * Keeping all locators here means a single-file update covers every
 * step that references a DOM element — steps themselves stay readable.
 */
export const Selectors = {
  auth: {
    loginEmail: '[data-qa="login-email"]',
    loginPassword: '[data-qa="login-password"]',
    loginButton: '[data-qa="login-button"]',
    logoutLink: 'a[href="/logout"]',
    signupName: '[data-qa="signup-name"]',
    signupEmail: '[data-qa="signup-email"]',
    signupButton: '[data-qa="signup-button"]',
  },

  account: {
    genderMale: '#id_gender1',
    password: '[data-qa="password"]',
    dobDay: '[data-qa="days"]',
    dobMonth: '[data-qa="months"]',
    dobYear: '[data-qa="years"]',
    firstName: '[data-qa="first_name"]',
    lastName: '[data-qa="last_name"]',
    address: '[data-qa="address"]',
    country: '[data-qa="country"]',
    state: '[data-qa="state"]',
    city: '[data-qa="city"]',
    zipcode: '[data-qa="zipcode"]',
    mobileNumber: '[data-qa="mobile_number"]',
    createAccount: '[data-qa="create-account"]',
    accountCreated: '[data-qa="account-created"]',
    continueButton: '[data-qa="continue-button"]',
  },

  cart: {
    checkoutButton: 'a.btn.btn-default.check_out, a.check_out',
    deleteItem: 'a.cart_quantity_delete',
    emptyCart: '#empty_cart',
    infoTable: '#cart_info_table',
    lineTotal: '#cart_info_table .cart_total',
    viewCartLink: 'a[href="/view_cart"]',
  },

  checkout: {
    deliveryAddress: '#address_delivery',
    invoiceAddress: '#address_invoice',
    orderComment: 'textarea[name="message"], textarea',
    placeOrder: 'a.check_out[href="/payment"], a[href="/payment"], button:has-text("Place Order")',
  },

  payment: {
    nameOnCard: '[data-qa="name-on-card"]',
    cardNumber: '[data-qa="card-number"]',
    expiryMonth: '[data-qa="expiry-month"]',
    expiryYear: '[data-qa="expiry-year"]',
    cvc: '[data-qa="cvc"]',
    payButton: '[data-qa="pay-button"]',
  },

  confirmation: {
    downloadInvoice: 'a[href*="download_invoice"]',
    orderPlacedHeading: '[data-qa="order-placed"]',
  },

  modal: {
    cartModal: '#cartModal',
    checkoutModal: '#checkoutModal',
  },

  /** Returns the "Add to cart" selector for a product by its site ID. */
  addToCartById: (id: string) => `a.add-to-cart[data-product-id="${id}"]`,
} as const;
