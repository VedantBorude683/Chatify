import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCircleIcon } from '@heroicons/react/24/solid';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

function Onboarding() {
  const [showForm, setShowForm] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [imagePreview, setImagePreview] = useState(null);
  const [status, setStatus] = useState('');
  const [location, setLocation] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const navigate = useNavigate();

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImagePreview(URL.createObjectURL(file));
      // In a real app, you would also store the file object itself
      // e.g., setImageFile(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/'); // Redirect home if no token
        return;
      }

      const config = {
        headers: {
          Authorization: `Bearer ${token}`
        }
      };

      const payload = {
        displayName,
        status,
        location,
        // We are skipping the actual file upload logic for now
      };
      
      await axios.put('http://localhost:3001/api/user/onboarding', payload, config);

      navigate('/dashboard');

    } catch (err) {
      console.error('Onboarding submission failed:', err);
      // You could add an error message to the UI here
    }
  };

  const stageVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900 p-4 text-white">
      <div className="w-full max-w-lg rounded-2xl bg-gray-800/50 border border-white/10 shadow-2xl overflow-hidden p-8">
        <AnimatePresence mode="wait">
          {!showForm ? (
            // Stage 1: Welcome Screen
            <motion.div
              key="welcome"
              variants={stageVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center text-center"
            >
              <h2 className="text-3xl font-bold">Welcome to ChatApp!</h2>
              <p className="mt-2 text-gray-400">Let's create your profile.</p>
              <button 
                onClick={() => setShowForm(true)} 
                className="mt-8 w-full max-w-xs rounded-md bg-teal-600 py-2 font-bold text-white transition-colors hover:bg-teal-700"
              >
                Let's Go
              </button>
            </motion.div>
          ) : (
            // Stage 2: The Combined Profile Form
            <motion.div
              key="form"
              variants={stageVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ duration: 0.3 }}
            >
              <h2 className="text-2xl font-bold text-center">Create Your Profile</h2>
              <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                {/* Avatar Upload */}
                <div className="flex items-center gap-x-4">
                  {imagePreview ? (
                    <img src={imagePreview} className="h-20 w-20 rounded-full object-cover" alt="Avatar preview" />
                  ) : (
                    <UserCircleIcon className="h-20 w-20 text-gray-500" />
                  )}
                  <label htmlFor="file-upload" className="cursor-pointer rounded-md bg-white/10 px-3 py-2 text-sm font-semibold shadow-sm hover:bg-white/20">
                    <span>Upload Avatar</span>
                    <input id="file-upload" type="file" className="sr-only" onChange={handleImageChange} accept="image/*" />
                  </label>
                </div>

                {/* Display Name & Location Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="displayName" className="block font-semibold text-gray-300">Display Name</label>
                    <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required
                      className="mt-2 w-full rounded-md border border-gray-600 bg-gray-700/50 px-3 py-2 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                      placeholder="e.g., Jane Doe"
                    />
                  </div>
                  <div>
                    <label htmlFor="location" className="block font-semibold text-gray-300">Location</label>
                    <input type="text" value={location} onChange={(e) => setLocation(e.target.value)}
                      className="mt-2 w-full rounded-md border border-gray-600 bg-gray-700/50 px-3 py-2 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                      placeholder="e.g., Solapur, India"
                    />
                  </div>
                </div>

                {/* Status/Bio Input */}
                <div>
                  <label htmlFor="status" className="block font-semibold text-gray-300">Status</label>
                  <textarea id="status" value={status} onChange={(e) => setStatus(e.target.value)} rows={2}
                    className="mt-2 w-full resize-none rounded-md border border-gray-600 bg-gray-700/50 px-3 py-2 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    placeholder="e.g., Available | Working on a project..."
                  />
                </div>

                {/* Notification Toggle */}
                <div className="flex items-center justify-between rounded-lg bg-gray-700/50 p-4 border border-gray-600">
                    <label htmlFor="notifications" className="font-semibold text-gray-300">Enable Desktop Notifications</label>
                    <button type="button" onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                        className={`${notificationsEnabled ? 'bg-teal-600' : 'bg-gray-600'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}
                    >
                        <span className={`${notificationsEnabled ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
                    </button>
                </div>

                <button type="submit" className="w-full rounded-md bg-teal-600 py-2 font-bold text-white transition-colors hover:bg-teal-700">
                  Finish Setup
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default Onboarding;