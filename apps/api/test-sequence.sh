#!/bin/bash
echo "Running tenant tests..."
npm test -- tests/routes/tenants.integration.test.ts

echo "Running auth tests..."
npm test -- tests/routes/auth.integration.test.ts

echo "Running all tests together..."
npm test
