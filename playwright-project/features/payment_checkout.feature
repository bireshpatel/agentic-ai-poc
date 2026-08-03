# source: data/requirements/payment_checkout.md
# Credentials are read from .env (PW_TEST_EMAIL / PW_TEST_PASSWORD) — never hardcode here.
#
# INTEGRATION NOTE: These scenarios were derived from AI-generated test cases in
# output/testcase_generated/payment_checkout_testcases.csv
# Reference the CSV for test case details, acceptance criteria, and expected results.
# Mapping: Feature scenarios @TC-XXX tags link back to AI-generated test cases.
# When updating: ensure both this .feature file and the corresponding CSV remain in sync.

Feature: Payment Checkout

  @TC-001 @high @smoke @regression
  Scenario: Verify successful order placement and invoice download for logged-in user
    Given I am logged in as a registered user
    And I have "Blue Top" in my cart
    When I proceed to checkout with comment "Please deliver before 5 PM."
    And I pay with card holder "Test User", card "4111111111111111", expiry "12/2026", and CVC "123"
    Then the order should be placed successfully
    And the invoice file should be downloaded

  @TC-002 @high @regression
  Scenario: Verify guest user can register during checkout and complete order
    Given I am a guest user with "Men Tshirt" in my cart
    When I proceed to checkout and choose to create an account
    And I complete the new account registration
    And I return to the cart and proceed to checkout
    And I complete the payment with test card details
    Then I should be logged in
    And the order should be placed successfully

  @TC-003 @medium @regression
  Scenario: Verify cart total calculation for multiple quantities and post-order clearance
    Given I am logged in as a registered user
    And I have 3 units of "Stylish Dress" in my cart
    And I have 1 unit of "Winter Top" in my cart
    When I view the cart
    Then the cart total should be "Rs. 5100"
    When I complete checkout and payment
    And I navigate back to the cart
    Then the cart should be empty

  @TC-004 @medium @regression
  Scenario: Verify system prevents checkout when the cart is empty
    Given I have a product in my cart
    When I remove all items from the cart
    Then the checkout button should not be visible
    When I navigate directly to the payment page
    And I attempt to pay with test card details
    Then the order should not be placed

  @TC-005 @high @regression
  Scenario: Verify registered address and mobile number pre-fill on checkout page
    Given I have registered with address "1234 Main St" and mobile "+1-972-000-0000"
    And I have a product in my cart
    When I proceed to checkout
    Then the delivery address section should display my registered details
    And the billing address section should display my registered details
