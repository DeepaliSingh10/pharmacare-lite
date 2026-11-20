import dotenv from 'dotenv';
import repl from 'node:repl';
import mongoose from 'mongoose';
import { fileURLToPath } from 'node:url';
import Medicine from './models/Medicine.js';
import Sale from './models/Sale.js';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) });

const uri =
  process.env.MONGODB_URI ||
  `mongodb://127.0.0.1:${process.env.MONGODB_PORT || 27018}/pharma_simple`;

try {
  await mongoose.connect(uri);
} catch (error) {
  console.error(`Could not connect to ${uri}`);
  console.error('Start the app first with: npm run dev');
  process.exit(1);
}

console.log(`\nConnected to ${uri}`);
console.log('Available: Medicine, Sale, mongoose');
console.log('Try:');
console.log('  await Medicine.find().lean()');
console.log('  await Medicine.updateOne({ name: "Paracetamol 500mg" }, { $set: { stock: 200 } })');
console.log('  await Sale.deleteMany({})');
console.log('Type .exit to quit.\n');

const shell = repl.start({ prompt: 'pharma> ' });
shell.context.Medicine = Medicine;
shell.context.Sale = Sale;
shell.context.mongoose = mongoose;

shell.on('exit', async () => {
  await mongoose.disconnect();
  process.exit(0);
});
