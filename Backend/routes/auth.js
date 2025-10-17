const router = require('express').Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// REGISTER
router.post('/register', async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json("Please provide all required fields.");
    }
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json("An account with this email already exists.");
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      username,
      email,
      password: hashedPassword,
    });

    await newUser.save();
    res.status(201).json("User registered successfully!");

  } catch (err) {
    next(err); 
  }
});

// LOGIN
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json("Please provide email and password.");
    }
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json("Invalid credentials. Please try again.");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json("Invalid credentials. Please try again.");
    }

    const payload = {
      user: {
        id: user.id,
      },
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '1d' },
      (err, token) => {
        if (err) throw err;
        res.json({ 
          token, 
          hasCompletedOnboarding: user.hasCompletedOnboarding 
        });
      }
    );

  } catch (err) {
    next(err);
  }
});

module.exports = router;