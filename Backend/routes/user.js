const router = require('express').Router();
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');

// @route   GET api/user/me
// @desc    Get current user's data
// @access  Private
router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    // req.user.id is available from the authMiddleware
    const user = await User.findById(req.user.id).select('-password'); // Exclude password
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// @route   PUT api/user/onboarding
// @desc    Update user profile after onboarding
// @access  Private
router.put('/onboarding', authMiddleware, async (req, res, next) => {
  const { displayName, status, location } = req.body;

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json('User not found');
    }

    user.username = displayName || user.username;
    user.status = status;
    user.location = location;
    user.hasCompletedOnboarding = true;

    await user.save();
    res.json(user);

  } catch (err) {
    next(err);
  }
});

module.exports = router;