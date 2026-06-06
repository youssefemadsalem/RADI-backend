require("dotenv").config(); // MUST BE THE VERY FIRST LINE
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const authRoutes = require("./routes/auth");
const productRoutes = require("./routes/products");
const cartRoutes = require("./routes/cart"); 
const orderRoutes = require("./routes/orders"); 

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
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes); 
app.use("/api/orders", orderRoutes); // ✅ 2. LINK ORDERS TO /api/orders PATHWAY

app.get("/", (req, res) => {
  res.json({ message: "RADI API Operational" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server executing on port ${PORT}`));