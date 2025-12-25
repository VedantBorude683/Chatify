const express = require('express');
const router = express.Router();
const Conversation = require('../models/Conversation');
// Make sure this path to your auth middleware is correct
const  protect  = require('../middleware/authMiddleware'); 

// @route   POST /api/groups
// @desc    Create a new group chat
// @access  Private
router.post('/', protect, async (req, res) => {
  const { name, members } = req.body; // 'name' = group name, 'members' = array of user IDs

  if (!name || !members || members.length < 2) {
    return res.status(400).json({ msg: 'Please provide a group name and at least two members (excluding yourself).' });
  }

  try {
    // Add the current user (the creator) to the members list
    const allMembers = [...members, req.user.id];

    const newGroup = new Conversation({
      groupName: name,
      members: allMembers,
      isGroup: true,
      groupAdmin: req.user.id, // The creator is the admin
    });

    const savedGroup = await newGroup.save();

    // Send back the full conversation object, populated with user details
    const fullGroup = await Conversation.findById(savedGroup._id)
                                        .populate('members', '-password') // Populate all members
                                        .populate('groupAdmin', '-password'); // Populate the admin

    res.status(201).json(fullGroup);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;