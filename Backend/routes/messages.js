const router = require('express').Router();
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const authMiddleware = require('../middleware/authMiddleware');

// =====================================================================
// 1. GET MESSAGES (Fixes "0 messages" bug)
// =====================================================================
// @route   GET api/messages/:conversationId
// @desc    Get message history by Conversation ID
// @access  Private
router.get('/:conversationId', authMiddleware, async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { conversationId } = req.params;

        // Validation: Ensure it looks like a valid ID
        if (!conversationId || conversationId.length !== 24) {
            return res.status(400).json([]);
        }

        // Fetch messages for this specific conversation
        const messages = await Message.find({
            conversationId: conversationId,
            deletedEveryone: false,
            deletedFor: { $nin: [userId] } 
        })
        .populate("senderId", "username email profilePicture") // Populates sender info
        .sort({ createdAt: 1 }); 

        res.json(messages);
    } catch (err) {
        next(err);
    }
});

// =====================================================================
// 2. SEND MESSAGE (Fixes "disappearing messages" bug)
// =====================================================================
// @route   POST api/messages/
// @desc    Save to DB first, THEN emit to Socket
// @access  Private

    // @route   POST api/messages/
// @desc    Send a message (Text, Image, or File)
router.post('/', authMiddleware, async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { conversationId, text, messageType, fileUrl, clientId, callInfo } = req.body;

        if (messageType === 'text' && !text) {
             return res.status(400).json("Message text is required");
        }

        let fallbackText = text;
        if (!fallbackText) {
          if (messageType === 'image') fallbackText = 'Sent an image';
          else if (messageType === 'video') fallbackText = 'Sent a video';
          else if (messageType === 'call') fallbackText = `${callInfo?.callType === 'audio' ? 'Audio' : 'Video'} call (${callInfo?.status || 'ended'})`;
          else fallbackText = 'Sent a file';
        }

        // A. Create Message Object
        const newMessage = new Message({
            conversationId,
            senderId: userId,
            text: fallbackText, 
            messageType: messageType || 'text',
            fileUrl: fileUrl || null,
            callInfo: callInfo || undefined,
            readBy: [userId]
        });

        // B. Save to MongoDB
        const savedMessage = await newMessage.save();

        // C. Update Conversation (Last message & timestamp)
        await Conversation.findByIdAndUpdate(conversationId, {
            $set: { 
                lastMessage: savedMessage._id,
                updatedAt: new Date() 
            }
        });

        // D. Populate Sender
        const populatedMessage = await savedMessage.populate('senderId', 'username email avatar status');
        const messageToSend = populatedMessage.toObject();
        if (clientId) {
            messageToSend.clientId = clientId;
        }

        // E. Send via Socket.io
        const io = req.app.get('io'); 
        if (io) {
            io.to(conversationId.toString()).emit("receiveMessage", messageToSend);
        }

        res.status(200).json(messageToSend);

    } catch (err) {
        next(err);
    }
});

// =====================================================================
// 3. DELETE MESSAGE
// =====================================================================
// @route   DELETE api/messages/:messageId
// @desc    Delete a message (for me or everyone)
// @access  Private
router.delete('/:messageId', authMiddleware, async (req, res, next) => {
    try {
        const messageId = req.params.messageId;
        const userId = req.user.id;
        const { type } = req.query; // ?type=me OR ?type=everyone

        const message = await Message.findById(messageId);

        if (!message) {
            return res.status(404).json("Message not found");
        }

        const conversation = await Conversation.findById(message.conversationId);
        // Security check: User must be part of conversation
        if (!conversation || !conversation.members.includes(userId)) {
             return res.status(403).json("Cannot delete message from this conversation.");
        }

        if (type === 'me') {
            // Delete for just this user
            await Message.updateOne(
                { _id: messageId },
                { $addToSet: { deletedFor: userId } }
            );
            res.json({ message: "Message deleted for you." });

        } else if (type === 'everyone') {
            // Delete for everyone (Sender only)
            if (message.senderId.toString() !== userId) {
                return res.status(403).json("Only the sender can delete for everyone.");
            }
            
            // Optional: Prevent delete if read by others
            const hasBeenReadByOthers = message.readBy.some(readerId => readerId.toString() !== userId);
            if (hasBeenReadByOthers) {
                return res.status(403).json("Cannot delete for everyone, message has been read.");
            }

            message.deletedEveryone = true;
            message.text = "This message was deleted"; 
            await message.save();
            
            // Notify clients via Socket
            const io = req.app.get('io');
            if (io) {
                io.to(message.conversationId.toString()).emit('messageDeleted', { 
                    messageId, 
                    conversationId: message.conversationId 
                });
            }

            res.json({ message: "Message deleted for everyone.", updatedMessage: message });
            
        } else {
            return res.status(400).json("Invalid delete type specified.");
        }

    } catch (err) {
        next(err);
    }
});

module.exports = router;