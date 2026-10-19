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
      enum: ['text', 'image', 'file', 'video', 'call'],
      default: 'text'
    },
    fileUrl: {
      type: String,
      default: null
    },
    callInfo: {
      callType: { type: String, enum: ['audio', 'video'], default: 'video' },
      duration: { type: Number, default: 0 },
      status: { type: String, enum: ['completed', 'missed', 'declined'], default: 'completed' }
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