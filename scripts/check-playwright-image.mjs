#!/usr/bin/env node
// CI's e2e job runs in Microsoft's Playwright image, pinned by digest in .github/workflows/ci.yml with its tag in a
// comment beside it:
//
//   image: mcr.microsoft.com/playwright@sha256:<digest> # v<version>-<ubuntu>
//
// The image holds the browsers of one Playwright version. This fails when that version is not exactly the
// @playwright/test that package-lock.json installs, so a bump of one without the other is caught by the check, not by
// a browser that will not start. It also fails when the image is named by a tag instead of a digest, or more than once.
//
//   node scripts/check-playwright-image.mjs
import { readFileSync } from 'node:fs';

const workflow = '.github/workflows/ci.yml';
const text = readFileSync(workflow, 'utf8');
const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
const locked = lock.packages?.['node_modules/@playwright/test']?.version;

const named = text.split('\n').filter((line) => /^\s*image:.*mcr\.microsoft\.com\/playwright\b/.test(line));
const pinned = named
  .map((line) => line.match(/image:\s*mcr\.microsoft\.com\/playwright@sha256:[0-9a-f]{64}\s+#\s*v(\d+\.\d+\.\d+)-([a-z]+)\s*$/))
  .filter(Boolean);

const problems = [];
if (!locked) problems.push('package-lock.json has no node_modules/@playwright/test');
if (named.length !== 1) problems.push(`${workflow} names the Playwright image ${named.length} times; it should name it once`);
if (pinned.length !== named.length) {
  problems.push(`${workflow} must name the image by its digest, with "# v<version>-<ubuntu>" beside it`);
}
const tagged = pinned[0]?.[1];
if (tagged && locked && tagged !== locked) {
  problems.push(`the image is Playwright ${tagged}, package-lock.json installs @playwright/test ${locked}`);
}

console.log(`Playwright image in ${workflow}: ${pinned[0] ? `v${tagged}-${pinned[0][2]}` : 'not found'}`);
console.log(`@playwright/test in package-lock.json: ${locked ?? 'not found'}`);
if (problems.length) {
  for (const problem of problems) console.log(`::error title=Playwright image::${problem}`);
  console.log('Change both together: the tag, its digest (docker buildx imagetools inspect mcr.microsoft.com/playwright:<tag>) and the lock.');
  process.exit(1);
}
console.log('They match.');
