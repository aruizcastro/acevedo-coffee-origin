#!/usr/bin/env node
/*
 * Generates a print-ready QR code (PNG + SVG) for each lot in data/lots.json.
 *
 *   npm install            (once)
 *   npm run qr             all lots
 *   npm run qr -- ACV-2026-001                 one lot
 *   npm run qr -- --url=https://user.github.io/repo    override the site address
 *
 * The site address comes from "site_url" in data/farm.json unless --url is given.
 * Files are written to /qr as <lot id>.png and <lot id>.svg.
 */
'use strict';

const fs = require('fs');
const path = require('path');

let QRCode;
try {
  QRCode = require('qrcode');
} catch (err) {
  console.error('Missing dependency. Run "npm install" first.');
  process.exit(1);
}

const root = path.join(__dirname, '..');
const outDir = path.join(root, 'qr');
const args = process.argv.slice(2);

const urlArg = args.find((a) => a.startsWith('--url='));
const wantedIds = args.filter((a) => !a.startsWith('--')).map((a) => a.toUpperCase());

const farm = JSON.parse(fs.readFileSync(path.join(root, 'data', 'farm.json'), 'utf8'));
const lots = JSON.parse(fs.readFileSync(path.join(root, 'data', 'lots.json'), 'utf8')).lots || [];

const siteUrl = String(urlArg ? urlArg.slice('--url='.length) : farm.site_url || '').trim().replace(/\/+$/, '');

if (!/^https?:\/\//.test(siteUrl)) {
  console.error(
    'The site address is not set.\n' +
    'Set "site_url" in data/farm.json (e.g. https://user.github.io/repo)\n' +
    'or pass it directly: npm run qr -- --url=https://user.github.io/repo'
  );
  process.exit(1);
}

const selected = wantedIds.length
  ? lots.filter((lot) => wantedIds.includes(String(lot.id).toUpperCase()))
  : lots;

const unknown = wantedIds.filter((id) => !lots.some((lot) => String(lot.id).toUpperCase() === id));
if (unknown.length) {
  console.error('Not found in data/lots.json: ' + unknown.join(', '));
  process.exit(1);
}
if (!selected.length) {
  console.error('data/lots.json has no lots.');
  process.exit(1);
}

const options = {
  errorCorrectionLevel: 'M',
  margin: 2,
  color: { dark: '#21150d', light: '#ffffff' }
};

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  for (const lot of selected) {
    const url = `${siteUrl}/lot.html?id=${encodeURIComponent(lot.id)}`;
    const base = path.join(outDir, String(lot.id).replace(/[^\w.-]/g, '_'));
    await QRCode.toFile(`${base}.png`, url, { ...options, type: 'png', width: 1200 });
    fs.writeFileSync(`${base}.svg`, await QRCode.toString(url, { ...options, type: 'svg' }));
    console.log(`${lot.id}${lot.example ? ' (example)' : ''}  →  ${url}`);
  }
  console.log(`\n${selected.length} QR code(s) written to qr/`);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
