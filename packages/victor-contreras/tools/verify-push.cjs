'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');
const SITE = 'packages/victor-contreras';
const ZERO = /^0+$/;

function git(root,args) {
  return execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
}
function parseUpdates(input) {
  return input.trim().split(/\r?\n/).filter(Boolean).map(line => {
    const fields = line.trim().split(/\s+/);
    if (fields.length !== 4 || !/^[a-f0-9]{40,64}$/i.test(fields[1]) || !/^[a-f0-9]{40,64}$/i.test(fields[3])) {
      throw new Error('Invalid pre-push reference data.');
    }
    return {localRef:fields[0],localSha:fields[1],remoteRef:fields[2],remoteSha:fields[3]};
  });
}
function classifyChanges(files) {
  const victor = files.some(file => file === 'Dockerfile.victor-contreras' || file.startsWith(SITE+'/'));
  const other = files.some(file => file !== 'Dockerfile.victor-contreras' && !file.startsWith(SITE+'/'));
  return {victor,other};
}
function changedPaths(root,updates) {
  const files = new Set();
  for (const update of updates) {
    if (ZERO.test(update.localSha)) continue; // No application contents are pushed for a branch deletion.
    let base = update.remoteSha;
    if (ZERO.test(base)) {
      // A new branch has no remote tip. Compare against its common ancestor with
      // the known production branch; fall back conservatively to the default branch.
      base = null;
      for (const ref of ['refs/remotes/origin/release/auth-stripe-db','refs/remotes/origin/main']) {
        try { base = git(root,['merge-base',update.localSha,ref]); } catch { continue; }
        if (base) break;
      }
      if (!base) throw new Error('No comparison base available. Fetch origin before pushing.');
    }
    try { git(root,['cat-file','-e',base+'^{commit}']); }
    catch { throw new Error('The remote tip is not available locally. Fetch origin before pushing.'); }
    const result = git(root,['diff','--name-only','-z',base,update.localSha]);
    for (const file of result.split('\0').filter(Boolean)) files.add(file);
  }
  return [...files];
}
function run(root,command,args) {
  const result = spawnSync(command,args,{cwd:root,stdio:'inherit',shell:process.platform === 'win32' && command === 'npm'});
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(command+' '+args.join(' ')+' failed (exit '+result.status+'). Push blocked.');
}
function main() {
  const root = git(process.cwd(),['rev-parse','--show-toplevel']);
  const updates = parseUpdates(fs.readFileSync(0,'utf8'));
  if (!updates.length) throw new Error('No push references received; refusing to skip validation.');
  // Test exactly the working tree being pushed, not a different branch or dirty checkout.
  const current = git(root,['rev-parse','HEAD']);
  const pushed = updates.filter(update => !ZERO.test(update.localSha));
  if (pushed.some(update => update.localSha !== current)) throw new Error('Check out the commit being pushed before running this gate.');
  if (git(root,['status','--porcelain'])) throw new Error('Working tree is not clean. Commit or preserve local changes before pushing.');
  const files = changedPaths(root,updates);
  const scope = classifyChanges(files);
  console.log('[pre-push] Changed paths: '+files.length+'; Victor: '+scope.victor+'; other apps/shared files: '+scope.other);
  if (scope.other) {
    console.log('[pre-push] Preserving the existing monorepo build gate.');
    run(root,'npm',['run','-s','build']);
  }
  if (scope.victor) {
    console.log('[pre-push] Validating Victor website.');
    run(root,'npm',['--prefix',SITE,'test']);
    run(root,'python',['-B',path.join(SITE,'tools/check-site.py')]);
  }
  console.log('[pre-push] OK');
}
module.exports = {parseUpdates,classifyChanges,changedPaths};
if (require.main === module) {
  try { main(); } catch (error) { console.error('[pre-push] '+error.message); process.exitCode=1; }
}
