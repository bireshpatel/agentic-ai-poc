################################################################################
USER STORIES & GHERKIN ACCEPTANCE CRITERIA
AutomationExercise.com — AI Testing POC
URL: https://automationexercise.com
API: https://automationexercise.com/api_list
Test Login: reachtobp@gmail.com / Welcome@123
################################################################################

################################################################################
SCENARIO 3: SEARCH ALL BRAND LIST
################################################################################

################################################################################
US-BL-01
As a: QA engineer testing the brands list API
I want to: retrieve the complete list of all brands via the API
So that: I can verify the API returns all brands correctly with no missing entries
API Endpoint: GET https://automationexercise.com/api/brandsList
################################################################################

  AC 1
  Given The GET /api/brandsList endpoint is available
  When  I send a GET request to https://automationexercise.com/api/brandsList
  Then  The response status code is 200 and the JSON body contains a "brands" array with at least 8 brand objects

  AC 2
  Given I receive a 200 response from GET /api/brandsList
  When  I check the brands array for required brands
  Then  The response includes all 8 known brands: Polo, H&M, Madame, Mast & Harbour, Babyhug, Allen Solly Junior, Kookie Kids, and Biba

  AC 3
  Given I receive a 200 response from GET /api/brandsList
  When  I inspect each brand object in the array
  Then  Every brand object contains at least an "id" (integer) and a "brand" (string) field with non-null, non-empty values

  AC 4
  Given I receive a 200 brands list response
  When  I check the "id" field for each brand in the array
  Then  All brand IDs are unique positive integers with no duplicate values in the response

  AC 5
  Given I receive a brands list response with all 8 brands
  When  I cross-reference the brand names against the Brands sidebar visible on the UI Products page
  Then  Every brand name in the API response exactly matches a brand name displayed in the UI sidebar, confirming data consistency

################################################################################
US-BL-02
As a: QA engineer testing invalid method handling on the brands list API
I want to: verify that unsupported HTTP methods on /api/brandsList are properly rejected
So that: I can confirm the API enforces method-level restrictions as per the API contract
API Endpoint: PUT/POST https://automationexercise.com/api/brandsList | Negative cases
################################################################################

  AC 1
  Given The /api/brandsList endpoint is available
  When  I send a PUT request to https://automationexercise.com/api/brandsList
  Then  The response code is 405 and the message is "This request method is not supported."

  AC 2
  Given The /api/brandsList endpoint is available
  When  I send a POST request to /api/brandsList with any request body
  Then  The response code is 405 and the response message clearly states the method is not supported

  AC 3
  Given The /api/brandsList endpoint is available
  When  I send a DELETE request to /api/brandsList
  Then  The response code is 405 with no 5xx server error, confirming the server handles unrecognized methods safely

  AC 4
  Given I send a GET /api/brandsList request with an Authorization header containing invalid credentials
  When  The server processes the request
  Then  The response code is still 200 and returns the brands list, confirming this is a public read-only endpoint requiring no authentication

  AC 5
  Given I send a GET /api/brandsList request with an additional unexpected query parameter, e.g., ?filter=polo
  When  The server processes the request
  Then  The response code is 200 and returns the full brands list, confirming unknown query parameters are ignored gracefully

################################################################################
US-BL-03
As a: UI tester on AutomationExercise.com
I want to: browse and filter products by brand using the UI sidebar
So that: I can verify that clicking a brand shows only products belonging to that brand
################################################################################

  AC 1
  Given I am on the Products page (/products) and the brand sidebar is visible
  When  I click on the "Polo" brand link in the sidebar
  Then  I am redirected to /brand_products/Polo and the page displays only Polo brand products with a count of 6 products

  AC 2
  Given I am on the Products page and the brand sidebar is visible with 8 brands listed
  When  I click on the "H&M" brand link
  Then  The page navigates to /brand_products/H&M and displays 5 H&M products, with no products from any other brand

  AC 3
  Given I am on the Polo brand products page (/brand_products/Polo)
  When  I click on the "Biba" brand link in the left sidebar
  Then  The page navigates to /brand_products/Biba and shows 5 Biba brand products, confirming cross-brand navigation from the sidebar works

  AC 4
  Given I am on any brand products page
  When  I inspect all product cards displayed on the page
  Then  Each product card shows a product name, price (in Rs.), an "Add to Cart" button, and a "View Product" link

  AC 5
  Given I am on the "Babyhug" brand products page (/brand_products/Babyhug)
  When  I click "View Product" on any Babyhug product
  Then  The product detail page loads and the "Brand:" field shows "Babyhug", confirming brand filtering is accurate down to the product detail level

