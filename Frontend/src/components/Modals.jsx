import React, { useState, useEffect, Fragment } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, Transition } from '@headlessui/react';
import axios from 'axios';
import {
  XMarkIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  TrashIcon,
  ClipboardDocumentIcon,
  VideoCameraIcon,
  PhoneIcon,
  SparklesIcon,
  UserGroupIcon,
  ArrowRightOnRectangleIcon,
  DocumentArrowDownIcon
} from '@heroicons/react/24/outline';
import { API_BASE_URL } from '../config';

// ==========================================
// 1. SETTINGS MODAL
// ==========================================
export const SettingsModal = ({ isOpen, closeModal, user, onUserUpdated, handleLogout }) => {
  const [displayName, setDisplayName] = useState(user?.username || '');
  const [status, setStatus] = useState(user?.status || '');
  const [location, setLocation] = useState(user?.location || '');
  const [avatarSeed, setAvatarSeed] = useState(user?.username || 'user');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      setDisplayName(user.username || '');
      setStatus(user.status || '');
      setLocation(user.location || '');
      setAvatarSeed(user.username || 'user');
    }
  }, [user]);

  const avatarUrl = user?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${avatarSeed}`;

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.put(
        `${API_BASE_URL}/api/user/onboarding`,
        {
          displayName: displayName.trim(),
          status: status.trim(),
          location: location.trim(),
          avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${avatarSeed}`
        },
        config
      );
      if (onUserUpdated) onUserUpdated(res.data);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      console.error('Failed to update profile:', err);
      alert('Could not update profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={closeModal}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-3xl bg-zinc-900 border border-zinc-800 p-6 sm:p-8 text-left shadow-2xl transition-all">
                <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                  <Dialog.Title as="h3" className="text-xl font-bold text-zinc-100">
                    Profile & Settings
                  </Dialog.Title>
                  <button
                    onClick={closeModal}
                    className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveProfile} className="mt-6 space-y-5">
                  {/* Avatar Section */}
                  <div className="flex flex-col sm:flex-row items-center gap-5 pb-4 border-b border-zinc-800">
                    <img
                      src={avatarUrl}
                      alt={displayName}
                      className="h-20 w-20 rounded-2xl border-2 border-emerald-500/50 bg-zinc-950 p-1 object-cover"
                    />
                    <div className="text-center sm:text-left">
                      <p className="text-sm font-semibold text-zinc-200">Avatar Style</p>
                      <p className="text-xs text-zinc-400 mt-0.5">Randomize your 3D bot persona avatar</p>
                      <button
                        type="button"
                        onClick={() => setAvatarSeed(Math.random().toString(36).substring(7))}
                        className="mt-2.5 inline-flex items-center gap-1.5 rounded-xl bg-zinc-800 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:bg-zinc-700 transition-colors border border-zinc-700/60"
                      >
                        <SparklesIcon className="h-3.5 w-3.5" />
                        Randomize Avatar
                      </button>
                    </div>
                  </div>

                  {/* Username Field */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      required
                    />
                  </div>

                  {/* Email (Read-Only) */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                      Email Address
                    </label>
                    <input
                      type="text"
                      value={user?.email || ''}
                      readOnly
                      className="w-full rounded-xl bg-zinc-950/50 border border-zinc-800/60 px-4 py-2.5 text-sm text-zinc-500 cursor-not-allowed"
                    />
                  </div>

                  {/* Status Message */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                      Status Message
                    </label>
                    <input
                      type="text"
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      placeholder="e.g. Building cool things with Chatify"
                      className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Location */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                      Location
                    </label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. San Francisco, CA"
                      className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Actions */}
                  <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-zinc-800">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-rose-500/10 px-4 py-2.5 text-sm font-semibold text-rose-400 hover:bg-rose-500/20 transition-all border border-rose-500/20"
                    >
                      <ArrowRightOnRectangleIcon className="h-4 w-4" />
                      Log Out
                    </button>

                    <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                      <button
                        type="button"
                        onClick={closeModal}
                        className="rounded-xl px-4 py-2.5 text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-zinc-950 hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                      >
                        {isSaving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

// ==========================================
// 2. START NEW CHAT MODAL
// ==========================================
export const NewChatModal = ({ isOpen, closeModal, usersList, onStartChat }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredUsers = usersList.filter((u) => {
    const q = searchQuery.toLowerCase();
    return u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={closeModal}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-3xl bg-zinc-900 border border-zinc-800 p-6 text-left shadow-2xl transition-all">
                <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                  <div>
                    <Dialog.Title as="h3" className="text-xl font-bold text-zinc-100">
                      Start a New Chat
                    </Dialog.Title>
                    <p className="text-xs text-zinc-400 mt-0.5">Select a user to begin synchronous messaging</p>
                  </div>
                  <button
                    onClick={closeModal}
                    className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

                {/* Search Bar */}
                <div className="mt-4 relative">
                  <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name or email..."
                    className="w-full rounded-xl bg-zinc-950 border border-zinc-800 pl-10 pr-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* User List */}
                <div className="mt-4 max-h-72 overflow-y-auto space-y-1.5 pr-1">
                  {filteredUsers.length === 0 ? (
                    <div className="text-center py-8 text-zinc-500 text-sm">
                      No matching users found.
                    </div>
                  ) : (
                    filteredUsers.map((u) => {
                      const avatar = u.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.username}`;
                      return (
                        <div
                          key={u._id}
                          onClick={() => onStartChat(u)}
                          className="flex items-center gap-3.5 p-3 rounded-2xl hover:bg-zinc-800/60 cursor-pointer transition-colors border border-transparent hover:border-zinc-700/40"
                        >
                          <img
                            src={avatar}
                            alt={u.username}
                            className="h-11 w-11 rounded-xl bg-zinc-950 border border-zinc-800 object-cover"
                          />
                          <div className="flex-grow min-w-0">
                            <p className="text-sm font-semibold text-zinc-100 truncate">{u.username}</p>
                            <p className="text-xs text-zinc-400 truncate">{u.status || u.email}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

// ==========================================
// 3. CREATE GROUP MODAL
// ==========================================
export const CreateGroupModal = ({ isOpen, closeModal, usersList, onCreateGroup }) => {
  const [groupName, setGroupName] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const toggleSelectUser = (id) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((uId) => uId !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!groupName.trim() || selectedUserIds.length < 2) {
      alert('Please specify a group name and choose at least 2 other members.');
      return;
    }
    onCreateGroup(groupName.trim(), selectedUserIds);
    setGroupName('');
    setSelectedUserIds([]);
    closeModal();
  };

  const filteredUsers = usersList.filter((u) =>
    u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={closeModal}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-3xl bg-zinc-900 border border-zinc-800 p-6 text-left shadow-2xl transition-all">
                <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                  <div>
                    <Dialog.Title as="h3" className="text-xl font-bold text-zinc-100">
                      Create a Group
                    </Dialog.Title>
                    <p className="text-xs text-zinc-400 mt-0.5">Collaborate with multiple members</p>
                  </div>
                  <button
                    onClick={closeModal}
                    className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                      Group Name
                    </label>
                    <input
                      type="text"
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      placeholder="e.g. Engineering Squad"
                      className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>

                  {/* Selected count */}
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span>Select Members (Min. 2)</span>
                    <span className="font-semibold text-emerald-400">
                      {selectedUserIds.length} Selected
                    </span>
                  </div>

                  {/* User Selection List */}
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Filter users..."
                      className="w-full rounded-xl bg-zinc-950 border border-zinc-800 pl-9 pr-3 py-2 text-xs text-zinc-100 focus:outline-none"
                    />
                  </div>

                  <div className="max-h-56 overflow-y-auto space-y-1 border border-zinc-800/80 rounded-2xl p-2 bg-zinc-950/40">
                    {filteredUsers.map((u) => {
                      const isSelected = selectedUserIds.includes(u._id);
                      const avatar = u.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.username}`;
                      return (
                        <div
                          key={u._id}
                          onClick={() => toggleSelectUser(u._id)}
                          className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-emerald-500/10 border border-emerald-500/30 text-white'
                              : 'hover:bg-zinc-800/50 text-zinc-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <img src={avatar} alt={u.username} className="h-9 w-9 rounded-xl bg-zinc-900 object-cover" />
                            <span className="text-sm font-medium">{u.username}</span>
                          </div>
                          {isSelected && <CheckCircleIcon className="h-5 w-5 text-emerald-400" />}
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-3 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="rounded-xl px-4 py-2.5 text-sm font-medium text-zinc-400 hover:bg-zinc-800 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-zinc-950 hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20"
                    >
                      Create Group
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

// ==========================================
// 4. CONTACT / GROUP INFO PANEL (SLIDE-OVER)
// ==========================================
export const ContactInfoPanel = ({
  chat,
  isOpen,
  closePanel,
  onlineUsers,
  currentUser,
  onStartCall,
  onStartLiveStream
}) => {
  if (!isOpen || !chat) return null;

  const isGroup = chat.isGroup;
  const otherUser = isGroup ? null : chat.members?.find((m) => m._id !== currentUser?._id);
  const avatarUrl = isGroup
    ? chat.groupAvatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${chat._id}`
    : otherUser?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${otherUser?.username || 'User'}`;

  const isOtherOnline = otherUser ? onlineUsers.includes(otherUser._id) : false;

  return (
    <AnimatePresence>
      <motion.aside
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="absolute top-0 right-0 h-full w-full sm:w-80 bg-zinc-900 border-l border-zinc-800 z-30 flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h4 className="font-bold text-zinc-100 text-sm">
            {isGroup ? 'Group Information' : 'Contact Details'}
          </h4>
          <button
            onClick={closePanel}
            className="p-1 rounded-full text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-grow overflow-y-auto p-6 flex flex-col items-center text-center">
          <div className="relative mb-4">
            <img
              src={avatarUrl}
              alt={isGroup ? chat.groupName : otherUser?.username}
              className="h-24 w-24 rounded-3xl border-2 border-zinc-700 bg-zinc-950 p-1 object-cover shadow-xl"
            />
            {!isGroup && (
              <span
                className={`absolute bottom-1 right-1 h-4 w-4 rounded-full border-2 border-zinc-900 ${
                  isOtherOnline ? 'bg-emerald-400' : 'bg-zinc-600'
                }`}
              />
            )}
          </div>

          <h3 className="text-xl font-bold text-zinc-100">
            {isGroup ? chat.groupName : otherUser?.username}
          </h3>
          <p className="text-xs text-zinc-400 mt-1">
            {isGroup
              ? `${chat.members?.length || 0} Members in Group`
              : isOtherOnline
              ? 'Active Now'
              : 'Offline'}
          </p>

          {/* Quick Action Buttons */}
          <div className="mt-6 flex items-center justify-center gap-3 w-full">
            {!isGroup && (
              <>
                <button
                  onClick={() => onStartCall(false)}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-zinc-800 py-2.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 hover:text-white transition-all border border-zinc-700/60"
                >
                  <PhoneIcon className="h-4 w-4 text-emerald-400" />
                  Audio Call
                </button>
                <button
                  onClick={() => onStartCall(true)}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-500 py-2.5 text-xs font-bold text-zinc-950 hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20"
                >
                  <VideoCameraIcon className="h-4 w-4" />
                  Video Call
                </button>
              </>
            )}

            {isGroup && (
              <button
                onClick={onStartLiveStream}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 py-3 text-sm font-bold text-zinc-950 hover:brightness-110 transition-all shadow-lg shadow-emerald-500/20"
              >
                <VideoCameraIcon className="h-5 w-5" />
                Go Live / Start Video Stream
              </button>
            )}
          </div>

          {/* Details Section */}
          <div className="mt-8 w-full text-left space-y-4">
            {!isGroup && otherUser && (
              <>
                <div className="rounded-2xl bg-zinc-950/60 border border-zinc-800/80 p-3.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">About / Status</p>
                  <p className="mt-1 text-sm text-zinc-200">{otherUser.status || 'No status set'}</p>
                </div>

                <div className="rounded-2xl bg-zinc-950/60 border border-zinc-800/80 p-3.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Email</p>
                  <p className="mt-1 text-sm text-zinc-200 truncate">{otherUser.email}</p>
                </div>

                {otherUser.location && (
                  <div className="rounded-2xl bg-zinc-950/60 border border-zinc-800/80 p-3.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Location</p>
                    <p className="mt-1 text-sm text-zinc-200">{otherUser.location}</p>
                  </div>
                )}
              </>
            )}

            {isGroup && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">
                  Members ({chat.members?.length || 0})
                </p>
                <div className="space-y-2">
                  {chat.members?.map((member) => {
                    const isOnline = onlineUsers.includes(member._id);
                    const isAdmin = member._id === (chat.groupAdmin?._id || chat.groupAdmin);
                    const memberAvatar = member.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${member.username}`;
                    return (
                      <div
                        key={member._id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/50 border border-zinc-800/60"
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <img src={memberAvatar} alt={member.username} className="h-9 w-9 rounded-xl bg-zinc-900 object-cover" />
                            <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-zinc-950 ${isOnline ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-zinc-200">{member.username}</p>
                            <p className="text-[10px] text-zinc-500">{isOnline ? 'Online' : 'Offline'}</p>
                          </div>
                        </div>
                        {isAdmin && (
                          <span className="text-[10px] font-bold uppercase rounded-md bg-emerald-500/10 text-emerald-400 px-2 py-0.5 border border-emerald-500/20">
                            Admin
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
};

// ==========================================
// 5. MESSAGE CONTEXT MENU
// ==========================================
export const MessageContextMenu = ({ x, y, message, user, onDelete, closeMenu }) => {
  if (!message._id || message._id.startsWith('temp_') || !user) return null;

  const isSender = message.senderId === user._id || message.senderId?._id === user._id;
  const showDeleteForEveryone = isSender && !message.deletedEveryone;

  // Reposition inside bounds
  const menuWidth = 190;
  const menuHeight = showDeleteForEveryone ? 120 : 80;
  let left = x;
  let top = y;
  if (x + menuWidth > window.innerWidth) left = window.innerWidth - menuWidth - 12;
  if (y + menuHeight > window.innerHeight) top = y - menuHeight - 12;

  useEffect(() => {
    const handleClickOutside = () => closeMenu();
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [closeMenu]);

  const handleCopyText = () => {
    if (message.text) {
      navigator.clipboard.writeText(message.text);
    }
    closeMenu();
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      style={{ top, left }}
      className="fixed z-50 w-48 overflow-hidden rounded-2xl bg-zinc-900/95 border border-zinc-700/80 p-1.5 shadow-2xl backdrop-blur-xl text-zinc-200"
    >
      {message.text && (
        <button
          onClick={handleCopyText}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium hover:bg-zinc-800 hover:text-white transition-colors"
        >
          <ClipboardDocumentIcon className="h-4 w-4 text-zinc-400" />
          Copy Text
        </button>
      )}

      <button
        onClick={() => onDelete(message, 'me')}
        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium hover:bg-zinc-800 hover:text-white transition-colors"
      >
        <TrashIcon className="h-4 w-4 text-zinc-400" />
        Delete for Me
      </button>

      {showDeleteForEveryone && (
        <button
          onClick={() => onDelete(message, 'everyone')}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors"
        >
          <TrashIcon className="h-4 w-4 text-rose-400" />
          Delete for Everyone
        </button>
      )}
    </motion.div>
  );
};
