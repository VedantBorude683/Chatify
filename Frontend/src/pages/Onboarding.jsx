import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCircleIcon } from '@heroicons/react/24/solid';
import { motion, AnimatePresence } from 'framer-motion';

function Onboarding() {
  const [showForm, setShowForm] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [imagePreview, setImagePreview] = useState(null);
  const [status, setStatus] = useState('');
  const navigate = useNavigate();

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log({ displayName, status, imageFile: '...' });
    navigate('/dashboard');
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

                {/* Display Name Input */}
                <div>
                  <label htmlFor="displayName" className="block font-semibold text-gray-300">Display Name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                    className="mt-2 w-full rounded-md border border-gray-600 bg-gray-700/50 px-3 py-2 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    placeholder="e.g., Jane Doe"
                  />
                </div>

                {/* Status/Bio Input */}
                <div>
                  <label htmlFor="status" className="block font-semibold text-gray-300">Status</label>
                  <textarea
                    id="status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)} // <-- THE FIX IS HERE
                    rows={2}
                    className="mt-2 w-full resize-none rounded-md border border-gray-600 bg-gray-700/50 px-3 py-2 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    placeholder="e.g., Available | Working on a project..."
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  className="w-full rounded-md bg-teal-600 py-2 font-bold text-white transition-colors hover:bg-teal-700"
                >
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