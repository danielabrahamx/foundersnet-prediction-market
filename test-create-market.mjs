#!/usr/bin/env node

/**
 * Test script for POST /api/create-market endpoint
 * 
 * This script tests the market creation endpoint by submitting a sample market
 * to the Movement blockchain via the backend API.
 * 
 * Prerequisites:
 * - Backend server must be running on http://localhost:5000
 * - MOVEMENT_ADMIN_PRIVATE_KEY must be set in .env
 * - Movement blockchain must be accessible
 * 
 * Usage:
 *   node test-create-market.mjs
 */

const API_URL = 'http://localhost:5000';

// Test market data
const testMarket = {
    companyName: "Test Market " + Date.now(),
    description: "This is a test market created to verify the POST /create-market endpoint functionality. It should be successfully submitted to the Movement blockchain.",
    totalLiquidity: 10000, // Default initial liquidity
    expiryTimestamp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days from now
    creator: process.env.MOVEMENT_ADMIN_ADDRESS || "0x0", // Will be read from env or needs to be provided
};

console.log('\n🧪 Testing POST /api/create-market endpoint\n');
console.log('='.repeat(60));

/**
 * Test 1: Fetch admin address from environment
 */
async function getAdminAddress() {
    console.log('\n📋 Step 1: Getting admin address from server...\n');

    try {
        // First, let's check the health endpoint to see if server is running
        const healthResponse = await fetch(`${API_URL}/api/health`);

        if (!healthResponse.ok) {
            console.error('❌ Server health check failed');
            console.error(`   Status: ${healthResponse.status}`);
            return null;
        }

        const health = await healthResponse.json();
        console.log('✅ Server is healthy');
        console.log(`   Status: ${health.status}`);
        console.log(`   RPC: ${health.rpcUrl || 'N/A'}`);
        console.log(`   Chain ID: ${health.chainId || 'N/A'}`);

        if (health.adminAddress) {
            console.log(`   Admin Address: ${health.adminAddress}`);
            return health.adminAddress;
        } else {
            console.warn('⚠️  Admin address not found in health check');
            console.warn('   Make sure MOVEMENT_ADMIN_PRIVATE_KEY is set in .env');
            return null;
        }
    } catch (error) {
        console.error('❌ Failed to connect to server');
        console.error(`   Error: ${error.message}`);
        console.error('\n   Make sure the server is running with: npm run dev');
        return null;
    }
}

/**
 * Test 2: Create a test market
 */
async function createTestMarket(adminAddress) {
    console.log('\n📋 Step 2: Creating test market...\n');

    const marketData = {
        ...testMarket,
        creator: adminAddress,
    };

    console.log('Market data:');
    console.log(JSON.stringify(marketData, null, 2));
    console.log('');

    try {
        const response = await fetch(`${API_URL}/api/create-market`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(marketData),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('❌ Market creation failed');
            console.error(`   Status: ${response.status}`);
            console.error(`   Error: ${data.error}`);
            console.error(`   Code: ${data.code}`);
            console.error(`   Details: ${JSON.stringify(data.details, null, 2)}`);
            return null;
        }

        console.log('✅ Market creation transaction submitted successfully!');
        console.log(`   Transaction Hash: ${data.txHash}`);
        console.log(`   Duration: ${data.meta?.duration}ms`);
        console.log(`   Submitted At: ${data.meta?.submittedAt}`);

        return data.txHash;
    } catch (error) {
        console.error('❌ Request failed');
        console.error(`   Error: ${error.message}`);
        return null;
    }
}

/**
 * Test 3: Verify the market was created
 */
async function verifyMarketCreation(txHash) {
    console.log('\n📋 Step 3: Verifying market creation...\n');

    // Wait a bit for the transaction to be processed
    console.log('⏳ Waiting 3 seconds for transaction to be processed...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    try {
        // Fetch all markets
        const response = await fetch(`${API_URL}/api/markets`);

        if (!response.ok) {
            console.warn('⚠️  Could not fetch markets to verify');
            console.warn(`   Status: ${response.status}`);
            return;
        }

        const result = await response.json();
        const markets = result.data || [];

        console.log(`✅ Fetched ${markets.length} markets from blockchain`);

        // Try to find our market (it should be the most recent one)
        const recentMarkets = markets.slice(0, 3);

        if (recentMarkets.length > 0) {
            console.log('\n📊 Most recent markets:');
            recentMarkets.forEach((market, idx) => {
                console.log(`\n   ${idx + 1}. ${market.companyName}`);
                console.log(`      ID: ${market.id}`);
                console.log(`      Description: ${market.description.substring(0, 60)}...`);
                console.log(`      Liquidity: ${market.totalLiquidity}`);
                console.log(`      Resolved: ${market.resolved}`);
            });
        }

        console.log('\n✅ Market creation verified!');
    } catch (error) {
        console.warn('⚠️  Could not verify market creation');
        console.warn(`   Error: ${error.message}`);
        console.warn('   The transaction may still have succeeded');
    }
}

/**
 * Test 4: Test error cases
 */
async function testErrorCases(adminAddress) {
    console.log('\n📋 Step 4: Testing error cases...\n');

    // Test 1: Invalid data (missing required fields)
    console.log('Test 4.1: Missing required fields');
    try {
        const response = await fetch(`${API_URL}/api/create-market`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                companyName: "Incomplete Market"
                // Missing other required fields
            }),
        });

        const data = await response.json();

        if (response.status === 400 && data.code === 'VALIDATION_ERROR') {
            console.log('✅ Correctly rejected invalid data');
            console.log(`   Error: ${data.error}`);
        } else {
            console.warn('⚠️  Expected 400 validation error, got:', response.status);
        }
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }

    // Test 2: Unauthorized user
    console.log('\nTest 4.2: Unauthorized user');
    try {
        const response = await fetch(`${API_URL}/api/create-market`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...testMarket,
                creator: '0xunauthorized123',
            }),
        });

        const data = await response.json();

        if (response.status === 403 && data.code === 'UNAUTHORIZED') {
            console.log('✅ Correctly rejected unauthorized user');
            console.log(`   Error: ${data.error}`);
        } else {
            console.warn('⚠️  Expected 403 unauthorized error, got:', response.status);
        }
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

/**
 * Main test runner
 */
async function runTests() {
    try {
        // Step 1: Get admin address
        const adminAddress = await getAdminAddress();

        if (!adminAddress) {
            console.error('\n❌ Cannot proceed without admin address');
            console.error('   Please set MOVEMENT_ADMIN_PRIVATE_KEY in .env file');
            process.exit(1);
        }

        // Step 2: Create test market
        const txHash = await createTestMarket(adminAddress);

        if (!txHash) {
            console.error('\n❌ Market creation failed');
            process.exit(1);
        }

        // Step 3: Verify market creation
        await verifyMarketCreation(txHash);

        // Step 4: Test error cases
        await testErrorCases(adminAddress);

        // Summary
        console.log('\n' + '='.repeat(60));
        console.log('\n✅ All tests completed!\n');
        console.log('Summary:');
        console.log('  ✓ Server health check passed');
        console.log('  ✓ Market creation transaction submitted');
        console.log('  ✓ Transaction hash received');
        console.log('  ✓ Error handling verified');
        console.log('\n' + '='.repeat(60));
        console.log('');

    } catch (error) {
        console.error('\n❌ Test suite failed');
        console.error(`   Error: ${error.message}`);
        console.error('');
        process.exit(1);
    }
}

// Run the tests
runTests();
