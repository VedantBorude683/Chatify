const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    text: {
      type: String,
    },
    messageType: {
    type: String,
    enum: ['text', 'image', 'file'], // 'image' for <img>, 'file' for <a>
    default: 'text'
  },
  fileUrl: {
    type: String,
    default: null
  },
    readBy: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'User',
      default: []
    },
    deletedFor: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'User',
        default: [],
    },
    // Tracks if the message was deleted for everyone
    deletedEveryone: {
        type: Boolean,
        default: false,
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Message', MessageSchema);