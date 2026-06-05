require("dotenv").config(); // MUST BE THE VERY FIRST LINE
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const authRoutes = require("./routes/auth");
const productRoutes = require("./routes/products"); // 1. IMPORTED PRODUCT ROUTE MODULE

const app = express();

// Middleware Engine Configurations
app.use(cors());
app.use(express.json());

// Database Connection Matrix
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to RADI Database"))
  .catch((err) => console.error("Database connection error:", err));

// ==========================================
// REGISTERED ENDPOINT ROUTER ROUTINGS
// ==========================================
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes); // 2. LINKED PRODUCTS TO /api/products PATHWAY

// Basic Status Route (Fixed parameters)
app.get("/", (req, res) => {
  res.json({ message: "RADI API Operational" });
});

// ==========================================
// SERVER INITIALIZATION EXECUTION
// ==========================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server executing on port ${PORT}`));
