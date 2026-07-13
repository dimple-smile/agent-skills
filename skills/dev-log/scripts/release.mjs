// Release script for @dev-log/cli.
//
// Supports prerelease (beta) and stable releases using npm dist-tags so beta
// and latest coexist on the registry.
//
//   pnpm run release --tag beta              # 1.0.0-beta.1 → beta.2 → ...
//   pnpm run release                          # 1.0.0-beta.2 → 1.0.0 (stable)
//   pnpm run release --tag beta --target 1.1.0   # → 1.1.0-beta.1
//   pnpm run release --tag beta --dry-run     # show what would happen, no publish
//
// Flow: build → write version into dist/package.json → npm publish dist/.
// The source package.json is NOT modified by release — it stays clean.
//
import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

const TAG_FLAG = '--tag';
const TARGET_FLAG = '--target';
const DRY_RUN_FLAG = '--dry-run';

function parseArgs(argv) {
  const args = argv.slice(2);
  const get = (flag) => {
    const i = args.indexOf(flag);
    return i >= 0 && args[i + 1] ? args[i + 1] : null;
  };
  return {
    tag: get(TAG_FLAG),
    target: get(TARGET_FLAG),
    dryRun: args.includes(DRY_RUN_FLAG),
  };
}

function run(cmd, opts = {}) {
  if (opts.stdio === 'inherit') {
    execSync(cmd, opts);
    return '';
  }
  return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], ...opts }).trim();
}

function readPkg(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

/** Query npm for all published versions of the package. Returns [] if none. */
function getPublishedVersions(pkgName) {
  try {
    const out = run(`npm view ${pkgName} versions --json`);
    return JSON.parse(out);
  } catch {
    return [];
  }
}

function parseSemver(v) {
  const m = v.match(/^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/);
  if (!m) return null;
  const prerelease = m[4] ? m[4].split('.').map((p) => (/^\d+$/.test(p) ? Number(p) : p)) : [];
  return { major: +m[1], minor: +m[2], patch: +m[3], prerelease };
}

function formatSemver({ major, minor, patch, prerelease }) {
  const base = `${major}.${minor}.${patch}`;
  return prerelease.length ? `${base}-${prerelease.join('.')}` : base;
}

/**
 * Determine the next version to publish.
 *
 * Beta mode: bump or create a prerelease on the target base version.
 * Stable mode: strip the prerelease suffix from the current version.
 */
function resolveVersion(opts, currentVersion) {
  const current = parseSemver(currentVersion);
  if (!current) {
    throw new Error(`invalid version in package.json: ${currentVersion}`);
  }

  // --- Stable release: publish the current source version as-is ---
  if (!opts.tag) {
    return formatSemver(current);
  }

  // --- Prerelease (beta) ---
  const baseVersion = opts.target
    ? parseSemver(opts.target)
    : { major: current.major, minor: current.minor, patch: current.patch, prerelease: [] };

  if (!baseVersion) {
    throw new Error(`invalid --target version: ${opts.target}`);
  }

  const published = getPublishedVersions(PKG_NAME);
  const baseStr = formatSemver(baseVersion);
  const betaPattern = new RegExp(`^${baseStr.replace(/\./g, '\\.')}-${opts.tag}\\.(\\d+)$`);
  let maxBeta = 0;
  for (const v of published) {
    const m = v.match(betaPattern);
    if (m) maxBeta = Math.max(maxBeta, +m[1]);
  }

  return formatSemver({ ...baseVersion, prerelease: [opts.tag, maxBeta + 1] });
}

/** Check npm login; exit with guidance if not authenticated. */
function checkAuth() {
  try {
    run('npm whoami');
  } catch {
    console.error('error: not logged in to npm. Run "npm login" first.');
    process.exit(1);
  }
}

const PKG_NAME = '@dev-log/cli';

function main() {
  const opts = parseArgs(process.argv);
  const srcPkg = readPkg('package.json');

  const nextVersion = resolveVersion(opts, srcPkg.version);
  const isBeta = !!opts.tag;

  console.log(`\n  package:  ${srcPkg.name}`);
  console.log(`  current:  ${srcPkg.version}`);
  console.log(`  publish:  ${nextVersion}${isBeta ? `  (dist-tag: ${opts.tag})` : '  (dist-tag: latest)'}${opts.dryRun ? '  [DRY RUN]' : ''}\n`);

  if (opts.dryRun) {
    console.log('(dry run — no build, no version write, no publish)\n');
    return;
  }

  // 1. Pre-flight: typecheck + tests must pass before we build anything.
  console.log('• typechecking...');
  run('npx tsc --noEmit', { stdio: 'inherit' });
  console.log('✓ typecheck passed');

  // 2. Build first — tests depend on dist/cli.cjs.
  console.log('• building...');
  run('pnpm run build', { stdio: 'inherit' });
  console.log('✓ build complete');

  console.log('• running tests...');
  run('pnpm run test', { stdio: 'inherit' });
  console.log('✓ tests passed');

  // 3. Write the release version into dist/package.json (the package that
  //    actually gets published). Source package.json stays untouched.
  const distPkgPath = 'dist/package.json';
  const distPkg = readPkg(distPkgPath);
  distPkg.version = nextVersion;
  writeFileSync(distPkgPath, JSON.stringify(distPkg, null, 2) + '\n');
  console.log(`✓ set dist/package.json version → ${nextVersion}`);

  // 4. Check auth
  checkAuth();

  // 5. Publish from dist/ — must run inside dist/ so npm reads the dist
  //    package.json as the package root (not the repo root).
  const tagArg = isBeta ? ` --tag ${opts.tag}` : '';
  console.log(`• publishing...`);
  run(`npm publish${tagArg}`, { cwd: 'dist', stdio: 'inherit' });
  console.log(`✓ published ${nextVersion}${isBeta ? ` as @${opts.tag}` : ' as @latest'}`);

  // 6. Git tag
  const tagName = `v${nextVersion}`;
  try {
    run(`git tag ${tagName}`);
    console.log(`✓ git tag ${tagName}`);
  } catch {
    console.log(`⊘ git tag ${tagName} skipped (already exists or git error)`);
  }

  console.log(`\nDone. ${srcPkg.name}@${nextVersion} is live.\n`);
  if (isBeta) {
    console.log(`  install: npx @dev-log/cli@${opts.tag}`);
    console.log(`  next:    pnpm run release ${opts.tag === 'beta' ? '' : `--tag ${opts.tag} `}(again) to bump, or "pnpm run release" for stable.\n`);
  }
}

main();
