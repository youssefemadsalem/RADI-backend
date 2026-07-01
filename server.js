require("dotenv").config(); // MUST BE THE VERY FIRST LINE
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path"); 
const authRoutes = require("./routes/auth");
const productRoutes = require("./routes/productRoutes"); 
const cartRoutes = require("./routes/cart"); 
const orderRoutes = require("./routes/orders"); 
const adminRoutes = require("./routes/admin"); 

const app = express();

// Middleware Engine Configurations
app.use(cors());
app.use(express.json());


app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Database Connection Matrix with Safe Local Fallback
const dbURI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/radi_db";
mongoose
  .connect(dbURI)
  .then(() => console.log("Connected to RADI Database"))
  .catch((err) => console.error("Database connection error:", err));

// REGISTERED ENDPOINT ROUTER ROUTINGS
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes); 
app.use("/api/cart", cartRoutes); 
app.use("/api/orders", orderRoutes); 
app.use("/api/admin", adminRoutes); 

app.get("/", (req, res) => {
  res.json({ message: "RADI API Operational" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server executing on port ${PORT}`));