const router = require('express').Router();
const Conversation = require('../models/Conversation');
const Message = require('../models/Message'); // Need Message model
const authMiddleware = require('../middleware/authMiddleware');

// @route   GET api/conversations
// @desc    Get all conversations for the logged-in user with unread counts
// @access  Private
router.get('/', authMiddleware, async (req, res, next) => {
    try {
        const userId = req.user.id;
        
        // Find conversations the user is a member of
        let conversations = await Conversation.find({
            members: { $in: [userId] }
        })
        .populate('members', '-password') // Populate member details
        .populate({ // Populate the last message details
            path: 'lastMessage',
            select: 'text senderId createdAt readBy' // Select specific fields
        }) 
        .sort({ updatedAt: -1 });

        // Efficiently calculate unread counts for each conversation
        const conversationsWithUnread = await Promise.all(
            conversations.map(async (convo) => {
                const unreadCount = await Message.countDocuments({
                    conversationId: convo._id,
                    senderId: { $ne: userId }, // Messages not sent by the current user
                    readBy: { $nin: [userId] } // Where the current user is NOT in readBy array
                });
                // Return a plain object to avoid potential Mongoose object modification issues
                return { ...convo.toObject(), unreadCount }; 
            })
        );

        res.json(conversationsWithUnread);
    } catch (err) {
        next(err);
    }
});

// @route   PUT api/conversations/:conversationId/read
// @desc    Mark messages in a conversation as read
// @access  Private
router.put('/:conversationId/read', authMiddleware, async (req, res, next) => {
    try {
        await Message.updateMany(
            { 
                conversationId: req.params.conversationId, 
                senderId: { $ne: req.user.id }, // Only mark messages sent by others
                readBy: { $ne: req.user.id }  // Only update if not already read
            }, 
            { $addToSet: { readBy: req.user.id } } // Add current user to readBy array
        );
        res.status(200).json("Messages marked as read.");
    } catch (err) {
        next(err);
    }
});
// @route   POST api/conversations/findOrCreate
// @desc    Find an existing 1-on-1 chat or create a new one
// @access  Private
router.post('/findOrCreate', authMiddleware, async (req, res, next) => {
    try {
        const currentUserId = req.user.id;
        const otherUserId = req.body.userId; // Matches { userId: chatUser._id } from Dashboard.jsx

        if (!otherUserId) {
            return res.status(400).json({ msg: "User ID is required" });
        }

        // 1. Check if a 1-on-1 conversation already exists between these two
        let conversation = await Conversation.findOne({
            isGroup: false, 
            members: { $all: [currentUserId, otherUserId] }
        })
        .populate('members', '-password')
        .populate('lastMessage');

        // 2. If it exists, return it
        if (conversation) {
            return res.json(conversation);
        }

        // 3. If not, create a new one
        const newConversation = new Conversation({
            members: [currentUserId, otherUserId],
            isGroup: false
        });

        const savedConversation = await newConversation.save();

        // Populate details so the frontend can display avatars immediately
        const populatedConversation = await Conversation.findById(savedConversation._id)
            .populate('members', '-password');

        res.status(200).json(populatedConversation);

    } catch (err) {
        next(err);
    }
});
module.exports = router;