import app from './app.js';
import { config } from './config/index.js';
import { connectDatabase } from './infrastructure/database/connection.js';
import { AdminUserModel } from './infrastructure/database/models/AdminUser.js';
import { seedDatabase } from './infrastructure/database/seeds/seed.js';
import { seedGeoDataIfNeeded } from './infrastructure/database/seeds/geoSeed.js';
import { seedEmployeesIfNeeded } from './infrastructure/database/seeds/employeeSeed.js';
import { seedBrandArrangementIfNeeded } from './infrastructure/database/seeds/brandArrangementSeed.js';
import { seedAppleModelsArrangementIfNeeded } from './infrastructure/database/seeds/appleModelsSeed.js';
import { runPhoneCatalogSeedIfNeeded } from './infrastructure/database/seeds/phoneCatalogSeed.js';
import { BuybackRequestModel } from './infrastructure/database/models/BuybackRequest.js';
import { InvoiceModel } from './infrastructure/database/models/Invoice.js';

async function bootstrap() {
  try {
    console.log('[REVOO Server] Initializing platform backend...');
    await connectDatabase();

    // Check if initial seeding is required
    try {
      const adminCount = await AdminUserModel.countDocuments();
      if (adminCount === 0) {
        console.log('[REVOO Server] Fresh database detected. Running initial seed...');
        await seedDatabase();
        console.log('[REVOO Server] Database initialized with default admin accounts and catalogue.');
      } else {
        console.log(`[REVOO Server] Connected database verified with ${adminCount} admin accounts.`);
      }

      // Ensure India States, Cities, and Pincodes are seeded in DB
      await seedGeoDataIfNeeded();

      // Ensure Collection Partners & Employees are seeded across Tamil Nadu
      await seedEmployeesIfNeeded();

      // Ensure exact 22 phone brands arrangement & models
      await seedBrandArrangementIfNeeded();

      // Ensure exact 37 Apple phone models arrangement & variants
      await seedAppleModelsArrangementIfNeeded();

      // Automatically migrate legacy REV- prefixes in existing database records to GENIE-
      try {
        const legacyRequests = await BuybackRequestModel.find({ requestNumber: { $regex: '^REV-' } });
        for (const req of legacyRequests) {
          req.requestNumber = req.requestNumber.replace(/^REV-/i, 'GENIE-');
          await req.save();
        }
        const legacyInvoices = await InvoiceModel.find({
          $or: [{ invoiceNumber: { $regex: '^REV-' } }, { orderNumber: { $regex: '^REV-' } }],
        });
        for (const inv of legacyInvoices) {
          if (inv.invoiceNumber && /^REV-/i.test(inv.invoiceNumber)) {
            inv.invoiceNumber = inv.invoiceNumber.replace(/^REV-/i, 'GENIE-');
          }
          if (inv.orderNumber && /^REV-/i.test(inv.orderNumber)) {
            inv.orderNumber = inv.orderNumber.replace(/^REV-/i, 'GENIE-');
          }
          await inv.save();
        }
      } catch (migErr) {
        console.warn('[Genie Server] Prefix migration note:', migErr);
      }
    } catch (seedErr) {
      console.error('[REVOO Server] Error verifying/seeding database:', seedErr);
    }

    const server = app.listen(config.port, () => {
      console.log(`[REVOO Server] Running in ${config.nodeEnv} mode on port ${config.port}`);
      console.log(`[REVOO Server] API base URL: http://localhost:${config.port}/api/v1`);
      console.log(`[REVOO Server] Health check: http://localhost:${config.port}/api/v1/health`);
      // Large catalogue seed runs after the server is accepting traffic (once per data version)
      void runPhoneCatalogSeedIfNeeded();
    });

    const shutdown = async (signal: string) => {
      console.log(`\n[REVOO Server] Received ${signal}. Gracefully shutting down...`);
      server.close(() => {
        console.log('[REVOO Server] HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    console.error('[REVOO Server] Failed to bootstrap application:', err);
    process.exit(1);
  }
}

bootstrap();

