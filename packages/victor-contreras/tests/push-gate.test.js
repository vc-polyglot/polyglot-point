const test = require('node:test');
const assert = require('node:assert/strict');
const {parseUpdates,classifyChanges} = require('../tools/verify-push.cjs');

test('website-only changes select the website gate',()=> {
  assert.deepEqual(classifyChanges(['Dockerfile.victor-contreras','packages/victor-contreras/public/index.html']),{victor:true,other:false});
});
test('shared files and other apps preserve the original build gate',()=> {
  assert.deepEqual(classifyChanges(['package.json','packages/victor-contreras/public/index.html']),{victor:true,other:true});
  assert.deepEqual(classifyChanges(['packages/polyglot-point/frontend/src/main.tsx']),{victor:false,other:true});
  assert.deepEqual(classifyChanges(['pnpm-lock.yaml']),{victor:false,other:true});
});
test('push reference parsing rejects malformed input and supports multiple references',()=> {
  const zero='0'.repeat(40),sha='a'.repeat(40);
  const updates=parseUpdates('refs/heads/feature '+sha+' refs/heads/feature '+zero+'\nrefs/heads/old '+zero+' refs/heads/old '+sha+'\n');
  assert.equal(updates.length,2);
  assert.equal(updates[0].remoteSha,zero);
  assert.throws(()=>parseUpdates('malformed input'),/Invalid/);
});
