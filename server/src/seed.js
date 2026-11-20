import dotenv from 'dotenv';
import path from 'node:path';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { connectDB, disconnectDB } from './database.js';
import Medicine from './models/Medicine.js';
import Sale from './models/Sale.js';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) });

const demoMedicines = [
  { name: 'Paracetamol 500mg', category: 'Analgesic', price: 25, stock: 120 },
  { name: 'Amoxicillin 250mg', category: 'Antibiotic', price: 85, stock: 8 },
  { name: 'Cetirizine 10mg', category: 'Antihistamine', price: 30, stock: 60 },
  { name: 'Omeprazole 20mg', category: 'Antacid', price: 70, stock: 35 },
  { name: 'Metformin 500mg', category: 'Antidiabetic', price: 45, stock: 25 },
  { name: 'Vitamin C 500mg', category: 'Vitamin', price: 75, stock: 80 },
  { name: 'Cough Syrup 100ml', category: 'Respiratory', price: 130, stock: 15 },
  { name: 'Insulin Glargine', category: 'Antidiabetic', price: 850, stock: 6 },
];

/**
 * Adds demo medicines when the database is empty.
 * The seed script calls this with force=true to wipe and recreate the data.
 */
export async function seedData(force = false) {
  const count = await Medicine.countDocuments();

  if (!force && count > 0) {
    console.log('[seed] existing data kept');
    return;
  }

  await Sale.deleteMany({});
  await Medicine.deleteMany({});
  await Medicine.insertMany(demoMedicines);
  console.log(`[seed] ${demoMedicines.length} demo medicines inserted`);
}

// realpath matters when the folder is opened through a Windows junction.
const isDirectRun =
  process.argv[1] &&
  realpathSync(path.resolve(process.argv[1])) ===
    realpathSync(fileURLToPath(import.meta.url));

if (isDirectRun) {
  await connectDB();
  await seedData(true);
  await disconnectDB();
  process.exit(0);
}
