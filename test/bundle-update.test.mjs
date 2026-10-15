import assert from 'node:assert/strict';
import {Buffer} from 'node:buffer';
import {createHash} from 'node:crypto';
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {URL} from 'node:url';

const workflow = await readFile(new URL('../.github/workflows/dependabot-auto-merge.yml', import.meta.url), 'utf8');
const lines = workflow.split('          script: |\n')[1].split('\n');
const end = lines.findIndex(line => line.trim() && !line.startsWith('            '));
const source = lines.slice(0, end < 0 ? undefined : end).map(line => line.slice(12)).join('\n');
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const run = new AsyncFunction('github', 'context', 'core', 'require', 'process', source);

test('the privileged bot job treats bundle bytes as data and changes only the two dist files', async () => {
    await fixture(async state => {
        await state.run();
        const tree = state.calls.find(([name]) => name === 'createTree')[1];
        assert.deepEqual(tree.tree.map(entry => entry.path), ['dist/index.js', 'dist/licenses.txt']);
        assert.equal(tree.base_tree, 'existing-tree');
        const commit = state.calls.find(([name]) => name === 'createCommit')[1];
        assert.deepEqual(commit.parents, ['qualified-head']);
        const update = state.calls.find(([name]) => name === 'updateRef')[1];
        assert.deepEqual(update, {owner: 'fluxzero-io', repo: 'fluxzero-jwt-action', ref: 'heads/dependabot/npm_and_yarn/undici', sha: 'new-commit', force: false});
        assert.deepEqual(state.outputs, {'head-sha': 'new-commit'});
        for (const [, request] of state.calls) {
            assert.equal(request.owner, 'fluxzero-io');
            assert.equal(request.repo, 'fluxzero-jwt-action');
        }
    });
});

test('an already current bundle queues the original head without a generated commit', async () => {
    await fixture(async state => {
        state.unchanged = true;
        await state.run();
        assert.equal(state.calls.some(([name]) => ['createTree', 'createCommit', 'updateRef'].includes(name)), false);
        assert.deepEqual(state.outputs, {'head-sha': 'qualified-head'});
    });
});

for (const [label, change] of [
    ['a changed head', pr => pr.head.sha = 'racing-head'],
    ['a fork', pr => pr.head.repo.full_name = 'outsider/fluxzero-jwt-action'],
    ['a different author', pr => pr.user.login = 'someone-else'],
    ['a changed branch', pr => pr.head.ref = 'other-branch'],
    ['a different target', pr => pr.base.ref = 'other-target'],
    ['a closed PR', pr => pr.state = 'closed'],
]) {
    test(`the privileged job rejects ${label} before writing objects`, async () => {
        await fixture(async state => {
            change(state.pr);
            await assert.rejects(state.run(), /outside the qualified scope/);
            assert.deepEqual(state.calls.map(([name]) => name), ['getPull']);
            assert.deepEqual(state.outputs, {});
        });
    });
}

test('a truncated tree or empty bundle cannot update a branch', async () => {
    await fixture(async state => {
        state.truncated = true;
        await assert.rejects(state.run(), /incomplete source tree/);
        assert.equal(state.calls.some(([name]) => name === 'createBlob'), false);
    });
    await fixture(async state => {
        await writeFile(path.join(state.directory, 'index.js'), '');
        await assert.rejects(state.run(), /Invalid bundle size/);
        assert.equal(state.calls.some(([name]) => name === 'updateRef'), false);
    });
});

test('a non-fast-forward rejection propagates without reporting a mergeable head', async () => {
    await fixture(async state => {
        state.rejectUpdate = true;
        await assert.rejects(state.run(), /reference moved/);
        assert.deepEqual(state.outputs, {});
    });
});

async function fixture(check) {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'jwt-bundle-job-'));
    // Executing this artifact would fail the test. The privileged job may only encode its bytes.
    const files = {'index.js': 'throw new Error("bundle must not execute in the privileged job");', 'licenses.txt': 'test license'};
    for (const [name, content] of Object.entries(files)) await writeFile(path.join(directory, name), content);
    const expected = {number: 1, head: {sha: 'qualified-head', ref: 'dependabot/npm_and_yarn/undici'}};
    const state = {directory, outputs: {}, calls: [], pr: {
        ...expected, user: {login: 'dependabot[bot]'},
        base: {ref: 'main'}, draft: false, state: 'open',
        head: {...expected.head, repo: {full_name: 'fluxzero-io/fluxzero-jwt-action'}},
    }};
    const record = (name, implementation) => async request => {
        state.calls.push([name, request]);
        return {data: await implementation(request)};
    };
    const github = {rest: {pulls: {get: record('getPull', () => state.pr)}, git: {
        getCommit: record('getCommit', () => ({tree: {sha: 'existing-tree'}})),
        getTree: record('getTree', () => ({truncated: state.truncated, tree: Object.entries(files).map(([name, content]) => ({path: `dist/${name}`, mode: '100644', sha: state.unchanged ? blobHash(content) : 'old-blob'}))})),
        createBlob: record('createBlob', request => ({sha: blobHash(Buffer.from(request.content, 'base64'))})),
        createTree: record('createTree', () => ({sha: 'new-tree'})),
        createCommit: record('createCommit', () => ({sha: 'new-commit'})),
        updateRef: record('updateRef', () => {if (state.rejectUpdate) throw new Error('reference moved'); return {};}),
    }}};
    state.run = () => run(github, {repo: {owner: 'fluxzero-io', repo: 'fluxzero-jwt-action'}, payload: {pull_request: expected}},
        {setOutput: (name, value) => state.outputs[name] = value}, createRequire(import.meta.url), {env: {BUNDLE_DIRECTORY: directory}});
    try {await check(state);} finally {await rm(directory, {recursive: true, force: true});}
}

function blobHash(content) {
    const bytes = Buffer.from(content);
    return createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
}
