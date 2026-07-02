const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Order = require('../models/Order');
const Product = require('../models/Product'); 
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
    
    const parsedCustomerDetails = customerDetails ? JSON.parse(customerDetails) : {};
    const couponCode = parsedCustomerDetails.couponCode || req.body.couponCode || null;
    const discountAmount = parsedCustomerDetails.discountAmount || req.body.discountAmount || 0;

    const parsedItems = JSON.parse(items || '[]').map(item => ({
      ...item,
      productId: item.productId || item.id || item._id
    }));

    // i added this validation loop to check real database stock before we create the order document
    // if any item is out of stock, it stops the whole checkout process and sends an error back
    for (const item of parsedItems) {
      if (item.productId) {
        const productCheck = await Product.findById(item.productId);
        if (!productCheck || productCheck.currentInventory < item.quantity) {
          return res.status(400).json({ 
            success: false, 
            message: `Sorry, ${item.name || 'an item'} is out of stock or does not have enough quantity.` 
          });
        }
      }
    }

    // if it passes the check above, we can safely deduct the stock now
    for (const item of parsedItems) {
      if (item.productId) {
        await Product.findByIdAndUpdate(
          item.productId,
          { $inc: { currentInventory: -Math.abs(item.quantity) } },
          { returnDocument: 'after' } 
        );
      }
    }

    const generatedOrderCode = `RAD-2026-${Math.floor(10000 + Math.random() * 90000)}`;
    const screenshotUrlPath = req.file ? req.file.path : null;

    const freshCreatedOrder = new Order({
      orderCode: generatedOrderCode,
      customerDetails: parsedCustomerDetails,
      items: parsedItems, 
      subtotal: parseFloat(subtotal || 0),
      shippingCost: parseFloat(shippingCost || 100),
      couponCode: couponCode,
      discountAmount: parseFloat(discountAmount || 0),
      total: parseFloat(total || 0),
      paymentMethod,
      screenshotUrl: screenshotUrlPath
    });

    const savedDatabaseRecord = await freshCreatedOrder.save();
    
    process.nextTick(async () => {
      try {
        await sendOrderEmailNotifications(savedDatabaseRecord, screenshotUrlPath);
      } catch (mailError) {
        console.error('mail fail in background:', mailError.message);
      }
    });

    return res.status(201).json({ success: true, orderCode: generatedOrderCode });
  } catch (error) {
    console.error("checkout failed:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
});





router.get('/', async (req, res) => {
  try {
    // sorting by createdAt -1 ensures the newest orders show up at the top of the table
    const orders = await Order.find().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: orders });
  } catch (error) {
    console.error("failed to fetch orders:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// update the status of a specific order
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; 
    
    // updates the document and returns the newly updated version
    const updatedOrder = await Order.findByIdAndUpdate(
      id, 
      { status: status }, 
      { new: true }
    );

    if (!updatedOrder) {
      return res.status(404).json({ success: false, message: "order not found" });
    }

    return res.status(200).json({ success: true, data: updatedOrder });
  } catch (error) {
    console.error("failed to update order status:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
});


module.exports = router;