const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const Product = require("../models/Product");

// Helper function to read from your absolute Windows local path and convert to Base64
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
// 1. DYNAMIC FRONTEND FETCH FILTER ENDPOINT
// ==========================================================
router.get("/", async (req, res) => {
  try {
    const { filterType } = req.query;
    let queryCondition = { isPubliclyVisible: true };

    if (filterType) {
      const lowerFilter = filterType.toLowerCase().trim();

      if (lowerFilter === "new arrivals" || lowerFilter === "best sellers") {
        queryCondition.categoryTag = lowerFilter;
      } else if (
        lowerFilter === "clothes" ||
        lowerFilter === "bag" ||
        lowerFilter === "carry"
      ) {
        // FALLBACK OPTIMIZATION: Since your seeded folder contains strictly premium artisan bags,
        // we display items where tag is "none" or productType is "Carry" to populate the third shelf seamlessly!
        queryCondition.$or = [
          { categoryTag: "none" },
          { productType: "Carry" },
        ];
      }
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
// 2. AUTOMATED 9-IMAGE SEEDING ENDPOINT
// ==========================================================
router.post("/seed", async (req, res) => {
  try {
    await Product.deleteMany({});

    const targetFolder =
      "C:\\Users\\COMPUMARTS\\Desktop\\RADI\\radi material\\white studio";

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
      "#DC2626",
      "#171717",
      "#78350F",
      "#4B5563",
      "#09090b",
      "#059669",
      "#7C3AED",
      "#A7F3D0",
    ];
    const basePrices = [135, 150, 160, 175, 185, 190, 210];

    const directoryFiles = fs.readdirSync(targetFolder);
    const imageFiles = directoryFiles
      .filter(
        (file) =>
          file.toLowerCase().endsWith(".jpg") ||
          file.toLowerCase().endsWith(".jpeg"),
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
        productType: "Carry", // Matches your schema's strict Enum validation rule safely
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
