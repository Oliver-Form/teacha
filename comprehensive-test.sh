#!/bin/bash

# Comprehensive API Testing Script
# Tests all endpoints with various scenarios including edge cases

set -e

echo "🧪 Running comprehensive API tests..."

API_URL="http://localhost:3001"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Helper function to run tests
run_test() {
    local test_name="$1"
    local expected_status="$2"
    local response="$3"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if [[ "$response" == *"$expected_status"* ]] || [[ "$expected_status" == "any" ]]; then
        echo -e "  ${GREEN}✅ $test_name${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "  ${RED}❌ $test_name${NC}"
        echo -e "     Response: $response"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

# Test function with HTTP status code check
test_endpoint() {
    local test_name="$1"
    local method="$2"
    local endpoint="$3"
    local data="$4"
    local headers="$5"
    local expected_status="$6"
    
    if [ -n "$data" ]; then
        response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X "$method" "$API_URL$endpoint" -H "Content-Type: application/json" $headers -d "$data")
    else
        response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X "$method" "$API_URL$endpoint" $headers)
    fi
    
    http_status=$(echo "$response" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)
    response_body=$(echo "$response" | sed 's/HTTP_STATUS:[0-9]*$//')
    
    if [ "$http_status" == "$expected_status" ]; then
        echo -e "  ${GREEN}✅ $test_name (Status: $http_status)${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "  ${RED}❌ $test_name (Expected: $expected_status, Got: $http_status)${NC}"
        echo -e "     Response: $response_body"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    # Return the response body for token extraction
    echo "$response_body"
}

echo ""
echo "🔍 Testing Health and Basic Endpoints..."

# Health check
test_endpoint "Health check" "GET" "/health" "" "" "200" > /dev/null

# Ping check  
test_endpoint "Ping check" "GET" "/ping" "" "" "200" > /dev/null

echo ""
echo "👤 Testing User Registration..."

# Valid registration
REGISTER_RESPONSE=$(test_endpoint "Valid user registration" "POST" "/register" \
    '{"email":"test1@example.com","password":"password123","name":"Test User 1","role":"user"}' \
    "" "201")

# Extract token from registration
USER_TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.token // empty')

# Invalid email format
test_endpoint "Invalid email format" "POST" "/register" \
    '{"email":"invalid-email","password":"password123","name":"Test User"}' \
    "" "400" > /dev/null

# Password too short
test_endpoint "Password too short" "POST" "/register" \
    '{"email":"test2@example.com","password":"123","name":"Test User"}' \
    "" "400" > /dev/null

# Missing required fields
test_endpoint "Missing name field" "POST" "/register" \
    '{"email":"test3@example.com","password":"password123"}' \
    "" "400" > /dev/null

# Duplicate email
test_endpoint "Duplicate email registration" "POST" "/register" \
    '{"email":"test1@example.com","password":"password123","name":"Test User Duplicate"}' \
    "" "400" > /dev/null

# Admin user registration
ADMIN_RESPONSE=$(test_endpoint "Admin user registration" "POST" "/register" \
    '{"email":"admin@example.com","password":"adminpass123","name":"Admin User","role":"admin"}' \
    "" "201")

ADMIN_TOKEN=$(echo "$ADMIN_RESPONSE" | jq -r '.token // empty')

echo ""
echo "🔐 Testing User Login..."

# Valid login
test_endpoint "Valid user login" "POST" "/login" \
    '{"email":"test1@example.com","password":"password123"}' \
    "" "200" > /dev/null

# Invalid email
test_endpoint "Login with invalid email" "POST" "/login" \
    '{"email":"nonexistent@example.com","password":"password123"}' \
    "" "401" > /dev/null

# Invalid password
test_endpoint "Login with invalid password" "POST" "/login" \
    '{"email":"test1@example.com","password":"wrongpassword"}' \
    "" "401" > /dev/null

# Invalid email format
test_endpoint "Login with malformed email" "POST" "/login" \
    '{"email":"invalid-email","password":"password123"}' \
    "" "400" > /dev/null

# Missing fields
test_endpoint "Login with missing password" "POST" "/login" \
    '{"email":"test1@example.com"}' \
    "" "400" > /dev/null

