const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  orderCode: { type: String, required: true, unique: true },
  customerDetails: {
    email: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    phone: { type: String, required: true },
    shippingAddress: {
      address: { type: String, required: true },
      apartment: { type: String },
      city: { type: String, required: true },
      governorate: { type: String, required: true },
      postalCode: { type: String }
    }
  },
  items: [{
    productId: String,
    name: String,
    price: Number,
    quantity: Number,
    selectedSize: String,
    selectedColor: String ,
    image: String
  }],
  subtotal: Number,
  shippingCost: { type: Number, default: 100 },
  total: Number,
  paymentMethod: { type: String, enum: ['COD', 'INSTAPAY'], required: true },
  screenshotUrl: { type: String, default: null },
  status: { type: String, enum: ['PENDING', 'CONFIRMED'], default: 'PENDING' }
}, { timestamps: true });

module.exports = mongoose.model('Order', OrderSchema);