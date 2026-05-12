#!/usr/bin/env node
/**
 * Ship — one-command flow that takes local changes from "edited" to "live".
 *
 * Replaces the three-step manual flow (git add + git commit + git push +
 * npm run deploy) with a single command. Run via: `npm run ship`
 *
 * What it does, in order:
 *   1. Show what's about to ship (git diff summary).
 *   2. Stage everything (git add -A).
 *   3. Commit with a timestamp-based message (override with -m "your msg").
 *   4. Push to origin/master (this also auto-triggers the news-fetch and
 *      kit-rebuild GitHub Actions workflows via their push:paths filters).
 *   5. Run scripts/deploy.mjs to build + ship the React app to gh-pages,
 *      preserving cron-managed files (news-latest.json, kit-latest.json,
 *      kit/).
 *
 * Exit codes:
 *   0 = full pipeline succeeded
 *   non-zero = stops at the failing step, prints what failed
 *
 * Usage:
 *   npm run ship
 *   npm run ship -- -m "feat: new banner layout"
 */

import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const args = process.argv.slice(2);
const mIdx = args.indexOf('-m');
const userMessage = mIdx >= 0 ? args[mIdx + 1] : null;

function sh(cmd, opts = {}) {
  return execSync(cmd, { stdio: 'inherit', encoding: 'utf8', ...opts });
}

function shCapture(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

console.log('═══════════════════════════════════════════════════════════════');
console.log('SHIP — git → push → deploy, in one command');
console.log('═══════════════════════════════════════════════════════════════');

// 1. Sanity check — must be in a git repo
if (!existsSync('.git')) {
  console.error('FATAL: not a git repository (no .git directory)');
  process.exit(1);
}

// 2. Show what's about to ship
console.log('\n[1/5] Changes since last commit:');
const status = shCapture('git status --short');
if (!status) {
  console.log('  (working tree is clean — nothing new to commit)');
  console.log('  …skipping commit + push, running deploy only.');
  console.log('\n[5/5] Running deploy...');
  sh('node scripts/deploy.mjs');
  process.exit(0);
}
console.log(status.split('\n').map(l => '  ' + l).join('\n'));

// 3. Stage all
console.log('\n[2/5] Staging all changes (git add -A)...');
sh('git add -A');

// 4. Build commit message
let commitMsg;
if (userMessage) {
  commitMsg = userMessage;
} else {
  const ts = new Date().toISOString().slice(0, 16).replace('T', ' ');
  const fileCount = status.split('\n').filter(Boolean).length;
  commitMsg = `chore: sync ${fileCount} file${fileCount === 1 ? '' : 's'} (${ts}Z)`;
}
console.log(`\n[3/5] Committing: "${commitMsg}"`);
try {
  sh(`git commit -m "${commitMsg.replace(/"/g, '\\"')}"`);
} catch {
  console.log('  (nothing to commit — possibly only whitespace changes)');
}

// 5. Push to origin/master
console.log('\n[4/5] Pushing to origin/master...');
console.log('  (this also auto-triggers fetch-news + build-weekly-kit workflows)');
sh('git push origin master');

// 6. Deploy the React app
console.log('\n[5/5] Deploying app to gh-pages (preserves cron-managed files)...');
sh('node scripts/deploy.mjs');

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('✅ Shipped.');
console.log('   Code:        https://github.com/alexyngcong/mics-social-media-engine');
console.log('   Live app:    https://alexyngcong.github.io/mics-social-media-engine/');
console.log('   Workflows:   https://github.com/alexyngcong/mics-social-media-engine/actions');
console.log('═══════════════════════════════════════════════════════════════');
