import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { StorageService } from '../src/infrastructure/storage/StorageService.js';

interface DeviceSpec {
  slug: string;
  brand: string;
  model: string;
  accentColor: string;
  frameColor: string;
  screenGradient: [string, string];
  cameraType: 'dynamic_island' | 'punch_hole' | 'punch_hole_corner' | 'visor' | 'glyph' | 'circle_module';
  isSharpCorner?: boolean;
  foldHinge?: boolean;
}

const devices: DeviceSpec[] = [
  // Apple
  {
    slug: 'iphone-15-pro-max',
    brand: 'Apple',
    model: 'iPhone 15 Pro Max',
    accentColor: '#94A3B8',
    frameColor: '#475569',
    screenGradient: ['#0F172A', '#1E293B'],
    cameraType: 'dynamic_island',
  },
  {
    slug: 'iphone-15-pro',
    brand: 'Apple',
    model: 'iPhone 15 Pro',
    accentColor: '#60A5FA',
    frameColor: '#334155',
    screenGradient: ['#0B192C', '#1E3E62'],
    cameraType: 'dynamic_island',
  },
  {
    slug: 'iphone-15',
    brand: 'Apple',
    model: 'iPhone 15',
    accentColor: '#34D399',
    frameColor: '#059669',
    screenGradient: ['#064E3B', '#047857'],
    cameraType: 'dynamic_island',
  },
  {
    slug: 'iphone-14-pro',
    brand: 'Apple',
    model: 'iPhone 14 Pro',
    accentColor: '#C084FC',
    frameColor: '#581C87',
    screenGradient: ['#2E1065', '#581C87'],
    cameraType: 'dynamic_island',
  },
  {
    slug: 'iphone-14',
    brand: 'Apple',
    model: 'iPhone 14',
    accentColor: '#38BDF8',
    frameColor: '#0284C7',
    screenGradient: ['#082F49', '#0369A1'],
    cameraType: 'dynamic_island',
  },
  {
    slug: 'iphone-13',
    brand: 'Apple',
    model: 'iPhone 13',
    accentColor: '#F43F5E',
    frameColor: '#BE123C',
    screenGradient: ['#4C0519', '#9F1239'],
    cameraType: 'dynamic_island',
  },

  // Samsung
  {
    slug: 'galaxy-s24-ultra',
    brand: 'Samsung',
    model: 'Galaxy S24 Ultra',
    accentColor: '#E2E8F0',
    frameColor: '#1E293B',
    screenGradient: ['#090D16', '#1E293B'],
    cameraType: 'punch_hole',
    isSharpCorner: true,
  },
  {
    slug: 'galaxy-s24-plus',
    brand: 'Samsung',
    model: 'Galaxy S24+',
    accentColor: '#818CF8',
    frameColor: '#3730A3',
    screenGradient: ['#1E1B4B', '#312E81'],
    cameraType: 'punch_hole',
  },
  {
    slug: 'galaxy-s24',
    brand: 'Samsung',
    model: 'Galaxy S24',
    accentColor: '#FBBF24',
    frameColor: '#78350F',
    screenGradient: ['#451A03', '#78350F'],
    cameraType: 'punch_hole',
  },
  {
    slug: 'galaxy-s23-ultra',
    brand: 'Samsung',
    model: 'Galaxy S23 Ultra',
    accentColor: '#10B981',
    frameColor: '#064E3B',
    screenGradient: ['#022C22', '#064E3B'],
    cameraType: 'punch_hole',
    isSharpCorner: true,
  },
  {
    slug: 'galaxy-z-fold-5',
    brand: 'Samsung',
    model: 'Galaxy Z Fold 5',
    accentColor: '#38BDF8',
    frameColor: '#0369A1',
    screenGradient: ['#082F49', '#0C4A6E'],
    cameraType: 'punch_hole',
    foldHinge: true,
  },
  {
    slug: 'galaxy-z-flip-5',
    brand: 'Samsung',
    model: 'Galaxy Z Flip 5',
    accentColor: '#A7F3D0',
    frameColor: '#047857',
    screenGradient: ['#022C22', '#065F46'],
    cameraType: 'punch_hole',
    foldHinge: true,
  },

  // Vivo
  {
    slug: 'vivo-x100-pro',
    brand: 'Vivo',
    model: 'Vivo X100 Pro',
    accentColor: '#F97316',
    frameColor: '#7C2D12',
    screenGradient: ['#431407', '#9A3412'],
    cameraType: 'circle_module',
  },
  {
    slug: 'vivo-v30-pro',
    brand: 'Vivo',
    model: 'Vivo V30 Pro',
    accentColor: '#06B6D4',
    frameColor: '#0E7490',
    screenGradient: ['#083344', '#155E75'],
    cameraType: 'punch_hole',
  },
  {
    slug: 'vivo-v29-5g',
    brand: 'Vivo',
    model: 'Vivo V29 5G',
    accentColor: '#38BDF8',
    frameColor: '#0284C7',
    screenGradient: ['#082F49', '#075985'],
    cameraType: 'punch_hole',
  },
  {
    slug: 'vivo-t3-5g',
    brand: 'Vivo',
    model: 'Vivo T3 5G',
    accentColor: '#3B82F6',
    frameColor: '#1D4ED8',
    screenGradient: ['#172554', '#1E40AF'],
    cameraType: 'punch_hole',
  },

  // Oppo
  {
    slug: 'oppo-find-x7-ultra',
    brand: 'Oppo',
    model: 'Find X7 Ultra',
    accentColor: '#D97706',
    frameColor: '#451A03',
    screenGradient: ['#291402', '#5A2E05'],
    cameraType: 'circle_module',
  },
  {
    slug: 'oppo-reno-11-pro',
    brand: 'Oppo',
    model: 'Reno 11 Pro',
    accentColor: '#E2E8F0',
    frameColor: '#475569',
    screenGradient: ['#0F172A', '#1E293B'],
    cameraType: 'punch_hole',
  },
  {
    slug: 'oppo-f25-pro-5g',
    brand: 'Oppo',
    model: 'Oppo F25 Pro 5G',
    accentColor: '#EF4444',
    frameColor: '#991B1B',
    screenGradient: ['#450A0A', '#7F1D1D'],
    cameraType: 'punch_hole',
  },

  // Nothing
  {
    slug: 'nothing-phone-2',
    brand: 'Nothing',
    model: 'Nothing Phone (2)',
    accentColor: '#FFFFFF',
    frameColor: '#1E293B',
    screenGradient: ['#050811', '#111827'],
    cameraType: 'glyph',
  },
  {
    slug: 'nothing-phone-2a',
    brand: 'Nothing',
    model: 'Nothing Phone (2a)',
    accentColor: '#CBD5E1',
    frameColor: '#0F172A',
    screenGradient: ['#090D16', '#1E293B'],
    cameraType: 'glyph',
  },
  {
    slug: 'nothing-phone-1',
    brand: 'Nothing',
    model: 'Nothing Phone (1)',
    accentColor: '#E2E8F0',
    frameColor: '#334155',
    screenGradient: ['#020617', '#0F172A'],
    cameraType: 'glyph',
  },

  // Redmi
  {
    slug: 'redmi-note-13-pro-plus',
    brand: 'Redmi',
    model: 'Redmi Note 13 Pro+ 5G',
    accentColor: '#A855F7',
    frameColor: '#6B21A8',
    screenGradient: ['#3B0764', '#581C87'],
    cameraType: 'punch_hole',
  },
  {
    slug: 'redmi-note-13-pro',
    brand: 'Redmi',
    model: 'Redmi Note 13 Pro',
    accentColor: '#14B8A6',
    frameColor: '#0F766E',
    screenGradient: ['#042F2E', '#115E59'],
    cameraType: 'punch_hole',
  },
  {
    slug: 'redmi-13c-5g',
    brand: 'Redmi',
    model: 'Redmi 13C 5G',
    accentColor: '#10B981',
    frameColor: '#047857',
    screenGradient: ['#022C22', '#064E3B'],
    cameraType: 'punch_hole',
  },

  // Realme
  {
    slug: 'realme-12-pro-plus',
    brand: 'Realme',
    model: 'Realme 12 Pro+ 5G',
    accentColor: '#3B82F6',
    frameColor: '#1E3A8A',
    screenGradient: ['#172554', '#1E3A8A'],
    cameraType: 'circle_module',
  },
  {
    slug: 'realme-gt-6t',
    brand: 'Realme',
    model: 'Realme GT 6T',
    accentColor: '#94A3B8',
    frameColor: '#334155',
    screenGradient: ['#0B192C', '#1E293B'],
    cameraType: 'punch_hole',
  },
  {
    slug: 'realme-narzo-70-pro',
    brand: 'Realme',
    model: 'Realme Narzo 70 Pro',
    accentColor: '#22C55E',
    frameColor: '#15803D',
    screenGradient: ['#052E16', '#14532D'],
    cameraType: 'circle_module',
  },

  // iQOO
  {
    slug: 'iqoo-12-5g',
    brand: 'iQOO',
    model: 'iQOO 12 5G',
    accentColor: '#EF4444',
    frameColor: '#1E293B',
    screenGradient: ['#0A0A0A', '#1C1917'],
    cameraType: 'circle_module',
  },
  {
    slug: 'iqoo-neo-9-pro',
    brand: 'iQOO',
    model: 'iQOO Neo 9 Pro',
    accentColor: '#DC2626',
    frameColor: '#7F1D1D',
    screenGradient: ['#450A0A', '#991B1B'],
    cameraType: 'punch_hole',
  },
  {
    slug: 'iqoo-z9-5g',
    brand: 'iQOO',
    model: 'iQOO Z9 5G',
    accentColor: '#10B981',
    frameColor: '#065F46',
    screenGradient: ['#022C22', '#047857'],
    cameraType: 'punch_hole',
  },

  // OnePlus
  {
    slug: 'oneplus-12',
    brand: 'OnePlus',
    model: 'OnePlus 12',
    accentColor: '#10B981',
    frameColor: '#064E3B',
    screenGradient: ['#022C22', '#065F46'],
    cameraType: 'circle_module',
  },
  {
    slug: 'oneplus-12r',
    brand: 'OnePlus',
    model: 'OnePlus 12R',
    accentColor: '#38BDF8',
    frameColor: '#0369A1',
    screenGradient: ['#082F49', '#075985'],
    cameraType: 'circle_module',
  },
  {
    slug: 'oneplus-nord-4',
    brand: 'OnePlus',
    model: 'OnePlus Nord 4',
    accentColor: '#94A3B8',
    frameColor: '#475569',
    screenGradient: ['#0F172A', '#1E293B'],
    cameraType: 'punch_hole',
  },

  // Google
  {
    slug: 'pixel-8-pro',
    brand: 'Google',
    model: 'Pixel 8 Pro',
    accentColor: '#38BDF8',
    frameColor: '#0284C7',
    screenGradient: ['#082F49', '#0369A1'],
    cameraType: 'visor',
  },
  {
    slug: 'pixel-8',
    brand: 'Google',
    model: 'Pixel 8',
    accentColor: '#F43F5E',
    frameColor: '#BE123C',
    screenGradient: ['#4C0519', '#881337'],
    cameraType: 'visor',
  },
  {
    slug: 'pixel-7a',
    brand: 'Google',
    model: 'Pixel 7a',
    accentColor: '#2DD4BF',
    frameColor: '#0F766E',
    screenGradient: ['#042F2E', '#115E59'],
    cameraType: 'visor',
  },
];

