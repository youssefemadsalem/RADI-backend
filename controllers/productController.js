const Product = require("../models/Product");

exports.createProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      initialInventory,
      sku,
      productType,
      categoryTag,
      materials,
      colors,
      sizes,
      isPubliclyVisible
    } = req.body;

    // Process file structures uploaded via Multer
    let fileImagePaths = [];
    if (req.files && req.files.length > 0) {
      fileImagePaths = req.files.map(file => {
        // 1. Normalize windows slashes
        let cleanPath = file.path.replace(/\\/g, "/");
        
        // 2. 🌟 CRITICAL FIX: Find where 'uploads/' starts and strip everything before it
        const index = cleanPath.indexOf("uploads/");
        if (index !== -1) {
          cleanPath = cleanPath.substring(index); // Now becomes exactly: "uploads/products/filename.png"
        }
        return cleanPath;
      });
    }

    // Build model structure
    const newProduct = new Product({
      name,
      description,
      price: Number(price),
      initialInventory: Number(initialInventory),
      currentInventory: Number(initialInventory),
      sku,
      productType,
      categoryTag: categoryTag || "none",
      materials: typeof materials === 'string' ? JSON.parse(materials) : materials,
      colors: typeof colors === 'string' ? JSON.parse(colors) : colors,
      sizes: typeof sizes === 'string' ? JSON.parse(sizes) : sizes,
      images: fileImagePaths,
      isPubliclyVisible: isPubliclyVisible === 'true' || isPubliclyVisible === true
    });

    const savedProduct = await newProduct.save();
    return res.status(201).json({ success: true, data: savedProduct });
  } catch (error) {
    console.error("Failed to create product:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};