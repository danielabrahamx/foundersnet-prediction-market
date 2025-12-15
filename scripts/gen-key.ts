import { Account, Ed25519PrivateKey } from "@aptos-labs/ts-sdk";

const account = Account.generate();
console.log(`Private Key: ${account.privateKey.toString()}`);
console.log(`Address: ${account.accountAddress.toString()}`);
