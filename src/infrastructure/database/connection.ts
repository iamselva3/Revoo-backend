import mongoose from 'mongoose';
import { config } from '../../config/index.js';

let memoryServerInstance: any = null;

export async function connectDatabase(uri?: string): Promise<typeof mongoose> {
  const mongoUri = uri || config.mongoUri;
  try {
    const conn = await mongoose.connect(mongoUri, {
      autoIndex: true,
      serverSelectionTimeoutMS: 7000,
    });
    console.log(`[Database] MongoDB connected successfully to ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (err) {
    console.error('[Database] MongoDB connection error:', (err as any)?.message || err);
    if (!config.isProduction) {
      console.warn('[Database] Attempting fallback to in-memory MongoDB for development...');
      try {
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        memoryServerInstance = await MongoMemoryServer.create();
        const memUri = memoryServerInstance.getUri();
        const conn = await mongoose.connect(memUri, { autoIndex: true });
        console.log(`[Database] Connected to fallback in-memory MongoDB at ${memUri}`);
        return conn;
      } catch (memErr) {
        console.error('[Database] In-memory fallback failed:', memErr);
        throw err;
      }
    }
    throw err;
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
  if (memoryServerInstance) {
    await memoryServerInstance.stop();
    memoryServerInstance = null;
  }
}

