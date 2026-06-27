const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Order = require('../models/Order');
const Product = require('../models/Product'); 
const { sendOrderEmailNotifications } = require('../utils/mailer');

// Initialize the Multer disk storage system engine
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = './uploads/screenshots';
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, 'receipt-' + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// ==========================================
// ORDER CREATION ROUTE
// ==========================================
router.post('/create', upload.single('screenshot'), async (req, res) => {
  try {
    const { customerDetails, items, subtotal, shippingCost, total, paymentMethod } = req.body;
    const generatedOrderCode = `RAD-2026-${Math.floor(10000 + Math.random() * 90000)}`;
    const screenshotUrlPath = req.file ? req.file.path : null;

    // 🌟 FIXED: Normalize frontend identifiers (id / _id) on the fly to fulfill 'productId' schema demands
    const parsedItems = JSON.parse(items || '[]').map(item => ({
      ...item,
      productId: item.productId || item.id || item._id
    }));

    // Safe transactional inventory deduction pass loop
    for (const item of parsedItems) {
      if (item.productId) {
        await Product.findByIdAndUpdate(
          item.productId,
          { $inc: { currentInventory: -Math.abs(item.quantity || 1) } },
          { returnDocument: 'after' } // 🌟 FIXED: Mongoose standard syntax update to clear terminal deprecation warnings
        );
      }
    }

    const freshCreatedOrder = new Order({
      orderCode: generatedOrderCode,
      customerDetails: customerDetails ? JSON.parse(customerDetails) : {},
      items: parsedItems, 
      subtotal: parseFloat(subtotal || 0),
      shippingCost: parseFloat(shippingCost || 100),
      total: parseFloat(total || 0),
      paymentMethod,
      screenshotUrl: screenshotUrlPath
    });

    const savedDatabaseRecord = await freshCreatedOrder.save();
    
    // Safe asynchronous background execution loop worker prevents mail thread failures from triggering 500 errors
    process.nextTick(async () => {
      try {
        await sendOrderEmailNotifications(savedDatabaseRecord, screenshotUrlPath);
      } catch (mailError) {
        console.error('[SMTP Background Thread Exception] Notification pipeline choked safely:', mailError.message);
      }
    });

    return res.status(201).json({ success: true, orderCode: generatedOrderCode });
  } catch (error) {
    console.error("❌ Checkout Controller Exception Intercepted:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;