const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String },
    price: { type: Number, required: true },
    initialInventory: { type: Number, required: true },
    currentInventory: { type: Number, required: true },
    sku: { type: String, required: true, unique: true },

    // Categorization requirements
    productType: {
      type: String,
      required: true,
      enum: ["Apparel", "Carry", "Tableware", "Outerwear"],
    },
    materials: [{ type: String }], // e.g., ['Virgin Wool', 'Silk Lining']
    colors: [{ type: String }], // Hex codes or names: ['#000000', '#FFFFFF']

    images: [{ type: String }], // Array of image asset URLs
    isPubliclyVisible: { type: Boolean, default: false },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Product", ProductSchema);
