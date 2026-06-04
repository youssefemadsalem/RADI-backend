const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const authRoutes = require("./routes/auth");

dotenv.config();
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Database Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to RADI Database"))
  .catch((err) => console.error("Database connection error:", err));

// Basic Status Route
app.get("/", (path, res) => {
  res.json({ message: "RADI API Operational" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server executing on port ${PORT}`));

// Mount Auth endpoints under /api/auth
app.use("/api/auth", authRoutes);
