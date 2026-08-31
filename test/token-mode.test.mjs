import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {generateKeyPairSync} from 'node:crypto';
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import test from 'node:test';
import {verifyTokenContract} from './token-contract.mjs';

test('token mode signs a bounded System API JWT with an ephemeral RSA key', async () => {
    const expectedUserId = 'jwt-action-test-user';
    const expectedKeyId = 'jwt-action-test-key';
    const validitySeconds = 120;
    const {privateKey, publicKey} = generateKeyPairSync('rsa', {
        modulusLength: 2048,
        privateKeyEncoding: {type: 'pkcs8', format: 'der'},
        publicKeyEncoding: {type: 'spki', format: 'pem'},
    });
    const apiKey = JSON.stringify({
        userId: expectedUserId,
        keyId: expectedKeyId,
        key: privateKey.toString('base64'),
        issuedAt: new Date().toISOString(),
    });
    const earliestIssuedAt = Math.floor(Date.now() / 1000);
    const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'fluxzero-jwt-action-'));
    const outputFile = path.join(temporaryDirectory, 'github-output');
    await writeFile(outputFile, '');

    try {
        const result = await runAction({
            INPUT_MODE: 'token',
            'INPUT_API-KEY': apiKey,
            'INPUT_VALIDITY-SECONDS': String(validitySeconds),
            GITHUB_OUTPUT: outputFile,
        });
        assert.equal(result.code, 0, result.stderr);

        const outputs = await readFile(outputFile, 'utf8');
        const token = readOutput(outputs, 'token');
        assert.ok(result.stdout.includes(`::add-mask::${token}`),
            'generated token must be registered with the GitHub log masker');
        assert.equal(readOutput(outputs, 'userId'), expectedUserId);
        verifyTokenContract({
            token,
            publicKey,
            expectedUserId,
            expectedKeyId,
            validitySeconds,
            earliestIssuedAt,
        });
    } finally {
        await rm(temporaryDirectory, {recursive: true, force: true});
    }
});

function runAction(environment) {
    return new Promise((resolve, reject) => {
        const child = spawn(process.execPath, ['dist/index.js'], {
            cwd: path.resolve(import.meta.dirname, '..'),
            env: {...process.env, ...environment},
        });
        let stdout = '';
        let stderr = '';
        child.stdout.on('data', chunk => stdout += chunk);
        child.stderr.on('data', chunk => stderr += chunk);
        child.on('error', reject);
        child.on('close', code => resolve({code, stdout, stderr}));
    });
}

function readOutput(outputs, name) {
    const match = outputs.match(new RegExp(
        `${escapeRegex(name)}<<(?<delimiter>ghadelimiter_[^\\n]+)\\n(?<value>[^\\n]+)\\n\\k<delimiter>`
    ));
    assert.ok(match?.groups, `Missing ${name} output`);
    return match.groups.value;
}

function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
