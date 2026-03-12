import * as core from '@actions/core';
import * as jwt from 'jsonwebtoken';
import {HttpClient} from '@actions/http-client';
import {ApiKeyResult} from "./ApiKeyResult";

interface ExchangeTokenResponse {
    registryToken: string;
    deployToken: string;
    registryHost: string;
}

async function run() {
    const mode = core.getInput('mode') || 'token';

    switch (mode) {
        case 'oidc':
            await runOidcMode();
            break;
        case 'token':
            await runApiKeyMode();
            break;
        default:
            throw new Error(`Unknown mode: '${mode}'. Must be 'token' or 'oidc'.`);
    }
}

async function runOidcMode() {
    const fluxzeroHost = core.getInput('fluxzero-host', {required: true});
    const imageName = core.getInput('image-name', {required: true});
    const audience = 'https://cloud.fluxzero.io';
    const oidcToken = await core.getIDToken(audience);

    const httpClient = new HttpClient('fluxzero-jwt-action');
    const response = await httpClient.post(
        `${fluxzeroHost}/api/github/exchange-token`,
        JSON.stringify({oidcToken, imageName}),
        {'Content-Type': 'application/json'}
    );

    const body = await response.readBody();
    const statusCode = response.message.statusCode;
    if (typeof statusCode !== 'number' || statusCode < 200 || statusCode >= 300) {
        throw new Error(`Token exchange failed (${statusCode}): ${body}`);
    }

    const data: ExchangeTokenResponse = JSON.parse(body);

    // registryToken is Base64(userId:jwt) — decode to extract parts
    const decoded = Buffer.from(data.registryToken, 'base64').toString();
    const colonIndex = decoded.indexOf(':');
    if (colonIndex === -1) {
        throw new Error('Invalid registryToken format');
    }
    const userId = decoded.substring(0, colonIndex);
    const registryJwt = decoded.substring(colonIndex + 1);

    core.setOutput('token', registryJwt);
    core.setOutput('userId', userId);
    core.setOutput('deploy-token', data.deployToken);
    core.setOutput('registry-host', data.registryHost);

    core.setSecret(registryJwt);
    core.setSecret(data.deployToken);
}

async function runApiKeyMode() {
    const apiKey: ApiKeyResult = JSON.parse(core.getInput('api-key', {required: true}));
    core.setSecret(apiKey.key);

    const validitySeconds = parseInt(core.getInput('validity-seconds'));

    const header = {
        kid: apiKey.keyId,
        alg: 'RS256',
        typ: 'JWT'
    };

    const payload = {
        sub: apiKey.userId,
        exp: Math.floor(Date.now() / 1000) + (validitySeconds),
        iat: Math.floor(Date.now() / 1000)
    };

    const formattedKey = "-----BEGIN PRIVATE KEY-----\n" + apiKey.key.match(/.{1,64}/g)?.join("\n") + "\n-----END PRIVATE KEY-----"

    const jwtToken = jwt.sign(payload, formattedKey, {algorithm: 'RS256', header: header});

    core.setOutput('token', jwtToken);
    core.setOutput('userId', apiKey.userId);
}

run().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    core.setFailed(`Action failed with error: ${message}`);
});
