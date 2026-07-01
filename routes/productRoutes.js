const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const Product = require("../models/Product"); 
const uploadMiddleware = require("../middleware/upload");
const productController = require("../controllers/productController");

// =========================================================================
// 1. DASHBOARD ENDPOINT & METRICS (GET /api/products/inventory)
// =========================================================================
router.get("/inventory", async (req, res) => {
  try {
    const products = await Product.find({}).sort({ createdAt: -1 });

    // total stock now counts what is actually left on shelves using currentInventory
    const totalStock = products.reduce((acc, prod) => acc + (prod.currentInventory || 0), 0);
    
    // items are checked against currentInventory to see if they are completely sold out
    const outOfStock = products.filter(prod => (prod.currentInventory || 0) <= 0).length;
    
    const uniqueCategories = [...new Set(products.map(prod => prod.productType))].filter(Boolean);
    const totalCategories = uniqueCategories.length;

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const newThisMonthCount = products.filter(prod => {
      const prodDate = new Date(prod.createdAt);
      return prodDate.getMonth() === currentMonth && prodDate.getFullYear() === currentYear;
    }).length;

    const formattedProducts = products.map(prod => {
      // dynamic badges mapping depends directly on the updated remaining stock level
      let status = "AVAILABLE";
      if ((prod.currentInventory || 0) <= 0) status = "SOLD OUT";
      else if ((prod.currentInventory || 0) < 5) status = "LOW STOCK";

      return {
        id: prod._id,
        name: prod.name,
        sku: prod.sku,
        category: prod.productType || "Unassigned",
        price: prod.price,
        // sending currentInventory instead of the static initial setup value
        stock: prod.currentInventory || 0,
        status: status,
        image: prod.images && prod.images.length > 0 ? prod.images[0] : null
      };
    });

    return res.status(200).json({
      summaryMetrics: {
        totalStock,
        outOfStock,
        totalCategories,
        newThisMonth: String(newThisMonthCount)
      },
      products: formattedProducts
    });
  } catch (error) {
    console.error("Inventory dashboard aggregation failed:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// =========================================================================
// 2. SHOP FRONT FILTRATION STREAM (GET /api/products)
// =========================================================================
router.get("/", async (req, res) => {
  try {
    const { filterType } = req.query;
    let queryCondition = {};

    if (filterType === "new arrivals") {
      queryCondition = { categoryTag: "new arrivals" };
    } else if (filterType === "best sellers") {
      queryCondition = { categoryTag: "best sellers" };
    } else if (filterType === "clothes" || filterType === "Apparel") {
      queryCondition = { productType: { $in: ["Apparel", "Outerwear", "clothes"] } };
    }

    const products = await Product.find({ 
      ...queryCondition,
      isPubliclyVisible: true 
    }).sort({ createdAt: -1 });

    return res.status(200).json(products);
  } catch (error) {
    console.error("Shop filter retrieval failed:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// =========================================================================
// 3. GET SINGLE PRODUCT BY ID (GET /api/products/:id)
// =========================================================================
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid product identifier format." });
    }

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ success: false, message: "Luxury asset item context not found." });
    }

    return res.status(200).json(product);
  } catch (error) {
    console.error("Single product retrieval pipeline failed:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// =========================================================================
// 4. PRODUCT INGESTION CREATION PIPELINE (POST /api/products/create-new)
// =========================================================================
router.post("/create-new", uploadMiddleware.array("images", 5), productController.createProduct);

module.exports = router;