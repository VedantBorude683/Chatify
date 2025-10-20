import React, { useState, useEffect, useRef, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import TextareaAutosize from 'react-textarea-autosize';
import { io } from 'socket.io-client';
import { Dialog, Transition, Menu } from '@headlessui/react';
import { 
  MagnifyingGlassIcon, BellIcon, PlusCircleIcon, Cog6ToothIcon, PhoneIcon, VideoCameraIcon, 
  PaperAirplaneIcon, FaceSmileIcon, XMarkIcon, CheckCircleIcon, EllipsisVerticalIcon 
} from '@heroicons/react/24/outline';
import { HashtagIcon, LockClosedIcon } from '@heroicons/react/24/solid';

// --- Helper Components ---
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

const ContactInfoPanel = ({ chat, isOpen, closePanel }) => (
    <AnimatePresence>
      {isOpen && (
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
            <img src={chat.avatar} alt={chat.name} className="h-24 w-24 rounded-full" />
            <h4 className="mt-4 text-xl font-semibold text-white">{chat.name}</h4>
            <p className="text-gray-400 text-sm">+1 234 567 8900</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
);

function Dashboard() {
  const [user, setUser] = useState(null);
  const [selectedChat, setSelectedChat] = useState(null);
  const [activeTab, setActiveTab] = useState('All');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isInfoPanelOpen, setIsInfoPanelOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const socket = useRef(null);
  const navigate = useNavigate();

  const servers = [
    { id: '1', name: 'Work', icon: <HashtagIcon className="h-6 w-6 text-white" /> },
    { id: '2', name: 'Gaming', icon: <LockClosedIcon className="h-6 w-6 text-white" /> },
  ];
  const contacts = [
    { _id: '68f291abd6b99d5f3b838b26', name: 'bholu', time: 'Online', unread: 0, avatar: 'https://randomuser.me/api/portraits/men/44.jpg', online: true },
    { _id: '68f26daceb845cc79be15fa1', name: 'bablu', time: '2:36 PM', unread: 0, avatar: 'https://randomuser.me/api/portraits/women/45.jpg', online: true },
  ];

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

  // Effect to establish and manage the main socket connection
  useEffect(() => {
    if (user) {
      socket.current = io('http://localhost:3001');
      socket.current.on('connect', () => {
        socket.current.emit('addUser', user._id);
      });
      
      return () => {
        socket.current.disconnect();
      };
    }
  }, [user]);

  // Separate effect to handle receiving messages
  // --- UPDATED useEffect for debugging ---
  useEffect(() => {
    if (socket.current) {
      const messageListener = (data) => {
        console.log("--- MESSAGE RECEIVED ON CLIENT ---");
        console.log("Incoming message data:", data);
        console.log("Current selected chat:", selectedChat);

        // This is the condition we need to check
        if (selectedChat && data.senderId === selectedChat._id) {
          console.log("IDs MATCH. Adding message to state.");
          setMessages((prevMessages) => [...prevMessages, data]);
        } else {
          console.log("IDs DO NOT MATCH. Message will not be displayed.");
          if (!selectedChat) {
            console.log("Reason: No chat is currently selected.");
          } else {
            console.log(`Reason: Incoming senderId (${data.senderId}) does not match selected chatId (${selectedChat._id})`);
          }
        }
      };
      
      socket.current.on('receiveMessage', messageListener);

      // Cleanup function to prevent duplicate listeners
      return () => {
        socket.current.off('receiveMessage', messageListener);
      };
    }
  }, [socket.current, selectedChat]); // Dependencies are correct

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/';
  };
  
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (newMessage.trim() === '' || !socket.current || !user || !selectedChat) return;

    const messageData = {
      senderId: user._id,
      recipientId: selectedChat._id,
      text: newMessage,
      timestamp: new Date().toISOString(),
    };
    console.log("SENDING MESSAGE DATA:", {
      i_am_sender: user.username,
      my_sender_id: user._id,
      i_am_sending_to: selectedChat.name,
      the_recipient_id: selectedChat._id
    });

    socket.current.emit('sendMessage', messageData);
    setMessages(prevMessages => [...prevMessages, messageData]);
    setNewMessage('');
  };

  if (!user) {
    return <div className="flex h-screen items-center justify-center bg-gray-900 text-white">Loading...</div>;
  }

  return (
    <div className="flex h-screen w-full bg-black text-gray-300 overflow-hidden noise-bg">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] bg-gradient-to-br from-teal-500/20 via-purple-500/10 to-transparent blur-3xl opacity-50 animate-pulse" style={{ animationDuration: '15s' }}></div>
      
      <motion.div initial={{ x: -100 }} animate={{ x: 0 }} transition={{ duration: 0.5 }}
        className="w-20 h-screen bg-black/20 backdrop-blur-xl border-r border-white/5 flex flex-col items-center py-4 space-y-4 flex-shrink-0"
      >
        {servers.map((server, index) => <ServerIcon key={server.id} icon={server.icon} name={server.name} active={index === 0} />)}
      </motion.div>

      <motion.aside initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2, duration: 0.5 }}
        className="w-full md:w-[350px] h-screen bg-black/20 backdrop-blur-xl border-r border-white/5 flex flex-col flex-shrink-0"
      >
        <header className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0">
          <h2 className="text-lg font-bold text-white">Workspace</h2>
          <button className="text-gray-400 hover:text-white"><PlusCircleIcon className="h-6 w-6" /></button>
        </header>

        <div className="p-4 border-b border-white/10">
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
        
        <div className="flex-grow overflow-y-auto">
          {contacts.map(contact => (
            <div 
              key={contact._id} 
              onClick={() => {
                setSelectedChat(contact);
                setMessages([]);
              }}
              className={`relative flex items-center p-4 cursor-pointer border-l-2 transition-colors ${selectedChat?._id === contact._id ? 'border-teal-400' : 'border-transparent hover:bg-white/5'}`}
            >
              {selectedChat?._id === contact._id && <motion.div layoutId="active-chat-indicator" className="absolute left-0 top-0 bottom-0 w-full h-full bg-gradient-to-r from-teal-500/20 to-transparent" />}
              <div className="relative z-10">
                <img src={contact.avatar} alt={contact.name} className="h-12 w-12 rounded-full" />
                {contact.online && <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-green-400 border-2 border-gray-800 animate-pulse"></span>}
              </div>
              <div className="ml-4 flex-grow z-10">
                <p className="font-semibold text-white">{contact.name}</p>
                <p className="text-sm text-gray-400">{contact.time}</p>
              </div>
               {contact.unread > 0 && <span className="h-6 w-6 flex items-center justify-center rounded-full bg-teal-500 text-white text-xs font-bold">{contact.unread}</span>}
            </div>
          ))}
        </div>
      </motion.aside>

      <main className="flex-grow flex flex-col relative">
        <AnimatePresence mode="wait">
          {selectedChat ? (
            <motion.div key={selectedChat._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-grow flex flex-col">
              <header onClick={() => setIsInfoPanelOpen(true)} className="flex items-center justify-between p-4 bg-black/20 backdrop-blur-xl border-b border-white/10 flex-shrink-0 cursor-pointer">
                <div className="flex items-center gap-4">
                  <img src={selectedChat.avatar} alt={selectedChat.name} className="h-10 w-10 rounded-full" />
                  <div>
                    <p className="font-semibold text-white">{selectedChat.name}</p>
                    <p className="text-xs text-green-400">Online</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-gray-400">
                  <button className="hover:text-white"><PhoneIcon className="h-6 w-6" /></button>
                  <button className="hover:text-white"><VideoCameraIcon className="h-6 w-6" /></button>
                  <button className="hover:text-white"><EllipsisVerticalIcon className="h-6 w-6" /></button>
                </div>
              </header>
              <div className="flex-grow p-6 overflow-y-auto bg-black/20">
                <div className="text-center my-4"><span className="text-xs text-gray-500 bg-gray-800/50 px-2 py-1 rounded-full">Today</span></div>
                {messages.map((msg, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.senderId === user._id ? 'justify-end' : 'justify-start'} mb-4`}
                  >
                    <div className={`rounded-2xl py-2 px-4 max-w-lg flex items-center gap-2 ${msg.senderId === user._id ? 'bg-teal-600 text-white' : 'bg-gray-700 text-gray-200'}`}>
                      <span>{msg.text}</span>
                      {msg.senderId === user._id && <CheckCircleIcon className="h-4 w-4 text-teal-200" />}
                    </div>
                  </motion.div>
                ))}
                {isTyping && <TypingIndicator />}
              </div>
              <footer className="p-4 bg-black/20 backdrop-blur-xl border-t border-white/10 flex-shrink-0">
                <form onSubmit={handleSendMessage} className="flex items-center bg-gray-900/50 rounded-lg px-2">
                  <motion.button type="button" whileTap={{ scale: 0.9 }} className="text-gray-400 hover:text-white p-2"><PlusCircleIcon className="h-6 w-6" /></motion.button>
                  <TextareaAutosize
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(e); } }}
                    maxRows={5}
                    className="flex-grow px-3 py-3 bg-transparent focus:outline-none text-white resize-none"
                  />
                  <motion.button type="button" whileTap={{ scale: 0.9 }} className="text-gray-400 hover:text-yellow-400 p-2"><FaceSmileIcon className="h-6 w-6" /></motion.button>
                  <motion.button type="submit" whileTap={{ scale: 0.9 }} className="bg-teal-600 text-white p-2 rounded-full hover:bg-teal-700 m-1 shadow-lg">
                    <PaperAirplaneIcon className="h-6 w-6" />
                  </motion.button>
                </form>
              </footer>
            </motion.div>
          ) : (
             <motion.div 
              key="welcome" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.5, ease: 'easeInOut' }}
              className="flex-grow flex flex-col items-center justify-center h-full text-center"
            >
              <h2 className="text-2xl font-semibold text-white">Select a chat to start messaging</h2>
              <p className="text-gray-500 mt-2">You can also start a new chat from the sidebar.</p>
            </motion.div>
          )}
        </AnimatePresence>
        <ContactInfoPanel chat={selectedChat} isOpen={isInfoPanelOpen} closePanel={() => setIsInfoPanelOpen(false)} />
      </main>
    </div>
  );
}

export default Dashboard;