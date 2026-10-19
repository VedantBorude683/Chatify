import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import TextareaAutosize from 'react-textarea-autosize';
import { io } from 'socket.io-client';
import {
  MagnifyingGlassIcon,
  PlusCircleIcon,
  Cog6ToothIcon,
  PhoneIcon,
  VideoCameraIcon,
  PaperAirplaneIcon,
  PaperClipIcon,
  DocumentIcon,
  ArrowLeftIcon,
  EllipsisVerticalIcon,
  CheckIcon,
  PlayCircleIcon,
  SparklesIcon,
  UserGroupIcon,
  UserPlusIcon,
  SignalIcon,
  ArrowDownTrayIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { CheckBadgeIcon } from '@heroicons/react/24/solid';

import NavigationRail from '../components/NavigationRail';
import VideoCallModal from '../components/VideoCallModal';
import LiveStreamModal from '../components/LiveStreamModal';
import {
  SettingsModal,
  NewChatModal,
  CreateGroupModal,
  ContactInfoPanel,
  MessageContextMenu
} from '../components/Modals';
import { API_BASE_URL, SOCKET_URL } from '../config';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [selectedChat, setSelectedChat] = useState(null);
  const selectedChatRef = useRef(null);
  const [conversations, setConversations] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [activeView, setActiveView] = useState('chats'); // 'chats' | 'streams'
  const [activeTab, setActiveTab] = useState('All'); // 'All' | 'Direct' | 'Groups'
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Panels
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  const [isInfoPanelOpen, setIsInfoPanelOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [lightboxMedia, setLightboxMedia] = useState(null);

  // Video Calling & Live Streaming
  const [callState, setCallState] = useState({
    isActive: false,
    isIncoming: false,
    isVideo: true,
    peerUser: null,
    callerSignal: null,
    conversationId: null
  });

  const [liveStreamState, setLiveStreamState] = useState({
    isOpen: false,
    isHost: false,
    conversation: null
  });

  // Real-time Presence & Typing
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState({}); // { conversationId: { userId: username } }

  const socket = useRef(null);
  const typingTimeout = useRef({});
  const chatContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  // Keep ref up to date
  useEffect(() => {
    selectedChatRef.current = selectedChat;
  }, [selectedChat]);

  // 1. Initial User Fetch
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/');
          return;
        }
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const res = await axios.get(`${API_BASE_URL}/api/user/me`, config);
        setUser(res.data);
      } catch (err) {
        localStorage.removeItem('token');
        navigate('/');
      }
    };
    fetchUserData();
  }, [navigate]);

  // 2. Fetch Conversations and Users List
  const refreshConversations = async () => {
    if (!user) return;
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const [convosRes, usersRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/conversations`, config),
        axios.get(`${API_BASE_URL}/api/user`, config)
      ]);
      setConversations(convosRes.data || []);
      setUsersList(usersRes.data || []);
    } catch (err) {
      console.error('Failed to load chats or users:', err);
    }
  };

  useEffect(() => {
    refreshConversations();
  }, [user]);

  // 3. Setup Socket Connection & Signaling
  useEffect(() => {
    if (!user) return;

    const newSocket = io(SOCKET_URL);
    socket.current = newSocket;

    newSocket.on('connect', () => {
      console.log('✅ Connected to Chatify Socket:', newSocket.id);
      newSocket.emit('addUser', user._id);
    });

    newSocket.on('getOnlineUsers', (users) => {
      setOnlineUsers(users || []);
    });

    // Real-time message listener
    newSocket.on('receiveMessage', (messageData) => {
      console.log('⚡ Socket receiveMessage:', messageData);
      if (!messageData) return;

      const currentSelected = selectedChatRef.current;
      const isForCurrentChat = currentSelected && messageData.conversationId === currentSelected._id;

      if (isForCurrentChat) {
        setMessages((prev) => {
          // Check if already in list
          if (messageData._id && prev.some((m) => m._id === messageData._id)) {
            return prev;
          }

          // Check if it replaces optimistic message with tempId
          let tempIdx = -1;
          if (messageData.clientId) {
            tempIdx = prev.findIndex((m) => m._id === messageData.clientId);
          }
          if (tempIdx === -1 && messageData.senderId?._id === user._id) {
            tempIdx = prev.findLastIndex(
              (m) => m._id.startsWith('temp_') && m.text === messageData.text
            );
          }

          if (tempIdx !== -1) {
            const updated = [...prev];
            updated[tempIdx] = messageData;
            return updated;
          }

          const nextList = [...prev, messageData];
          nextList.sort((a, b) => new Date(a.createdAt || a.timestamp) - new Date(b.createdAt || b.timestamp));
          return nextList;
        });

        // Clear typing status for sender
        const senderId = messageData.senderId?._id || messageData.senderId;
        setTypingUsers((prev) => {
          const convoTypers = { ...(prev[messageData.conversationId] || {}) };
          delete convoTypers[senderId];
          return { ...prev, [messageData.conversationId]: convoTypers };
        });
      }

      // Update sidebar conversation preview
      setConversations((prev) => {
        const found = prev.some((c) => c._id === messageData.conversationId);
        if (!found) {
          refreshConversations();
          return prev;
        }
        return prev
          .map((convo) => {
            if (convo._id === messageData.conversationId) {
              const isCurrent = currentSelected && currentSelected._id === convo._id;
              return {
                ...convo,
                lastMessage: messageData,
                unreadCount: isCurrent ? 0 : (convo.unreadCount || 0) + 1,
                updatedAt: new Date().toISOString()
              };
            }
            return convo;
          })
          .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
      });
    });

    // Typing Indicators
    newSocket.on('userTyping', ({ conversationId, senderId, senderUsername }) => {
      setTypingUsers((prev) => ({
        ...prev,
        [conversationId]: {
          ...(prev[conversationId] || {}),
          [senderId]: senderUsername
        }
      }));
    });

    newSocket.on('userStoppedTyping', ({ conversationId, senderId }) => {
      setTypingUsers((prev) => {
        const convoTypers = { ...(prev[conversationId] || {}) };
        delete convoTypers[senderId];
        return { ...prev, [conversationId]: convoTypers };
      });
    });

    // Message Deletion
    newSocket.on('messageDeleted', ({ messageId, conversationId }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === messageId
            ? { ...msg, deletedEveryone: true, text: 'This message was deleted' }
            : msg
        )
      );
    });

    // Incoming Video/Audio Call
    newSocket.on('call:incoming', ({ signal, from, callerName, callerAvatar, isVideo, conversationId }) => {
      console.log('📞 Incoming call from:', callerName, { isVideo });
      setCallState({
        isActive: true,
        isIncoming: true,
        isVideo,
        peerUser: { _id: from, username: callerName, avatar: callerAvatar },
        callerSignal: signal,
        conversationId
      });
    });

    // Live Stream Broadcast Notifications
    newSocket.on('stream:started', ({ conversationId, streamTitle, host }) => {
      console.log('🔴 Live stream started in room:', conversationId);
      setConversations((prev) =>
        prev.map((c) =>
          c._id === conversationId
            ? {
                ...c,
                activeStream: {
                  isLive: true,
                  hostId: host,
                  streamTitle
                }
              }
            : c
        )
      );
    });

    newSocket.on('stream:ended', ({ conversationId }) => {
      setConversations((prev) =>
        prev.map((c) =>
          c._id === conversationId
            ? {
                ...c,
                activeStream: { isLive: false, hostId: null }
              }
            : c
        )
      );
    });

    return () => {
      newSocket.disconnect();
    };
  }, [user]);

  // 4. Fetch Messages when Chat Changes
  useEffect(() => {
    if (!selectedChat || selectedChat._id.startsWith('temp_')) {
      setMessages([]);
      return;
    }

    const fetchMessages = async () => {
      try {
        const token = localStorage.getItem('token');
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const res = await axios.get(
          `${API_BASE_URL}/api/messages/${selectedChat._id}`,
          config
        );
        const fetched = res.data || [];
        fetched.sort((a, b) => new Date(a.createdAt || a.timestamp) - new Date(b.createdAt || b.timestamp));
        setMessages(fetched);

        // Mark as read
        if (selectedChat.unreadCount > 0) {
          await axios.put(
            `${API_BASE_URL}/api/conversations/${selectedChat._id}/read`,
            {},
            config
          );
          setConversations((prev) =>
            prev.map((c) => (c._id === selectedChat._id ? { ...c, unreadCount: 0 } : c))
          );
        }

        // Scroll to bottom
        setTimeout(() => {
          if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
          }
        }, 60);
      } catch (err) {
        console.error('Failed to fetch messages for conversation:', err);
      }
    };

    fetchMessages();
  }, [selectedChat]);

  // Auto-scroll on new message
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages.length]);

  // 5. Send Text Message (Optimistic + Synchronous Socket + DB)
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() || !user || !selectedChat) return;

    const messageText = newMessage.trim();
    const tempId = `temp_${Date.now()}_${Math.random()}`;
    const timestamp = new Date().toISOString();

    const optimisticMessage = {
      _id: tempId,
      clientId: tempId,
      senderId: user,
      conversationId: selectedChat._id,
      text: messageText,
      messageType: 'text',
      fileUrl: null,
      readBy: [user._id],
      timestamp,
      createdAt: timestamp,
      deletedEveryone: false
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setNewMessage('');

    // Stop typing timeout
    const convoId = selectedChat._id;
    if (typingTimeout.current[convoId]) {
      clearTimeout(typingTimeout.current[convoId]);
      delete typingTimeout.current[convoId];
    }
    if (socket.current) {
      socket.current.emit('stopTyping', { senderId: user._id, conversationId: convoId });
    }

    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.post(
        `${API_BASE_URL}/api/messages`,
        {
          conversationId: selectedChat._id,
          text: messageText,
          messageType: 'text',
          clientId: tempId
        },
        config
      );

      const savedMessage = res.data;
      setMessages((prev) => prev.map((m) => (m._id === tempId ? savedMessage : m)));
    } catch (err) {
      console.error('Failed to send message:', err);
      setMessages((prev) => prev.filter((m) => m._id !== tempId));
      alert('Could not send message. Please try again.');
    }
  };

  // 6. Send File or Image or Video
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user || !selectedChat) return;

    const tempId = `temp_${Date.now()}_${Math.random()}`;
    const timestamp = new Date().toISOString();
    let messageType = 'file';
    if (file.type.startsWith('image/')) messageType = 'image';
    else if (file.type.startsWith('video/')) messageType = 'video';

    const optimisticMessage = {
      _id: tempId,
      clientId: tempId,
      senderId: user,
      conversationId: selectedChat._id,
      text: file.name,
      messageType,
      fileUrl: URL.createObjectURL(file),
      readBy: [user._id],
      timestamp,
      createdAt: timestamp,
      isUploading: true
    };

    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('token');
      const uploadRes = await axios.post(`${API_BASE_URL}/api/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });

      const { fileUrl } = uploadRes.data;

      const postRes = await axios.post(
        `${API_BASE_URL}/api/messages`,
        {
          conversationId: selectedChat._id,
          text: file.name,
          messageType,
          fileUrl,
          clientId: tempId
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const savedMessage = postRes.data;
      setMessages((prev) => prev.map((m) => (m._id === tempId ? savedMessage : m)));
    } catch (err) {
      console.error('File upload failed:', err);
      setMessages((prev) => prev.filter((m) => m._id !== tempId));
      alert('Failed to upload file.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // 7. Typing Indicator Handler
  const handleTyping = () => {
    if (!socket.current || !selectedChat || !user) return;
    const convoId = selectedChat._id;
    socket.current.emit('startTyping', {
      conversationId: convoId,
      senderId: user._id,
      senderUsername: user.username
    });

    if (typingTimeout.current[convoId]) {
      clearTimeout(typingTimeout.current[convoId]);
    }

    typingTimeout.current[convoId] = setTimeout(() => {
      if (socket.current) {
        socket.current.emit('stopTyping', {
          conversationId: convoId,
          senderId: user._id
        });
      }
      delete typingTimeout.current[convoId];
    }, 2500);
  };

  // 8. Delete Message
  const handleDeleteMessage = async (message, type) => {
    if (!message._id || message._id.startsWith('temp_')) return;
    setContextMenu(null);

    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` },
        params: { type }
      };

      const res = await axios.delete(
        `${API_BASE_URL}/api/messages/${message._id}`,
        config
      );

      if (type === 'me') {
        setMessages((prev) => prev.filter((m) => m._id !== message._id));
      } else if (type === 'everyone') {
        const updated = res.data.updatedMessage || {
          ...message,
          deletedEveryone: true,
          text: 'This message was deleted'
        };
        setMessages((prev) => prev.map((m) => (m._id === message._id ? updated : m)));
      }
    } catch (err) {
      console.error('Failed to delete message:', err);
      alert('Could not delete message');
    }
  };

  // 9. Start New Chat or Select Existing
  const handleStartNewChat = async (targetUser) => {
    setIsNewChatModalOpen(false);
    if (!user || !targetUser || targetUser._id === user._id) return;

    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.post(
        `${API_BASE_URL}/api/conversations/findOrCreate`,
        { userId: targetUser._id },
        config
      );
      const conversation = res.data;

      setConversations((prev) => {
        const exists = prev.some((c) => c._id === conversation._id);
        const nextList = exists
          ? prev.map((c) => (c._id === conversation._id ? conversation : c))
          : [conversation, ...prev];
        return nextList.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
      });

      setSelectedChat(conversation);
      if (socket.current) {
        socket.current.emit('joinConversation', conversation._id);
      }
    } catch (err) {
      console.error('Failed to start chat:', err);
      alert('Could not start conversation');
    }
  };

  // 10. Create Group
  const handleCreateGroup = async (groupName, memberIds) => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.post(
        `${API_BASE_URL}/api/groups`,
        { name: groupName, members: memberIds },
        config
      );
      const newGroup = res.data;

      setConversations((prev) => [newGroup, ...prev]);
      setSelectedChat(newGroup);

      if (socket.current) {
        socket.current.emit('joinNewGroupRoom', { conversationId: newGroup._id });
      }
    } catch (err) {
      console.error('Failed to create group:', err);
      alert('Failed to create group');
    }
  };

  // 11. Start Call (Audio or Video)
  const handleInitiateCall = (isVideo = true) => {
    if (!selectedChat || selectedChat.isGroup) {
      alert('1-on-1 calls are available with direct contacts. For groups, use Live Stream!');
      return;
    }
    const otherUser = selectedChat.members?.find((m) => m._id !== user._id);
    if (!otherUser) return;

    setCallState({
      isActive: true,
      isIncoming: false,
      isVideo,
      peerUser: otherUser,
      callerSignal: null,
      conversationId: selectedChat._id
    });
  };

  // 12. Start Live Video Stream (Broadcast)
  const handleStartLiveStream = () => {
    if (!selectedChat) return;
    setLiveStreamState({
      isOpen: true,
      isHost: true,
      conversation: selectedChat
    });
  };

  const handleJoinLiveStream = (convo) => {
    setLiveStreamState({
      isOpen: true,
      isHost: false,
      conversation: convo
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    if (socket.current) socket.current.disconnect();
    window.location.href = '/';
  };

  if (!user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-zinc-950 text-zinc-300">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500 text-zinc-950 font-black text-2xl animate-pulse shadow-lg shadow-emerald-500/20">
            C
          </div>
          <p className="text-sm font-medium text-zinc-400">Loading Chatify...</p>
        </div>
      </div>
    );
  }

  // Filter Conversations by Tab and Search
  const filteredConversations = conversations.filter((c) => {
    if (activeTab === 'Direct' && c.isGroup) return false;
    if (activeTab === 'Groups' && !c.isGroup) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (c.isGroup) return c.groupName?.toLowerCase().includes(q);
      const other = c.members?.find((m) => m._id !== user._id);
      return other?.username?.toLowerCase().includes(q) || other?.email?.toLowerCase().includes(q);
    }
    return true;
  });

  // Typing users for current selected chat
  const currentChatTyping = typingUsers[selectedChat?._id] || {};
  const activeTypers = Object.entries(currentChatTyping)
    .filter(([id]) => id !== user._id)
    .map(([, name]) => name);

  let typingBannerText = '';
  if (activeTypers.length === 1) typingBannerText = `${activeTypers[0]} is typing...`;
  else if (activeTypers.length === 2)
    typingBannerText = `${activeTypers[0]} and ${activeTypers[1]} are typing...`;
  else if (activeTypers.length > 2)
    typingBannerText = `${activeTypers[0]} and ${activeTypers.length - 1} others are typing...`;

  const anyLiveStream = conversations.find((c) => c.activeStream?.isLive);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-zinc-950 text-zinc-200 antialiased font-sans">
      {/* 1. Left Vertical Navigation Rail (Replaces old dummy servers!) */}
      <NavigationRail
        activeView={activeView}
        setActiveView={setActiveView}
        onOpenNewChat={() => setIsNewChatModalOpen(true)}
        onOpenCreateGroup={() => setIsCreateGroupModalOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onLogout={handleLogout}
        currentUser={user}
        hasLiveStream={!!anyLiveStream}
      />

      {/* 2. Main Content Split View */}
      <div className="relative flex flex-grow overflow-hidden">
        {/* ========================================== */}
        {/* CONVERSATION & CHAT LIST SIDEBAR           */}
        {/* ========================================== */}
        <motion.aside
          className={`absolute inset-y-0 left-0 z-20 w-full sm:w-88 md:w-96 flex flex-col border-r border-zinc-800/80 bg-zinc-900/90 backdrop-blur-2xl transition-all md:static ${
            selectedChat && window.innerWidth < 768 ? '-translate-x-full' : 'translate-x-0'
          }`}
        >
          {/* Header */}
          <header className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/80">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img
                  src={user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`}
                  alt={user.username}
                  className="h-10 w-10 rounded-2xl border border-zinc-700 bg-zinc-950 object-cover"
                />
                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-400 border-2 border-zinc-900"></span>
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-zinc-100 truncate">{user.username}</h2>
                <p className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Active Now
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsNewChatModalOpen(true)}
                className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
                title="New Chat"
              >
                <UserPlusIcon className="h-5 w-5" />
              </button>
              <button
                onClick={() => setIsCreateGroupModalOpen(true)}
                className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
                title="Create Group"
              >
                <UserGroupIcon className="h-5 w-5" />
              </button>
            </div>
          </header>

          {/* Search Bar */}
          <div className="px-5 py-3 border-b border-zinc-800/60">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="w-full rounded-xl bg-zinc-950 border border-zinc-800/80 pl-10 pr-4 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/80"
              />
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 px-5 py-2.5 border-b border-zinc-800/60">
            {['All', 'Direct', 'Groups'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`relative rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  activeTab === tab
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Active Live Broadcast Banner in Sidebar if any */}
          {anyLiveStream && (
            <div className="mx-4 my-2.5 rounded-2xl bg-gradient-to-r from-rose-500/20 via-pink-500/10 to-transparent border border-rose-500/30 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-rose-500 animate-ping"></span>
                  <p className="text-xs font-bold uppercase tracking-wider text-rose-400">
                    Live Stream Happening
                  </p>
                </div>
                <button
                  onClick={() => handleJoinLiveStream(anyLiveStream)}
                  className="rounded-lg bg-rose-500 px-2.5 py-1 text-xs font-bold text-white hover:bg-rose-400 shadow transition-all"
                >
                  Watch
                </button>
              </div>
              <p className="mt-1 text-xs text-zinc-300 font-medium truncate">
                {anyLiveStream.activeStream?.streamTitle || anyLiveStream.groupName}
              </p>
            </div>
          )}

          {/* Conversation List */}
          <div className="flex-grow overflow-y-auto px-2 py-2 space-y-1">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-xs">
                No conversations found.
                <button
                  onClick={() => setIsNewChatModalOpen(true)}
                  className="mt-3 block mx-auto text-emerald-400 font-semibold hover:underline"
                >
                  + Start a new chat
                </button>
              </div>
            ) : (
              filteredConversations.map((convo) => {
                const isSelected = selectedChat?._id === convo._id;
                const isGroup = convo.isGroup;
                const otherUser = isGroup
                  ? null
                  : convo.members?.find((m) => m._id !== user._id);

                const chatName = isGroup ? convo.groupName : otherUser?.username || 'User';
                const chatAvatar = isGroup
                  ? convo.groupAvatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${convo._id}`
                  : otherUser?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${otherUser?.username || 'User'}`;

                const isOnline = otherUser ? onlineUsers.includes(otherUser._id) : false;
                const isStreamingNow = convo.activeStream?.isLive;

                const lastMsg = convo.lastMessage;
                let previewText = 'No messages yet';
                if (lastMsg) {
                  if (lastMsg.deletedEveryone) previewText = '🗑️ Message deleted';
                  else if (lastMsg.messageType === 'image') previewText = '📷 Photo';
                  else if (lastMsg.messageType === 'video') previewText = '🎥 Video';
                  else if (lastMsg.messageType === 'call') previewText = '📞 Call';
                  else if (lastMsg.messageType === 'file') previewText = '📎 File attachment';
                  else previewText = lastMsg.text || 'Message';
                }

                return (
                  <div
                    key={convo._id}
                    onClick={() => {
                      setSelectedChat(convo);
                      if (socket.current) {
                        socket.current.emit('joinConversation', convo._id);
                      }
                    }}
                    className={`group relative flex items-center gap-3.5 p-3 rounded-2xl cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-zinc-800 border border-zinc-700/80 shadow-md'
                        : 'hover:bg-zinc-800/40 border border-transparent'
                    }`}
                  >
                    {/* Active Bar Indicator */}
                    {isSelected && (
                      <motion.div
                        layoutId="active-chat-pill"
                        className="absolute left-1 top-2.5 bottom-2.5 w-1 rounded-full bg-emerald-400"
                      />
                    )}

                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <img
                        src={chatAvatar}
                        alt={chatName}
                        className="h-12 w-12 rounded-2xl bg-zinc-950 border border-zinc-800 object-cover"
                      />
                      {!isGroup && (
                        <span
                          className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-zinc-900 ${
                            isOnline ? 'bg-emerald-400' : 'bg-zinc-600'
                          }`}
                        />
                      )}
                      {isStreamingNow && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white shadow animate-pulse">
                          ●
                        </span>
                      )}
                    </div>

                    {/* Chat Text Details */}
                    <div className="flex-grow min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-zinc-100 truncate flex items-center gap-1.5">
                          {chatName}
                          {isGroup && (
                            <span className="text-[10px] text-zinc-500 font-normal">
                              ({convo.members?.length || 0})
                            </span>
                          )}
                        </p>
                        {isStreamingNow && (
                          <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">
                            LIVE
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-zinc-400 truncate max-w-[170px]">
                          {previewText}
                        </p>
                        {convo.unreadCount > 0 && (
                          <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[11px] font-bold text-zinc-950">
                            {convo.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </motion.aside>

        {/* ========================================== */}
        {/* MAIN SYNCHRONOUS CHAT AREA                 */}
        {/* ========================================== */}
        {selectedChat ? (
          <main className="relative flex flex-grow flex-col h-full bg-zinc-950 overflow-hidden">
            {/* Chat Top Header */}
            <header className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/80 bg-zinc-900/60 backdrop-blur-xl z-10 flex-shrink-0">
              <div
                onClick={() => setIsInfoPanelOpen(true)}
                className="flex items-center gap-3.5 cursor-pointer group min-w-0"
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedChat(null);
                  }}
                  className="md:hidden p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-white"
                >
                  <ArrowLeftIcon className="h-5 w-5" />
                </button>

                {/* Avatar */}
                <div className="relative">
                  <img
                    src={
                      selectedChat.isGroup
                        ? selectedChat.groupAvatar ||
                          `https://api.dicebear.com/7.x/identicon/svg?seed=${selectedChat._id}`
                        : selectedChat.members?.find((m) => m._id !== user._id)?.avatar ||
                          `https://api.dicebear.com/7.x/bottts/svg?seed=${
                            selectedChat.members?.find((m) => m._id !== user._id)?.username || 'User'
                          }`
                    }
                    alt={selectedChat.groupName || 'Chat'}
                    className="h-11 w-11 rounded-2xl bg-zinc-900 border border-zinc-700/80 object-cover group-hover:border-emerald-500/60 transition-colors"
                  />
                  {!selectedChat.isGroup && (
                    <span
                      className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-zinc-950 ${
                        onlineUsers.includes(
                          selectedChat.members?.find((m) => m._id !== user._id)?._id
                        )
                          ? 'bg-emerald-400'
                          : 'bg-zinc-600'
                      }`}
                    />
                  )}
                </div>

                {/* Info Text */}
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-zinc-100 truncate group-hover:text-emerald-400 transition-colors">
                    {selectedChat.isGroup
                      ? selectedChat.groupName
                      : selectedChat.members?.find((m) => m._id !== user._id)?.username}
                  </h3>
                  <div className="h-4 flex items-center">
                    {typingBannerText ? (
                      <p className="text-xs text-emerald-400 animate-pulse font-medium">
                        {typingBannerText}
                      </p>
                    ) : selectedChat.isGroup ? (
                      <p className="text-xs text-zinc-400">
                        {selectedChat.members?.length || 0} Members
                        {selectedChat.activeStream?.isLive && (
                          <span className="ml-2 text-rose-400 font-bold uppercase">• Streaming Now</span>
                        )}
                      </p>
                    ) : onlineUsers.includes(
                        selectedChat.members?.find((m) => m._id !== user._id)?._id
                      ) ? (
                      <p className="text-xs text-emerald-400 flex items-center gap-1 font-medium">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        Online
                      </p>
                    ) : (
                      <p className="text-xs text-zinc-500">Offline</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Header Action Buttons */}
              <div className="flex items-center gap-2">
                {/* 1-on-1: Audio Call Button */}
                {!selectedChat.isGroup && (
                  <button
                    onClick={() => handleInitiateCall(false)}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white transition-all border border-zinc-700/60"
                    title="Start Audio Call"
                  >
                    <PhoneIcon className="h-5 w-5" />
                  </button>
                )}

                {/* 1-on-1: Video Call Button */}
                {!selectedChat.isGroup && (
                  <button
                    onClick={() => handleInitiateCall(true)}
                    className="flex h-10 px-3.5 items-center gap-2 rounded-xl bg-emerald-500 text-zinc-950 font-bold hover:bg-emerald-400 transition-all shadow-md shadow-emerald-500/20"
                    title="Start Video Call"
                  >
                    <VideoCameraIcon className="h-5 w-5 text-zinc-950" />
                    <span className="hidden sm:inline text-xs">Video Call</span>
                  </button>
                )}

                {/* Group: Go Live / Live Video Stream */}
                {selectedChat.isGroup && (
                  <button
                    onClick={
                      selectedChat.activeStream?.isLive
                        ? () => handleJoinLiveStream(selectedChat)
                        : handleStartLiveStream
                    }
                    className={`flex h-10 px-3.5 items-center gap-2 rounded-xl font-bold text-xs transition-all ${
                      selectedChat.activeStream?.isLive
                        ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30 animate-pulse'
                        : 'bg-emerald-500 text-zinc-950 hover:bg-emerald-400 shadow-md shadow-emerald-500/20'
                    }`}
                  >
                    <SignalIcon className="h-4 w-4" />
                    <span>{selectedChat.activeStream?.isLive ? 'Watch Stream' : 'Go Live'}</span>
                  </button>
                )}

                {/* Contact Info Toggle */}
                <button
                  onClick={() => setIsInfoPanelOpen(!isInfoPanelOpen)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
                >
                  <EllipsisVerticalIcon className="h-5 w-5" />
                </button>
              </div>
            </header>

            {/* Active Live Stream Indicator Bar in Chat */}
            {selectedChat.activeStream?.isLive && (
              <div className="flex items-center justify-between bg-rose-500/10 border-b border-rose-500/20 px-6 py-2.5 text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse"></span>
                  <span className="font-bold text-rose-400 uppercase">Live Stream Active:</span>
                  <span className="text-zinc-200">
                    {selectedChat.activeStream?.streamTitle || 'Live Video'}
                  </span>
                </div>
                <button
                  onClick={() => handleJoinLiveStream(selectedChat)}
                  className="rounded-lg bg-rose-500 px-3 py-1 font-bold text-white hover:bg-rose-400 transition-all text-xs"
                >
                  Join Stream
                </button>
              </div>
            )}

            {/* Message List */}
            <div
              ref={chatContainerRef}
              onClick={() => setContextMenu(null)}
              className="flex-grow overflow-y-auto p-4 sm:p-6 space-y-3 bg-zinc-950/80"
            >
              {messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center p-8">
                  <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-zinc-900 border border-zinc-800 text-emerald-400 mb-3 shadow-lg">
                    <SparklesIcon className="h-8 w-8" />
                  </div>
                  <h4 className="text-base font-bold text-zinc-200">Synchronous Chat Ready</h4>
                  <p className="mt-1 text-xs text-zinc-400 max-w-xs">
                    Send a message, photo, or start a video call right away.
                  </p>
                </div>
              ) : (
                messages.map((msg, index) => {
                  const sender = msg.senderId;
                  const isMyMessage =
                    user && (sender === user._id || sender?._id === user._id);

                  const senderUsername = sender?.username || 'User';
                  const senderAvatar =
                    sender?.avatar ||
                    `https://api.dicebear.com/7.x/bottts/svg?seed=${senderUsername}`;

                  return (
                    <motion.div
                      key={msg._id || msg.clientId || index}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.15 }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        if (msg.deletedEveryone) return;
                        setContextMenu({ x: e.clientX, y: e.clientY, message: msg });
                      }}
                      className={`flex flex-col ${isMyMessage ? 'items-end' : 'items-start'}`}
                    >
                      {/* Group Sender Name */}
                      {selectedChat.isGroup && !isMyMessage && (
                        <div className="flex items-center gap-1.5 mb-1 ml-2 text-xs text-zinc-400 font-medium">
                          <img src={senderAvatar} alt="" className="h-4 w-4 rounded-full" />
                          <span>{senderUsername}</span>
                        </div>
                      )}

                      <div className={`flex items-end gap-2 max-w-[85%] sm:max-w-[70%]`}>
                        {/* Bubble */}
                        <div
                          className={`rounded-2xl p-3 text-sm shadow-md transition-all ${
                            isMyMessage
                              ? 'bg-emerald-500 text-zinc-950 rounded-br-xs font-medium'
                              : 'bg-zinc-800/90 text-zinc-100 rounded-bl-xs border border-zinc-700/60'
                          }`}
                        >
                          {/* Deleted message view */}
                          {msg.deletedEveryone ? (
                            <span className="italic text-xs opacity-75">
                              🗑️ This message was deleted
                            </span>
                          ) : msg.messageType === 'image' ? (
                            <div className="space-y-1.5">
                              <img
                                src={msg.fileUrl}
                                alt="Image"
                                onClick={() =>
                                  setLightboxMedia({ isOpen: true, url: msg.fileUrl, type: 'image' })
                                }
                                className="max-h-64 rounded-xl object-cover cursor-pointer hover:opacity-95 transition-opacity"
                              />
                              {msg.text && msg.text !== 'Sent an image' && (
                                <p className="text-xs pt-1">{msg.text}</p>
                              )}
                            </div>
                          ) : msg.messageType === 'video' ? (
                            <div className="space-y-1.5">
                              <video
                                src={msg.fileUrl}
                                controls
                                className="max-h-64 rounded-xl bg-black"
                              />
                              {msg.text && msg.text !== 'Sent a video' && (
                                <p className="text-xs pt-1">{msg.text}</p>
                              )}
                            </div>
                          ) : msg.messageType === 'file' ? (
                            <a
                              href={msg.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className={`flex items-center gap-3 p-2 rounded-xl transition-colors ${
                                isMyMessage
                                  ? 'bg-emerald-600/30 hover:bg-emerald-600/40 text-zinc-950'
                                  : 'bg-zinc-900/60 hover:bg-zinc-900 text-zinc-100'
                              }`}
                            >
                              <DocumentIcon className="h-8 w-8 flex-shrink-0" />
                              <div className="min-w-0">
                                <p className="text-xs font-bold truncate">{msg.text || 'File'}</p>
                                <p className="text-[10px] opacity-75">Download attachment</p>
                              </div>
                              <ArrowDownTrayIcon className="h-4 w-4 ml-auto" />
                            </a>
                          ) : msg.messageType === 'call' ? (
                            <div className="flex items-center gap-2 text-xs font-semibold">
                              <PhoneIcon className="h-4 w-4" />
                              <span>{msg.text}</span>
                            </div>
                          ) : (
                            <p className="whitespace-pre-wrap break-words leading-relaxed">
                              {msg.text}
                            </p>
                          )}

                          {/* Footer with Time and Status */}
                          <div
                            className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                              isMyMessage ? 'text-zinc-800' : 'text-zinc-400'
                            }`}
                          >
                            <span>
                              {new Date(msg.createdAt || msg.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                            {isMyMessage && !msg.deletedEveryone && (
                              <span>
                                {msg._id?.startsWith('temp_') ? (
                                  '• Sending'
                                ) : (
                                  <CheckBadgeIcon className="h-3.5 w-3.5 inline text-zinc-900" />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* Message Input Footer */}
            <footer className="p-4 border-t border-zinc-800/80 bg-zinc-900/60 backdrop-blur-xl flex-shrink-0">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
                accept="image/*,video/*,application/pdf,.doc,.docx,.txt,.zip"
              />

              <form
                onSubmit={handleSendMessage}
                className="flex items-end gap-2 rounded-2xl bg-zinc-950 border border-zinc-800/80 p-1.5 focus-within:border-emerald-500/80 transition-colors"
              >
                {/* Attach File Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-zinc-400 hover:text-emerald-400 transition-colors rounded-xl hover:bg-zinc-900"
                  title="Upload photo, video or document"
                >
                  <PaperClipIcon className="h-5 w-5" />
                </button>

                {/* Auto-growing Text Input */}
                <TextareaAutosize
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    handleTyping();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e);
                    }
                  }}
                  placeholder="Type a message..."
                  maxRows={5}
                  className="flex-grow bg-transparent px-2 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none resize-none leading-relaxed"
                />

                {/* Send Button */}
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 text-zinc-950 shadow-md hover:bg-emerald-400 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <PaperAirplaneIcon className="h-4 w-4" />
                </button>
              </form>
            </footer>
          </main>
        ) : (
          /* Empty Chat Placeholder */
          <div className="hidden md:flex flex-grow flex-col items-center justify-center bg-zinc-950 p-8 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-zinc-900 border border-zinc-800 text-emerald-400 shadow-xl mb-4">
              <SignalIcon className="h-10 w-10 animate-pulse" />
            </div>
            <h2 className="text-xl font-bold text-zinc-100">Welcome to Chatify</h2>
            <p className="mt-1.5 text-sm text-zinc-400 max-w-sm">
              Select a conversation to start synchronous messaging, make WebRTC video calls, or watch live streams.
            </p>
            <button
              onClick={() => setIsNewChatModalOpen(true)}
              className="mt-6 rounded-xl bg-emerald-500 px-5 py-2.5 text-xs font-bold text-zinc-950 hover:bg-emerald-400 shadow-lg shadow-emerald-500/20 transition-all"
            >
              Start New Conversation
            </button>
          </div>
        )}

        {/* Contact/Group Info Slide-over Panel */}
        <ContactInfoPanel
          chat={selectedChat}
          isOpen={isInfoPanelOpen}
          closePanel={() => setIsInfoPanelOpen(false)}
          onlineUsers={onlineUsers}
          currentUser={user}
          onStartCall={(isVideo) => {
            setIsInfoPanelOpen(false);
            handleInitiateCall(isVideo);
          }}
          onStartLiveStream={() => {
            setIsInfoPanelOpen(false);
            handleStartLiveStream();
          }}
        />
      </div>

      {/* ========================================== */}
      {/* MODALS & OVERLAYS                          */}
      {/* ========================================== */}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        closeModal={() => setIsSettingsOpen(false)}
        user={user}
        onUserUpdated={(updated) => setUser(updated)}
        handleLogout={handleLogout}
      />

      {/* New Direct Chat Modal */}
      <NewChatModal
        isOpen={isNewChatModalOpen}
        closeModal={() => setIsNewChatModalOpen(false)}
        usersList={usersList.filter((u) => u._id !== user._id)}
        onStartChat={handleStartNewChat}
      />

      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={isCreateGroupModalOpen}
        closeModal={() => setIsCreateGroupModalOpen(false)}
        usersList={usersList.filter((u) => u._id !== user._id)}
        onCreateGroup={handleCreateGroup}
      />

      {/* Message Context Menu */}
      {contextMenu && (
        <MessageContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          message={contextMenu.message}
          user={user}
          onDelete={handleDeleteMessage}
          closeMenu={() => setContextMenu(null)}
        />
      )}

      {/* Video Call Modal & PiP Floating Widget */}
      {callState.isActive && (
        <VideoCallModal
          callState={callState}
          currentUser={user}
          socket={socket}
          onEndCall={() => {
            setCallState({
              isActive: false,
              isIncoming: false,
              isVideo: true,
              peerUser: null,
              callerSignal: null,
              conversationId: null
            });
          }}
        />
      )}

      {/* Live Video Broadcast Modal */}
      {liveStreamState.isOpen && (
        <LiveStreamModal
          isOpen={liveStreamState.isOpen}
          isHost={liveStreamState.isHost}
          conversation={liveStreamState.conversation}
          currentUser={user}
          socket={socket}
          onClose={() =>
            setLiveStreamState({ isOpen: false, isHost: false, conversation: null })
          }
        />
      )}

      {/* Media Lightbox for Images/Videos */}
      {lightboxMedia && (
        <div
          onClick={() => setLightboxMedia(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 cursor-pointer"
        >
          <img
            src={lightboxMedia.url}
            alt=""
            className="max-h-[90vh] max-w-[90vw] rounded-2xl object-contain shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}