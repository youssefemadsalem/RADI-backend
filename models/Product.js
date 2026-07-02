
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
height: { type: String, default: "" },
  width: { type: String, default: "" },
    materials: [{ type: String }],
    colors: [{ type: String }],
    sizes: [{ type: String }],
    images: [{ type: String }],
    isPubliclyVisible: { type: Boolean, default: false },

    // ADDED: Outfit lookbook schemas for the "Day to Night" feature
    outfits: [
      {
        time: { type: String },    // e.g., "06:00 AM"
        period: { type: String },  // e.g., "Morning"
        imageUrl: { type: String } // Base64 or URL path string
      }
    ]
  },
  { timestamps: true },
);

module.exports = mongoose.model("Product", ProductSchema);