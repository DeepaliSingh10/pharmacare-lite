import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
let memoryServer = null;

/**
 * Connects to MongoDB.
 *
 * If MONGODB_URI is set, that database is used.
 * Otherwise a local MongoDB instance is started by mongodb-memory-server and its
 * files are kept in server/.data/mongo, so the demo data survives restarts.
 */
export async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (uri) {
    await mongoose.connect(uri);
    console.log('[db] connected to MongoDB');
    return mongoose.connection;
  }

  const { MongoMemoryServer } = await import('mongodb-memory-server');
  const dbPath = path.resolve(moduleDir, '..', '.data', 'mongo');
  const downloadDir = process.env.MONGOMS_DOWNLOAD_DIR;
  const port = Number(process.env.MONGODB_PORT) || 27018;

  fs.mkdirSync(dbPath, { recursive: true });

  memoryServer = await MongoMemoryServer.create({
    instance: {
      port,
      dbName: 'pharma_simple',
      dbPath,
      storageEngine: 'wiredTiger',
    },
    binary: downloadDir ? { downloadDir } : undefined,
  });

  await mongoose.connect(memoryServer.getUri('pharma_simple'));
  console.log(`[db] embedded MongoDB data: ${dbPath}`);
  console.log(`[db] MongoDB connection: mongodb://127.0.0.1:${port}/pharma_simple`);
  return mongoose.connection;
}

export async function disconnectDB() {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
}
