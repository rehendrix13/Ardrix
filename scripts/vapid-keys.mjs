// Creates the key pair that reminder notifications need. Run: node scripts/vapid-keys.mjs
// Put the PUBLIC key in public/config.js and in the function secrets.
// Put the PRIVATE key ONLY in the Supabase function secrets. Never commit it.
import { generateKeyPairSync } from "node:crypto";

const { publicKey, privateKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
const pub = publicKey.export({ format: "jwk" });
const priv = privateKey.export({ format: "jwk" });
const b64 = (s) => Buffer.from(s, "base64url");
const raw = Buffer.concat([Buffer.from([4]), b64(pub.x), b64(pub.y)]).toString("base64url");

console.log(`VAPID_PUBLIC_KEY=${raw}`);
console.log(`VAPID_PRIVATE_KEY=${priv.d}`);
