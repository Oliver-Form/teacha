#!/bin/bash

echo "🧪 Simple API Testing..."

API_URL="http://localhost:3001"

echo ""
echo "1. Testing Health Check..."
curl -s "$API_URL/health" | jq .

echo ""
echo "2. Testing User Registration..."
REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "simple-test@example.com",
    "password": "password123",
    "name": "Simple Test User",
    "role": "user"
  }')

echo "Registration Response:"
echo "$REGISTER_RESPONSE" | jq .

# Extract token
TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.token // empty')
echo "Extracted Token: $TOKEN"

echo ""
echo "3. Testing Login..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "simple-test@example.com",
    "password": "password123"
  }')

echo "Login Response:"
echo "$LOGIN_RESPONSE" | jq .

echo ""
echo "4. Testing Protected Profile Endpoint..."
if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
    PROFILE_RESPONSE=$(curl -s "$API_URL/me" \
      -H "Authorization: Bearer $TOKEN")
    echo "Profile Response:"
    echo "$PROFILE_RESPONSE" | jq .
else
    echo "❌ No token available for protected endpoint test"
fi

echo ""
echo "5. Testing Invalid Login..."
INVALID_LOGIN=$(curl -s -X POST "$API_URL/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "simple-test@example.com",
    "password": "wrongpassword"
  }')

echo "Invalid Login Response:"
echo "$INVALID_LOGIN" | jq .

echo ""
echo "6. Testing Validation Errors..."

# Test invalid email
INVALID_EMAIL=$(curl -s -X POST "$API_URL/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "invalid-email",
    "password": "password123",
    "name": "Test User"
  }')

echo "Invalid Email Response:"
echo "$INVALID_EMAIL" | jq .

# Test short password
SHORT_PASSWORD=$(curl -s -X POST "$API_URL/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "short-pass@example.com",
    "password": "123",
    "name": "Test User"
  }')

echo "Short Password Response:"
echo "$SHORT_PASSWORD" | jq .

# Test duplicate email
DUPLICATE_EMAIL=$(curl -s -X POST "$API_URL/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "simple-test@example.com",
    "password": "password123",
    "name": "Duplicate User"
  }')

echo "Duplicate Email Response:"
echo "$DUPLICATE_EMAIL" | jq .

echo ""
echo "7. Testing Unauthorized Access..."
NO_TOKEN_RESPONSE=$(curl -s "$API_URL/me")
echo "No Token Response:"
echo "$NO_TOKEN_RESPONSE" | jq .

INVALID_TOKEN_RESPONSE=$(curl -s "$API_URL/me" \
  -H "Authorization: Bearer invalid-token")
echo "Invalid Token Response:"
echo "$INVALID_TOKEN_RESPONSE" | jq .

echo ""
echo "8. Testing Users List..."
if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
    USERS_RESPONSE=$(curl -s "$API_URL/" \
      -H "Authorization: Bearer $TOKEN")
    echo "Users List Response:"
    echo "$USERS_RESPONSE" | jq .
fi

echo ""
echo "✅ Simple testing completed!"
