const Product = require("../models/Product");

// =========================================================================
// 1. PRODUCT CREATION INGESTION PIPELINE (POST /api/products/create-new)
// =========================================================================
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
      isPubliclyVisible,
      height,
      width,
      materials 
    } = req.body;

    // Map incoming files to web-safe relative storage paths
    let imageUrls = [];
    if (req.files && req.files.length > 0) {
      imageUrls = req.files.map(file => {
        // 🌟 STRIP ABSOLUTE PATHS: Converts local folder structures into clean web-accessible paths
        const relativePath = file.path.includes('uploads') 
          ? 'uploads' + file.path.split('uploads')[1] 
          : file.path;
          
        return relativePath.replace(/\\/g, "/"); // Normalize Windows backslashes
      });
    }

    // Split materials by comma into a clean clean string array
    let parsedMaterials = [];
    if (materials && typeof materials === 'string') {
      parsedMaterials = materials.split(',').map(item => item.trim()).filter(item => item !== '');
    }

    const newProduct = new Product({
      name,
      description,
      price: Number(price),
      initialInventory: Number(initialInventory),
      currentInventory: Number(initialInventory), // Set starting remaining stock
      sku,
      productType,
      categoryTag,
      isPubliclyVisible: isPubliclyVisible === 'true',
      height: height || "",
      width: width || "",
      materials: parsedMaterials,
      images: imageUrls
    });

    const savedProduct = await newProduct.save();
    return res.status(201).json({ success: true, data: savedProduct });
  } catch (error) {
    console.error("Failed to create product:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================================================
// 2. PRODUCT EDIT PIPELINE (PUT /api/products/edit/:id)
// =========================================================================
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Sync current remaining inventory tracks if admin adjusts base inventory boundaries
    if (updateData.initialInventory) {
      updateData.currentInventory = Number(updateData.initialInventory);
    }

    // Handle string conversion arrays for raw materials text string input matrices
    if (updateData.materials && typeof updateData.materials === 'string') {
      updateData.materials = updateData.materials.split(',').map(item => item.trim()).filter(item => item !== '');
    }

    // If new replacement lookbook assets are uploaded during edit, normalize them safely
    if (req.files && req.files.length > 0) {
      updateData.images = req.files.map(file => {
        const relativePath = file.path.includes('uploads') 
          ? 'uploads' + file.path.split('uploads')[1] 
          : file.path;
          
        return relativePath.replace(/\\/g, "/");
      });
    }
    
    const updatedProduct = await Product.findByIdAndUpdate(id, updateData, { new: true });
    
    if (!updatedProduct) {
      return res.status(404).json({ success: false, message: "Product context target reference not found." });
    }
    
    return res.status(200).json({ success: true, data: updatedProduct });
  } catch (error) {
    console.error("Error updating product:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================================================
// 3. PRODUCT REMOVAL CLEANUP PIPELINE (DELETE /api/products/delete/:id)
// =========================================================================
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedProduct = await Product.findByIdAndDelete(id);
    
    if (!deletedProduct) {
      return res.status(404).json({ success: false, message: "Product context target reference not found." });
    }
    
    return res.status(200).json({ success: true, message: "Product deleted successfully" });
  } catch (error) {
    console.error("Error deleting product:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};