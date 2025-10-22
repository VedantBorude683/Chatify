const router = require('express').Router();
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const authMiddleware = require('../middleware/authMiddleware');

// @route   GET api/messages/:otherUserId
// @desc    Get message history between logged-in user and another user
// @access  Private
router.get('/:otherUserId', authMiddleware, async (req, res, next) => {
    try {
        // Find the conversation between the logged-in user and the other user
        const conversation = await Conversation.findOne({
            members: { $all: [req.user.id, req.params.otherUserId] }
        });

        if (!conversation) {
            return res.json([]); // No conversation yet, return empty array
        }

        // Fetch all messages for that conversation, sorted by creation time
        const messages = await Message.find({
            conversationId: conversation._id
        }).sort({ createdAt: 1 }); 

        res.json(messages);
    } catch (err) {
        next(err);
    }
});

module.exports = router;