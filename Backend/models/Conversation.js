const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ConversationSchema = new Schema({
  members: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  lastMessage: {
    type: Schema.Types.ObjectId,
    ref: 'Message'
  },
  
  // --- NEW FIELDS FOR GROUPS ---
  isGroup: {
    type: Boolean,
    default: false
  },
  groupName: {
    type: String,
    trim: true,
    default: null
  },
  groupAdmin: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  groupAvatar: {
    type: String,
    default: null
  },
  activeStream: {
    isLive: { type: Boolean, default: false },
    hostId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    streamTitle: { type: String, default: '' },
    startedAt: { type: Date, default: null }
  }
  // --- END NEW FIELDS ---
  
}, { timestamps: true });

module.exports = mongoose.model('Conversation', ConversationSchema);