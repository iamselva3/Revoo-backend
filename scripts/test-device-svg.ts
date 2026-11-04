import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

function createSmartphoneSvg({
  brand,
  model,
  accentColor,
  frameColor,
  screenGradient,
  cameraType = 'punch_hole', // 'dynamic_island' | 'punch_hole' | 'visor' | 'glyph'
  isSharpCorner = false,
}: {
  brand: string;
  model: string;
  accentColor: string;
  frameColor: string;
  screenGradient: [string, string];
  cameraType?: 'dynamic_island' | 'punch_hole' | 'visor' | 'glyph';
  isSharpCorner?: boolean;
}) {
  const cornerRadius = isSharpCorner ? 8 : 42;
  const screenCornerRadius = isSharpCorner ? 4 : 32;

  let cameraElement = '';
  if (cameraType === 'dynamic_island') {
    cameraElement = `
      <!-- Dynamic Island -->
      <rect x="155" y="44" width="90" height="26" rx="13" fill="#000000" />
      <circle cx="172" cy="57" r="5" fill="#111827" />
      <circle cx="173" cy="56" r="2" fill="#1E3A8A" opacity="0.6" />
      <circle cx="225" cy="57" r="6" fill="#080C14" />
      <circle cx="226" cy="56" r="2.5" fill="#1E293B" />
    `;
  } else if (cameraType === 'punch_hole') {
    cameraElement = `
      <!-- Center Punch Hole Camera -->
      <circle cx="200" cy="50" r="7" fill="#000000" />
      <circle cx="200" cy="50" r="4" fill="#0A0F1D" />
      <circle cx="201" cy="49" r="1.5" fill="#3B82F6" opacity="0.7" />
    `;
  }

  // Brand-specific rear camera module preview in the background (showing off the back aesthetics)
  let backAccent = '';
  if (cameraType === 'dynamic_island') {
    // Apple 3-lens triangle camera bump
    backAccent = `
      <g opacity="0.18" transform="translate(60, 48) scale(0.65)">
        <rect x="0" y="0" width="130" height="130" rx="36" fill="${frameColor}" stroke="#FFFFFF" stroke-width="2"/>
        <circle cx="42" cy="42" r="26" fill="#111827" stroke="${accentColor}" stroke-width="4"/>
        <circle cx="42" cy="88" r="26" fill="#111827" stroke="${accentColor}" stroke-width="4"/>
        <circle cx="88" cy="65" r="26" fill="#111827" stroke="${accentColor}" stroke-width="4"/>
      </g>
    `;
  } else if (brand.toLowerCase() === 'samsung') {
    // Samsung vertical 3/4 lens stack
    backAccent = `
      <g opacity="0.18" transform="translate(48, 50) scale(0.6)">
        <circle cx="30" cy="30" r="22" fill="#111827" stroke="${accentColor}" stroke-width="4"/>
        <circle cx="30" cy="85" r="22" fill="#111827" stroke="${accentColor}" stroke-width="4"/>
        <circle cx="30" cy="140" r="22" fill="#111827" stroke="${accentColor}" stroke-width="4"/>
        <circle cx="30" cy="195" r="14" fill="#111827" stroke="${accentColor}" stroke-width="3"/>
      </g>
    `;
  } else if (brand.toLowerCase() === 'nothing') {
    // Nothing glyph strips
    backAccent = `
      <g opacity="0.25" stroke="#FFFFFF" stroke-width="3" fill="none">
        <circle cx="200" cy="270" r="85" stroke-dasharray="8 6"/>
        <path d="M 120 70 L 160 70 A 30 30 0 0 1 190 100 L 190 130" />
        <path d="M 280 70 L 240 70 A 30 30 0 0 0 210 100 L 210 130" />
        <line x1="200" y1="450" x2="200" y2="480" stroke-width="5"/>
      </g>
    `;
  } else if (brand.toLowerCase() === 'vivo') {
    // Big circular Zeiss camera ring
    backAccent = `
      <g opacity="0.22" transform="translate(130, 60)">
        <circle cx="70" cy="70" r="60" fill="#1E293B" stroke="${accentColor}" stroke-width="5"/>
        <circle cx="50" cy="55" r="16" fill="#0F172A"/>
        <circle cx="90" cy="55" r="16" fill="#0F172A"/>
        <circle cx="70" cy="95" r="16" fill="#0F172A"/>
        <text x="70" y="73" font-size="10" fill="#3B82F6" font-weight="bold" text-anchor="middle" font-family="sans-serif">ZEISS</text>
      </g>
    `;
  }

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 560" width="400" height="560">
      <defs>
        <linearGradient id="frameGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${frameColor}" />
          <stop offset="50%" stop-color="#334155" />
          <stop offset="100%" stop-color="${frameColor}" />
        </linearGradient>
        <linearGradient id="screenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${screenGradient[0]}" />
          <stop offset="100%" stop-color="${screenGradient[1]}" />
        </linearGradient>
        <linearGradient id="glassReflection" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.35" />
          <stop offset="35%" stop-color="#FFFFFF" stop-opacity="0.08" />
          <stop offset="70%" stop-color="#FFFFFF" stop-opacity="0.0" />
        </linearGradient>
        <filter id="phoneShadow" x="-10%" y="-5%" width="120%" height="115%">
          <feDropShadow dx="0" dy="16" stdDeviation="20" flood-color="#0F172A" flood-opacity="0.22"/>
          <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#0F172A" flood-opacity="0.12"/>
        </filter>
      </defs>

      <!-- Soft Drop Shadow on White / Canvas -->
      <rect x="75" y="22" width="250" height="500" rx="${cornerRadius}" fill="#000000" filter="url(#phoneShadow)" />

      <!-- Outer Metallic Chassis Frame -->
      <rect x="75" y="20" width="250" height="500" rx="${cornerRadius}" fill="url(#frameGrad)" stroke="#64748B" stroke-width="2.5" />

      <!-- Bezel Screen Border -->
      <rect x="83" y="28" width="234" height="484" rx="${screenCornerRadius}" fill="#050811" />

      <!-- Active Display Screen -->
      <rect x="86" y="31" width="228" height="478" rx="${screenCornerRadius - 2}" fill="url(#screenGrad)" />

      <!-- Brand Distinctive Back Graphic / Watermark in Screen -->
      ${backAccent}

      <!-- Diagonal Glass Luster Reflection -->
      <path d="M 86 31 L 280 31 L 86 320 Z" fill="url(#glassReflection)" />

      <!-- Front Camera / Dynamic Island -->
      ${cameraElement}

      <!-- Speaker Earpiece Slit -->
      <rect x="180" y="24" width="40" height="3" rx="1.5" fill="#475569" />

      <!-- Home Bar Indicator Indicator at Bottom -->
      <rect x="155" y="494" width="90" height="4" rx="2" fill="#FFFFFF" opacity="0.75" />

      <!-- Subtle Device Badge Tag on Screen -->
      <g transform="translate(200, 430)">
        <text text-anchor="middle" font-size="12" font-weight="800" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" fill="#FFFFFF" letter-spacing="1">
          ${brand.toUpperCase()}
        </text>
        <text y="16" text-anchor="middle" font-size="10" font-weight="600" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" fill="#CBD5E1" opacity="0.9">
          ${model}
        </text>
      </g>
    </svg>
  `;
}

async function run() {
  const testSvg = createSmartphoneSvg({
    brand: 'Apple',
    model: 'iPhone 15 Pro',
    accentColor: '#93C5FD',
    frameColor: '#64748B',
    screenGradient: ['#1E1B4B', '#0284C7'],
    cameraType: 'dynamic_island',
  });

  const outDir = path.resolve('uploads/devices');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  await sharp(Buffer.from(testSvg))
    .png()
    .toFile(path.join(outDir, 'iphone-15-pro.png'));

  console.log('Saved test iphone-15-pro.png successfully!');
}

run();

