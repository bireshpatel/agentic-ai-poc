################################################################################
USER STORIES & GHERKIN ACCEPTANCE CRITERIA
AutomationExercise.com — AI Testing POC
URL: https://automationexercise.com
API: https://automationexercise.com/api_list
Test Login: reachtobp@gmail.com / Welcome@123
################################################################################

################################################################################
SCENARIO 1: PAYMENT CHECKOUT
################################################################################

################################################################################
US-PC-01
As a: logged-in customer on AutomationExercise.com
I want to: add a product to the cart and complete the payment checkout flow
So that: I can place a successful order and receive an order confirmation
################################################################################

  AC 1
  Given I am logged in as reachtobp@gmail.com and I am on the Products page
  When  I hover over "Blue Top" (Rs. 500) and click "Add to Cart", then click "View Cart"
  Then  The cart page displays the product "Blue Top" with price Rs. 500, quantity 1, and total Rs. 500

  AC 2
  Given I have at least one product in my cart and I am on the cart page
  When  I click the "Proceed To Checkout" button
  Then  The checkout page loads, displaying my delivery address, billing address, and the order summary with all cart items and their correct prices

  AC 3
  Given I am on the checkout page with my order summary visible
  When  I enter a comment "Please deliver before 5 PM" in the comment text area and click "Place Order"
  Then  The payment page is displayed with fields for Name on Card, Card Number, CVC, and Expiration Date

  AC 4
  Given I am on the payment page and I fill in card details: Name "Test User", Card Number "4111111111111111", CVC "123", Expiry "12/2026"
  When  I click "Pay and Confirm Order"
  Then  A success message "Your order has been placed successfully!" is displayed and the order confirmation page is shown

  AC 5
  Given I am on the order confirmation page after a successful payment
  When  I click the "Download Invoice" button
  Then  An invoice file is downloaded to my system, and I can click "Continue" to return to the home page

################################################################################
US-PC-02
As a: guest user (not logged in) on AutomationExercise.com
I want to: register while in the checkout process and complete payment
So that: I can place an order without needing a pre-existing account
################################################################################

  AC 1
  Given I am not logged in and I have added "Men Tshirt" (Rs. 400) to my cart
  When  I click "Proceed To Checkout" from the cart page
  Then  A modal or prompt appears with options to "Register / Login" or continue as guest

  AC 2
  Given I clicked "Register / Login" from the checkout prompt and I am on the signup page
  When  I fill in a new username and a unique email address and click "Signup"
  Then  The account information form is displayed with fields for Title, Name, Email, Password, and Date of Birth

  AC 3
  Given I have completed the account information form with all required fields including address, city, state, and mobile number
  When  I click "Create Account"
  Then  "ACCOUNT CREATED!" confirmation is displayed and I can click "Continue" to proceed

  AC 4
  Given I have created a new account during checkout and I am now logged in
  When  I navigate back to the cart and click "Proceed To Checkout"
  Then  The checkout page shows my registered delivery address pre-filled and my cart items are still present

  AC 5
  Given I am on the checkout page with my address and order summary visible
  When  I enter payment details and click "Pay and Confirm Order"
  Then  "Your order has been placed successfully!" is displayed, confirming the end-to-end flow for a new user

################################################################################
US-PC-03
As a: logged-in customer on AutomationExercise.com
I want to: add multiple products with different quantities to the cart before checkout
So that: I can verify that the cart calculates the correct total before I pay
################################################################################

  AC 1
  Given I am on the product detail page for "Stylish Dress" (Rs. 1500)
  When  I increase the quantity to 3 and click "Add to Cart"
  Then  The cart page shows "Stylish Dress" with quantity 3 and a line total of Rs. 4500

  AC 2
  Given I have "Stylish Dress" (qty 3) already in the cart
  When  I add "Winter Top" (Rs. 600, qty 1) to the cart and view the cart
  Then  The cart shows two distinct line items — "Stylish Dress" Rs. 4500 and "Winter Top" Rs. 600 — with a combined total of Rs. 5100

  AC 3
  Given I am on the cart page with two products totaling Rs. 5100
  When  I click "Proceed To Checkout"
  Then  The order review section on the checkout page lists both products with their correct quantities and the same total of Rs. 5100

  AC 4
  Given I am on the checkout page and the order summary is displayed correctly
  When  I place the order and submit payment details
  Then  "Your order has been placed successfully!" is shown, confirming the multi-item, multi-quantity order

  AC 5
  Given My order has been placed and I am on the confirmation page
  When  I navigate back to the cart
  Then  The cart is empty, confirming that all items were cleared after a successful order placement

################################################################################
US-PC-04
As a: logged-in customer on AutomationExercise.com
I want to: verify that my registered delivery address is correctly pre-filled on the checkout page
So that: I do not have to re-enter my address details every time I check out
################################################################################

  AC 1
  Given I have registered with first name "Biresh", last name "Panda", address "1234 Main St", city "Carrollton", state "Texas", zip "75010", country "United States"
  When  I add a product and navigate to the checkout page
  Then  The "Delivery Address" section displays exactly: "Mr. Biresh Panda, 1234 Main St, Carrollton, Texas 75010, United States"

  AC 2
  Given The checkout page is loaded with my registered details
  When  I inspect the "Billing Address" section
  Then  The billing address matches the delivery address exactly, confirming they are pulled from the same registered profile

  AC 3
  Given Both delivery and billing addresses are correctly displayed on the checkout page
  When  I click "Place Order" without modifying any address
  Then  The order proceeds to the payment page, confirming that pre-filled addresses are accepted as valid

  AC 4
  Given I am a logged-in user who registered with a mobile number "+1-972-000-0000"
  When  I view my account details via the checkout page
  Then  The mobile number "+1-972-000-0000" is visible in the address block on the checkout page

  AC 5
  Given I delete my account after a successful order by clicking "Delete Account"
  When  The account deletion is confirmed with "ACCOUNT DELETED!"
  Then  I am redirected to the home page and the nav bar no longer shows "Logged in as [username]"

################################################################################
US-PC-05
As a: logged-in customer on AutomationExercise.com
I want to: remove a product from my cart before proceeding to checkout
So that: I can correct my order before making a payment
################################################################################

  AC 1
  Given I have two products in my cart: "Blue Top" (Rs. 500) and "Men Tshirt" (Rs. 400)
  When  I click the "X" delete button next to "Blue Top"
  Then  The cart refreshes and only "Men Tshirt" (Rs. 400) remains, with the total updated to Rs. 400

  AC 2
  Given I have one product remaining "Men Tshirt" in the cart after removing "Blue Top"
  When  I click "Proceed To Checkout"
  Then  The checkout order summary shows only "Men Tshirt" with quantity 1 and price Rs. 400

  AC 3
  Given I have only one product in the cart and I click the "X" button to remove it
  When  The product is removed
  Then  The cart page displays a message indicating the cart is empty and the "Proceed To Checkout" button is not available

  AC 4
  Given I have removed all products from the cart
  When  I attempt to navigate directly to the checkout URL
  Then  I am redirected to the cart page which shows an empty cart, preventing an empty checkout

  AC 5
  Given I have added "Stylish Dress" (Rs. 1500, qty 2) to the cart
  When  I remove it using the "X" button and then add "Summer White Top" (Rs. 400) as a replacement
  Then  The cart shows only "Summer White Top" with total Rs. 400, confirming the cart updates correctly after replacement