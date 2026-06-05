const mongoose = require("mongoose");

const CartItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  quantity: { type: Number, required: true, default: 1, min: 1 },
  selectedSize: { type: String, default: "OS" },
  selectedColor: { type: String, required: true }
});

const CartSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true }, // Ties to user ID or transient session token strings
    items: [CartItemSchema]
  },
  { timestamps: true }
);

module.exports = mongoose.model("Cart", CartSchema);