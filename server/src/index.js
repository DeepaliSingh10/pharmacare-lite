import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Medicine from './models/Medicine.js';
import Sale from './models/Sale.js';
import { connectDB, disconnectDB } from './database.js';
import { seedData } from './seed.js';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) });

const app = express();
const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(moduleDir, '..', '..', 'client', 'dist');
const clientIndex = path.join(clientDist, 'index.html');

app.use(cors());
app.use(express.json());

// Small helper so async route errors reach the error handler.
const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

// Checks the four fields used by both create and update.
function readMedicine(body) {
  const name = String(body.name ?? '').trim();
  const category = String(body.category ?? '').trim();
  const price = Number(body.price);
  const stock = Number(body.stock);

  if (!name || !category) {
    return { error: 'Name and category are required.' };
  }
  if (!Number.isFinite(price) || price < 0) {
    return { error: 'Price must be zero or more.' };
  }
  if (!Number.isInteger(stock) || stock < 0) {
    return { error: 'Stock must be a whole number.' };
  }

  return { value: { name, category, price, stock } };
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'pharma-simple-api' });
});

// Dashboard numbers: totals, low-stock items and the latest bills.
app.get(
  '/api/summary',
  asyncHandler(async (req, res) => {
    const [medicines, sales] = await Promise.all([
      Medicine.find().lean(),
      Sale.find().sort({ createdAt: -1 }).lean(),
    ]);

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const lowStockList = medicines
      .filter((medicine) => medicine.stock <= 10)
      .sort((a, b) => a.stock - b.stock);

    res.json({
      totalMedicines: medicines.length,
      totalStock: medicines.reduce((sum, medicine) => sum + medicine.stock, 0),
      lowStock: lowStockList.length,
      totalSales: sales.length,
      revenue: sales.reduce((sum, sale) => sum + sale.total, 0),
      todayRevenue: sales
        .filter((sale) => new Date(sale.createdAt) >= startOfToday)
        .reduce((sum, sale) => sum + sale.total, 0),
      lowStockItems: lowStockList.slice(0, 5),
      recentSales: sales.slice(0, 5),
    });
  })
);

// Medicine CRUD.
app.get(
  '/api/medicines',
  asyncHandler(async (req, res) => {
    const medicines = await Medicine.find().sort({ name: 1 });
    res.json(medicines);
  })
);

app.post(
  '/api/medicines',
  asyncHandler(async (req, res) => {
    const { error, value } = readMedicine(req.body);
    if (error) return res.status(400).json({ message: error });

    const medicine = await Medicine.create(value);
    res.status(201).json(medicine);
  })
);

app.put(
  '/api/medicines/:id',
  asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid medicine id.' });
    }

    const { error, value } = readMedicine(req.body);
    if (error) return res.status(400).json({ message: error });

    const medicine = await Medicine.findByIdAndUpdate(req.params.id, value, {
      new: true,
      runValidators: true,
    });

    if (!medicine) return res.status(404).json({ message: 'Medicine not found.' });
    res.json(medicine);
  })
);

app.delete(
  '/api/medicines/:id',
  asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid medicine id.' });
    }

    const medicine = await Medicine.findByIdAndDelete(req.params.id);
    if (!medicine) return res.status(404).json({ message: 'Medicine not found.' });
    res.json({ message: 'Medicine deleted.' });
  })
);

// Bills. Creating a bill checks stock and reduces it in one atomic update.
app.get(
  '/api/sales',
  asyncHandler(async (req, res) => {
    const sales = await Sale.find().sort({ createdAt: -1 });
    res.json(sales);
  })
);

app.post(
  '/api/sales',
  asyncHandler(async (req, res) => {
    const { medicineId, quantity, customerName } = req.body;
    const qty = Number(quantity);

    if (!mongoose.isValidObjectId(medicineId)) {
      return res.status(400).json({ message: 'Choose a medicine.' });
    }
    if (!Number.isInteger(qty) || qty < 1) {
      return res.status(400).json({ message: 'Quantity must be at least 1.' });
    }

    const medicine = await Medicine.findOneAndUpdate(
      { _id: medicineId, stock: { $gte: qty } },
      { $inc: { stock: -qty } },
      { new: true }
    );

    if (!medicine) {
      const exists = await Medicine.exists({ _id: medicineId });
      return res.status(400).json({
        message: exists ? 'Not enough stock for this medicine.' : 'Medicine not found.',
      });
    }

    try {
      const sale = await Sale.create({
        billNo: `BILL-${Date.now()}`,
        medicine: medicine._id,
        medicineName: medicine.name,
        quantity: qty,
        price: medicine.price,
        total: medicine.price * qty,
        customerName: String(customerName ?? '').trim() || 'Walk-in customer',
      });

      res.status(201).json(sale);
    } catch (error) {
      // Put the stock back if saving the bill failed.
      await Medicine.findByIdAndUpdate(medicineId, { $inc: { stock: qty } });
      throw error;
    }
  })
);

// In production the Express server also serves the built React app.
if (fs.existsSync(clientIndex)) {
  app.use(express.static(clientDist));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(clientIndex);
    }
    next();
  });
}

app.use((err, req, res, next) => {
  console.error(err);
  if (err.name === 'CastError') {
    return res.status(400).json({ message: 'Invalid value supplied.' });
  }
  res.status(500).json({ message: err.message || 'Server error.' });
});

const port = Number(process.env.PORT) || 5000;

await connectDB();
await seedData();

app.listen(port, () => {
  console.log(`[api] PharmaCare Lite running at http://localhost:${port}`);
});

process.on('SIGINT', async () => {
  await disconnectDB();
  process.exit(0);
});
