import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';

export function verifyTokenContract({
    token,
    publicKey,
    expectedUserId,
    expectedKeyId,
    validitySeconds,
    earliestIssuedAt,
    checkedAt = Math.floor(Date.now() / 1000),
}) {
    const verified = jwt.verify(token, publicKey, {
        algorithms: ['RS256'],
        complete: true,
        clockTimestamp: checkedAt,
    });

    assert.equal(typeof verified, 'object');
    assert.equal(verified.header.alg, 'RS256');
    assert.equal(verified.header.typ, 'JWT');
    assert.equal(verified.header.kid, expectedKeyId);

    const payload = verified.payload;
    assert.equal(typeof payload, 'object');
    assert.equal(payload.sub, expectedUserId);
    assert.equal(payload.iss, undefined,
        'token mode must not self-assert an issuer');
    assert.equal(payload.aud, undefined,
        'token mode must not reuse the GitHub OIDC audience');
    assert.deepEqual(Object.keys(payload).sort(), ['exp', 'iat', 'sub']);

    assert.equal(Number.isInteger(payload.iat), true);
    assert.equal(Number.isInteger(payload.exp), true);
    assert.equal(payload.exp - payload.iat, validitySeconds);
    assert.ok(payload.iat >= earliestIssuedAt);
    assert.ok(payload.iat <= checkedAt);
    assert.ok(payload.exp > checkedAt);
}
