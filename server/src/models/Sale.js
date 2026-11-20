import mongoose from 'mongoose';

const saleSchema = new mongoose.Schema(
  {
    billNo: { type: String, required: true, unique: true },
    medicine: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine' },
    medicineName: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    customerName: { type: String, default: 'Walk-in customer', trim: true },
  },
  { timestamps: true }
);

export default mongoose.model('Sale', saleSchema);
