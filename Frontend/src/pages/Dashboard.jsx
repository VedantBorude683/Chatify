import React, { useState, useEffect, useRef, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import TextareaAutosize from 'react-textarea-autosize';
import { io } from 'socket.io-client';
import { Dialog, Transition, Menu } from '@headlessui/react';
import { 
  MagnifyingGlassIcon, BellIcon, PlusCircleIcon, Cog6ToothIcon, PhoneIcon, VideoCameraIcon, 
  PaperAirplaneIcon, FaceSmileIcon, XMarkIcon, CheckCircleIcon, EllipsisVerticalIcon, ArrowLeftIcon, TrashIcon,
  PaperClipIcon, DocumentIcon // <-- ADDED THESE
} from '@heroicons/react/24/outline';
import { HashtagIcon, LockClosedIcon } from '@heroicons/react/24/solid';

// --- Helper Components (Unchanged) ---
const ServerIcon = ({ icon, name, active }) => (
  <div className="relative group">
    <motion.div
      className={`absolute left-0 top-1/2 -translate-y-1/2 h-0 w-1 rounded-r-full bg-white transition-all duration-200 ${active ? 'h-10' : 'group-hover:h-5'}`}
    />
    <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
      <div className={`h-12 w-12 rounded-2xl flex items-center justify-center cursor-pointer transition-all duration-200 ${active ? 'bg-teal-600 rounded-2xl' : 'bg-gray-700 rounded-3xl group-hover:bg-teal-600 group-hover:rounded-2xl'}`}>
        {icon}
      </div>
    </motion.div>
  </div>
);

const TypingIndicator = () => (
    <motion.div 
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="flex justify-start mb-4 items-end gap-2"
    >
        <div className="bg-gray-700 rounded-2xl py-3 px-4 flex items-center gap-1">
            <motion.span animate={{ y: [0, -4, 0] }} transition={{ duration: 0.8, repeat: Infinity, delay: 0 }} className="h-2 w-2 bg-gray-500 rounded-full" />
            <motion.span animate={{ y: [0, -4, 0] }} transition={{ duration: 0.8, repeat: Infinity, delay: 0.2 }} className="h-2 w-2 bg-gray-500 rounded-full" />
            <motion.span animate={{ y: [0, -4, 0] }} transition={{ duration: 0.8, repeat: Infinity, delay: 0.4 }} className="h-2 w-2 bg-gray-500 rounded-full" />
        </div>
    </motion.div>
);

const SettingsModal = ({ isOpen, closeModal, user, handleLogout }) => (
  <Transition appear show={isOpen} as={Fragment}>
    <Dialog as="div" className="relative z-50" onClose={closeModal}>
      <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
      </Transition.Child>
      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4 text-center">
          <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
            <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-gray-800/80 border border-white/10 p-6 text-left align-middle shadow-xl transition-all">
              <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-white">Settings</Dialog.Title>
              <div className="mt-4 flex flex-col items-center">
                <img src={`https://i.pravatar.cc/150?u=${user.email}`} alt={user.username} className="h-24 w-24 rounded-full" />
                <h4 className="mt-4 text-xl font-semibold text-white">{user.username}</h4>
                <p className="text-gray-400">{user.email}</p>
              </div>
              <div className="mt-6">
                <button onClick={handleLogout} className="w-full rounded-md bg-red-600/80 py-2 font-semibold text-white hover:bg-red-700">Logout</button>
              </div>
              <button onClick={closeModal} className="absolute top-4 right-4 text-gray-400 hover:text-white"><XMarkIcon className="h-6 w-6" /></button>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </div>
    </Dialog>
  </Transition>
);

const ContactInfoPanel = ({ chat, isOpen, closePanel, onlineUsers }) => (
    <AnimatePresence>
      {isOpen && chat && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="absolute top-0 right-0 h-full w-full md:w-[300px] bg-gray-800 border-l border-gray-700 z-30 flex flex-col"
        >
          <header className="flex items-center gap-4 p-4 border-b border-gray-700">
            <button onClick={closePanel} className="text-gray-400 hover:text-white"><XMarkIcon className="h-6 w-6" /></button>
            <h3 className="font-semibold text-white">Contact Info</h3>
          </header>
          <div className="flex flex-col items-center p-6">
            <img src={`https://i.pravatar.cc/150?u=${chat.email}`} alt={chat.username} className="h-24 w-24 rounded-full" />
            <h4 className="mt-4 text-xl font-semibold text-white">{chat.username}</h4>
            <p className="text-gray-400 text-sm mt-1">{onlineUsers.includes(chat._id) ? 'Online' : 'Offline'}</p>
            <p className="text-gray-400 text-sm mt-4">{chat.status || "No status available"}</p>
            <p className="text-gray-400 text-sm mt-1">{chat.location || "Location not set"}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
);

const NewChatModal = ({ isOpen, closeModal, usersList, onStartChat }) => (
  <Transition appear show={isOpen} as={Fragment}>
    <Dialog as="div" className="relative z-50" onClose={closeModal}>
      <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
      </Transition.Child>
      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4 text-center">
          <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
            <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-gray-800/80 border border-white/10 p-6 text-left align-middle shadow-xl transition-all">
              <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-white">Start a New Chat</Dialog.Title>
              <p className="mt-1 text-sm text-gray-400">Select a user to begin a conversation.</p>
              <div className="mt-4 max-h-80 overflow-y-auto">
                {usersList.map(user => (
                  <div key={user._id} onClick={() => onStartChat(user)}
                    className="flex items-center p-3 cursor-pointer rounded-lg hover:bg-white/10 transition-colors">
                    <img src={`https://i.pravatar.cc/150?u=${user.email}`} alt={user.username} className="h-10 w-10 rounded-full" />
                    <div className="ml-4">
                      <p className="font-semibold text-white">{user.username}</p>
                      <p className="text-sm text-gray-500">{user.status || "No status"}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={closeModal} className="absolute top-4 right-4 text-gray-400 hover:text-white"><XMarkIcon className="h-6 w-6" /></button>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </div>
    </Dialog>
  </Transition>
);

// --- Context Menu Component (Unchanged) ---
const MessageContextMenu = ({ x, y, message, user, onDelete, closeMenu }) => {
  if (!message._id || message._id.startsWith('temp_')) {
    return null;
  }
  const isSender = message.senderId === user._id;
  const readByOthers = message.readBy?.some(readerId => readerId !== user._id) ?? false;
  const alreadyDeletedEveryone = message.deletedEveryone;
  const showDeleteForEveryone = isSender && !readByOthers && !alreadyDeletedEveryone;
  const menuWidth = 190;
  const menuHeight = showDeleteForEveryone ? 90 : 50;
  let left = x;
  let top = y;
  let direction = "down";
  if (x + menuWidth > window.innerWidth) {
    left = window.innerWidth - menuWidth - 10;
  }
  if (y + menuHeight > window.innerHeight) {
    top = y - menuHeight - 10;
    direction = "up";
  }
  useEffect(() => {
    const handleClickOutside = () => closeMenu();
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [closeMenu]);
  return (
    <motion.div
      key="context-menu"
      className="absolute backdrop-blur-md bg-gray-800/90 text-white rounded-xl shadow-2xl border border-gray-700/50 overflow-hidden z-50"
      style={{ top, left, transformOrigin: direction === "up" ? "bottom center" : "top center" }}
      initial={{ opacity: 0, scale: 0.8, y: direction === "up" ? 15 : -15 }}
      animate={{ opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 200, damping: 18 } }}
      exit={{ opacity: 0, scale: 0.9, y: direction === "up" ? 15 : -15, transition: { duration: 0.15 } }}
    >
      <motion.button
        whileHover={{ backgroundColor: "rgba(255,255,255,0.05)", x: 3 }}
        whileTap={{ scale: 0.97 }}
        className="block w-full text-left px-5 py-2 text-sm font-medium hover:text-white transition-all duration-150"
        onClick={() => onDelete(message, 'me')}
      >
        <TrashIcon className="h-4 w-4 inline mr-2" /> Delete for me
      </motion.button>
      {showDeleteForEveryone && (
        <motion.button
          whileHover={{ backgroundColor: "rgba(239,68,68,0.15)", x: 3 }}
          whileTap={{ scale: 0.97 }}
          className="block w-full text-left px-5 py-2 text-sm font-medium text-red-400 hover:text-red-500 transition-all duration-150"
          onClick={() => onDelete(message, 'everyone')}
        >
          <TrashIcon className="h-4 w-4 inline mr-2" /> Delete for everyone
        </motion.button>
      )}
    </motion.div>
  );
};


function Dashboard() {
  const [user, setUser] = useState(null);
  const [selectedChat, setSelectedChat] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isInfoPanelOpen, setIsInfoPanelOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [contextMenu, setContextMenu] = useState(null);
  const socket = useRef(null);
  const typingTimeout = useRef(null);
  const navigate = useNavigate();
  const chatContainerRef = useRef(null);
  const fileInputRef = useRef(null); // <-- ADDED THIS

  const servers = [
    { id: '1', name: 'Work', icon: <HashtagIcon className="h-6 w-6 text-white" /> },
    { id: '2', name: 'Gaming', icon: <LockClosedIcon className="h-6 w-6 text-white" /> },
  ];

  // --- User and Data Fetching (Unchanged) ---
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) { navigate('/'); return; }
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const res = await axios.get('http://localhost:3001/api/user/me', config);
        setUser(res.data);
      } catch (err) {
        localStorage.removeItem('token');
        navigate('/');
      }
    };
    fetchUserData();
  }, [navigate]);
  
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        const token = localStorage.getItem('token');
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const convosRes = await axios.get('http://localhost:3001/api/conversations', config);
        setConversations(convosRes.data);
        const usersRes = await axios.get('http://localhost:3001/api/user/', config);
        setUsersList(usersRes.data);
      } catch (err) {
        console.error("Failed to fetch data:", err);
      }
    };
    fetchData();
  }, [user]);

  // --- Socket Connection (Unchanged) ---
  useEffect(() => {
    if (user) {
      const newSocket = io('http://localhost:3001');
      socket.current = newSocket;
      newSocket.on('connect', () => {
        newSocket.emit('addUser', user._id);
      });
      newSocket.on('getOnlineUsers', (users) => {
        setOnlineUsers(users);
      });
      return () => {
        newSocket.disconnect();
      };
    }
  }, [user]);

  // --- Socket Event Listeners (Unchanged, but robust) ---
  useEffect(() => {
    if (socket.current) {
      const messageListener = (data) => {
        if (!user) return; 
        setMessages((prevMessages) => {
            let tempMsgIndex = -1;
            if (data.clientId) {
                tempMsgIndex = prevMessages.findIndex(msg => msg._id === data.clientId);
            }
            if (tempMsgIndex === -1 && data.timestamp) {
                const tempId = `temp_${data.timestamp}`;
                tempMsgIndex = prevMessages.findIndex(msg => msg._id === tempId);
            }
            if (tempMsgIndex === -1 && data.senderId === user._id) {
                tempMsgIndex = prevMessages.findLastIndex(msg =>
                    msg._id.startsWith('temp_') &&
                    msg.senderId === user._id &&
                    msg.text === data.text
                );
            }
            if (tempMsgIndex !== -1) {
                const updatedMessages = [...prevMessages];
                updatedMessages[tempMsgIndex] = data;
                return updatedMessages;
            }
            if (selectedChat) {
                const isFromOtherUser = data.senderId === selectedChat._id;
                const isFromMe = data.senderId === user._id;
                if ((isFromOtherUser || isFromMe) && !prevMessages.some(m => m._id === data._id)) {
                    setIsTyping(false);
                    return [...prevMessages, data];
                }
            }
            return prevMessages;
        });
        setConversations(prev => prev.map(convo => {
             if (convo._id === data.conversationId) {
                 return { ...convo, lastMessage: data };
             }
             return convo;
        }));
      };
      
      const typingListener = (data) => {
        if (selectedChat && data.senderId === selectedChat._id) setIsTyping(true);
      };
      const stopTypingListener = (data) => {
        if (selectedChat && data.senderId === selectedChat._id) setIsTyping(false);
      };
      const newUnreadListener = (data) => {
          if (!selectedChat || data.senderId !== selectedChat._id) {
              setConversations(prev => prev.map(convo =>
                  convo._id === data.conversationId
                      ? { ...convo, unreadCount: (convo.unreadCount || 0) + 1 }
                      : convo
              ));
          }
      };
      const deleteListener = (data) => {
         setMessages(prev => prev.map(msg =>
            msg._id === data.messageId ? { ...msg, deletedEveryone: true, text: "This message was deleted" } : msg
        ));
         setConversations(prev => prev.map(convo => {
             if (convo._id === data.conversationId && convo.lastMessage?._id === data.messageId) {
                 return { ...convo, lastMessage: { ...convo.lastMessage, text: "This message was deleted"} };
             }
             return convo;
         }));
      };
      socket.current.on('receiveMessage', messageListener);
      socket.current.on('userTyping', typingListener);
      socket.current.on('userStoppedTyping', stopTypingListener);
      socket.current.on('newUnreadMessage', newUnreadListener);
      socket.current.on('messageDeleted', deleteListener);
      return () => {
        socket.current.off('receiveMessage', messageListener);
        socket.current.off('userTyping', typingListener);
        socket.current.off('userStoppedTyping', stopTypingListener);
        socket.current.off('newUnreadMessage', newUnreadListener);
        socket.current.off('messageDeleted', deleteListener);
      };
    }
  }, [socket.current, selectedChat, user]);

  // --- Message Fetching and Scrolling (Unchanged) ---
  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedChat) return;
      try {
        const token = localStorage.getItem('token');
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const res = await axios.get(`http://localhost:3001/api/messages/${selectedChat._id}`, config);
        setMessages(res.data);
      } catch (err) {
        console.error("Failed to fetch messages:", err);
      }
    };
    fetchMessages();
  }, [selectedChat]);
  
  useEffect(() => {
      if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
  }, [messages]);

  // --- Event Handlers ---
  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/';
  };

  // --- (!!!) UPDATED 'handleSendMessage' (!!!) ---
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (newMessage.trim() === '' || !socket.current || !user || !selectedChat) return;
    
    const timestamp = new Date().toISOString();
    const tempId = `temp_${timestamp}_${Math.random()}`; 

    const optimisticMessage = {
      _id: tempId,
      senderId: user._id,
      recipientId: selectedChat._id,
      text: newMessage,
      timestamp: timestamp, 
      createdAt: timestamp,
      readBy: [user._id],
      deletedEveryone: false,
      deletedFor: [],
      messageType: 'text', // <-- SPECIFY 'text'
      fileUrl: null        // <-- SPECIFY 'null'
    };

    const serverMessageData = {
      senderId: user._id,
      recipientId: selectedChat._id,
      text: newMessage,
      timestamp: timestamp, 
      clientId: tempId,
      messageType: 'text', // <-- SPECIFY 'text'
      fileUrl: null        // <-- SPECIFY 'null'
    };

    socket.current.emit('sendMessage', serverMessageData);
    setMessages(prevMessages => [...prevMessages, optimisticMessage]);
    setNewMessage('');
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    socket.current.emit('stopTyping', { senderId: user._id, recipientId: selectedChat._id });
  };

  // --- (!!!) NEW FILE UPLOAD HANDLER (!!!) ---
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !user || !selectedChat) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: { 
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}` 
        }
      };

      // 1. Upload the file
      const res = await axios.post('http://localhost:3001/api/upload', formData, config);
      const { fileUrl } = res.data;

      // 2. Determine messageType
      let messageType = 'file';
      if (file.type.startsWith('image/')) {
        messageType = 'image';
      }
      
      // 3. Prepare socket message data
      const timestamp = new Date().toISOString();
      const text = file.name; // Use filename as the text content
      const tempId = `temp_${timestamp}_${Math.random()}`; 

      const serverMessageData = {
        senderId: user._id,
        recipientId: selectedChat._id,
        text: text,
        timestamp: timestamp, 
        clientId: tempId,
        messageType: messageType, // 'image' or 'file'
        fileUrl: fileUrl          // The URL from our server
      };
      
      // 4. Create optimistic message
      const optimisticMessage = {
        _id: tempId,
        senderId: user._id,
        recipientId: selectedChat._id,
        text: text,
        timestamp: timestamp, 
        createdAt: timestamp,
        readBy: [user._id],
        deletedEveryone: false,
        deletedFor: [],
        messageType: messageType, // Add to optimistic message
        fileUrl: fileUrl          // Add to optimistic message
      };

      // 5. Emit and update state
      socket.current.emit('sendMessage', serverMessageData);
      setMessages(prevMessages => [...prevMessages, optimisticMessage]);

    } catch (err) {
      console.error("File upload failed:", err.response ? err.response.data : err.message);
      alert("File upload failed.");
    }
    
    // Clear the file input so user can select same file again
    if(fileInputRef.current) {
        fileInputRef.current.value = null;
    }
  };

  const handleStartNewChat = (chatUser) => {
    setSelectedChat(chatUser);
    setMessages([]);
    setIsNewChatModalOpen(false);
  };

  const handleTyping = () => {
    if (!socket.current || !selectedChat) return;
    socket.current.emit('startTyping', { senderId: user._id, recipientId: selectedChat._id });
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket.current.emit('stopTyping', { senderId: user._id, recipientId: selectedChat._id });
    }, 2000);
  };

  const showContextMenu = (e, message) => {
      e.preventDefault();
      if (message.deletedEveryone || !message._id || message._id.startsWith('temp_')) {
          return;
      }
      setContextMenu({ x: e.clientX, y: e.clientY, message });
  };
  const closeContextMenu = () => setContextMenu(null);

  const handleDeleteMessage = async (message, type) => {
      if (!message._id || message._id.startsWith('temp_')) {
          console.warn("Cannot delete unsaved message.");
          closeContextMenu();
          return;
      }
      closeContextMenu();
      const token = localStorage.getItem('token');
      const config = {
          headers: { Authorization: `Bearer ${token}` },
          params: { type }
      };
      try {
          const res = await axios.delete(`http://localhost:3001/api/messages/${message._id}`, config);
          if (type === 'me') {
              setMessages(prev => prev.filter(msg => msg._id !== message._id));
          } else if (type === 'everyone') {
              const updatedMsg = res.data.updatedMessage;
              setMessages(prev => prev.map(msg =>
                  msg._id === message._id ? updatedMsg : msg
              ));
              if (socket.current && selectedChat) {
                  socket.current.emit('notifyDeleteEveryone', {
                      messageId: message._id,
                      conversationId: message.conversationId,
                      recipientId: selectedChat._id
                  });
              }
          }
      } catch (err) {
          console.error("Failed to delete message:", err);
          alert(err.response?.data?.message || err.response?.data || "Could not delete message.");
      }
  };

  // --- Render ---
  if (!user) {
    return <div className="flex h-screen items-center justify-center bg-gray-900 text-white">Loading...</div>;
  }

  return (
    <div className="flex h-screen w-full bg-black text-gray-300 overflow-hidden noise-bg">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] bg-gradient-to-br from-teal-500/20 via-purple-500/10 to-transparent blur-3xl opacity-50 animate-pulse" style={{ animationDuration: '15s' }}></div>

      <SettingsModal isOpen={isSettingsOpen} closeModal={() => setIsSettingsOpen(false)} user={user} handleLogout={handleLogout} />
      <NewChatModal isOpen={isNewChatModalOpen} closeModal={() => setIsNewChatModalOpen(false)} usersList={usersList} onStartChat={handleStartNewChat} />

      <motion.div initial={{ x: -100 }} animate={{ x: 0 }} transition={{ duration: 0.5 }}
        className="hidden md:flex w-20 h-screen bg-black/20 backdrop-blur-xl border-r border-white/5 flex-col items-center py-4 space-y-4 flex-shrink-0"
      >
        {servers.map((server, index) => <ServerIcon key={server.id} icon={server.icon} name={server.name} active={index === 0} />)}
      </motion.div>

      <div className="flex-grow relative overflow-hidden flex">
        <motion.aside
          className="absolute top-0 left-0 h-full w-full md:w-[350px] md:static bg-black/20 backdrop-blur-xl border-r border-white/5 flex flex-col flex-shrink-0"
          initial={false}
          animate={{ x: selectedChat && window.innerWidth < 768 ? '-100%' : '0%' }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
          {/* --- Sidebar Header (Unchanged) --- */}
          <header className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0">
            <h2 className="text-lg font-bold text-white">{user.username}</h2>
            <div className="flex items-center gap-2">
                <button onClick={() => setIsNewChatModalOpen(true)} className="text-gray-400 hover:text-white"><PlusCircleIcon className="h-6 w-6" /></button>
                <button onClick={() => setIsSettingsOpen(true)} className="text-gray-400 hover:text-white"><Cog6ToothIcon className="h-6 w-6" /></button>
            </div>
          </header>
          {/* --- Sidebar Search (Unchanged) --- */}
          <div className="p-4 border-b border-white/10">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input type="text" placeholder="Search" className="w-full pl-10 pr-4 py-2 rounded-lg bg-gray-900 border border-gray-700 focus:outline-none focus:ring-1 focus:ring-teal-500" />
            </div>
          </div>
          {/* --- Sidebar Tabs (Unchanged) --- */}
          <div className="p-4 border-b border-gray-700">
            <div className="flex space-x-4">
              {['All', 'Friends', 'Groups'].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1 text-sm font-semibold rounded-full relative ${activeTab === tab ? 'text-white' : 'text-gray-400 hover:text-white'}`}>
                  {tab}
                  {activeTab === tab && <motion.div className="absolute bottom-[-8px] left-0 right-0 h-0.5 bg-teal-500" layoutId="active-tab-indicator" />}
                </button>
              ))}
            </div>
          </div>
          
          {/* --- (!!!) UPDATED CONVERSATION LIST (!!!) --- */}
          <div className="flex-grow overflow-y-auto">
            {conversations.map(convo => {
              const otherUser = convo.members.find(member => member._id !== user._id);
              if (!otherUser) return null;
              const isOnline = onlineUsers.includes(otherUser._id);

              const handleSelectChat = async (convo, chatUser) => {
                  setSelectedChat(chatUser);
                  if (convo.unreadCount > 0) {
                      try {
                          const token = localStorage.getItem('token');
                          const config = { headers: { Authorization: `Bearer ${token}` } };
                          await axios.put(`http://localhost:3001/api/conversations/${convo._id}/read`, {}, config);
                          setConversations(prev => prev.map(c => c._id === convo._id ? { ...c, unreadCount: 0 } : c));
                      } catch (err) { console.error("Failed to mark messages as read", err); }
                  }
              };
              
              // --- (!!!) UPDATE LAST MESSAGE PREVIEW (!!!) ---
              const lastMessageText = () => {
                  if (!convo.lastMessage) return "No messages yet";
                  // Check messageType first
                  if (convo.lastMessage.messageType === 'image') return "Sent an image";
                  if (convo.lastMessage.messageType === 'file') return "Sent a file";
                  // Fallback to text
                  return convo.lastMessage.text;
              }

              return (
                <div
                  key={convo._id}
                  onClick={() => handleSelectChat(convo, otherUser)}
                  className={`relative flex items-center p-4 cursor-pointer border-l-2 transition-colors ${selectedChat?._id === otherUser._id ? 'border-teal-400' : 'border-transparent hover:bg-white/5'}`}
                >
                  {selectedChat?._id === otherUser._id && <motion.div layoutId="active-chat-indicator" className="absolute left-0 top-0 bottom-0 w-full h-full bg-gradient-to-r from-teal-500/20 to-transparent" />}
                  <div className="relative z-10">
                    <img src={`https://i.pravatar.cc/150?u=${otherUser.email}`} alt={otherUser.username} className="h-12 w-12 rounded-full" />
                    {isOnline && <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-green-400 border-2 border-gray-800 animate-pulse"></span>}
                  </div>
                  <div className="ml-4 flex-grow z-10 overflow-hidden">
                    <p className="font-semibold text-white">{otherUser.username}</p>
                    {/* --- Use new lastMessageText function --- */}
                    <p className="text-sm text-gray-400 truncate">{lastMessageText()}</p>
                  </div>
                  {convo.unreadCount > 0 && (
                      <div className="ml-2 flex-shrink-0 z-10">
                        <span className="h-6 w-6 flex items-center justify-center rounded-full bg-teal-500 text-white text-xs font-bold">
                          {convo.unreadCount}
                        </span>
                      </div>
                  )}
                </div>
              );
            })}
          </div>
        </motion.aside>

        <AnimatePresence>
          {selectedChat && (
            <motion.main
                className="absolute top-0 left-0 h-full w-full md:static flex-grow flex flex-col bg-gray-900"
                initial={{ x: '100%' }}
                animate={{ x: '0%' }}
                exit={{ x: '100%' }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              {/* --- Chat Header (Unchanged) --- */}
              <header onClick={() => setIsInfoPanelOpen(true)} className="flex items-center justify-between p-4 bg-black/20 backdrop-blur-xl border-b border-white/10 flex-shrink-0 cursor-pointer">
                <div className="flex items-center gap-4">
                  <button onClick={(e) => {e.stopPropagation(); setSelectedChat(null)}} className="md:hidden text-gray-400 hover:text-white">
                      <ArrowLeftIcon className="h-6 w-6" />
                  </button>
                  <img src={`https://i.pravatar.cc/150?u=${selectedChat.email}`} alt={selectedChat.username} className="h-10 w-10 rounded-full" />
                  <div>
                    <p className="font-semibold text-white">{selectedChat.username}</p>
                    {isTyping ? (
                      <p className="text-xs text-teal-400">Typing...</p>
                    ) : onlineUsers.includes(selectedChat._id) ? (
                      <p className="text-xs text-green-400">Online</p>
                    ) : (
                      <p className="text-xs text-gray-500">Offline</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-gray-400">
                  <button className="hover:text-white"><PhoneIcon className="h-6 w-6" /></button>
                  <button className="hover:text-white"><VideoCameraIcon className="h-6 w-6" /></button>
                  <button className="hover:text-white"><EllipsisVerticalIcon className="h-6 w-6" /></button>
                </div>
              </header>
              
              {/* --- (!!!) UPDATED CHAT CONTAINER (!!!) --- */}
              <div ref={chatContainerRef} className="flex-grow p-6 overflow-y-auto bg-black/20 relative" onClick={closeContextMenu}>
                {messages.map((msg, index) => {
                  
                  // --- NEW: Message Content Renderer ---
                  const renderMessageContent = () => {
                    if (msg.deletedEveryone) {
                      return <span className="italic text-gray-400 text-sm">🗑️ This message was deleted</span>;
                    }
                    
                    switch (msg.messageType) {
                      case 'image':
                        return (
                          <img 
                            src={msg.fileUrl} 
                            alt="Uploaded content" 
                            className="max-w-xs md:max-w-sm rounded-lg cursor-pointer" 
                            onClick={() => window.open(msg.fileUrl, '_blank')}
                          />
                        );
                      case 'file':
                        return (
                          <a 
                            href={msg.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            // Use a consistent background for file links
                            className={`flex items-center gap-3 p-3 rounded-lg 
                              ${msg.senderId === user._id ? 'bg-teal-700 hover:bg-teal-800' : 'bg-gray-800 hover:bg-gray-700'}`}
                          >
                            <DocumentIcon className="h-8 w-8 text-teal-300 flex-shrink-0" />
                            <div className="flex flex-col overflow-hidden">
                              <span className="font-semibold truncate">{msg.text}</span>
                              <span className="text-xs text-gray-300">Click to download</span>
                            </div>
                          </a>
                        );
                      case 'text':
                      default:
                        return <span>{msg.text}</span>;
                    }
                  };

                  return (
                   <div
                    key={msg._id || msg.timestamp || index}
                    onContextMenu={(e) => showContextMenu(e, msg)}
                  >
                    <motion.div
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      className={`flex ${msg.senderId === user._id ? 'justify-end' : 'justify-start'} mb-4`}
                    >
                      <div 
                        className={`rounded-2xl max-w-lg flex items-center gap-2 
                          ${msg.senderId === user._id ? 'bg-teal-600 text-white' : 'bg-gray-700 text-gray-200'}
                          ${msg.messageType === 'text' ? 'py-2 px-4' : ''} 
                          ${msg.messageType !== 'text' ? (msg.messageType === 'image' ? 'p-1' : 'p-2') : ''} 
                        `}
                      >
                        {renderMessageContent()}
                        
                        {msg.senderId === user._id && !msg.deletedEveryone && (
                          <CheckCircleIcon 
                            className={`h-4 w-4 text-teal-200 flex-shrink-0 
                            ${msg.messageType !== 'text' ? 'self-end' : ''}`} 
                          />
                        )}
                      </div>
                    </motion.div>
                  </div>
                )})}
                {isTyping && <TypingIndicator />}
              </div>
              
              {/* --- (!!!) UPDATED FOOTER (!!!) --- */}
              <footer className="p-4 bg-black/20 backdrop-blur-xl border-t border-white/10 flex-shrink-0">
                {/* --- (1) ADD HIDDEN FILE INPUT --- */}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange}
                  className="hidden" 
                />
              
                <form onSubmit={handleSendMessage} className="flex items-center bg-gray-900/50 rounded-lg px-2">
                  <motion.button type="button" whileTap={{ scale: 0.9 }} className="text-gray-400 hover:text-white p-2"><PlusCircleIcon className="h-6 w-6" /></motion.button>
                  
                  {/* --- (2) ADD FILE BUTTON --- */}
                  <motion.button 
                    type="button" 
                    whileTap={{ scale: 0.9 }} 
                    className="text-gray-400 hover:text-white p-2"
                    onClick={() => fileInputRef.current && fileInputRef.current.click()} // <-- Triggers input
                  >
                    <PaperClipIcon className="h-6 w-6" />
                  </motion.button>
                  
                  <TextareaAutosize
                    placeholder="Type a message..."
                    value={newMessage}
                    onInput={handleTyping}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(e); } }} maxRows={5}
                    className="flex-grow px-3 py-3 bg-transparent focus:outline-none text-white resize-none"
                  />
                  <motion.button type="button" whileTap={{ scale: 0.9 }} className="text-gray-400 hover:text-yellow-400 p-2"><FaceSmileIcon className="h-6 w-6" /></motion.button>
                  <motion.button type="submit" whileTap={{ scale: 0.9 }} className="bg-teal-600 text-white p-2 rounded-full hover:bg-teal-700 m-1 shadow-lg">
                    <PaperAirplaneIcon className="h-6 w-6" />
                  </motion.button>
                </form>
              </footer>
            </motion.main>
          )}
        </AnimatePresence>
        
        {/* --- Context Menu (Unchanged) --- */}
        <AnimatePresence>
        {contextMenu && (
            <MessageContextMenu
                x={contextMenu.x} y={contextMenu.y} message={contextMenu.message}
                user={user} onDelete={handleDeleteMessage} closeMenu={closeContextMenu}
            />
        )}
        </AnimatePresence>
        
        {/* --- Empty State (Unchanged) --- */}
        {!selectedChat && (
            <div className="hidden md:flex flex-grow flex-col items-center justify-center h-full text-center bg-gray-900">
              <h2 className="text-2xl font-semibold text-white">Select a chat to start messaging</h2>
              <p className="text-gray-500 mt-2">Your conversations will appear in the sidebar.</p>
            </div>
        )}
        
        {/* --- Contact Info Panel (Unchanged) --- */}
        <ContactInfoPanel chat={selectedChat} isOpen={isInfoPanelOpen} closePanel={() => setIsInfoPanelOpen(false)} onlineUsers={onlineUsers} />
      </div>
    </div>
  );
}

export default Dashboard;