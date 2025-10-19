import React, { useState, useEffect, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import TextareaAutosize from 'react-textarea-autosize';
import { Dialog, Transition } from '@headlessui/react';
import {
  MagnifyingGlassIcon, BellIcon, PlusCircleIcon, Cog6ToothIcon, PhoneIcon,
  VideoCameraIcon, PaperAirplaneIcon, FaceSmileIcon, XMarkIcon, CheckCircleIcon
} from '@heroicons/react/24/outline';

// --- Reusable Animated Div for Scroll-in effects ---
const MotionDiv = ({ children, index }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay: index * 0.1 }}
  >
    {children}
  </motion.div>
);

// --- Settings Modal Component ---
const SettingsModal = ({ isOpen, closeModal, user, handleLogout }) => (
  <Transition appear show={isOpen} as={Fragment}>
    <Dialog as="div" className="relative z-50" onClose={closeModal}>
      <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
      </Transition.Child>
      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4 text-center">
          <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
            <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-gradient-to-b from-gray-800 to-gray-900 border border-white/10 p-6 text-left align-middle shadow-xl transition-all">
              <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-white">⚙️ Settings</Dialog.Title>
              <div className="mt-4 flex flex-col items-center">
                <motion.img
                  src={`https://i.pravatar.cc/150?u=${user.email}`} 
                  alt={user.username}
                  className="h-24 w-24 rounded-full shadow-lg border-2 border-teal-500"
                  initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2 }}
                />
                <h4 className="mt-4 text-xl font-semibold text-white">{user.username}</h4>
                <p className="text-gray-400">{user.email}</p>
              </div>
              <div className="mt-6 space-y-3">
                <button onClick={handleLogout} className="w-full rounded-md bg-gradient-to-r from-red-500 to-red-700 py-2 font-semibold text-white hover:from-red-600 hover:to-red-800 transition-all duration-200">Logout</button>
              </div>
              <button onClick={closeModal} className="absolute top-4 right-4 text-gray-400 hover:text-white"><XMarkIcon className="h-6 w-6" /></button>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </div>
    </Dialog>
  </Transition>
);

// --- Contact Info Panel Component ---
const ContactInfoPanel = ({ chat, isOpen, closePanel }) => (
  <AnimatePresence>
    {isOpen && (
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="absolute top-0 right-0 h-full w-full md:w-[320px] bg-gray-800 border-l border-gray-700 z-30 flex flex-col"
      >
        <header className="flex items-center gap-4 p-4 border-b border-gray-700 bg-gray-900/80">
          <button onClick={closePanel} className="text-gray-400 hover:text-white"><XMarkIcon className="h-6 w-6" /></button>
          <h3 className="font-semibold text-white">Contact Info</h3>
        </header>
        <div className="flex flex-col items-center p-6">
          <motion.img
            src={chat.avatar}
            alt={chat.name}
            className="h-24 w-24 rounded-full border-2 border-teal-500 shadow-md"
            initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.3 }}
          />
          <h4 className="mt-4 text-xl font-semibold text-white">{chat.name}</h4>
          <p className="text-gray-400 text-sm">📞 +1 234 567 8900</p>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
);

// --- Typing Indicator Animation ---
const TypingIndicator = () => (
  <div className="flex items-center gap-1 mt-1 text-gray-400">
    <span className="text-xs">typing</span>
    <motion.span animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 1 }} className="text-xs">.</motion.span>
    <motion.span animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="text-xs">.</motion.span>
    <motion.span animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="text-xs">.</motion.span>
  </div>
);

