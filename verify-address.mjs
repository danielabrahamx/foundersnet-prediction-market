import { Account, Ed25519PrivateKey } from "@aptos-labs/ts-sdk";

const privateKeyHex = "0xDD5474FDC0C04E865420022C7BF2B7810B222A9245C2F7374A013278E8C4A0A0";
const privateKey = new Ed25519PrivateKey(privateKeyHex);
const account = Account.fromPrivateKey({ privateKey });

console.log("Private Key:", privateKeyHex);
console.log("Derived Address:", account.accountAddress.toString());
