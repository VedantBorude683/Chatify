const router = require('express').Router();
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const authMiddleware = require('../middleware/authMiddleware');

// @route   GET api/messages/:otherUserId
// @desc    Get message history, filtering deleted messages
// @access  Private
router.get('/:otherUserId', authMiddleware, async (req, res, next) => {
    try {
        const userId = req.user.id;
        const otherUserId = req.params.otherUserId;

        const conversation = await Conversation.findOne({
            members: { $all: [userId, otherUserId] }
        });

        if (!conversation) {
            return res.json([]); 
        }

        // Fetch messages not deleted for everyone AND not deleted for the current user
        const messages = await Message.find({
            conversationId: conversation._id,
            deletedEveryone: false,
            deletedFor: { $nin: [userId] } 
        }).sort({ createdAt: 1 }); 

        res.json(messages);
    } catch (err) {
        next(err);
    }
});

// --- NEW ROUTE: DELETE MESSAGE ---
// @route   DELETE api/messages/:messageId
// @desc    Delete a message (for me or everyone)
// @access  Private
router.delete('/:messageId', authMiddleware, async (req, res, next) => {
    try {
        const messageId = req.params.messageId;
        const userId = req.user.id;
        const { type } = req.query; // Expecting ?type=me or ?type=everyone

        const message = await Message.findById(messageId);

        if (!message) {
            return res.status(404).json("Message not found");
        }

        const conversation = await Conversation.findById(message.conversationId);
        if (!conversation || !conversation.members.includes(userId)) {
             return res.status(403).json("Cannot delete message from this conversation.");
        }

        if (type === 'me') {
            await Message.updateOne(
                { _id: messageId },
                { $addToSet: { deletedFor: userId } }
            );
            res.json({ message: "Message deleted for you." });

        } else if (type === 'everyone') {
            if (message.senderId.toString() !== userId) {
                return res.status(403).json("Only the sender can delete for everyone.");
            }
            
            // Check if anyone besides the sender has read it
            const hasBeenReadByOthers = message.readBy.some(readerId => readerId.toString() !== userId);

            if (hasBeenReadByOthers) {
                return res.status(403).json("Cannot delete for everyone, message has been read.");
            }

            message.deletedEveryone = true;
            message.text = "This message was deleted"; 
            await message.save();
            
            // TODO: Emit socket event 'messageDeletedEveryone' from index.js io.on('connection', ...)
            // Example data to send: { messageId, conversationId }

            res.json({ message: "Message deleted for everyone.", updatedMessage: message });
            
        } else {
            return res.status(400).json("Invalid delete type specified.");
        }

    } catch (err) {
        next(err);
    }
});

module.exports = router;