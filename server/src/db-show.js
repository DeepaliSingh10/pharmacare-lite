import dotenv from 'dotenv';
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

const medicines = await Medicine.find().sort({ name: 1 }).lean();
const sales = await Sale.find().sort({ createdAt: -1 }).lean();

console.log(`\nConnected to ${uri}\n`);

console.log(`Medicines (${medicines.length})`);
if (medicines.length === 0) {
  console.log('  No medicines yet.\n');
} else {
  console.table(
    medicines.map((medicine) => ({
      id: medicine._id.toString(),
      name: medicine.name,
      category: medicine.category,
      price: medicine.price,
      stock: medicine.stock,
    }))
  );
}

console.log(`Sales (${sales.length})`);
if (sales.length === 0) {
  console.log('  No bills yet.\n');
} else {
  console.table(
    sales.map((sale) => ({
      billNo: sale.billNo,
      medicine: sale.medicineName,
      qty: sale.quantity,
      total: sale.total,
      customer: sale.customerName,
      date: new Date(sale.createdAt).toLocaleString('en-IN'),
    }))
  );
}

await mongoose.disconnect();
