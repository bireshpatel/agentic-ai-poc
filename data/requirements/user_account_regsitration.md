################################################################################
USER STORIES & GHERKIN ACCEPTANCE CRITERIA
AutomationExercise.com — AI Testing POC
URL: https://automationexercise.com
API: https://automationexercise.com/api_list
Test Login: reachtobp@gmail.com / Welcome@123
################################################################################

################################################################################
SCENARIO 4: CREATE / REGISTER USER ACCOUNT
################################################################################

################################################################################
US-RA-01
As a: new visitor on AutomationExercise.com
I want to: register a new user account via the UI with all required details
So that: I can log in, place orders, and manage my profile as a registered user
################################################################################

  AC 1
  Given I am on the home page and I click "Signup / Login"
  When  I enter a new unique name and a unique email address in the "New User Signup!" section and click "Signup"
  Then  The "ENTER ACCOUNT INFORMATION" page is displayed with fields for Title, Name, Email, Password, and Date of Birth

  AC 2
  Given I am on the account information page and I select Title "Mr.", enter Password "Welcome@123", and set DOB to "01-Jan-1990"
  When  I scroll down and fill in: First name, Last name, Company, Address1, Address2, Country "India", State "Texas", City "Dallas", Zipcode "75201", Mobile "9876543210"
  Then  All fields are populated with no validation errors visible

  AC 3
  Given I have filled all required account and address fields on the registration form
  When  I click the "Create Account" button
  Then  "ACCOUNT CREATED!" confirmation text is displayed and a "Continue" button is visible

  AC 4
  Given I click "Continue" after account creation
  When  I am redirected to the home page
  Then  The navigation bar displays "Logged in as [username]", confirming I am automatically authenticated after registration

  AC 5
  Given I am logged in after registration
  When  I click "Delete Account" and confirm
  Then  "ACCOUNT DELETED!" is displayed and I am redirected, confirming account lifecycle (create -> login -> delete) completes without errors

################################################################################
US-RA-02
As a: QA engineer testing the Create Account API
I want to: register a new user account via POST /api/createAccount with all required parameters
So that: I can verify the API creates accounts correctly and returns the expected response
API Endpoint: POST https://automationexercise.com/api/createAccount
################################################################################

  AC 1
  Given The POST /api/createAccount endpoint is available
  When  I send a POST request with all required parameters: name, email (unique), password, title="Mr", birth_date="1", birth_month="January", birth_year="1990", firstname, lastname, company, address1, address2, country="India", zipcode, state, city, mobile_number
  Then  The response code is 201 and the response message is "User created!"

  AC 2
  Given A user account has been created via POST /api/createAccount
  When  I send POST /api/verifyLogin with the same email and password
  Then  The response code is 200 and the message is "User exists!", confirming the account was persisted correctly

  AC 3
  Given A user account was created with email "testuser_poc@example.com"
  When  I send GET /api/getUserDetailByEmail?email=testuser_poc@example.com
  Then  The response code is 200 and the JSON contains the user's name, email, and address details matching what was submitted during creation

  AC 4
  Given I attempt to create an account with an email that already exists (e.g., reachtobp@gmail.com)
  When  I send POST /api/createAccount with the existing email
  Then  The response code is 400 and the response message is "Email already exist!" confirming duplicate prevention

  AC 5
  Given I send POST /api/createAccount with a missing required field (e.g., no "password" parameter)
  When  The request is processed
  Then  The response code is 400 with a descriptive error message, and no partial account record is created in the system

