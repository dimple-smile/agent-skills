// After pkgroll bundles dist/cli.cjs, emit a lean dist/package.json for the
// published package. The bundled file is self-contained (localtunnel & cac are
// inlined), so the published package has ZERO runtime dependencies — this
// means `npx @dev-log/cli` installs nothing extra.
//
// We derive the fields from the root package.json so there's a single source
// of truth, then strip everything dev-only and fix paths to be relative to
// dist/ (since this package.json lives inside dist/).
import { readFileSync, writeFileSync, copyFileSync } from 'fs';

const root = JSON.parse(readFileSync('package.json', 'utf8'));

// Strip the ./dist/ prefix from paths. npm's bin field does NOT accept a
// leading "./" (it silently removes the bin entry as "invalid"), so we strip
// it entirely: "./dist/cli.cjs" → "cli.cjs".
const stripDist = (p) => p.replace('./dist/', '').replace(/^\.\//, '');

const binKey = Object.keys(root.bin)[0];

const published = {
  name: root.name,
  version: root.version,
  description: root.description,
  bin: { [binKey]: stripDist(Object.values(root.bin)[0]) },
  main: stripDist(root.main),
  // Crucial: no "dependencies" field. The bundle is self-contained.
  // No "devDependencies" — those are only for the source repo.
  // No "scripts" — the published package is run, not developed.
  files: ['cli.cjs', 'README.md'],
  keywords: root.keywords,
  license: root.license,
  publishConfig: root.publishConfig,
};

writeFileSync('dist/package.json', JSON.stringify(published, null, 2) + '\n');

// Copy README.md so npm displays it on the package page.
// (npm only reads README from the package root, i.e. dist/.)
// SKILL.md is NOT included — skills are installed separately via "npx skills add".
copyFileSync('README.md', 'dist/README.md');

console.log('postbuild: dist/package.json + README.md (zero dependencies)');
