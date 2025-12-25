// START OF Dashboard.jsx

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
  PaperClipIcon, DocumentIcon,
  UsersIcon // Group Icon
} from '@heroicons/react/24/outline';
import { HashtagIcon, LockClosedIcon } from '@heroicons/react/24/solid';

// --- Helper Components ---
const ServerIcon = ({ icon, name, active }) => (
  <div className="relative group">
    <motion.div className={`absolute left-0 top-1/2 -translate-y-1/2 h-0 w-1 rounded-r-full bg-white transition-all duration-200 ${active ? 'h-10' : 'group-hover:h-5'}`} />
    <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
      <div className={`h-12 w-12 rounded-2xl flex items-center justify-center cursor-pointer transition-all duration-200 ${active ? 'bg-teal-600 rounded-2xl' : 'bg-gray-700 rounded-3xl group-hover:bg-teal-600 group-hover:rounded-2xl'}`}>
        {icon}
      </div>
    </motion.div>
  </div>
);

// Settings Modal Component
const SettingsModal = ({ isOpen, closeModal, user, handleLogout }) => (
  <Transition appear show={isOpen} as={Fragment}>
    <Dialog as="div" className="relative z-50" onClose={closeModal}>
      <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
      </Transition.Child>
      <div className="fixed inset-0 overflow-y-auto"><div className="flex min-h-full items-center justify-center p-4 text-center">
        <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
          <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-gray-800/80 border border-white/10 p-6 text-left align-middle shadow-xl transition-all">
            <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-white">Settings</Dialog.Title>
            <div className="mt-4 flex flex-col items-center">
              {user && <img src={`https://i.pravatar.cc/150?u=${user.email}`} alt={user.username} className="h-24 w-24 rounded-full bg-gray-600" />}
              <h4 className="mt-4 text-xl font-semibold text-white">{user?.username || 'Loading...'}</h4>
              <p className="text-gray-400">{user?.email || ''}</p>
            </div>
            <div className="mt-6"><button onClick={handleLogout} className="w-full rounded-md bg-red-600/80 py-2 font-semibold text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-800">Logout</button></div>
            <button onClick={closeModal} className="absolute top-4 right-4 text-gray-400 hover:text-white focus:outline-none"><XMarkIcon className="h-6 w-6" /></button>
          </Dialog.Panel>
        </Transition.Child>
      </div></div>
    </Dialog>
  </Transition>
);

