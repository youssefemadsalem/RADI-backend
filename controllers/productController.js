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


// i am adding a delete function to completely remove the item from the database
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedProduct = await Product.findByIdAndDelete(id);
    
    if (!deletedProduct) {
      return res.status(404).json({ success: false, message: "product not found" });
    }
    
    return res.status(200).json({ success: true, message: "product deleted successfully" });
  } catch (error) {
    console.error("error deleting product:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// this function handles updating the text fields. if you want to handle new image uploads during edit, 
// you would process req.files here similar to the create function. for now it updates the basic details.
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // mapping currentInventory to match the initial inventory if they update the stock number manually
    if (updateData.initialInventory) {
      updateData.currentInventory = Number(updateData.initialInventory);
    }
    
    const updatedProduct = await Product.findByIdAndUpdate(id, updateData, { new: true });
    
    if (!updatedProduct) {
      return res.status(404).json({ success: false, message: "product not found" });
    }
    
    return res.status(200).json({ success: true, data: updatedProduct });
  } catch (error) {
    console.error("error updating product:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};