const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Order = require('../models/Order');
const { sendOrderEmailNotifications } = require('../utils/mailer');

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

router.post('/create', upload.single('screenshot'), async (req, res) => {
  try {
    const { customerDetails, items, subtotal, shippingCost, total, paymentMethod } = req.body;
    const generatedOrderCode = `RAD-2026-${Math.floor(10000 + Math.random() * 90000)}`;
    const screenshotUrlPath = req.file ? req.file.path : null;

    const freshCreatedOrder = new Order({
      orderCode: generatedOrderCode,
      customerDetails: JSON.parse(customerDetails),
      items: JSON.parse(items),
      subtotal: parseFloat(subtotal),
      shippingCost: parseFloat(shippingCost),
      total: parseFloat(total),
      paymentMethod,
      screenshotUrl: screenshotUrlPath
    });

    const savedDatabaseRecord = await freshCreatedOrder.save();
    
    // Dispatch asynchronous emails background processes tasks out over SMTP threads
    sendOrderEmailNotifications(savedDatabaseRecord, screenshotUrlPath);

    res.status(201).json({ success: true, orderCode: generatedOrderCode });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;