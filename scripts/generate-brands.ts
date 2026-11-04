import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { StorageService } from '../src/infrastructure/storage/StorageService.js';

const outDir = path.resolve('uploads/brands');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

async function run() {
  const brands = [
    { name: 'apple', url: 'https://cdn.simpleicons.org/apple/000000' },
    { name: 'samsung', url: 'https://cdn.simpleicons.org/samsung/1428A0' },
    { name: 'oneplus', url: 'https://cdn.simpleicons.org/oneplus/EB0028' },
    { name: 'google', url: 'https://cdn.simpleicons.org/google' },
    { name: 'vivo', url: 'https://cdn.simpleicons.org/vivo/0057FF' },
    { name: 'oppo', url: 'https://cdn.simpleicons.org/oppo/008234' },
    { name: 'nothing', url: 'https://upload.wikimedia.org/wikipedia/commons/3/30/Nothing.svg' },
    { name: 'redmi', url: 'https://upload.wikimedia.org/wikipedia/commons/f/f9/REDMI_logo.svg' },
    { name: 'realme', url: 'https://upload.wikimedia.org/wikipedia/commons/0/03/Realme_2024_logo.svg' },
    { name: 'iqoo', url: 'https://upload.wikimedia.org/wikipedia/commons/a/aa/IQOO_logo.svg' }
  ];

  for (const b of brands) {
    try {
      const res = await fetch(b.url, { headers: { 'User-Agent': 'Mozilla/5.0 Revoo/1.0' } });
      const svgText = await res.text();
      const svgBuffer = Buffer.from(svgText);
      const outPath = path.join(outDir, `${b.name}.png`);
      
      await sharp(svgBuffer, { density: 300 })
        .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toFile(outPath);
      
      console.log(`Generated ${b.name}.png (${fs.statSync(outPath).size} bytes)`);

      // Upload to Cloudflare R2
      const r2Url = await StorageService.uploadToR2(`brands/${b.name}.png`, outPath, 'image/png');
      console.log(`  -> R2 URL: ${r2Url}`);
    } catch (err: any) {
      console.error(`Failed ${b.name}:`, err.message);
    }
  }
}

run();

