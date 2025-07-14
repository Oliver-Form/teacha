#!/bin/bash

echo "🔐 Testing Admin and RBAC Functionality..."

API_URL="http://localhost:3001"

echo ""
echo "1. Creating Admin User..."
ADMIN_RESPONSE=$(curl -s -X POST "$API_URL/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "adminpass123",
    "name": "Admin User",
    "role": "admin"
  }')

echo "Admin Registration Response:"
echo "$ADMIN_RESPONSE" | jq .

ADMIN_TOKEN=$(echo "$ADMIN_RESPONSE" | jq -r '.token // empty')
echo "Admin Token: $ADMIN_TOKEN"

echo ""
echo "2. Creating Regular User..."
USER_RESPONSE=$(curl -s -X POST "$API_URL/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "regular@example.com",
    "password": "userpass123",
    "name": "Regular User",
    "role": "user"
  }')

echo "User Registration Response:"
echo "$USER_RESPONSE" | jq .

USER_TOKEN=$(echo "$USER_RESPONSE" | jq -r '.token // empty')

echo ""
echo "3. Testing Users Route Access (should work for both)..."

echo "Admin accessing users:"
if [ -n "$ADMIN_TOKEN" ] && [ "$ADMIN_TOKEN" != "null" ]; then
    curl -s "$API_URL/" -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.users | length'
else
    echo "❌ No admin token"
fi

echo "Regular user accessing users:"
if [ -n "$USER_TOKEN" ] && [ "$USER_TOKEN" != "null" ]; then
    curl -s "$API_URL/" -H "Authorization: Bearer $USER_TOKEN" | jq '.users | length'
else
    echo "❌ No user token"
fi

echo ""
echo "4. Testing User Creation (should test admin-only endpoints if they exist)..."

# Note: Based on the current code, we don't have admin-only endpoints implemented yet
# Let's test what we do have and suggest improvements

echo ""
echo "5. Testing Role Verification in JWT Tokens..."

if [ -n "$ADMIN_TOKEN" ] && [ "$ADMIN_TOKEN" != "null" ]; then
    # Decode JWT payload (base64)
    payload=$(echo "$ADMIN_TOKEN" | cut -d. -f2)
    # Add padding if needed
    payload="${payload}$(printf '%*s' $((4 - ${#payload} % 4)) '' | tr ' ' '=')"
    decoded=$(echo "$payload" | base64 -d 2>/dev/null || echo "$payload" | base64 -D 2>/dev/null)
    echo "Admin JWT payload: $decoded"
fi

if [ -n "$USER_TOKEN" ] && [ "$USER_TOKEN" != "null" ]; then
    payload=$(echo "$USER_TOKEN" | cut -d. -f2)
    payload="${payload}$(printf '%*s' $((4 - ${#payload} % 4)) '' | tr ' ' '=')"
    decoded=$(echo "$payload" | base64 -d 2>/dev/null || echo "$payload" | base64 -D 2>/dev/null)
    echo "User JWT payload: $decoded"
fi

echo ""
echo "6. Testing Invalid Role Registration..."
INVALID_ROLE=$(curl -s -X POST "$API_URL/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "invalid-role@example.com",
    "password": "password123",
    "name": "Invalid Role User",
    "role": "superadmin"
  }')

echo "Invalid Role Response:"
echo "$INVALID_ROLE" | jq .

echo ""
echo "✅ RBAC testing completed!"
