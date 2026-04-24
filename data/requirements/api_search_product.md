################################################################################
USER STORIES & GHERKIN ACCEPTANCE CRITERIA
AutomationExercise.com — AI Testing POC
URL: https://automationexercise.com
API: https://automationexercise.com/api_list
Test Login: reachtobp@gmail.com / Welcome@123
################################################################################

################################################################################
SCENARIO 2: SEARCH PRODUCT USING API
################################################################################

################################################################################
US-SP-01
As a: QA engineer testing the search product API
I want to: search for products using a valid keyword via a POST request
So that: I can verify the API returns a filtered product list matching the search term
API Endpoint: POST https://automationexercise.com/api/searchProduct | Param: search_product
################################################################################

  AC 1
  Given The API endpoint POST /api/searchProduct is available
  When  I send a POST request with body parameter search_product="top"
  Then  The response status code is 200 and the JSON body contains a list of products with names that include "top" (e.g., Blue Top, Madame Top For Women, Winter Top)

  AC 2
  Given The POST /api/searchProduct endpoint is available
  When  I send a POST request with search_product="tshirt"
  Then  The response code is 200 and the returned JSON contains products with category "Tshirts" including product IDs, names, prices, and brand details

  AC 3
  Given The POST /api/searchProduct endpoint is available
  When  I send a POST request with search_product="jean"
  Then  The response code is 200 and the JSON payload contains jeans products with correct fields: id, name, price, brand, category (Men > Jeans)

  AC 4
  Given The POST /api/searchProduct endpoint is available
  When  I send a POST request with search_product="dress"
  Then  The response code is 200 and the JSON contains at least 3 products matching "dress", each with a non-null name, price, and category field

  AC 5
  Given The POST /api/searchProduct endpoint is available
  When  I send a POST request with search_product="saree"
  Then  The response code is 200 and the JSON contains saree products under Women > Saree category, confirming category-specific search works

################################################################################
US-SP-02
As a: QA engineer testing the search product API
I want to: verify API error handling when the required parameter is missing or the method is wrong
So that: I can confirm the API enforces correct request contracts and returns meaningful error responses
API Endpoint: POST https://automationexercise.com/api/searchProduct | Error cases
################################################################################

  AC 1
  Given The POST /api/searchProduct endpoint is available
  When  I send a POST request with an empty body (no search_product parameter)
  Then  The response code is 400 and the response message is "Bad request, search_product parameter is missing in POST request."

  AC 2
  Given The POST /api/searchProduct endpoint is available
  When  I send a GET request to /api/searchProduct instead of POST
  Then  The response code is 405 and the message is "This request method is not supported." confirming method-level enforcement

  AC 3
  Given The POST /api/searchProduct endpoint is available
  When  I send a POST request with search_product="" (empty string value)
  Then  The response code is either 400 or 200 with an empty products array, and no server error (5xx) is returned

  AC 4
  Given The POST /api/searchProduct endpoint is available
  When  I send a POST request with search_product="zzz_nonexistent_xyz"
  Then  The response code is 200 and the products array in the JSON body is empty, confirming graceful handling of no-match searches

  AC 5
  Given The POST /api/searchProduct endpoint is available
  When  I send a POST request with search_product containing special characters like "top<script>"
  Then  The response code is 200 or 400 with no 5xx error, confirming the API does not expose XSS or injection vulnerabilities in the response

################################################################################
US-SP-03
As a: QA engineer validating API response schema for search product
I want to: verify that each product in the search response contains the required fields and correct data types
So that: I can ensure the API contract is stable for downstream consumers and automation scripts
API Endpoint: POST https://automationexercise.com/api/searchProduct | Schema validation
################################################################################

  AC 1
  Given I send POST /api/searchProduct with search_product="top" and receive a 200 response
  When  I inspect the first product object in the returned JSON
  Then  The product object contains exactly these fields: id (integer), name (string), price (string with "Rs."), category (object with usertype and category), and brand (string)

  AC 2
  Given I receive a 200 search response for search_product="tshirt"
  When  I validate the category field for each product
  Then  Each product's category object contains a nested "usertype" field (e.g., "Women", "Men") and a "category" field (e.g., "Tops", "Tshirts"), both as non-empty strings

  AC 3
  Given I receive a 200 search response for search_product="dress"
  When  I check the "id" field for all returned products
  Then  All product IDs are unique positive integers with no duplicates in the response

  AC 4
  Given I receive a 200 search response for any valid keyword
  When  I check the response Content-Type header
  Then  The Content-Type is "application/json" confirming the API returns properly formatted JSON

  AC 5
  Given I send a valid search request and receive a product list
  When  I cross-reference one product ID (e.g., id=1 "Blue Top") from the response against GET /api/productsList
  Then  The product details (name, price, brand, category) match exactly in both APIs, confirming data consistency

################################################################################
US-SP-04
As a: QA engineer comparing API search results against UI search results
I want to: verify that the API search product endpoint returns the same products shown in the UI search
So that: I can confirm that the UI and API are backed by the same data source
API Endpoint: POST https://automationexercise.com/api/searchProduct vs UI /products search
################################################################################

  AC 1
  Given I perform a UI search on the Products page with keyword "top"
  When  I simultaneously send POST /api/searchProduct with search_product="top"
  Then  The product names visible on the UI "SEARCHED PRODUCTS" section match the product names returned in the API JSON response

  AC 2
  Given I search for "jean" via both the UI and the API
  When  I compare the number of results from each source
  Then  The count of products in the UI search results equals the count of product objects in the API response array

  AC 3
  Given I search for "dress" via UI and API
  When  I pick one specific product returned by both (e.g., "Stylish Dress")
  Then  The price displayed on the UI product card (Rs. 1500) matches the price string in the API JSON ("Rs. 1500")

  AC 4
  Given I search for a keyword that returns multiple products via API
  When  I click "View Product" on the first product in the UI and inspect the product detail page
  Then  The product ID in the URL path (/product_details/{id}) matches the id field for that product in the API search response

  AC 5
  Given The API returns a product with a specific brand (e.g., "Polo")
  When  I navigate to that product detail page in the UI
  Then  The "Brand:" field on the product detail page matches the brand field returned by the API for that product

################################################################################
US-SP-05
As a: QA engineer testing performance and reliability of the search product API
I want to: send multiple sequential search requests and verify consistent responses
So that: I can confirm the API is stable, consistent, and reliable for automation test suites
API Endpoint: POST https://automationexercise.com/api/searchProduct | Reliability
################################################################################

  AC 1
  Given The search API is available and healthy
  When  I send 3 consecutive POST requests with the same search_product="top"
  Then  All 3 responses return status 200 and the same product count and product IDs, confirming response consistency

  AC 2
  Given I send a valid search request
  When  I measure the response time of POST /api/searchProduct with search_product="dress"
  Then  The response is received within 3 seconds, confirming acceptable API response performance

  AC 3
  Given I send searches for three different keywords sequentially: "top", "tshirt", "jean"
  When  I compare the product lists across all three responses
  Then  There are no duplicate products across the three result sets — each keyword returns a distinct non-overlapping set of products

  AC 4
  Given The API is queried with a case variation: search_product="TOP" (uppercase)
  When  I compare the results with search_product="top" (lowercase)
  Then  Both return status 200; the results may or may not match, but neither returns a 4xx or 5xx error, confirming the API handles case without crashing

  AC 5
  Given I send a POST search request with a very long string value for search_product (500+ characters)
  When  The request is received by the API
  Then  The response code is 200 with an empty array or 400 with an error message, and no 5xx server error is returned, confirming input length tolerance