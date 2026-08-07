# source: output/testcase_generated/payment_checkout_raw_output.json + data/page_context/payment_checkout_page.json
Feature: Payment checkout

  @TC-01 @high
  Scenario: Logged-in customer adds product to cart and completes checkout
    Given I am logged in as reachtobp@gmail.com and navigate to Products page
    When I hover over 'Blue Top' (Rs. 500) and click 'Add to Cart'
    And I click 'View Cart'
    And I click 'Proceed To Checkout'
    And I enter comment 'Please deliver before 5 PM'
    And I fill in card details: Name 'Test User', Card Number '4111111111111111', CVC '123', Expiry '12/2026'
    And I click 'Pay and Confirm Order'
    Then a success message 'Your order has been placed successfully!' is displayed and the order confirmation page is shown

  @TC-02 @high
  Scenario: Guest user registers and completes checkout
    Given I navigate to Products page and add 'Men Tshirt' (Rs. 400) to cart
    And I click 'Proceed To Checkout'
    When I select 'Register / Login' from the prompt
    And I fill in a new username and email, click 'Signup'
    And I complete account information form with all required fields
    And I click 'Create Account'
    And I navigate back to cart and proceed to checkout
    And I enter payment details and click 'Pay and Confirm Order'
    Then "Your order has been placed successfully!" is displayed confirming the end-to-end flow for a new user

  @TC-03 @high
  Scenario: Logged-in customer adds multiple products with different quantities to cart and completes checkout
    Given I navigate to 'Stylish Dress' product page, increase quantity to 3, add to cart
    And I add 'Winter Top' (Rs. 600) to cart
    When I click 'Proceed To Checkout'
    Then both products are listed with correct quantities and total on checkout page
    And I place order and submit payment details
    Then "Your order has been placed successfully!" is shown confirming the multi-item, multi-quantity order

  @TC-04 @high
  Scenario: Logged-in customer verifies pre-filled delivery address on checkout page
    Given I register with first name 'Biresh', last name 'Panda', address '1234 Main St', city 'Carrollton', state 'Texas', zip '75010', country 'United States'
    And I add a product and navigate to the checkout page
    When I verify delivery address is correctly pre-filled as: 'Mr. Biresh Panda, 1234 Main St, Carrollton, Texas 75010, United States'
    And I inspect billing address section
    Then I click 'Place Order' without modifying any details
    Then order proceeds to payment page confirming pre-filled addresses are accepted as valid

  @TC-05 @high
  Scenario: Logged-in customer removes a product from cart before proceeding to checkout
    Given I add 'Blue Top' (Rs. 500) and 'Men Tshirt' (Rs. 400) to cart
    And I click 'X' delete button next to 'Blue Top'
    When I verify only 'Men Tshirt' remains with total updated to Rs. 400 on cart page
    And I proceed to checkout and verify order summary shows only 'Men Tshirt'
    Then I remove last product from cart
    Then cart displays a message indicating the cart is empty and 'Proceed To Checkout' button is not available
