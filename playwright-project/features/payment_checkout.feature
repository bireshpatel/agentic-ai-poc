# 2026-05-07T04:20:56+00:00
# source: output/testcase_generated/payment_checkout_raw_output.json + data/page_context/payment_checkout_page.json
# Selectors below target https://automationexercise.com (data-qa / real DOM — not TODO placeholders).

Feature: Payment Checkout

  @TC-001 @high
  Scenario: Verify successful order placement and invoice download for logged-in user
    Given I login with "reachtobp@gmail.com" and "Welcome@123"
    And I add "Blue Top" to cart and navigate to "View Cart"
    When I click "a.check_out", enter a delivery comment, and click "a.check_out"
    And I fill "[data-qa='name-on-card']" with "Test User"
    And I fill "[data-qa='card-number']" with "4111111111111111"
    And I fill "[data-qa='expiry-month']" with "12"
    And I fill "[data-qa='expiry-year']" with "2026"
    And I fill "[data-qa='cvc']" with "123"
    And I click "[data-qa='pay-button']"
    Then I should see "#success_message"
    And I click "a[href*='download_invoice']" and the invoice file is downloaded

  @TC-002 @high
  Scenario: Verify guest user can register during checkout and complete order
    Given I add "Men Tshirt" to cart as a guest user
    When I click "a.check_out" and select "a[href='/login']"
    And I complete the signup and account creation form with all required details
    And I click "[data-qa='continue-button']" and return to the cart
    And I click "a.check_out"
    And I complete the payment flow using "[data-qa='pay-button']"
    Then the user is successfully registered and logged in
    And the order is placed successfully with "#success_message"

  @TC-003 @medium
  Scenario: Verify cart total calculation for multiple quantities and post-order clearance
    Given I login with "reachtobp@gmail.com" and "Welcome@123"
    And I add 3 units of "Stylish Dress" (Rs. 1500 each) to cart
    And I add 1 unit of "Winter Top" (Rs. 600) to cart
    When I view the cart to verify total calculation is "Rs. 5100"
    And I complete the checkout and payment process using "[data-qa='pay-button']"
    And I navigate back to the cart page from the confirmation screen
    Then the cart should be empty and display "#empty_cart"

  @TC-004 @medium
  Scenario: Verify system prevents checkout when the cart is empty
    Given I add any product to the cart
    When I navigate to the cart page and click the "a.cart_quantity_delete" button
    Then the "a.btn.btn-default.check_out" button should not be visible
    And I attempt to navigate directly to "/payment"
    Then I am redirected to the cart page which displays "#empty_cart"

  @TC-005 @high
  Scenario: Verify registered address and mobile number pre-fill on checkout page
    Given I register a new account with address "1234 Main St" and mobile "+1-972-000-0000"
    When I add a product to the cart and click "a.check_out"
    Then the "#address_delivery" section displays the registered name, address, and mobile
    And the "#address_invoice" section displays the registered name, address, and mobile
