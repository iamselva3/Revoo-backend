/**
 * Applies the phone catalogue (src/infrastructure/database/seeds/data/phoneCatalog.json).
 *
 *   npm run seed:catalog                 dry run: prints what would change, writes nothing
 *   npm run seed:catalog -- --apply      backs up brands/models/variants to backups/, then applies
 *
 * Uses MONGO_URI from .env. The server also applies the same catalogue once per version on startup.
 */
import mongoose from 'mongoose';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { config } from '../src/config/index.js';
import { BrandModel } from '../src/infrastructure/database/models/Brand.js';
import { SmartphoneModel } from '../src/infrastructure/database/models/SmartphoneModel.js';
import { StorageVariantModel } from '../src/infrastructure/database/models/StorageVariant.js';
import { SeedMarkerModel } from '../src/infrastructure/database/models/SeedMarker.js';
import { seedBrandArrangementIfNeeded } from '../src/infrastructure/database/seeds/brandArrangementSeed.js';
import {
  PHONE_CATALOG_MARKER_KEY,
  PHONE_CATALOG_VERSION,
  applyPhoneCatalog,
} from '../src/infrastructure/database/seeds/phoneCatalogSeed.js';

const args = process.argv.slice(2);
const unknown = args.filter((a) => a !== '--apply');
if (unknown.length) {
  console.error(`Unknown argument(s): ${unknown.join(' ')}. Use --apply to write.`);
  process.exit(2);
}
const apply = args.includes('--apply');

async function main() {
  const safeUri = config.mongoUri.replace(/\/\/[^@]*@/, '//***@').replace(/\?.*$/, '');
  console.log(`Catalogue version ${PHONE_CATALOG_VERSION} → ${safeUri} (${apply ? 'APPLY' : 'dry run'})`);
  await mongoose.connect(config.mongoUri, { autoIndex: false });

  if (apply) {
    const dir = join(process.cwd(), 'backups');
    mkdirSync(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const file = join(dir, `catalog-before-${stamp}.json`);
    const [brands, models, variants] = await Promise.all([
      BrandModel.find().lean(),
      SmartphoneModel.find().lean(),
      StorageVariantModel.find().lean(),
    ]);
    writeFileSync(file, JSON.stringify({ takenAt: new Date(), brands, models, variants }));
    console.log(`Backup: ${file} (${brands.length} brands, ${models.length} models, ${variants.length} variants)`);
  }

  if (apply) {
    // Brand order/creation from the brand arrangement seed first, so the 22 brands are in place
    await seedBrandArrangementIfNeeded();
  } else {
    console.log('(dry run: the brand arrangement seed would run first on --apply)');
  }
  const report = await applyPhoneCatalog({ dryRun: !apply });

  if (apply) {
    await SeedMarkerModel.updateOne(
      { key: PHONE_CATALOG_MARKER_KEY },
      { $set: { version: PHONE_CATALOG_VERSION, appliedAt: new Date(), summary: { created: report.modelsCreated, matched: report.modelsMatched } } },
      { upsert: true }
    );
  }

  console.log('\n=== Summary ===');
  console.log(`New brands:            ${report.brandsCreated.join(', ') || 'none'}`);
  console.log(`Models created:        ${report.modelsCreated}`);
  console.log(`Existing re-ordered:   ${report.modelsMatched}`);
  console.log(`Variants added:        ${report.variantsCreated}`);
  console.log(`Photos set:            ${report.imagesFilled}`);
  console.log(`Unlisted kept (after): ${report.unlistedKept}`);
  console.log(`Moved between brands:  ${report.modelsMovedBrand.length}`);
  report.modelsMovedBrand.forEach((m) => console.log(`   ${m.name}: ${m.from} → ${m.to}`));
  console.log(`Duplicates hidden:     ${report.duplicatesHidden.length}`);
  report.duplicatesHidden.forEach((d) => console.log(`   [${d.brand}] "${d.name}" duplicates "${d.duplicateOf}"`));
  console.log(`Empty alias brands hidden: ${report.aliasBrandsHidden.join(', ') || 'none'}`);
  console.log(`Renamed to list spelling: ${report.renamed.length}`);
  report.renamed.forEach((r) => console.log(`   "${r.from}" → "${r.to}"`));
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