################################################################################
US-BL-04
As a: QA engineer validating the brand list API response schema
I want to: verify the structure and completeness of each brand object returned by the API
So that: I can ensure the brands API contract is stable for test data generation and downstream automation
API Endpoint: GET https://automationexercise.com/api/brandsList | Schema validation
################################################################################

  AC 1
  Given I send GET /api/brandsList and receive a 200 response
  When  I parse the JSON response body
  Then  The top-level JSON contains a "responseCode" field equal to 200 and a "brands" array as the data payload

  AC 2
  Given I inspect the "brands" array from the GET /api/brandsList response
  When  I validate the schema of each brand object
  Then  Each object has exactly the fields "id" (positive integer) and "brand" (non-empty string), with no null values

  AC 3
  Given I receive the brands list API response
  When  I count the total number of brand entries
  Then  The total count is exactly 8, matching the 8 brands listed in the UI sidebar: Polo(6), H&M(5), Madame(5), Mast & Harbour(3), Babyhug(4), Allen Solly Junior(3), Kookie Kids(3), Biba(5)

  AC 4
  Given I retrieve the brands list from GET /api/brandsList
  When  I compare brand names against brand URLs on the UI (e.g., brand "Polo" -> /brand_products/Polo)
  Then  The brand string from the API can be URL-encoded and appended to /brand_products/ to produce a valid navigable URL returning a 200 HTTP response

  AC 5
  Given I send GET /api/brandsList three times consecutively
  When  I compare the brand arrays from each response
  Then  All three responses return identical brand IDs, brand names, and array order, confirming deterministic API behavior

################################################################################
US-BL-05
As a: QA engineer building a test data layer for the automation POC
I want to: use the brands API response to dynamically generate brand-specific test cases
So that: my test suite can adapt to new brands without hardcoded brand names
API Endpoint: GET https://automationexercise.com/api/brandsList | Data-driven testing
################################################################################

  AC 1
  Given I call GET /api/brandsList and parse the response into a list of brand names
  When  I use each brand name as a dynamic input to navigate to /brand_products/{brandName}
  Then  All 8 brand product pages return HTTP 200 and display at least 1 product, confirming all brands have accessible product pages

  AC 2
  Given I retrieve the full brand list from the API
  When  I pick "Allen Solly Junior" and navigate to /brand_products/Allen Solly Junior
  Then  The page loads with 3 products all tagged with brand "Allen Solly Junior" on their respective product detail pages

  AC 3
  Given I retrieve the brand list from the API and pick "Kookie Kids"
  When  I add all Kookie Kids products to the cart by clicking "Add to Cart" on each
  Then  The cart contains exactly 3 Kookie Kids products with the correct prices as shown on their product cards

  AC 4
  Given I use the brands API to get the brand name "Mast & Harbour"
  When  I search for products via POST /api/searchProduct with search_product="Mast & Harbour"
  Then  The search response returns products where the brand field equals "Mast & Harbour", confirming cross-API brand consistency

  AC 5
  Given I retrieve the brand list from the API and sort it alphabetically
  When  I compare the sorted list to the order brands appear in the UI sidebar
  Then  The UI sidebar order may differ from alphabetical, but all 8 brands from the API are present in the UI with no additions or omissions