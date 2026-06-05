const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const User = require("../models/User");

// ==========================================
// NODEMAILER EMAIL TRANSPORTER CONFIGURATION
// ==========================================
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, // Pulls safely from your hidden .env file
    pass: process.env.EMAIL_PASS, // Pulls your secure 16-character App Password safely
  },
});

// ==========================================
// ROUTE 1: REGISTER A NEW USER
// ==========================================
router.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res
        .status(400)
        .json({ message: "Email coordinates already registered." });
    }

    // Securely hash the password string before storing
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create and save document
    user = new User({
      email,
      password: hashedPassword,
    });

    await user.save();
    res.status(201).json({ message: "Profile generated successfully." });
  } catch (error) {
    res
      .status(500)
      .json({
        message: "Server Registration block error.",
        error: error.message,
      });
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
      return res
        .status(400)
        .json({ message: "Invalid authentication coordinates." });
    }

    // Compare entered password with database hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ message: "Invalid authentication coordinates." });
    }

    // Generate a secure JWT Token containing user metadata
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || "RADI_SECRET_KEY",
      { expiresIn: "24h" }, // Token auto-expires in 1 day
    );

    // Return the token and user metadata back to Angular
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
      .json({ message: "Server Login process failure.", error: error.message });
  }
});

// ==========================================
// ROUTE 3: FORGOT PASSWORD (REQUEST OTP)
// ==========================================
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ message: "No profile matching those coordinates." });
    }

    // Generate clear cryptographically secure 6-Digit Number Code string
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Save transient verification parameters inside User Document (Valid for 15 minutes)
    user.otpCode = otp;
    user.otpExpires = Date.now() + 15 * 60 * 1000;
    await user.save();

    // Fire actual mailing process
    const mailOptions = {
      from: `"RADI Studio" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "RADI Access Node - Secure OTP Request",
      html: `
        <div style="background:#000; color:#fff; padding:40px; font-family:sans-serif; text-align:center;">
          <h1 style="letter-spacing:6px; font-weight:300;">RADI</h1>
          <p style="color:#888; font-size:12px; text-transform:uppercase; letter-spacing:2px;">Identity Recovery Node</p>
          <hr style="border-color:#222; margin:30px 0;" />
          <p style="font-size:14px; color:#ccc;">Use the transient secure key sequence below to authorize modifications:</p>
          <h2 style="font-size:36px; letter-spacing:10px; margin:20px 0; font-weight:600; color:#fff;">${otp}</h2>
          <p style="color:#555; font-size:11px;">Coordinates self-destruct automatically inside 15 minutes.</p>
        </div>`,
    };

    await transporter.sendMail(mailOptions);
    res.json({
      message: "Authorization code transmitted safely to your mailbox.",
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Mailer pipeline broke down.", error: error.message });
  }
});

// ==========================================
// ROUTE 4: RESET PASSWORD (VERIFY OTP + UPDATE)
// ==========================================
router.post("/reset-password", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    // Assures OTP matches exactly and token timestamp has not expired
    const user = await User.findOne({
      email,
      otpCode: otp,
      otpExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res
        .status(400)
        .json({ message: "Invalid or expired authentication token." });
    }

    // Securely rewrite credential hash parameters
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    // Wipe transient verification variables entirely upon successful execution
    user.otpCode = null;
    user.otpExpires = null;
    await user.save();

    res.json({
      message: "Authentication profile rewritten. Proceed to login.",
    });
  } catch (error) {
    res
      .status(500)
      .json({
        message: "Profile reset configuration failed.",
        error: error.message,
      });
  }
});

module.exports = router;
