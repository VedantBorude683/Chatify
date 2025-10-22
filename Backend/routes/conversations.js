const router = require('express').Router();
const Conversation = require('../models/Conversation');
const authMiddleware = require('../middleware/authMiddleware');

// @route   GET api/conversations
// @desc    Get all conversations for the logged-in user
// @access  Private
router.get('/', authMiddleware, async (req, res, next) => {
    try {
        const conversations = await Conversation.find({
            members: { $in: [req.user.id] }
        })
        .populate('members', '-password') // Replace user IDs with user objects
        .populate('lastMessage') // Replace lastMessage ID with the message object
        .sort({ updatedAt: -1 }); // Sort by most recently updated

        res.json(conversations);
    } catch (err) {
        next(err);
    }
});

module.exports = router;