#!/usr/bin/env node
/**
 * Deploy script — overlays vite build onto gh-pages without wiping
 * cron-generated files.
 *
 * Cron-managed files that MUST survive every deploy:
 *   - news-latest.json     (fetch-news.yml writes this every 4 hours)
 *   - kit-latest.json      (build-weekly-kit.yml writes this weekly)
 *   - kit/                 (build-weekly-kit.yml writes 14 banner+caption files)
 *
 * Strategy:
 *   1. Build with vite as normal → dist/
 *   2. Worktree-checkout origin/gh-pages into .gh-pages-tmp/
 *   3. Save the cron-managed files out of the worktree (always preserved).
 *   4. Copy dist/* on top of the worktree (overwrite app files).
 *   5. Restore the cron-managed files (they win over any seed shipped in dist).
 *   6. Commit + push.
 *
 * Run via: npm run deploy
 */

import { execSync } from 'node:child_process';
import { existsSync, cpSync, rmSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const WORKTREE = '.gh-pages-tmp';

function sh(cmd, opts = {}) {
  return execSync(cmd, { stdio: 'inherit', ...opts });
}

function safeRm(path) {
  if (existsSync(path)) {
    rmSync(path, { recursive: true, force: true });
  }
}

console.log('═══════════════════════════════════════════════════════════════');
console.log('MICS app deploy — preserves cron-managed gh-pages content');
console.log('═══════════════════════════════════════════════════════════════');

// 1. Build
console.log('\n[1/5] Building app...');
sh('npx vite build');

if (!existsSync('dist')) {
  console.error('FATAL: vite build did not produce dist/');
  process.exit(1);
}

// 2. Worktree checkout of gh-pages
console.log('\n[2/5] Preparing gh-pages worktree...');
try { sh(`git worktree remove --force ${WORKTREE}`); } catch { /* not present */ }
safeRm(WORKTREE);

try {
  sh('git fetch origin gh-pages');
  sh(`git worktree add -B gh-pages ${WORKTREE} origin/gh-pages`);
} catch (e) {
  console.log('gh-pages branch does not exist on origin yet — creating fresh');
  sh(`git worktree add -B gh-pages ${WORKTREE} HEAD`);
  // Wipe HEAD content since this is a fresh gh-pages
  for (const f of readdirSync(WORKTREE)) {
    if (f === '.git') continue;
    safeRm(join(WORKTREE, f));
  }
}

// 3. Stash cron-managed files so they survive the overlay
console.log('\n[3/5] Stashing cron-managed files...');
const PRESERVE = ['news-latest.json', 'kit-latest.json', 'kit'];
const stash = {};
for (const name of PRESERVE) {
  const src = join(WORKTREE, name);
  if (existsSync(src)) {
    const tmp = `.deploy-stash-${name.replace(/[^a-z0-9]/gi, '-')}`;
    safeRm(tmp);
    cpSync(src, tmp, { recursive: true });
    stash[name] = tmp;
    console.log(`  ↻ stashed gh-pages/${name}`);
  }
}

// 4. Overlay dist contents on top of worktree
console.log('\n[4/6] Overlaying app build on top of worktree...');
const distFiles = readdirSync('dist');
console.log(`  app files to deploy: ${distFiles.join(', ')}`);

for (const f of distFiles) {
  const src = join('dist', f);
  const dst = join(WORKTREE, f);
  safeRm(dst);
  cpSync(src, dst, { recursive: true });
}

// 5. Restore the stashed cron-managed files — they win over any seed in dist
console.log('\n[5/6] Restoring cron-managed files...');
for (const [name, tmp] of Object.entries(stash)) {
  const dst = join(WORKTREE, name);
  safeRm(dst);
  cpSync(tmp, dst, { recursive: true });
  safeRm(tmp);
  console.log(`  ✓ restored gh-pages/${name} (cron version preserved)`);
}

// 6. Commit
console.log('\n[6/6] Committing changes...');
sh(`git -C ${WORKTREE} add -A`);

let hasChanges = false;
try {
  execSync(`git -C ${WORKTREE} diff --cached --quiet`, { stdio: 'ignore' });
} catch {
  hasChanges = true;
}

if (!hasChanges) {
  console.log('  no changes — skipping commit');
} else {
  const stamp = new Date().toISOString().slice(0, 19).replace('T', ' ') + 'Z';
  sh(`git -C ${WORKTREE} -c user.name="deploy" -c user.email="deploy@local" commit -m "deploy ${stamp}"`);
  sh(`git -C ${WORKTREE} push origin gh-pages`);
}

// Cleanup
console.log('\nCleaning up worktree...');
try { sh(`git worktree remove --force ${WORKTREE}`); } catch { /* ignore */ }
safeRm(WORKTREE);

console.log('\n✅ Deploy complete.');
console.log('   App: https://alexyngcong.github.io/mics-social-media-engine/');
console.log('   Weekly Kit opens inside the app via the gold CTA on the home screen.');
