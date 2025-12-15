
import * as dotenv from 'dotenv';
import { Account, Ed25519PrivateKey } from "@aptos-labs/ts-sdk";

dotenv.config();

const privateKeyHex = process.env.MOVEMENT_ADMIN_PRIVATE_KEY;
if (!privateKeyHex) {
    console.log("No MOVEMENT_ADMIN_PRIVATE_KEY found in .env");
    process.exit(1);
}

try {
    const privateKey = new Ed25519PrivateKey(privateKeyHex);
    const account = Account.fromPrivateKey({ privateKey });
    console.log(`Current Private Key Address: ${account.accountAddress.toString()}`);
} catch (e) {
    console.error("Error deriving address:", e);
}
