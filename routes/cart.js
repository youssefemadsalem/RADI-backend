const express = require("express");
const router = express.Router();
const Cart = require("../models/Cart");

// POST: /api/cart/add
router.post("/add", async (req, res) => {
  try {
    const { productId, quantity, selectedSize, selectedColor, userId } = req.body;
    
    // Fallback ID tracker if explicit JWT token parameters aren't attached yet
    const targetUser = userId || "guest_client_session";

    let cart = await Cart.findOne({ userId: targetUser });
    if (!cart) {
      cart = new Cart({ userId: targetUser, items: [] });
    }

    // Check if item configuration variation is already inside the array
    const existingIndex = cart.items.findIndex(
      (item) =>
        item.productId.toString() === productId &&
        item.selectedSize === selectedSize &&
        item.selectedColor === selectedColor
    );

    if (existingIndex > -1) {
      cart.items[existingIndex].quantity += quantity;
    } else {
      cart.items.push({ productId, quantity, selectedSize, selectedColor });
    }

    await cart.save();
    res.status(200).json({ success: true, cart });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;