################################################################################
US-RA-03
As a: new visitor on AutomationExercise.com
I want to: be prevented from registering with an email address that is already registered
So that: I receive a clear error message and can use a different email to complete registration
################################################################################

  AC 1
  Given I am on the Signup / Login page
  When  I enter name "Test User" and email "reachtobp@gmail.com" (already registered) in the "New User Signup!" section and click "Signup"
  Then  An error message "Email Address already exist!" is displayed below the signup form and I remain on the login/signup page

  AC 2
  Given The duplicate email error is displayed
  When  I inspect the page state
  Then  The "Signup" button is still visible and enabled, allowing me to retry with a different email address without refreshing the page

  AC 3
  Given I have seen the duplicate email error
  When  I clear the email field and enter a new unique email address, then click "Signup"
  Then  The "ENTER ACCOUNT INFORMATION" page loads successfully, confirming the form resets for a new attempt

  AC 4
  Given A user exists with email "reachtobp@gmail.com" in the system
  When  I send POST /api/createAccount via API with the same email
  Then  The API returns status 400 with message "Email already exist!" consistent with the UI validation behavior

  AC 5
  Given I enter a valid new email but leave the Name field empty on the signup form
  When  I click "Signup"
  Then  Browser-level or server-side validation prevents form submission and a field validation error is shown for the Name field

################################################################################
US-RA-04
As a: registered user on AutomationExercise.com
I want to: verify my account details are correctly stored and retrievable after registration
So that: I can confirm data integrity between what I entered during registration and what the system stores
API Endpoint: GET https://automationexercise.com/api/getUserDetailByEmail
################################################################################

  AC 1
  Given I have registered a new account with name "Biresh Test", email "biresh_test@poc.com", firstname "Biresh", lastname "Test", city "Carrollton", country "United States"
  When  I call GET /api/getUserDetailByEmail?email=biresh_test@poc.com
  Then  The response code is 200 and the JSON contains a user object with name "Biresh Test", email "biresh_test@poc.com", city "Carrollton", and country "United States"

  AC 2
  Given I call GET /api/getUserDetailByEmail with a valid registered email
  When  I inspect the response JSON structure
  Then  The user object contains fields: id, name, email, title, birth_day, birth_month, birth_year, firstname, lastname, company, address1, address2, country, state, city, zipcode, mobile_number

  AC 3
  Given I call GET /api/getUserDetailByEmail with a non-existent email "nobody@nothere.com"
  When  The API processes the request
  Then  The response code is 404 and the message is "Account not found with this email, try another email!" confirming missing record handling

  AC 4
  Given I call GET /api/getUserDetailByEmail without providing the email parameter
  When  The request is sent
  Then  The response code is 400 and the error message indicates the email parameter is required

  AC 5
  Given I registered with title "Mrs." and DOB "15-June-1985"
  When  I retrieve my user detail via GET /api/getUserDetailByEmail
  Then  The response JSON shows title "Mrs.", birth_day "15", birth_month "June", birth_year "1985", confirming all demographic fields are correctly stored

################################################################################
US-RA-05
As a: registered user on AutomationExercise.com
I want to: delete my account after completing my testing actions
So that: the system remains clean and no stale test accounts persist after my test runs
API Endpoint: DELETE https://automationexercise.com/api/deleteAccount
################################################################################

  AC 1
  Given I am logged in as a registered user and I click "Delete Account" in the navigation bar
  When  The deletion is processed
  Then  "ACCOUNT DELETED!" message is displayed on the page and a "Continue" button is visible

  AC 2
  Given I click "Continue" after account deletion from the UI
  When  I am redirected to the home page
  Then  The navigation bar no longer shows "Logged in as [username]" and instead shows "Signup / Login", confirming the session is cleared

  AC 3
  Given A user account with email "biresh_test@poc.com" and password "Welcome@123" exists
  When  I send DELETE /api/deleteAccount with parameters email="biresh_test@poc.com" and password="Welcome@123"
  Then  The response code is 200 and the message is "Account deleted!" confirming API-level account deletion works

  AC 4
  Given I deleted an account with email "biresh_test@poc.com" via the API
  When  I immediately send POST /api/verifyLogin with the same credentials
  Then  The response code is 404 and the message is "User not found!" confirming the account is fully removed

  AC 5
  Given I send DELETE /api/deleteAccount with an email that does not exist in the system
  When  The API processes the request
  Then  The response code is 404 and the message clearly indicates the account was not found, with no 5xx server error