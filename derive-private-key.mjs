#!/usr/bin/env node

/**
 * Derive private key from mnemonic phrase
 * 
 * This script converts a BIP39 mnemonic phrase to the hex private key format
 * required by the Movement/Aptos SDK.
 */

import { Account, Ed25519PrivateKey } from '@aptos-labs/ts-sdk';

const mnemonic = "swift battle multiply idea update pupil blossom lunch task soldier face weird";

try {
    console.log('\n🔑 Deriving private key from mnemonic...\n');

    // Derive account from mnemonic
    const account = Account.fromDerivationPath({
        path: "m/44'/637'/0'/0'/0'",
        mnemonic: mnemonic,
    });

    const privateKey = account.privateKey;
    const address = account.accountAddress.toString();

    console.log('✅ Successfully derived account!\n');
    console.log('Wallet Address:');
    console.log(`  ${address}\n`);
    console.log('Private Key (hex format):');
    console.log(`  ${privateKey.toString()}\n`);
    console.log('---\n');
    console.log('Add this to your .env file:\n');
    console.log(`MOVEMENT_ADMIN_PRIVATE_KEY=${privateKey.toString()}`);
    console.log(`MOVEMENT_RESOURCE_ACCOUNT=${address}\n`);

} catch (error) {
    console.error('❌ Failed to derive private key:', error.message);
    process.exit(1);
}
