import * as core from '@actions/core';
import * as jwt from 'jsonwebtoken';

async function run() {
    try {
        const keyId = core.getInput('key-id', {required: true});
        const privateKey = core.getInput('private-key', {required: true});
        const userId = core.getInput('user-id', {required: true});
        const validitySeconds = parseInt(core.getInput('validity-seconds'));

        const header = {
            kid: keyId,
            alg: 'RS256',
            typ: 'JWT'
        };

        const payload = {
            sub: userId,
            iss: "https://flux.host",
            exp: Math.floor(Date.now() / 1000) + (validitySeconds),
            iat: Math.floor(Date.now() / 1000)
        };

        const formattedKey = "-----BEGIN PRIVATE KEY-----\n" + privateKey.match(/.{1,64}/g)?.join("\n") + "\n-----END PRIVATE KEY-----"

        const jwtToken = jwt.sign(payload, formattedKey, {algorithm: 'RS256', header: header});
        core.setOutput('token', jwtToken);
    } catch (error: any) {
        core.setFailed(`Action failed with error: ${error.message}`);
    }
}

run();