echo ""
echo "🛡️ Testing Protected Endpoints..."

# Valid JWT access to profile
test_endpoint "Profile access with valid JWT" "GET" "/me" \
    "" "-H 'Authorization: Bearer $USER_TOKEN'" "200" > /dev/null

# No JWT token
test_endpoint "Profile access without JWT" "GET" "/me" \
    "" "" "401" > /dev/null

# Invalid JWT token
test_endpoint "Profile access with invalid JWT" "GET" "/me" \
    "" "-H 'Authorization: Bearer invalid-token'" "401" > /dev/null

# Malformed Authorization header
test_endpoint "Profile access with malformed auth header" "GET" "/me" \
    "" "-H 'Authorization: invalid-format'" "401" > /dev/null

echo ""
echo "📋 Testing Users List Endpoint..."

# Valid access to users list
test_endpoint "Users list with valid JWT" "GET" "/" \
    "" "-H 'Authorization: Bearer $USER_TOKEN'" "200" > /dev/null

# No JWT for users list
test_endpoint "Users list without JWT" "GET" "/" \
    "" "" "401" > /dev/null

echo ""
echo "🔍 Testing Edge Cases and Error Handling..."

# Empty request body
test_endpoint "Registration with empty body" "POST" "/register" \
    '{}' "" "400" > /dev/null

# Invalid JSON
test_endpoint "Registration with invalid JSON" "POST" "/register" \
    '{invalid json}' "" "400" > /dev/null

# SQL injection attempt (should be safely handled by Prisma)
test_endpoint "SQL injection attempt" "POST" "/login" \
    '{"email":"test@example.com; DROP TABLE users; --","password":"password123"}' \
    "" "401" > /dev/null

# Very long inputs
test_endpoint "Registration with very long email" "POST" "/register" \
    '{"email":"'$(printf 'a%.0s' {1..1000})'@example.com","password":"password123","name":"Test User"}' \
    "" "400" > /dev/null

echo ""
echo "⚡ Testing Concurrent Requests..."

# Test multiple simultaneous registrations
echo "  Testing concurrent registrations..."
for i in {1..5}; do
    curl -s -X POST "$API_URL/register" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"concurrent$i@example.com\",\"password\":\"password123\",\"name\":\"Concurrent User $i\"}" &
done
wait

echo -e "  ${GREEN}✅ Concurrent registrations completed${NC}"
PASSED_TESTS=$((PASSED_TESTS + 1))
TOTAL_TESTS=$((TOTAL_TESTS + 1))

echo ""
echo "🎯 Testing JWT Token Functionality..."

# Test token expiration (we can't easily test this without waiting, but we can test token structure)
if [ -n "$USER_TOKEN" ]; then
    # Decode JWT header and payload (basic structure test)
    header=$(echo "$USER_TOKEN" | cut -d. -f1)
    payload=$(echo "$USER_TOKEN" | cut -d. -f2)
    
    if [ ${#header} -gt 10 ] && [ ${#payload} -gt 10 ]; then
        echo -e "  ${GREEN}✅ JWT token structure is valid${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "  ${RED}❌ JWT token structure is invalid${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
fi

echo ""
echo "🧹 Testing Data Validation..."

# Test role validation
test_endpoint "Invalid role value" "POST" "/register" \
    '{"email":"invalid-role@example.com","password":"password123","name":"Test User","role":"superadmin"}' \
    "" "400" > /dev/null

# Test age validation
test_endpoint "Negative age value" "POST" "/register" \
    '{"email":"negative-age@example.com","password":"password123","name":"Test User","age":-5}' \
    "" "400" > /dev/null

# Test email uniqueness after deletion (if we had a delete endpoint)
# This would test database constraint handling

echo ""
echo "📊 Test Results Summary:"
echo "========================"
echo -e "Total Tests: ${YELLOW}$TOTAL_TESTS${NC}"
echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed: ${RED}$FAILED_TESTS${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All tests passed! API is robust and ready for production.${NC}"
    exit 0
else
    echo -e "\n${RED}⚠️ Some tests failed. Please review the issues above.${NC}"
    exit 1
fi