// Contact / Group Info Panel Component
const ContactInfoPanel = ({ chat, isOpen, closePanel, onlineUsers, currentUser }) => (
    <AnimatePresence>
      {isOpen && chat && currentUser && ( // Ensure all props are available
        <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ duration: 0.3, ease: 'easeInOut' }} className="absolute top-0 right-0 h-full w-full md:w-[300px] bg-gray-800 border-l border-gray-700 z-30 flex flex-col">
          <header className="flex items-center gap-4 p-4 border-b border-gray-700">
            <button onClick={closePanel} className="text-gray-400 hover:text-white focus:outline-none"><XMarkIcon className="h-6 w-6" /></button>
            <h3 className="font-semibold text-white">{chat.isGroup ? 'Group Info' : 'Contact Info'}</h3>
          </header>
          {chat.isGroup ? (
            // Group Info Display
            <div className="flex flex-col flex-grow">
              <div className="flex flex-col items-center p-6 border-b border-gray-700">
                <img src={`https://i.pravatar.cc/150?u=${chat._id}`} alt={chat.groupName || 'Group'} className="h-24 w-24 rounded-full bg-gray-600" />
                <h4 className="mt-4 text-xl font-semibold text-white">{chat.groupName || 'Unnamed Group'}</h4>
                <p className="text-gray-400 text-sm mt-1">{chat.members?.length || 0} Members</p>
              </div>
              <div className="flex-grow p-4 overflow-y-auto">
                <h5 className="text-sm font-semibold text-gray-400 uppercase mb-2">Members</h5>
                {/* Ensure members array exists */}
                {chat.members?.map(member => (
                  <div key={member._id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5">
                    <img src={`https://i.pravatar.cc/150?u=${member.email}`} alt={member.username} className="h-10 w-10 rounded-full bg-gray-600" />
                    <div>
                      {/* Check if groupAdmin is populated, compare IDs */}
                      <p className="text-white font-semibold">{member.username} {member._id === (chat.groupAdmin?._id || chat.groupAdmin) ? <span className="text-xs text-teal-400">(Admin)</span> : ''}</p>
                      <p className={`text-xs ${onlineUsers.includes(member._id) ? 'text-green-400' : 'text-gray-500'}`}>{onlineUsers.includes(member._id) ? 'Online' : 'Offline'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            // 1-on-1 Contact Info Display
            (() => {
              // Find the other user safely
              const otherUser = chat.members?.find(m => m._id !== currentUser._id);
              if (!otherUser) return <div className="p-6 text-gray-400">User details not available.</div>;
              return (
                <div className="flex flex-col items-center p-6">
                  <img src={`https://i.pravatar.cc/150?u=${otherUser.email}`} alt={otherUser.username} className="h-24 w-24 rounded-full bg-gray-600" />
                  <h4 className="mt-4 text-xl font-semibold text-white">{otherUser.username}</h4>
                  <p className={`text-sm mt-1 ${onlineUsers.includes(otherUser._id) ? 'text-green-400' : 'text-gray-500'}`}>{onlineUsers.includes(otherUser._id) ? 'Online' : 'Offline'}</p>
                  <p className="text-gray-400 text-sm mt-4 text-center">{otherUser.status || "No status available"}</p>
                  <p className="text-gray-400 text-sm mt-1">{otherUser.location || "Location not set"}</p>
                </div>
              );
            })()
          )}
        </motion.div>
      )}
    </AnimatePresence>
);

// Start New Chat Modal Component
const NewChatModal = ({ isOpen, closeModal, usersList, onStartChat }) => (
  <Transition appear show={isOpen} as={Fragment}>
    <Dialog as="div" className="relative z-50" onClose={closeModal}>
      <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0"><div className="fixed inset-0 bg-black/50 backdrop-blur-sm" /></Transition.Child>
      <div className="fixed inset-0 overflow-y-auto"><div className="flex min-h-full items-center justify-center p-4 text-center">
        <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
          <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-gray-800/80 border border-white/10 p-6 text-left align-middle shadow-xl transition-all">
            <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-white">Start a New Chat</Dialog.Title>
            <p className="mt-1 text-sm text-gray-400">Select a user to begin a conversation.</p>
            <div className="mt-4 max-h-80 overflow-y-auto">
              {usersList.length === 0 && <p className="text-gray-400 text-center">No other users found.</p>}
              {usersList.map(user => (
                <div key={user._id} onClick={() => onStartChat(user)} className="flex items-center p-3 cursor-pointer rounded-lg hover:bg-white/10 transition-colors">
                  <img src={`https://i.pravatar.cc/150?u=${user.email}`} alt={user.username} className="h-10 w-10 rounded-full bg-gray-600" />
                  <div className="ml-4">
                    <p className="font-semibold text-white">{user.username}</p>
                    <p className="text-sm text-gray-500">{user.status || "No status"}</p>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={closeModal} className="absolute top-4 right-4 text-gray-400 hover:text-white focus:outline-none"><XMarkIcon className="h-6 w-6" /></button>
          </Dialog.Panel>
        </Transition.Child>
      </div></div>
    </Dialog>
  </Transition>
);

// Create Group Modal Component
const CreateGroupModal = ({ isOpen, closeModal, usersList, onCreateGroup }) => {
  const [groupName, setGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const handleUserSelect = (user) => { setSelectedUsers(prev => prev.some(u => u._id === user._id) ? prev.filter(u => u._id !== user._id) : [...prev, user]); };
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!groupName.trim() || selectedUsers.length < 2) { alert("A group needs a name and at least 2 other members."); return; }
    const memberIds = selectedUsers.map(u => u._id);
    onCreateGroup(groupName.trim(), memberIds);
    setGroupName(''); setSelectedUsers([]); closeModal();
  };
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={closeModal}>
        <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0"><div className="fixed inset-0 bg-black/50 backdrop-blur-sm" /></Transition.Child>
        <div className="fixed inset-0 overflow-y-auto"><div className="flex min-h-full items-center justify-center p-4 text-center">
          <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
            <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-gray-800/80 border border-white/10 p-6 text-left align-middle shadow-xl transition-all">
              <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-white">Create a New Group</Dialog.Title>
              <form onSubmit={handleSubmit}>
                <div className="mt-4">
                  <label htmlFor="groupName" className="block text-sm font-medium text-gray-300">Group Name</label>
                  <input type="text" id="groupName" value={groupName} onChange={(e) => setGroupName(e.target.value)} className="mt-1 w-full pl-3 pr-4 py-2 rounded-lg bg-gray-900 border border-gray-700 focus:outline-none focus:ring-1 focus:ring-teal-500" placeholder="My Awesome Group" required/>
                </div>
                <p className="mt-4 text-sm font-medium text-gray-300">Select Members (at least 2)</p>
                <div className="mt-2 max-h-60 overflow-y-auto border border-gray-700 rounded-lg">
                  {usersList.length === 0 && <p className="text-gray-400 text-center p-3">No other users to add.</p>}
                  {usersList.map(user => (
                    <div key={user._id} onClick={() => handleUserSelect(user)} className={`flex items-center p-3 cursor-pointer rounded-lg transition-colors ${selectedUsers.some(u => u._id === user._id) ? 'bg-teal-600/50' : 'hover:bg-white/10'}`}>
                      <img src={`https://i.pravatar.cc/150?u=${user.email}`} alt={user.username} className="h-10 w-10 rounded-full bg-gray-600" />
                      <div className="ml-4"><p className="font-semibold text-white">{user.username}</p></div>
                      {selectedUsers.some(u => u._id === user._id) && (<CheckCircleIcon className="h-6 w-6 text-teal-300 ml-auto" />)}
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex justify-end gap-4">
                  <button type="button" onClick={closeModal} className="px-4 py-2 text-sm font-medium text-gray-300 rounded-md hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-800">Cancel</button>
                  <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-gray-800">Create Group</button>
                </div>
              </form>
              <button onClick={closeModal} className="absolute top-4 right-4 text-gray-400 hover:text-white focus:outline-none"><XMarkIcon className="h-6 w-6" /></button>
            </Dialog.Panel>
          </Transition.Child>
        </div></div>
      </Dialog>
    </Transition>
  );
};

// Message Context Menu Component
const MessageContextMenu = ({ x, y, message, user, onDelete, closeMenu }) => {
  // Check if message is temporary or user is missing
  if (!message._id || message._id.startsWith('temp_') || !user) { return null; }
  // Determine if the current user sent the message
  const isSender = message.senderId === user._id || message.senderId?._id === user._id;
  const alreadyDeletedEveryone = message.deletedEveryone;
  // Sender can always delete for everyone if not already deleted
  const showDeleteForEveryone = isSender && !alreadyDeletedEveryone;
  // Calculate menu position
  const menuWidth=190, menuHeight=showDeleteForEveryone?90:50; let left=x, top=y, direction="down";
  if(x+menuWidth>window.innerWidth){left=window.innerWidth-menuWidth-10;} if(y+menuHeight>window.innerHeight){top=y-menuHeight-10; direction="up";}
  // Effect to close menu on outside click
  useEffect(()=>{const handleClickOutside=()=>closeMenu(); document.addEventListener('mousedown',handleClickOutside); return ()=>{document.removeEventListener('mousedown',handleClickOutside);};},[closeMenu]);
  return (
    <motion.div key="context-menu" className="absolute backdrop-blur-md bg-gray-800/90 text-white rounded-xl shadow-2xl border border-gray-700/50 overflow-hidden z-50" style={{top, left, transformOrigin: direction==="up"?"bottom center":"top center"}} initial={{opacity:0, scale:0.8, y: direction==="up"?15:-15}} animate={{opacity:1, scale:1, y:0, transition:{type:"spring", stiffness:200, damping:18}}} exit={{opacity:0, scale:0.9, y: direction==="up"?15:-15, transition:{duration:0.15}}}>
      <motion.button whileHover={{backgroundColor:"rgba(255,255,255,0.05)", x:3}} whileTap={{scale:0.97}} className="block w-full text-left px-5 py-2 text-sm font-medium hover:text-white transition-all duration-150" onClick={()=>onDelete(message,'me')}><TrashIcon className="h-4 w-4 inline mr-2"/> Delete for me</motion.button>
      {showDeleteForEveryone && (<motion.button whileHover={{backgroundColor:"rgba(239,68,68,0.15)", x:3}} whileTap={{scale:0.97}} className="block w-full text-left px-5 py-2 text-sm font-medium text-red-400 hover:text-red-500 transition-all duration-150" onClick={()=>onDelete(message,'everyone')}><TrashIcon className="h-4 w-4 inline mr-2"/> Delete for everyone</motion.button>)}
    </motion.div>
  );
};

// --- Main Dashboard Component ---
function Dashboard() {
  const [user, setUser] = useState(null);
  const [selectedChat, setSelectedChat] = useState(null); // Holds the full conversation object
  const selectedChatRef = useRef(null); // <-- REF FOR LATEST selectedChat
  const [conversations, setConversations] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [messages, setMessages] = useState([]);
  // const [incomingMessages, setIncomingMessages] = useState([]); // <-- REMOVED temporary store
  const [newMessage, setNewMessage] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isInfoPanelOpen, setIsInfoPanelOpen] = useState(false);
  const [typingUsers, setTypingUsers] = useState({}); // { conversationId: { userId: username, ... }, ... }
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [contextMenu, setContextMenu] = useState(null);
  const socket = useRef(null);
  const typingTimeout = useRef({}); // Store timeouts per conversation: { convoId: timeoutRef }
  const navigate = useNavigate();
  const chatContainerRef = useRef(null);
  const fileInputRef = useRef(null);

  const servers = [ { id: '1', name: 'Work', icon: <HashtagIcon className="h-6 w-6 text-white" /> }, { id: '2', name: 'Gaming', icon: <LockClosedIcon className="h-6 w-6 text-white" /> } ];

  // --- Initial Data Fetching ---
  useEffect(() => {
    const fetchUserData = async () => {
      try { const token=localStorage.getItem('token'); if(!token){navigate('/');return;} const config={headers:{Authorization:`Bearer ${token}`}}; const res=await axios.get('http://localhost:3001/api/user/me',config); setUser(res.data); } catch (err){localStorage.removeItem('token'); navigate('/'); }
    };
    fetchUserData();
  }, [navigate]);

  useEffect(() => {
    const fetchData = async () => {
      if(!user) return; // Don't fetch if user is not loaded yet
      try {
          const token=localStorage.getItem('token'); const config={headers:{Authorization:`Bearer ${token}`}};
          // Fetch conversations
          const convosRes=await axios.get('http://localhost:3001/api/conversations',config);
           // Sort initial conversations by updatedAt (most recent first)
           const sortedConvos = (convosRes.data || []).sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
           setConversations(sortedConvos);
          // Fetch all users (for modals)
          const usersRes=await axios.get('http://localhost:3001/api/user/',config);
          setUsersList(usersRes.data || []);
        } catch(err){console.error("Failed to fetch initial data:", err); }
    };
    fetchData();
  }, [user]); // Re-fetch data if user logs in

  // --- Update Ref whenever selectedChat changes ---
  useEffect(() => {
    selectedChatRef.current = selectedChat;
    // console.log('Updated selectedChatRef:', selectedChatRef.current?._id); // Optional log
  }, [selectedChat]);

  // --- Socket Connection (Revised for stability) ---
  useEffect(() => {
    // Connect only if user exists and socket isn't already set up
    if (user && !socket.current) {
      console.log('Attempting to connect socket...');
      const newSocket = io('http://localhost:3001', { /* Optional config */ });
      socket.current = newSocket; // Set the ref immediately

      // Setup listeners
      newSocket.on('connect', () => {
        console.log('Socket connected:', newSocket.id);
        if (user?._id) { newSocket.emit('addUser', user._id); } else { console.error("User ID not available on connect"); }
      });
      newSocket.on('getOnlineUsers', (users) => {
        // console.log("Received online users:", users); // Less verbose
        setOnlineUsers(users || []); // Handle potential null/undefined
      });
      newSocket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
        setOnlineUsers([]); // Clear online users
      });
      newSocket.on('connect_error', (err) => {
        console.error('Socket connection error:', err);
      });

      // Cleanup function: Disconnects when component unmounts or user changes
      return () => { console.log('Disconnecting socket on cleanup (user change or unmount)'); newSocket.disconnect(); socket.current = null; };
    } else if (!user && socket.current) {
        // If user logs out or becomes null, disconnect existing socket
        console.log('User is null, disconnecting existing socket'); socket.current.disconnect(); socket.current = null;
    }
  }, [user]); // Dependency: Only re-run when the user object changes


  // --- Socket Event Listeners (Using Ref Comparison Directly) ---
  useEffect(() => {
    // *** Update the ref immediately when the effect runs ***
    selectedChatRef.current = selectedChat;
    console.log(`[Listener Effect] selectedChatRef updated: ${selectedChatRef.current?._id}`);

    const currentSocket = socket.current;
    // Set up listeners only if socket exists and user is logged in
    if (currentSocket && user) {
      console.log('[Listener Effect] Setting up socket listeners...');

      const messageListener = (data) => {
        console.log('[Socket] receiveMessage:', data);
        if (!user || !data) return;

        const isMyMessage = data.senderId === user._id || data.senderId?._id === user._id;

        // --- Step 1: Check if message belongs to the currently selected chat using REF ---
        const currentSelectedChat = selectedChatRef.current; // Read latest ref value
        const isForSelectedChat = currentSelectedChat && data.conversationId === currentSelectedChat._id;

        if (isForSelectedChat) {
          console.log(`[Message Listener] Message ${data._id || data.clientId} IS for selected chat ${currentSelectedChat._id}. Updating state...`);
          // --- Update message list ---
          setMessages((prevMessages) => {
            // Check 1: Already exists?
            if (data._id && prevMessages.some(msg => msg._id === data._id)) {
              console.log(`[SetMessages] Message ${data._id} already exists. No change.`);
              return prevMessages;
            }
            // Check 2: Server confirmation for optimistic message?
            let tempMsgIndex = -1;
            if (data.clientId) { tempMsgIndex = prevMessages.findIndex(msg => msg._id === data.clientId); }
            if (tempMsgIndex === -1 && isMyMessage) { tempMsgIndex = prevMessages.findLastIndex(msg => msg._id.startsWith('temp_') && msg.text === data.text && msg.fileUrl === data.fileUrl); }

            if (tempMsgIndex !== -1) { // Replace temp message
              console.log(`[SetMessages] Replacing temp ${prevMessages[tempMsgIndex]._id} with real ${data._id}`);
              const updatedMessages = [...prevMessages]; updatedMessages[tempMsgIndex] = data;
              const senderIdStr = data.senderId?._id || data.senderId;
              setTypingUsers(prevTyping => { const convoTypers = { ...(prevTyping[data.conversationId] || {}) }; delete convoTypers[senderIdStr]; return { ...prevTyping, [data.conversationId]: convoTypers }; });
              return updatedMessages;
            }
            // Add new message
            console.log(`[SetMessages] Adding new message ${data._id || data.clientId} to state.`);
            const senderIdStr = data.senderId?._id || data.senderId;
            setTypingUsers(prevTyping => { const convoTypers = { ...(prevTyping[data.conversationId] || {}) }; delete convoTypers[senderIdStr]; return { ...prevTyping, [data.conversationId]: convoTypers }; });
            // Ensure messages are sorted after adding
            const newMessages = [...prevMessages, data];
            newMessages.sort((a,b) => new Date(a.createdAt || a.timestamp) - new Date(b.createdAt || b.timestamp));
            return newMessages;
          }); // End setMessages
        } else {
             // Log why state wasn't updated
             if (!currentSelectedChat) console.log(`[Message Listener] No chat selected (ref). Ignoring message update for ${data._id || data.clientId}.`);
             else console.log(`[Message Listener] Message ${data._id || data.clientId} convoId (${data.conversationId}) doesn't match selected ref ${currentSelectedChat._id}. Ignoring message update.`);
        }

        // --- Update conversations list (always do this) ---
        setConversations(prev => { /* ... keep the existing setConversations logic using selectedChatRef.current ... */
            let convoExists = false;
            const updatedConvos = prev.map(convo => {
                 if (convo._id === data.conversationId) {
                     convoExists = true;
                     const isMyMsg = data.senderId === user._id || data.senderId?._id === user._id;
                     // *** USE REF HERE FOR UNREAD COUNT ***
                     const newUnreadCount = (convo._id === selectedChatRef.current?._id || isMyMsg) ? 0 : (convo.unreadCount || 0) + 1;
                     const updatedLastMessage = { ...data, senderId: data.senderId };
                     return { ...convo, lastMessage: updatedLastMessage, unreadCount: newUnreadCount, updatedAt: data.createdAt || data.timestamp };
                 } return convo;
            });
            if (!convoExists) {
                 console.warn(`[Conversations] Unknown convo ${data.conversationId}. Fetching details...`);
                 const fetchNewConvoDetails = async () => { /* ... keep existing fetch logic ... */
                     try { const token=localStorage.getItem('token'); const config={headers:{Authorization:`Bearer ${token}`}}; const res=await axios.get(`http://localhost:3001/api/conversations/${data.conversationId}`,config); const newConvoData=res.data;
                         if (newConvoData) { const isMyMsg=data.senderId===user._id||data.senderId?._id===user._id; newConvoData.unreadCount=(newConvoData._id===selectedChatRef.current?._id||isMyMsg)?0:1; newConvoData.lastMessage={...data, senderId:data.senderId}; console.log(`[Conversations] Adding fetched convo ${newConvoData._id}`); setConversations(prev => [...prev.filter(c => c._id !== newConvoData._id), newConvoData].sort((a,b)=>new Date(b.lastMessage?.createdAt||b.updatedAt||0)-new Date(a.lastMessage?.createdAt||a.updatedAt||0))); }
                         else { console.error(`[Conversations] No data for new convo ${data.conversationId}`); }
                     } catch(err){ console.error(`[Conversations] Failed fetch for new convo ${data.conversationId}:`,err); }
                 }; fetchNewConvoDetails(); return updatedConvos;
            }
            return updatedConvos.sort((a,b)=>new Date(b.lastMessage?.createdAt||b.updatedAt||0)-new Date(a.lastMessage?.createdAt||a.updatedAt||0));
        }); // End setConversations
      }; // End messageListener

      // --- Other listeners remain the same ---
       const typingListener = (data) => {
        if (user && data.senderId !== user._id) { const username = data.senderUsername || 'Someone'; setTypingUsers(prev => ({ ...prev, [data.conversationId]: { ...(prev[data.conversationId] || {}), [data.senderId]: username } })); }
      };
      const stopTypingListener = (data) => {
         if (user && data.senderId !== user._id) { setTypingUsers(prev => { const convoTypers={...(prev[data.conversationId]||{})}; delete convoTypers[data.senderId]; return {...prev,[data.conversationId]:convoTypers}; }); }
      };
      const deleteListener = (data) => {
        console.log('[Socket] messageDeleted:', data);
         // *** USE REF HERE ***
         if (selectedChatRef.current && data.conversationId === selectedChatRef.current._id) { setMessages(prev => prev.map(msg => msg._id === data.messageId ? { ...msg, deletedEveryone: true, text: "This message was deleted" } : msg)); }
         setConversations(prev => prev.map(convo => { if (convo._id === data.conversationId && convo.lastMessage?._id === data.messageId) { const updatedLastMessage = convo.lastMessage ? { ...convo.lastMessage, text: "This message was deleted", deletedEveryone: true } : null; return { ...convo, lastMessage: updatedLastMessage }; } return convo; }));
      };
      const joinedRoomListener = (data) => { console.log(`[Socket] Confirmed joining room: ${data.conversationId}`); };

      // Attach listeners
      currentSocket.on('receiveMessage', messageListener);
      currentSocket.on('userTyping', typingListener);
      currentSocket.on('userStoppedTyping', stopTypingListener);
      currentSocket.on('messageDeleted', deleteListener);
      currentSocket.on('joinedRoom', joinedRoomListener);

      // Cleanup function
      return () => {
        console.log('[Listener Effect] Removing socket listeners...');
        currentSocket.off('receiveMessage', messageListener);
        currentSocket.off('userTyping', typingListener);
        currentSocket.off('userStoppedTyping', stopTypingListener);
        currentSocket.off('messageDeleted', deleteListener);
        currentSocket.off('joinedRoom', joinedRoomListener);
      };
    } else { console.log('[Listener Effect] Socket or user not ready, skipping listener setup.'); }
  // Dependencies ensure effect re-runs if socket connects/disconnects, user logs in/out, or selectedChat changes (updating ref)
  }, [socket, selectedChat, user]);


  // --- Message Fetching & Scrolling (Simplified Fetch Only) ---
  useEffect(() => {
    // Clear typing indicators when chat changes
    setTypingUsers({});

    const fetchMessages = async () => {
       // Don't fetch if no chat is selected or if it's a temporary ID
       if(!selectedChat || selectedChat._id.startsWith('temp_')) {
            console.log(`[FetchMessages] Clearing messages: No selected chat or temporary chat ID (${selectedChat?._id}).`);
            setMessages([]); // Clear messages state directly
            return;
       }

       console.log(`[FetchMessages] Attempting to fetch messages for selected chat: ${selectedChat._id}`);
       try {
           const token=localStorage.getItem('token');
           const config={headers:{Authorization:`Bearer ${token}`}};
           const res=await axios.get(`http://localhost:3001/api/messages/${selectedChat._id}`,config);

           console.log(`[FetchMessages] Received response status ${res.status} for ${selectedChat._id}. Fetched count: ${res.data?.length ?? 0}`);
           const fetchedMessages = res.data || [];

           // Sort fetched messages
           fetchedMessages.sort((a,b) => new Date(a.createdAt || a.timestamp) - new Date(b.createdAt || b.timestamp));

           console.log(`[FetchMessages] Setting ${fetchedMessages.length} fetched messages for ${selectedChat._id}.`);
           setMessages(fetchedMessages); // Set the fetched messages directly

           // Scroll to bottom
           if (chatContainerRef.current) { setTimeout(() => { if (chatContainerRef.current) { chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight; }}, 50); }

        } catch(err){
            console.error(`[FetchMessages] Failed for ${selectedChat._id}:`, err.response?.status, err.response?.data || err.message);
            console.log(`[FetchMessages] Clearing messages due to fetch error for ${selectedChat._id}.`);
            setMessages([]); // Clear messages state on error
        }
    };

    fetchMessages(); // Call the fetch function

  // Dependency remains selectedChat. Real-time messages are handled by the listener effect.
  }, [selectedChat]);


  useEffect(() => { /* Auto-scroll on new message */
     if(chatContainerRef.current){
         const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
         // Less aggressive scroll only if already near bottom
         if (scrollHeight - scrollTop < clientHeight + 300) { chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight; }
     }
  }, [messages]); // Dependency: Only messages

  // --- Event Handlers (Remain the same) ---
  const handleLogout = () => { localStorage.removeItem('token'); setSelectedChat(null); setConversations([]); setUser(null); window.location.href = '/'; };

  const handleSendMessage = async (e) => { // Mark function as async
    e.preventDefault();
    if (newMessage.trim() === '' || !user || !selectedChat) return;

    // 1. Optimistic UI Update (Show message immediately before server responds)
    const timestamp = new Date().toISOString();
    const tempId = `temp_${timestamp}_${Math.random()}`;
    const optimisticMessage = {
        _id: tempId,
        senderId: user, // Use full user object so image/username render instantly
        conversationId: selectedChat._id,
        text: newMessage,
        timestamp: timestamp,
        createdAt: timestamp,
        readBy: [user._id],
        messageType: 'text',
        fileUrl: null
    };

    setMessages(prev => [...prev, optimisticMessage]);
    setNewMessage('');
    
    // Clear typing timeout
    const convoId = selectedChat._id;
    if (typingTimeout.current[convoId]) {
        clearTimeout(typingTimeout.current[convoId]);
        typingTimeout.current[convoId] = null;
    }
    socket.current.emit('stopTyping', { senderId: user._id, conversationId: convoId });

    try {
        // 2. SEND TO DATABASE (The missing link!)
        const token = localStorage.getItem('token');
        const config = { headers: { Authorization: `Bearer ${token}` } };
        
        // This calls the POST route I gave you earlier
        const res = await axios.post('http://localhost:3001/api/messages', {
            conversationId: selectedChat._id,
            text: optimisticMessage.text,
            receiverId: selectedChat.members.find(m => m._id !== user._id)?._id // Logic to find receiver
        }, config);

        // 3. Replace "Optimistic" message with "Real" message from DB
        const savedMessage = res.data;
        setMessages(prev => prev.map(msg => msg._id === tempId ? savedMessage : msg));

    } catch (err) {
        console.error("Failed to send message:", err);
        // Error handling: Remove the optimistic message or show error
        setMessages(prev => prev.filter(msg => msg._id !== tempId));
        alert("Message failed to send");
    }
  };

  const handleFileChange = async (e) => {
    const file=e.target.files[0]; if(!file || !user || !selectedChat) return;
    const formData=new FormData(); formData.append('file',file);
    const tempId = `temp_${Date.now()}_${Math.random()}`; const timestamp = new Date().toISOString(); const text = file.name; let messageType = file.type.startsWith('image/') ? 'image' : 'file';
    const optimisticMessage={_id:tempId, senderId:user._id, conversationId:selectedChat._id, text:text, timestamp:timestamp, createdAt:timestamp, readBy:[user._id], deletedEveryone:false, deletedFor:[], messageType:messageType, fileUrl: URL.createObjectURL(file), isUploading: true };
    setMessages(prev => [...prev, optimisticMessage]);
    try {
        const token=localStorage.getItem('token'); const config={headers:{'Content-Type':'multipart/form-data', Authorization:`Bearer ${token}`}};
        console.log(`Uploading file for convo ${selectedChat._id}...`);
        const res=await axios.post('http://localhost:3001/api/upload',formData,config); const {fileUrl}=res.data;
        console.log('File upload successful:', fileUrl);
        const serverMessageData={senderId:user._id, conversationId:selectedChat._id, text:text, timestamp:timestamp, clientId:tempId, messageType:messageType, fileUrl:fileUrl};
        console.log("Client emitting sendMessage (file):", serverMessageData);
        socket.current.emit('sendMessage',serverMessageData);
        const convoId = selectedChat._id;
        if (typingTimeout.current[convoId]) { clearTimeout(typingTimeout.current[convoId]); typingTimeout.current[convoId] = null; }
        socket.current.emit('stopTyping', { senderId:user._id, conversationId:convoId });
    } catch(err){ console.error("File upload failed:", err.response?.data||err.message); alert("File upload failed."); setMessages(prev => prev.filter(msg => msg._id !== tempId)); }
    finally { if(fileInputRef.current){fileInputRef.current.value=null;} }
  };

  const handleStartNewChat = async (chatUser) => {
    setIsNewChatModalOpen(false); if (!user || !chatUser || chatUser._id === user._id) return;
    try {
        const token=localStorage.getItem('token'); const config={headers:{Authorization:`Bearer ${token}`}};
        console.log(`Finding or creating chat with user ${chatUser._id}`);
        // POST /api/conversations/findOrCreate
        const res=await axios.post('http://localhost:3001/api/conversations/findOrCreate',{userId:chatUser._id},config);
        const conversation=res.data;
        console.log('Found/Created conversation:', conversation);
        setConversations(prev => { const exists = prev.some(c => c._id === conversation._id); const newList = exists ? prev.map(c => c._id === conversation._id ? conversation : c) : [conversation, ...prev]; return newList.sort((a,b)=>new Date(b.updatedAt||0)-new Date(a.updatedAt||0)); });
        setSelectedChat(conversation);
    } catch (err){ console.error("Error finding/creating chat:", err.response?.data||err.message); alert("Could not start chat. "+(err.response?.data?.msg||"Check server logs.")); }
  };

  const handleCreateGroup = async (groupName, memberIds) => {
    try {
        const token=localStorage.getItem('token'); const config={headers:{Authorization:`Bearer ${token}`}};
        const res=await axios.post('http://localhost:3001/api/groups',{name:groupName, members:memberIds},config);
        const newGroup = res.data;
        console.log('Created group:', newGroup);
        setConversations(prev => [newGroup, ...prev].sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)));
        setSelectedChat(newGroup);
        if (socket.current) { console.log(`Emitting joinNewGroupRoom for ${newGroup._id}`); socket.current.emit('joinNewGroupRoom', { conversationId: newGroup._id }); }
    } catch(err){ console.error("Failed to create group:", err.response?.data?.msg||err.message); alert("Failed to create group: "+(err.response?.data?.msg||err.message)); }
  };

  const handleTyping = () => {
    if (!socket.current || !selectedChat || !user) return;
    const convoId = selectedChat._id;
    socket.current.emit('startTyping', { senderId: user._id, conversationId: convoId, senderUsername: user.username });
    if (typingTimeout.current[convoId]) clearTimeout(typingTimeout.current[convoId]);
    typingTimeout.current[convoId] = setTimeout(() => {
      console.log(`Typing timeout ended for convo ${convoId}`);
      if (socket.current) { socket.current.emit('stopTyping', { senderId: user._id, conversationId: convoId }); }
      delete typingTimeout.current[convoId];
    }, 2500); // 2.5 second timeout
  };

  const showContextMenu = (e, message) => { e.preventDefault(); if(message.deletedEveryone||!message._id||message._id.startsWith('temp_')){return;} setContextMenu({x:e.clientX, y:e.clientY, message}); };
  const closeContextMenu = () => setContextMenu(null);

  const handleDeleteMessage = async (message, type) => {
    if(!message._id || message._id.startsWith('temp_')){console.warn("Cannot delete unsaved msg."); closeContextMenu(); return;} closeContextMenu();
    const token=localStorage.getItem('token'); const config={headers:{Authorization:`Bearer ${token}`},params:{type}};
    try {
        const res=await axios.delete(`http://localhost:3001/api/messages/${message._id}`,config);
        if(type==='me'){ setMessages(prev => prev.filter(msg => msg._id !== message._id)); }
        else if(type==='everyone'){
            const updatedMsg = res.data.updatedMessage;
            setMessages(prev => prev.map(msg => msg._id === message._id ? updatedMsg : msg));
            if(socket.current && message.conversationId){
                console.log(`Emitting notifyDeleteEveryone for msg ${message._id} in convo ${message.conversationId}`);
                socket.current.emit('notifyDeleteEveryone', { messageId:message._id, conversationId:message.conversationId });
            } else { console.warn("Could not emit notifyDeleteEveryone", { socket: socket.current, message }); }
        }
    } catch (err){ console.error("Failed to delete msg:", err); alert(err.response?.data?.message||err.response?.data||"Could not delete msg."); }
  };

  // --- Render ---
  if (!user) { return <div className="flex h-screen items-center justify-center bg-gray-900 text-white">Loading...</div>; }

  // Typing indicator text logic
  const currentTypingUsers = typingUsers[selectedChat?._id] || {};
  const typerIds = Object.keys(currentTypingUsers).filter(id => currentTypingUsers[id] && id !== user._id);
  const typerNames = typerIds.map(id => currentTypingUsers[id]);
  let typingText = '';
  if (typerNames.length === 1) { typingText = `${typerNames[0]} is typing...`; }
  else if (typerNames.length === 2) { typingText = `${typerNames[0]} and ${typerNames[1]} are typing...`; }
  else if (typerNames.length > 2) { typingText = `${typerNames.slice(0, 2).join(', ')} and ${typerNames.length - 2} ${typerNames.length - 2 === 1 ? 'other' : 'others'} are typing...`; }


  return (
    <div className="flex h-screen w-full bg-black text-gray-300 overflow-hidden noise-bg">
      {/* Background Gradient */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] bg-gradient-to-br from-teal-500/20 via-purple-500/10 to-transparent blur-3xl opacity-50 animate-pulse" style={{ animationDuration: '15s' }}></div>

      {/* Modals */}
      <SettingsModal isOpen={isSettingsOpen} closeModal={() => setIsSettingsOpen(false)} user={user} handleLogout={handleLogout} />
      <NewChatModal isOpen={isNewChatModalOpen} closeModal={() => setIsNewChatModalOpen(false)} usersList={usersList.filter(u => u._id !== user?._id)} onStartChat={handleStartNewChat} />
      <CreateGroupModal isOpen={isCreateGroupModalOpen} closeModal={() => setIsCreateGroupModalOpen(false)} usersList={usersList.filter(u => u._id !== user?._id)} onCreateGroup={handleCreateGroup} />

      {/* Server List Sidebar */}
      <motion.div initial={{ x: -100 }} animate={{ x: 0 }} transition={{ duration: 0.5 }} className="hidden md:flex w-20 h-screen bg-black/20 backdrop-blur-xl border-r border-white/5 flex-col items-center py-4 space-y-4 flex-shrink-0">
        {servers.map((server, index) => <ServerIcon key={server.id} icon={server.icon} name={server.name} active={index === 0} />)}
      </motion.div>

      {/* Main Content Area */}
      <div className="flex-grow relative overflow-hidden flex">
        {/* Conversation List Sidebar */}
        <motion.aside className="absolute top-0 left-0 h-full w-full md:w-[350px] md:static bg-black/20 backdrop-blur-xl border-r border-white/5 flex flex-col flex-shrink-0" initial={false} animate={{ x: selectedChat && window.innerWidth < 768 ? '-100%' : '0%' }} transition={{ duration: 0.3, ease: 'easeInOut' }}>
          <header className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0">
            <h2 className="text-lg font-bold text-white">{user?.username}</h2>
            <div className="flex items-center gap-2">
                <button onClick={() => setIsCreateGroupModalOpen(true)} className="text-gray-400 hover:text-white p-1 rounded focus:outline-none focus:ring-2 focus:ring-teal-500" title="Create Group"><UsersIcon className="h-6 w-6" /></button>
                <button onClick={() => setIsNewChatModalOpen(true)} className="text-gray-400 hover:text-white p-1 rounded focus:outline-none focus:ring-2 focus:ring-teal-500" title="New Chat"><PlusCircleIcon className="h-6 w-6" /></button>
                <button onClick={() => setIsSettingsOpen(true)} className="text-gray-400 hover:text-white p-1 rounded focus:outline-none focus:ring-2 focus:ring-teal-500" title="Settings"><Cog6ToothIcon className="h-6 w-6" /></button>
            </div>
          </header>
          {/* Search */}
          <div className="p-4 border-b border-white/10"><div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" /><input type="text" placeholder="Search or start new chat" className="w-full pl-10 pr-4 py-2 rounded-lg bg-gray-900 border border-gray-700 focus:outline-none focus:ring-1 focus:ring-teal-500" />
          </div></div>
          {/* Tabs */}
          <div className="p-4 border-b border-gray-700"><div className="flex space-x-4">
            {['All', 'Friends', 'Groups'].map(tab => (<button key={tab} onClick={() => setActiveTab(tab)} className={`px-3 py-1 text-sm font-semibold rounded-full relative ${activeTab === tab ? 'text-white' : 'text-gray-400 hover:text-white'}`}>{tab}{activeTab === tab && <motion.div className="absolute bottom-[-8px] left-0 right-0 h-0.5 bg-teal-500" layoutId="active-tab-indicator" />}</button>))}
          </div></div>

          {/* Conversation List */}
          <div className="flex-grow overflow-y-auto">
            {!conversations.length && <p className="text-center text-gray-500 p-4">No conversations yet.</p>}
            {conversations.map(convo => {
              const members = convo.members || [];
              let chatName='', chatAvatar='', isOnline=false, otherUser=null;
              if (convo.isGroup) { chatName = convo.groupName || 'Unnamed Group'; chatAvatar = `https://i.pravatar.cc/150?u=${convo._id}`; }
              else { otherUser = user ? members.find(member => member._id !== user._id) : null; if (!otherUser) { return null; } chatName = otherUser.username; chatAvatar = `https://i.pravatar.cc/150?u=${otherUser.email}`; isOnline = onlineUsers.includes(otherUser._id); }
              const lastMessageData = convo.lastMessage;
              const lastMessageText = () => { if (!lastMessageData) return "No messages yet"; if(lastMessageData.deletedEveryone) return <span className="italic text-gray-500">🗑️ Message deleted</span>; const senderName = lastMessageData.senderId?.username; const senderPrefix = (convo.isGroup && senderName && lastMessageData.senderId?._id !== user?._id) ? `${senderName}: ` : ""; if (lastMessageData.messageType === 'image') return <span className="flex items-center gap-1 text-gray-400"><PaperClipIcon className="h-4 w-4 inline-block shrink-0"/>{senderPrefix}Image</span>; if (lastMessageData.messageType === 'file') return <span className="flex items-center gap-1 text-gray-400"><DocumentIcon className="h-4 w-4 inline-block shrink-0"/>{senderPrefix}{lastMessageData.text || 'File'}</span>; return <>{senderPrefix}{lastMessageData.text || ''}</>; };
              const handleSelectChat = async (selectedConvo) => { setSelectedChat(selectedConvo); if (selectedConvo.unreadCount > 0) { try { const token=localStorage.getItem('token'); const config={headers:{Authorization:`Bearer ${token}`}}; await axios.put(`http://localhost:3001/api/conversations/${selectedConvo._id}/read`,{},config); setConversations(prev => prev.map(c => c._id === selectedConvo._id ? { ...c, unreadCount: 0 } : c)); } catch(err){console.error("Failed to mark as read", err);} } };
              return (
                <div key={convo._id} onClick={() => handleSelectChat(convo)} className={`relative flex items-center p-4 cursor-pointer border-l-2 transition-colors ${selectedChat?._id === convo._id ? 'border-teal-400 bg-white/5' : 'border-transparent hover:bg-white/5'}`}>
                  {selectedChat?._id === convo._id && <motion.div layoutId="active-chat-indicator" className="absolute left-0 top-0 bottom-0 w-1 bg-teal-400 rounded-r-full" />}
                  <div className="relative z-10 shrink-0"><img src={chatAvatar} alt={chatName} className="h-12 w-12 rounded-full bg-gray-600" />{isOnline && !convo.isGroup && (<span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-green-400 border-2 border-gray-800 animate-pulse"></span>)}</div>
                  <div className="ml-4 flex-grow z-10 overflow-hidden"><p className="font-semibold text-white truncate">{chatName}</p><p className="text-sm text-gray-400 truncate">{lastMessageText()}</p></div>
                  {convo.unreadCount > 0 && (<div className="ml-2 flex-shrink-0 z-10"><span className="h-6 w-6 flex items-center justify-center rounded-full bg-teal-500 text-white text-xs font-bold">{convo.unreadCount > 9 ? '9+' : convo.unreadCount}</span></div>)}
                </div>
              );
            })}
          </div>
        </motion.aside>

        {/* Chat Area */}
        <AnimatePresence>
          {selectedChat && user && ( // Ensure user and selectedChat are loaded
            <motion.main className="absolute top-0 left-0 h-full w-full md:static flex-grow flex flex-col bg-gray-900" initial={{ x: '100%' }} animate={{ x: '0%' }} exit={{ x: '100%' }} transition={{ duration: 0.3, ease: 'easeInOut' }}>
              {/* Chat Header */}
              <header onClick={() => setIsInfoPanelOpen(true)} className="flex items-center justify-between p-4 bg-black/20 backdrop-blur-xl border-b border-white/10 flex-shrink-0 cursor-pointer">
                <div className="flex items-center gap-4 min-w-0"> {/* Added min-w-0 for truncation */}
                  <button onClick={(e) => {e.stopPropagation(); setSelectedChat(null)}} className="md:hidden text-gray-400 hover:text-white flex-shrink-0"><ArrowLeftIcon className="h-6 w-6" /></button>
                  {/* Defensive checks for members array */}
                  <img src={selectedChat.isGroup ? `https://i.pravatar.cc/150?u=${selectedChat._id}` : `https://i.pravatar.cc/150?u=${selectedChat.members?.find(m=>m._id!==user._id)?.email || 'default'}`} alt={selectedChat.isGroup ? selectedChat.groupName : selectedChat.members?.find(m=>m._id!==user._id)?.username || 'User'} className="h-10 w-10 rounded-full bg-gray-600 flex-shrink-0" />
                  <div className="min-w-0"> {/* Added min-w-0 for truncation */}
                    <p className="font-semibold text-white truncate">{selectedChat.isGroup ? selectedChat.groupName : selectedChat.members?.find(m=>m._id!==user._id)?.username || 'Chat'}</p>
                    {/* Typing/Online Indicator */}
                    <div className="h-4"> {/* Consistent height */}
                        {typingText ? ( <p className="text-xs text-teal-400 animate-pulse truncate">{typingText}</p> ) // Added truncate
                         : selectedChat.isGroup ? ( <p className="text-xs text-gray-400">{selectedChat.members?.length || 0} Members</p> )
                         // Check if other user ID exists before checking online status
                         : onlineUsers.includes(selectedChat.members?.find(m => m._id !== user._id)?._id) ? ( <p className="text-xs text-green-400">Online</p> )
                         : ( <p className="text-xs text-gray-500">Offline</p> )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-gray-400 flex-shrink-0"><button className="hover:text-white p-1 rounded focus:outline-none focus:ring-2 focus:ring-teal-500"><PhoneIcon className="h-6 w-6" /></button><button className="hover:text-white p-1 rounded focus:outline-none focus:ring-2 focus:ring-teal-500"><VideoCameraIcon className="h-6 w-6" /></button><button className="hover:text-white p-1 rounded focus:outline-none focus:ring-2 focus:ring-teal-500"><EllipsisVerticalIcon className="h-6 w-6" /></button></div>
              </header>

              {/* Message List */}
              <div ref={chatContainerRef} className="flex-grow p-6 overflow-y-auto bg-black/20 relative" onClick={closeContextMenu}>
                {messages.length === 0 && <div className="text-center text-gray-500 pt-10">No messages in this chat yet.</div>}
                {messages.map((msg) => {
                  const sender = msg.senderId; // Can be object (populated) or string ID
                  // Safely check if the message is from the current user
                  const isMyMessage = user ? (sender === user._id || sender?._id === user._id) : false;

                  const renderMessageContent = () => {
                    if (msg.deletedEveryone) { return <span className="italic text-gray-400 text-sm">🗑️ Message deleted</span>; }
                    switch (msg.messageType) {
                      case 'image': return (<img src={msg.fileUrl} alt={msg.text || "Uploaded image"} className="max-w-xs md:max-w-sm rounded-lg cursor-pointer object-cover" onClick={() => window.open(msg.fileUrl, '_blank')}/>);
                      case 'file': return (<a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-3 p-3 rounded-lg ${isMyMessage?'bg-teal-700 hover:bg-teal-800':'bg-gray-800 hover:bg-gray-700'}`}><DocumentIcon className="h-8 w-8 text-teal-300 flex-shrink-0" /><div className="flex flex-col overflow-hidden"><span className="font-semibold truncate">{msg.text || 'Download File'}</span><span className="text-xs text-gray-300">Click to download</span></div></a>);
                      default: return <span className="whitespace-pre-wrap break-words">{msg.text}</span>; // Handle line breaks
                    }
                  };
                  return (
                   // Use unique message ID, fallback to clientId or timestamp for optimistic updates
                   <div key={msg._id || msg.clientId || msg.timestamp} onContextMenu={(e) => showContextMenu(e, msg)}>
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex flex-col ${isMyMessage ? 'items-end' : 'items-start'} mb-1`}>
                      {/* Show sender name in groups for messages from others */}
                      {selectedChat.isGroup && !isMyMessage && (
                        <span className="text-xs text-gray-400 mb-1 ml-2 mr-2">{sender?.username || '...'}</span>
                      )}
                      <div className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'} w-full`}>
                        <div className={`rounded-2xl max-w-[80%] md:max-w-[70%] lg:max-w-[60%] flex items-center gap-2 ${isMyMessage ?'bg-teal-600 text-white':'bg-gray-700 text-gray-200'} ${msg.messageType==='text'?'py-2 px-4':''} ${msg.messageType!=='text'?(msg.messageType==='image'?'p-1':'p-2'):''}`}>
                          {renderMessageContent()}
                          {isMyMessage && !msg.deletedEveryone && (
                            // Don't show checkmark for temporary messages
                            !msg._id?.startsWith('temp_') &&
                            <CheckCircleIcon className={`h-4 w-4 text-teal-200 flex-shrink-0 self-end ${msg.messageType !== 'text' ? 'mb-1 ml-1' : 'ml-1'}`} />
                          )}
                           {/* Add upload indicator for optimistic file messages */}
                           {msg.isUploading && (
                             <motion.span initial={{opacity:0}} animate={{opacity:1}} className="ml-1 text-xs text-gray-400">(Uploading...)</motion.span>
                           )}
                        </div>
                      </div>
                    </motion.div>
                   </div>
                )})}
              </div>

              {/* Message Input Footer */}
              <footer className="p-4 bg-black/20 backdrop-blur-xl border-t border-white/10 flex-shrink-0">
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*, application/pdf, .doc, .docx, .txt, .zip, .rar, video/*, audio/*" /> {/* Added more accept types */}
                <form onSubmit={handleSendMessage} className="flex items-center bg-gray-900/50 rounded-lg px-2">
                  <motion.button type="button" whileTap={{ scale: 0.9 }} className="text-gray-400 hover:text-white p-2 rounded focus:outline-none focus:ring-2 focus:ring-teal-500"><PlusCircleIcon className="h-6 w-6" /></motion.button>
                  <motion.button type="button" whileTap={{ scale: 0.9 }} className="text-gray-400 hover:text-white p-2 rounded focus:outline-none focus:ring-2 focus:ring-teal-500" onClick={() => fileInputRef.current && fileInputRef.current.click()}><PaperClipIcon className="h-6 w-6" /></motion.button>
                  <TextareaAutosize placeholder="Type a message..." value={newMessage} onInput={handleTyping} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => { if(e.key==='Enter'&&!e.shiftKey){e.preventDefault(); handleSendMessage(e);}}} maxRows={5} className="flex-grow px-3 py-3 bg-transparent focus:outline-none text-white resize-none" rows={1}/>
                  <motion.button type="button" whileTap={{ scale: 0.9 }} className="text-gray-400 hover:text-yellow-400 p-2 rounded focus:outline-none focus:ring-2 focus:ring-teal-500"><FaceSmileIcon className="h-6 w-6" /></motion.button>
                  {/* Disable send button if message is empty */}
                  <motion.button type="submit" whileTap={{ scale: 0.9 }} className="bg-teal-600 text-white p-2 rounded-full hover:bg-teal-700 m-1 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-gray-900" disabled={!newMessage.trim()}><PaperAirplaneIcon className="h-6 w-6" /></motion.button>
                </form>
              </footer>
            </motion.main>
          )}
        </AnimatePresence>

        {/* Context Menu */}
        <AnimatePresence> {contextMenu && (<MessageContextMenu x={contextMenu.x} y={contextMenu.y} message={contextMenu.message} user={user} onDelete={handleDeleteMessage} closeMenu={closeContextMenu}/>)} </AnimatePresence>
        {/* Placeholder when no chat selected */}
        {!selectedChat && (<div className="hidden md:flex flex-grow flex-col items-center justify-center h-full text-center bg-gray-900"><h2 className="text-2xl font-semibold text-white">Select a chat to start messaging</h2><p className="text-gray-500 mt-2">Your conversations will appear in the sidebar.</p></div>)}
        {/* Contact/Group Info Panel */}
        <ContactInfoPanel chat={selectedChat} isOpen={isInfoPanelOpen} closePanel={() => setIsInfoPanelOpen(false)} onlineUsers={onlineUsers} currentUser={user}/>
      </div>
    </div>
  );
}

export default Dashboard;

// END OF Dashboard.jsx