/**
 * Deployment Health Check Script
 * 
 * Run with: npx tsx scripts/check-deployment.ts
 * 
 * This script checks:
 * 1. Environment variables are set
 * 2. RPC endpoint is reachable
 * 3. Contract is deployed at the specified address
 * 4. MarketRegistry is initialized
 * 5. Admin account has sufficient balance
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { Aptos, AptosConfig, Network, Ed25519PrivateKey, Account } from '@aptos-labs/ts-sdk';

async function main() {
    console.log('\n========================================');
    console.log('  Movement Contract Deployment Check');
    console.log('========================================\n');

    const errors: string[] = [];
    const warnings: string[] = [];

    // Step 1: Check environment variables
    console.log('1️⃣  Checking environment variables...\n');

    const requiredVars = [
        'MOVEMENT_RPC_URL',
        'MOVEMENT_CHAIN_ID',
        'MOVEMENT_CONTRACT_ADDRESS',
        'MOVEMENT_RESOURCE_ACCOUNT',
    ];

    const optionalVars = [
        'MOVEMENT_ADMIN_PRIVATE_KEY',
        'MOVEMENT_FAUCET_URL',
    ];

    for (const varName of requiredVars) {
        const value = process.env[varName];
        if (!value) {
            console.log(`   ❌ ${varName}: NOT SET (required)`);
            errors.push(`Missing required env var: ${varName}`);
        } else if (value === '0x0' || value === '') {
            console.log(`   ⚠️  ${varName}: ${value} (placeholder value)`);
            warnings.push(`${varName} has placeholder value`);
        } else {
            console.log(`   ✅ ${varName}: ${value.substring(0, 20)}...`);
        }
    }

    for (const varName of optionalVars) {
        const value = process.env[varName];
        if (!value) {
            console.log(`   ⚪ ${varName}: NOT SET (optional)`);
        } else {
            console.log(`   ✅ ${varName}: ${value.substring(0, 20)}...`);
        }
    }

    // Early exit if missing required vars
    if (errors.length > 0) {
        console.log('\n❌ Cannot continue: Missing required environment variables');
        console.log('   Please set them in your .env file and try again.\n');
        process.exit(1);
    }

    // Step 2: Test RPC connectivity
    console.log('\n2️⃣  Testing RPC connectivity...\n');

    const rpcUrl = process.env.MOVEMENT_RPC_URL!;
    const config = new AptosConfig({
        network: Network.CUSTOM,
        fullnode: rpcUrl,
        faucet: process.env.MOVEMENT_FAUCET_URL,
    });
    const aptos = new Aptos(config);

    try {
        const start = Date.now();
        const ledgerInfo = await aptos.getLedgerInfo();
        const latency = Date.now() - start;

        console.log(`   ✅ RPC endpoint reachable (${latency}ms latency)`);
        console.log(`   ✅ Chain ID: ${ledgerInfo.chain_id}`);
        console.log(`   ✅ Block Height: ${ledgerInfo.block_height}`);
        console.log(`   ✅ Epoch: ${ledgerInfo.epoch}`);
    } catch (error: any) {
        console.log(`   ❌ Failed to connect to RPC: ${error?.message}`);
        errors.push(`RPC connection failed: ${error?.message}`);
    }

    // Step 3: Check if contract module exists
    console.log('\n3️⃣  Checking contract deployment...\n');

    const packageAddress = process.env.MOVEMENT_CONTRACT_ADDRESS!;
    const registryAddress = process.env.MOVEMENT_RESOURCE_ACCOUNT!;

    try {
        const modules = await aptos.getAccountModules({
            accountAddress: packageAddress,
        });

        const marketModule = modules.find(m =>
            m.abi?.name === 'market'
        );

        if (marketModule) {
            console.log(`   ✅ Contract module 'market' found at ${packageAddress}`);

            // Check for required functions
            const functions = marketModule.abi?.exposed_functions || [];
            const requiredFunctions = ['initialize', 'create_market', 'buy_yes', 'buy_no', 'resolve_market', 'claim_winnings'];

            for (const fn of requiredFunctions) {
                const found = functions.find(f => f.name === fn);
                if (found) {
                    console.log(`   ✅ Function '${fn}' exists`);
                } else {
                    console.log(`   ❌ Function '${fn}' NOT FOUND`);
                    errors.push(`Missing required function: ${fn}`);
                }
            }
        } else {
            console.log(`   ❌ Contract module 'market' NOT FOUND at ${packageAddress}`);
            console.log(`   📋 Available modules: ${modules.map(m => m.abi?.name).join(', ') || 'none'}`);
            errors.push('Contract module not deployed');
        }
    } catch (error: any) {
        console.log(`   ❌ Failed to fetch account modules: ${error?.message}`);
        if (error?.message?.includes('Resource not found')) {
            console.log(`   💡 Hint: The contract may not be deployed yet. Run: npm run move:deploy:movement`);
        }
        errors.push(`Contract check failed: ${error?.message}`);
    }

    // Step 4: Check if MarketRegistry is initialized
    console.log('\n4️⃣  Checking MarketRegistry initialization...\n');

    try {
        const registryType = `${packageAddress}::market::MarketRegistry`;
        const registry = await aptos.getAccountResource({
            accountAddress: registryAddress,
            resourceType: registryType,
        });

        console.log(`   ✅ MarketRegistry found at ${registryAddress}`);
        console.log(`   ✅ Admin: ${(registry as any)?.data?.admin || 'unknown'}`);
        console.log(`   ✅ Next Market ID: ${(registry as any)?.data?.next_market_id || 'unknown'}`);
        console.log(`   ✅ Treasury: ${(registry as any)?.data?.treasury || 0}`);
    } catch (error: any) {
        console.log(`   ❌ MarketRegistry NOT FOUND at ${registryAddress}`);
        console.log(`   💡 Hint: The contract may need to be initialized. Run: npm run move:deploy:movement`);
        errors.push('MarketRegistry not initialized');
    }

    // Step 5: Check admin account
    console.log('\n5️⃣  Checking admin account...\n');

    if (process.env.MOVEMENT_ADMIN_PRIVATE_KEY) {
        try {
            const privateKey = new Ed25519PrivateKey(process.env.MOVEMENT_ADMIN_PRIVATE_KEY);
            const adminAccount = Account.fromPrivateKey({ privateKey });
            const adminAddress = adminAccount.accountAddress.toString();

            console.log(`   ✅ Admin address: ${adminAddress}`);

            // Check if admin matches registry
            if (adminAddress.toLowerCase() !== registryAddress.toLowerCase()) {
                console.log(`   ⚠️  Admin address does not match MOVEMENT_RESOURCE_ACCOUNT`);
                console.log(`      Admin: ${adminAddress}`);
                console.log(`      Registry: ${registryAddress}`);
                warnings.push('Admin address mismatch');
            }

            // Check balance
            try {
                const balance = await aptos.getAccountAPTAmount({
                    accountAddress: adminAddress,
                });
                const aptBalance = balance / 100000000;

                if (aptBalance < 0.1) {
                    console.log(`   ⚠️  Admin balance: ${aptBalance} APT (LOW - may need more for gas)`);
                    warnings.push('Admin balance is low');
                } else {
                    console.log(`   ✅ Admin balance: ${aptBalance} APT`);
                }
            } catch (balError: any) {
                console.log(`   ⚠️  Could not check admin balance: ${balError?.message}`);
            }
        } catch (error: any) {
            console.log(`   ❌ Invalid admin private key: ${error?.message}`);
            errors.push('Invalid admin private key');
        }
    } else {
        console.log(`   ⚠️  No admin private key configured`);
        console.log(`   💡 Admin operations (create/resolve markets) will not work`);
        warnings.push('No admin private key');
    }

    // Summary
    console.log('\n========================================');
    console.log('              SUMMARY');
    console.log('========================================\n');

    if (errors.length === 0 && warnings.length === 0) {
        console.log('✅ All checks passed! Your deployment is ready.\n');
    } else {
        if (errors.length > 0) {
            console.log('❌ ERRORS (must fix):');
            errors.forEach(e => console.log(`   • ${e}`));
            console.log('');
        }

        if (warnings.length > 0) {
            console.log('⚠️  WARNINGS (should review):');
            warnings.forEach(w => console.log(`   • ${w}`));
            console.log('');
        }
    }

    console.log('Next steps:');
    if (errors.some(e => e.includes('not deployed') || e.includes('not initialized'))) {
        console.log('   1. Set MOVEMENT_PRIVATE_KEY in your .env file');
        console.log('   2. Run: npm run move:deploy:movement');
    }
    if (warnings.some(w => w.includes('low'))) {
        console.log('   • Get testnet APT from the faucet');
    }
    console.log('');
}

main().catch(console.error);
