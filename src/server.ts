import app from './app.js';
import { config } from './config/index.js';
import { connectDatabase } from './infrastructure/database/connection.js';
import { AdminUserModel } from './infrastructure/database/models/AdminUser.js';
import { seedDatabase } from './infrastructure/database/seeds/seed.js';
import { seedGeoDataIfNeeded } from './infrastructure/database/seeds/geoSeed.js';

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
    } catch (seedErr) {
      console.error('[REVOO Server] Error verifying/seeding database:', seedErr);
    }

    const server = app.listen(config.port, () => {
      console.log(`[REVOO Server] Running in ${config.nodeEnv} mode on port ${config.port}`);
      console.log(`[REVOO Server] API base URL: http://localhost:${config.port}/api/v1`);
      console.log(`[REVOO Server] Health check: http://localhost:${config.port}/api/v1/health`);
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

