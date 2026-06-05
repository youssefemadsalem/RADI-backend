const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String },
    price: { type: Number, required: true },
    initialInventory: { type: Number, required: true },
    currentInventory: { type: Number, required: true },
    sku: { type: String, required: true, unique: true },

    productType: {
      type: String,
      required: true,
      enum: ["Apparel", "Carry", "Tableware", "Outerwear"],
    },

    categoryTag: {
      type: String,
      required: true,
      enum: ["new arrivals", "best sellers", "none"],
      default: "none",
    },

    materials: [{ type: String }],
    colors: [{ type: String }],
    sizes: [{ type: String }],

    // Changed to accept raw Base64 data strings directly inside the database document
    images: [{ type: String }],
    isPubliclyVisible: { type: Boolean, default: false },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Product", ProductSchema);
