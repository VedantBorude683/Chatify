const router = require('express').Router();
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');

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