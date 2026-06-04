const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User"); // The schema we created earlier

// ==========================================
// ROUTE 1: REGISTER A NEW USER
// ==========================================
router.post("/register", async (req, res) => {
  try {
    const { email, password, role } = req.body;

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res
        .status(400)
        .json({ message: "User already registered with this email." });
    }

    // Securely hash the password string before storing
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create and save document
    user = new User({
      email,
      password: hashedPassword,
      role: role || "customer", // Defaults to customer unless specified
    });

    await user.save();
    res.status(201).json({ message: "User created successfully." });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Server registration error.", error: error.message });
  }
});

// ==========================================
// ROUTE 2: LOGIN USER
// ==========================================
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Verify email exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials." });
    }

    // Compare entered password with database hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials." });
    }

    // Generate a secure JWT Token containing user metadata
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }, // Token auto-expires in 1 day
    );

    // Return the token and user role back to Angular
    res.json({
      token,
      user: {
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Server login error.", error: error.message });
  }
});

module.exports = router;
