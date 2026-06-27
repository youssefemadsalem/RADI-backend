const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const Product = require("../models/Product");

// ==========================================================
// CONFIGURATION: MULTER FOR HIGH-RES AD-HOC MEDIA UPLOADS
// ==========================================================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = "./uploads/products";
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, "prod-" + Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage: storage });

// ==========================================================
// CONFIGURATION: LOCAL BASE64 CONVERSION FOR SEEDING
// ==========================================================
function convertImageToBase64(filePath) {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    return `data:image/jpeg;base64,${fileBuffer.toString("base64")}`;
  } catch (error) {
    console.error(`Could not read image file at ${filePath}:`, error.message);
    return null;
  }
}

// ==========================================================
// 1. DYNAMIC FRONTEND FETCH FILTER ENDPOINT (Customer View)
// ==========================================================
router.get("/", async (req, res) => {
  try {
    const { filterType } = req.query;
    let queryCondition = {};

    if (filterType) {
      const lowerFilter = filterType.toLowerCase().trim();

      if (lowerFilter === "new arrivals" || lowerFilter === "best sellers") {
        queryCondition.isPubliclyVisible = true;
        queryCondition.categoryTag = lowerFilter;
      } else if (lowerFilter === "clothes" || lowerFilter === "bag" || lowerFilter === "carry") {
        queryCondition.$and = [
          { isPubliclyVisible: true },
          {
            $or: [
              { categoryTag: "none" },
              { productType: "Carry" }
            ]
          }
        ];
      }
    } else {
      queryCondition.isPubliclyVisible = true;
    }

    const products = await Product.find(queryCondition).sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed fetching products matrix",
      error: error.message,
    });
  }
});

// ==========================================================
// 2. ADMIN INVENTORY DASHBOARD METRICS PIPELINE (image_479cff.png)
// ==========================================================
router.get("/inventory", async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });

    let totalStockCount = 0;
    let outOfStockCount = 0;
    const uniqueCategories = new Set();
    
    const now = new Date();
    const firstDayOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    let newProductsThisMonthCount = 0;

    const formattedProductsList = products.map((product) => {
      const stock = product.currentInventory || 0;
      totalStockCount += stock;
      
      if (stock === 0) outOfStockCount++;
      
      if (product.categoryTag) uniqueCategories.add(product.categoryTag.toLowerCase().trim());
      if (product.createdAt >= firstDayOfCurrentMonth) newProductsThisMonthCount++;

      // Compute status flags explicitly matching luxury image guidelines
      let computedStatus = "AVAILABLE";
      if (stock === 0) {
        computedStatus = "SOLD OUT";
      } else if (stock <= 5) {
        computedStatus = "LOW STOCK";
      }

      return {
        id: product._id,
        name: product.name,
        sku: product.sku || `RD-SKU-${Math.floor(1000 + Math.random() * 9000)}`,
        category: product.categoryTag || "Unassigned",
        price: product.price,
        stock: stock,
        status: computedStatus,
        // Fallback checks to display either a Base64 string or an uploaded path reference
        image: product.images?.[0] || product.image || null,
      };
    });

    res.json({
      summaryMetrics: {
        totalStock: totalStockCount,
        outOfStock: outOfStockCount,
        totalCategories: uniqueCategories.size || 1,
        newThisMonth: `+${newProductsThisMonthCount}`,
      },
      products: formattedProductsList,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Inventory metrics pipeline blocked", error: error.message });
  }
});

// ==========================================================
// 3. FETCH SINGLE PRODUCT DETAILS BY ID
// ==========================================================
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "The requested silhouette form does not exist in the archive.",
      });
    }

    res.json(product);
  } catch (error) {
    if (error.kind === "ObjectId") {
      return res.status(400).json({
        success: false,
        message: "Malformed or invalid archive object identity structure.",
      });
    }

    res.status(500).json({
      success: false,
      message: "Internal tracking server exception encountered.",
      error: error.message,
    });
  }
});

