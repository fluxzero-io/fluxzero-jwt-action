import {readFile} from 'node:fs/promises';
import process from 'node:process';
import {verifyTokenContract} from './token-contract.mjs';

const checkedAt = Math.floor(Date.now() / 1000);
verifyTokenContract({
    token: requireEnvironment('JWT_TOKEN'),
    publicKey: await readFile(requireEnvironment('JWT_PUBLIC_KEY_PATH'), 'utf8'),
    expectedUserId: requireEnvironment('JWT_EXPECTED_USER_ID'),
    expectedKeyId: requireEnvironment('JWT_EXPECTED_KEY_ID'),
    validitySeconds: Number(requireEnvironment('JWT_VALIDITY_SECONDS')),
    earliestIssuedAt: Number(requireEnvironment('JWT_EARLIEST_ISSUED_AT')),
    checkedAt,
});

process.stdout.write(
    'JWT signature, issuer/audience boundary, claims, and validity verified.\n'
);

function requireEnvironment(name) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}