// --- Main Dashboard Component ---
function Dashboard() {
  const [user, setUser] = useState(null);
  const [selectedChat, setSelectedChat] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isInfoPanelOpen, setIsInfoPanelOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('All');
  const [isTyping, setIsTyping] = useState(false);
  const navigate = useNavigate();

  const contacts = [
    { id: 1, name: 'Ares Morgan', time: 'Just now', unread: 2, avatar: 'https://randomuser.me/api/portraits/women/44.jpg', online: true },
    { id: 2, name: 'Alexandra Chang', time: '2:36 PM', unread: 0, avatar: 'https://randomuser.me/api/portraits/women/45.jpg', online: false },
    { id: 3, name: 'Isabella Garcia', time: 'Yesterday', unread: 0, avatar: 'https://randomuser.me/api/portraits/women/46.jpg', online: false },
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

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/';
  };

  // Simulate typing indicator for demo
  useEffect(() => {
    if (selectedChat) {
      const timer = setTimeout(() => setIsTyping(true), 1000);
      const stop = setTimeout(() => setIsTyping(false), 4000);
      return () => { clearTimeout(timer); clearTimeout(stop); };
    }
  }, [selectedChat]);

  if (!user) {
    return <div className="flex h-screen items-center justify-center bg-gray-900 text-white">Loading...</div>;
  }

  return (
    <div className="flex h-screen w-full bg-gradient-to-br from-gray-900 via-gray-950 to-black text-gray-300 overflow-hidden">
      <SettingsModal isOpen={isSettingsOpen} closeModal={() => setIsSettingsOpen(false)} user={user} handleLogout={handleLogout} />
      
      {/* Sidebar */}
      <aside className="w-full md:w-[350px] h-screen bg-gray-800/50 backdrop-blur-xl border-r border-white/10 flex flex-col flex-shrink-0">
        <header className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <img src={`https://i.pravatar.cc/150?u=${user.email}`} alt={user.username} className="h-10 w-10 rounded-full border border-teal-500 shadow-sm" />
            <h2 className="text-lg font-semibold text-white">{user.username}</h2>
          </div>
          <button onClick={() => setIsSettingsOpen(true)} className="text-gray-400 hover:text-teal-400 transition-all"><Cog6ToothIcon className="h-6 w-6" /></button>
        </header>

        <div className="p-4 border-b border-white/10">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input type="text" placeholder="Search" className="w-full pl-10 pr-4 py-2 rounded-lg bg-gray-900 border border-gray-700 focus:outline-none focus:ring-1 focus:ring-teal-500" />
          </div>
        </div>

        <div className="p-4 border-b border-gray-700">
          <div className="flex space-x-4">
            {['All', 'Friends', 'Groups'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-3 py-1 text-sm font-semibold rounded-full relative ${activeTab === tab ? 'text-white' : 'text-gray-400 hover:text-white'}`}>
                {tab}
                {activeTab === tab && <motion.div className="absolute bottom-[-4px] left-0 right-0 h-0.5 bg-teal-500" layoutId="underline" />}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-grow overflow-y-auto">
          {contacts.map((contact, index) => (
            <MotionDiv key={contact.id} index={index}>
              <div onClick={() => setSelectedChat(contact)}
                className={`flex items-center p-4 cursor-pointer border-l-4 transition-colors ${selectedChat?.id === contact.id ? 'border-teal-500 bg-black/20' : 'border-transparent hover:bg-white/5'}`}>
                <div className="relative">
                  <img src={contact.avatar} alt={contact.name} className="h-12 w-12 rounded-full" />
                  {contact.online && <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-green-500 border-2 border-gray-800 animate-pulse"></span>}
                </div>
                <div className="ml-4 flex-grow">
                  <p className="font-semibold text-white">{contact.name}</p>
                  <p className="text-sm text-gray-400">{contact.time}</p>
                </div>
                {contact.unread > 0 && <span className="h-6 w-6 flex items-center justify-center rounded-full bg-teal-500 text-white text-xs font-bold">{contact.unread}</span>}
              </div>
            </MotionDiv>
          ))}
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-grow flex flex-col relative">
        <AnimatePresence mode="wait">
          {selectedChat ? (
            <motion.div key={selectedChat.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="flex-grow flex flex-col">
              <header onClick={() => setIsInfoPanelOpen(true)} className="flex items-center justify-between p-4 bg-gray-800/50 backdrop-blur-xl border-b border-white/10 flex-shrink-0 cursor-pointer">
                <div className="flex items-center gap-4">
                  <img src={selectedChat.avatar} alt={selectedChat.name} className="h-10 w-10 rounded-full" />
                  <div>
                    <p className="font-semibold text-white">{selectedChat.name}</p>
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                      {isTyping ? <TypingIndicator /> : 'Online'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-gray-400">
                    <button className="hover:text-teal-400 transition-all"><PhoneIcon className="h-6 w-6" /></button>
                    <button className="hover:text-teal-400 transition-all"><VideoCameraIcon className="h-6 w-6" /></button>
                </div>
              </header>

              {/* Chat Messages */}
              <div className="flex-grow p-6 overflow-y-auto bg-black/20">
                <div className="text-center my-4">
                  <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded-full">Today</span>
                </div>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex justify-end mb-4">
                  <div className="bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-2xl py-2 px-4 max-w-lg flex items-center gap-2 shadow-lg">
                    <span>Great! I have a few ideas.</span>
                    <CheckCircleIcon className="h-4 w-4 text-teal-200" />
                  </div>
                </motion.div>
              </div>

              {/* Chat Input */}
              <footer className="p-4 bg-gray-800/50 backdrop-blur-xl border-t border-white/10 flex-shrink-0">
                <div className="flex items-center bg-gray-900 rounded-lg px-2 shadow-md">
                  <motion.button whileTap={{ scale: 0.9 }} className="text-gray-400 hover:text-teal-400 p-2"><PlusCircleIcon className="h-6 w-6" /></motion.button>
                  <TextareaAutosize placeholder="Type a message..." maxRows={5}
                    className="flex-grow px-3 py-3 bg-transparent focus:outline-none text-white resize-none" />
                  <motion.button whileTap={{ scale: 0.9 }} className="text-gray-400 hover:text-yellow-400 p-2"><FaceSmileIcon className="h-6 w-6" /></motion.button>
                  <motion.button whileTap={{ scale: 0.9 }} className="bg-gradient-to-r from-teal-600 to-teal-700 text-white p-2 rounded-full hover:from-teal-500 hover:to-teal-600 m-1 shadow-lg"><PaperAirplaneIcon className="h-6 w-6" /></motion.button>
                </div>
              </footer>
            </motion.div>
          ) : (
            <motion.div 
              key="welcome"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
              className="flex-grow flex flex-col items-center justify-center h-full bg-gray-900 text-center"
            >
              <motion.img 
                src={`https://i.pravatar.cc/150?u=${user.email}`} alt={user.username} 
                className="h-24 w-24 rounded-full mb-4 shadow-lg border-2 border-teal-500"
                initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring', stiffness: 120 }}
              />
              <h2 className="text-2xl font-semibold text-white">Welcome, {user.username} 👋</h2>
              <p className="text-gray-500 mt-2">Select a chat to start messaging.</p>
            </motion.div>
          )}
        </AnimatePresence>
        <ContactInfoPanel chat={selectedChat} isOpen={isInfoPanelOpen} closePanel={() => setIsInfoPanelOpen(false)} />
      </main>
    </div>
  );
}
export default Dashboard;