function generateDeviceSvg(dev: DeviceSpec) {
  const cornerRadius = dev.isSharpCorner ? 10 : 44;
  const screenCornerRadius = dev.isSharpCorner ? 5 : 34;

  let cameraElement = '';
  if (dev.cameraType === 'dynamic_island') {
    cameraElement = `
      <rect x="155" y="44" width="90" height="26" rx="13" fill="#000000" />
      <circle cx="172" cy="57" r="5" fill="#111827" />
      <circle cx="173" cy="56" r="2" fill="#1E3A8A" opacity="0.6" />
      <circle cx="225" cy="57" r="6" fill="#080C14" />
      <circle cx="226" cy="56" r="2.5" fill="#1E293B" />
    `;
  } else {
    cameraElement = `
      <circle cx="200" cy="50" r="7" fill="#000000" />
      <circle cx="200" cy="50" r="4" fill="#0A0F1D" />
      <circle cx="201" cy="49" r="1.5" fill="#3B82F6" opacity="0.7" />
    `;
  }

  // Camera Bump / Distinctive Back Details
  let hardwareDetails = '';
  if (dev.cameraType === 'dynamic_island') {
    // Apple 3-lens bump
    hardwareDetails = `
      <g opacity="0.22" transform="translate(62, 50) scale(0.62)">
        <rect x="0" y="0" width="130" height="130" rx="36" fill="${dev.frameColor}" stroke="#FFFFFF" stroke-width="2"/>
        <circle cx="42" cy="42" r="26" fill="#0B132B" stroke="${dev.accentColor}" stroke-width="4"/>
        <circle cx="42" cy="88" r="26" fill="#0B132B" stroke="${dev.accentColor}" stroke-width="4"/>
        <circle cx="88" cy="65" r="26" fill="#0B132B" stroke="${dev.accentColor}" stroke-width="4"/>
      </g>
    `;
  } else if (dev.cameraType === 'circle_module') {
    // Big circular watch bezel module (Vivo / OnePlus / Oppo / Realme)
    hardwareDetails = `
      <g opacity="0.25" transform="translate(130, 60)">
        <circle cx="70" cy="70" r="62" fill="#0F172A" stroke="${dev.accentColor}" stroke-width="5"/>
        <circle cx="70" cy="70" r="56" fill="none" stroke="#64748B" stroke-dasharray="4 4" stroke-width="2"/>
        <circle cx="50" cy="55" r="16" fill="#020617"/>
        <circle cx="90" cy="55" r="16" fill="#020617"/>
        <circle cx="70" cy="95" r="16" fill="#020617"/>
      </g>
    `;
  } else if (dev.cameraType === 'glyph') {
    // Nothing Glyph Strips
    hardwareDetails = `
      <g opacity="0.3" stroke="#FFFFFF" stroke-width="3" fill="none">
        <circle cx="200" cy="270" r="85" stroke-dasharray="8 6"/>
        <path d="M 120 70 L 160 70 A 30 30 0 0 1 190 100 L 190 130" />
        <path d="M 280 70 L 240 70 A 30 30 0 0 0 210 100 L 210 130" />
        <line x1="200" y1="450" x2="200" y2="480" stroke-width="6"/>
      </g>
    `;
  } else if (dev.cameraType === 'visor') {
    // Google Pixel Camera Visor Bar
    hardwareDetails = `
      <g opacity="0.32" transform="translate(75, 80)">
        <rect x="0" y="0" width="250" height="42" rx="10" fill="#0F172A" stroke="${dev.accentColor}" stroke-width="3"/>
        <rect x="25" y="10" width="60" height="22" rx="11" fill="#000000"/>
        <circle cx="40" cy="21" r="7" fill="#1E293B"/>
        <circle cx="68" cy="21" r="7" fill="#1E293B"/>
        <circle cx="120" cy="21" r="8" fill="#1E293B"/>
      </g>
    `;
  } else if (dev.brand.toLowerCase() === 'samsung') {
    // Samsung vertical lenses
    hardwareDetails = `
      <g opacity="0.25" transform="translate(48, 50) scale(0.6)">
        <circle cx="30" cy="30" r="22" fill="#0F172A" stroke="${dev.accentColor}" stroke-width="4"/>
        <circle cx="30" cy="85" r="22" fill="#0F172A" stroke="${dev.accentColor}" stroke-width="4"/>
        <circle cx="30" cy="140" r="22" fill="#0F172A" stroke="${dev.accentColor}" stroke-width="4"/>
      </g>
    `;
  }

  const hingeLine = dev.foldHinge
    ? `<line x1="200" y1="20" x2="200" y2="520" stroke="#000000" stroke-width="4" opacity="0.4"/>`
    : '';

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 560" width="400" height="560">
      <defs>
        <linearGradient id="frameGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${dev.frameColor}" />
          <stop offset="50%" stop-color="#334155" />
          <stop offset="100%" stop-color="${dev.frameColor}" />
        </linearGradient>
        <linearGradient id="screenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${dev.screenGradient[0]}" />
          <stop offset="100%" stop-color="${dev.screenGradient[1]}" />
        </linearGradient>
        <linearGradient id="glassReflection" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.32" />
          <stop offset="35%" stop-color="#FFFFFF" stop-opacity="0.08" />
          <stop offset="70%" stop-color="#FFFFFF" stop-opacity="0.0" />
        </linearGradient>
        <filter id="phoneShadow" x="-10%" y="-5%" width="120%" height="115%">
          <feDropShadow dx="0" dy="16" stdDeviation="18" flood-color="#0F172A" flood-opacity="0.25"/>
          <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#0F172A" flood-opacity="0.15"/>
        </filter>
      </defs>

      <!-- Soft Drop Shadow -->
      <rect x="75" y="22" width="250" height="500" rx="${cornerRadius}" fill="#000000" filter="url(#phoneShadow)" />

      <!-- Outer Metallic Chassis Frame -->
      <rect x="75" y="20" width="250" height="500" rx="${cornerRadius}" fill="url(#frameGrad)" stroke="#475569" stroke-width="2.5" />

      <!-- Bezel Screen Border -->
      <rect x="83" y="28" width="234" height="484" rx="${screenCornerRadius}" fill="#050811" />

      <!-- Active Display Screen -->
      <rect x="86" y="31" width="228" height="478" rx="${screenCornerRadius - 2}" fill="url(#screenGrad)" />

      <!-- Brand Distinctive Hardware / Back Accent -->
      ${hardwareDetails}

      ${hingeLine}

      <!-- Diagonal Glass Luster Reflection -->
      <path d="M 86 31 L 280 31 L 86 320 Z" fill="url(#glassReflection)" />

      <!-- Front Camera / Dynamic Island -->
      ${cameraElement}

      <!-- Speaker Earpiece Slit -->
      <rect x="180" y="24" width="40" height="3" rx="1.5" fill="#475569" />

      <!-- Home Bar Indicator -->
      <rect x="155" y="494" width="90" height="4" rx="2" fill="#FFFFFF" opacity="0.7" />

      <!-- Subtle Device Badge Tag on Screen -->
      <g transform="translate(200, 428)">
        <text text-anchor="middle" font-size="12" font-weight="900" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" fill="#FFFFFF" letter-spacing="1.5">
          ${dev.brand.toUpperCase()}
        </text>
        <text y="16" text-anchor="middle" font-size="10" font-weight="700" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" fill="#E2E8F0" opacity="0.95">
          ${dev.model}
        </text>
      </g>
    </svg>
  `;
}

async function run() {
  const outDir = path.resolve('uploads/devices');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  console.log(`[Asset Generator] Generating ${devices.length} high-resolution device PNGs...`);

  for (const dev of devices) {
    try {
      const svg = generateDeviceSvg(dev);
      const outPath = path.join(outDir, `${dev.slug}.png`);
      
      await sharp(Buffer.from(svg), { density: 300 })
        .resize(400, 560, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toFile(outPath);

      // Upload to Cloudflare R2
      const r2Url = await StorageService.uploadToR2(`devices/${dev.slug}.png`, outPath, 'image/png');
      console.log(`✓ ${dev.slug}.png -> ${r2Url}`);
    } catch (err: any) {
      console.error(`✗ Error on ${dev.slug}:`, err.message);
    }
  }

  console.log('[Asset Generator] All device renders generated and uploaded to Cloudflare R2!');
}

run();

