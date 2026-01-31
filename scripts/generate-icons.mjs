import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const publicDir = join(__dirname, '..', 'public', 'icons');

const svgPath = join(publicDir, 'icon.svg');
const svg = readFileSync(svgPath);

// Generate 192x192
await sharp(svg)
  .resize(192, 192)
  .png()
  .toFile(join(publicDir, 'icon-192.png'));

console.log('Generated icon-192.png');

// Generate 512x512
await sharp(svg)
  .resize(512, 512)
  .png()
  .toFile(join(publicDir, 'icon-512.png'));

console.log('Generated icon-512.png');

console.log('Done!');