// ==========================================================
// 4. CREATE NEW PRODUCT HANDLER (image_479d5a.png)
// ==========================================================
router.post("/create-new", upload.array("mediaAssets", 5), async (req, res) => {
  try {
    const { 
      name, 
      category, 
      collection, 
      description, 
      retailPrice, 
      initialInventory, 
      sku,
      primaryColors,     
      materials,         
      isPubliclyVisible 
    } = req.body;

    // Normalizing media files into structural storage paths
    const uploadedImagesPaths = req.files ? req.files.map(f => f.path.replace(/\\/g, "/")) : [];

    const newlyMintedProduct = new Product({
      name,
      categoryTag: category,
      collectionTag: collection,
      description,
      price: parseFloat(retailPrice || 0),
      initialInventory: parseInt(initialInventory || 0, 10),
      currentInventory: parseInt(initialInventory || 0, 10), // Matching starting parameters
      sku,
      colors: typeof primaryColors === "string" ? JSON.parse(primaryColors) : primaryColors,
      materials: typeof materials === "string" ? JSON.parse(materials) : materials,
      sizes: ["OS"], // Defaulting size mapping configuration
      isPubliclyVisible: isPubliclyVisible === "true" || isPubliclyVisible === true,
      images: uploadedImagesPaths
    });

    const savedProduct = await newlyMintedProduct.save();
    res.status(201).json({ success: true, productId: savedProduct._id });

  } catch (error) {
    res.status(500).json({ success: false, message: "Failed adding product variant node", error: error.message });
  }
});

// ==========================================================
// 5. AUTOMATED LOCAL STUDIO BASE64 SEEDING ENDPOINT
// ==========================================================
router.post("/seed", async (req, res) => {
  try {
    await Product.deleteMany({});

    const targetFolder = "C:\\Users\\COMPUMARTS\\Desktop\\RADI\\radi material\\white studio";

    const categories = ["new arrivals", "best sellers", "none"];
    const materialOptions = [
      ["Faceted Resin Beads", "Nylon Core"],
      ["Metallic Iridescent Beads"],
      ["Braided Cotton Cord", "Glass Micro-Beads"],
      ["Organic Cotton Wool Slub"],
      ["Polished Macramé Cord"],
      ["Thick Gauge Fabric Tubing"],
      ["Chunky Cotton Cord Frame"],
      ["Ribbed Knit Cotton-Wool Blend"],
    ];
    const colorOptions = [
      "#DC2626", "#171717", "#78350F", "#4B5563",
      "#09090b", "#059669", "#7C3AED", "#A7F3D0",
    ];
    const basePrices = [135, 150, 160, 175, 185, 190, 210];

    const directoryFiles = fs.readdirSync(targetFolder);
    const imageFiles = directoryFiles
      .filter(
        (file) =>
          file.toLowerCase().endsWith(".jpg") ||
          file.toLowerCase().endsWith(".jpeg")
      )
      .sort((a, b) => parseInt(a) - parseInt(b));

    const productArchive = [];

    imageFiles.forEach((fileName, index) => {
      const displayIndex = index + 1;
      const absoluteImagePath = path.join(targetFolder, fileName);
      const base64Data = convertImageToBase64(absoluteImagePath);

      if (!base64Data) return;

      const targetCategory = categories[index % categories.length];
      const selectedMaterials = materialOptions[index % materialOptions.length];
      const selectedColor = colorOptions[index % colorOptions.length];
      const selectedPrice = basePrices[index % basePrices.length];

      let designType = "Woven Frame Satchel";
      if (selectedMaterials.join().toLowerCase().includes("bead"))
        designType = "Structural Beaded Form";
      if (selectedMaterials.join().toLowerCase().includes("macramé"))
        designType = "Geometric Macramé Clutch";
      if (selectedMaterials.join().toLowerCase().includes("knit"))
        designType = "Ribbed Slouch Pouch";

      productArchive.push({
        name: `${displayIndex.toString().padStart(2, "0")} / ${designType}`,
        description: `An artisanal, premium hand-crafted structural silhouette item profile. Designed with geometric balance and absolute functionality for the modern archive.`,
        price: selectedPrice,
        initialInventory: 25,
        currentInventory: Math.floor(Math.random() * 20) + 5,
        sku: `RAD-BAG-${displayIndex.toString().padStart(2, "0")}-${selectedColor.replace("#", "")}`,
        productType: "Carry", 
        categoryTag: targetCategory,
        materials: selectedMaterials,
        colors: [selectedColor],
        sizes: ["OS"],
        images: [base64Data],
        isPubliclyVisible: true,
      });
    });

    if (productArchive.length > 0) {
      await Product.insertMany(productArchive);
    }

    res.status(201).json({
      success: true,
      count: productArchive.length,
      message: `Successfully processed and uploaded all ${productArchive.length} local images directly inside MongoDB binary clusters!`,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;