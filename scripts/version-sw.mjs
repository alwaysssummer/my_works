import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const template = readFileSync(resolve(root, 'public/sw.template.js'), 'utf-8');

// Vercel 배포: VERCEL_GIT_COMMIT_SHA, 로컬: 타임스탬프
const version = process.env.VERCEL_GIT_COMMIT_SHA || Date.now().toString();

const output = template.replace('__BUILD_TIMESTAMP__', version);

writeFileSync(resolve(root, 'public/sw.js'), output, 'utf-8');

console.log(`[version-sw] sw.js generated (version: ${version})`);
