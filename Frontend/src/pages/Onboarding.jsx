import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { SparklesIcon, ArrowRightIcon, UserIcon, MapPinIcon, ChatBubbleBottomCenterTextIcon } from '@heroicons/react/24/outline';
import { API_BASE_URL } from '../config';

export default function Onboarding() {
  const [displayName, setDisplayName] = useState('');
  const [status, setStatus] = useState('Hey there! I am using Chatify.');
  const [location, setLocation] = useState('');
  const [avatarSeed, setAvatarSeed] = useState(Math.random().toString(36).substring(7));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${avatarSeed}`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/');
        return;
      }

      const config = { headers: { Authorization: `Bearer ${token}` } };
      const payload = {
        displayName: displayName.trim(),
        status: status.trim(),
        location: location.trim(),
        avatar: avatarUrl
      };

      await axios.put(`${API_BASE_URL}/api/user/onboarding`, payload, config);
      navigate('/dashboard');
    } catch (err) {
      console.error('Onboarding failed:', err);
      alert('Could not complete setup. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-4 text-zinc-100 selection:bg-emerald-500 selection:text-zinc-950">
      {/* Ambient Lighting */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full bg-emerald-500/10 blur-[120px]" />
      </div>

      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-zinc-900 border border-zinc-800 p-8 sm:p-10 shadow-2xl backdrop-blur-2xl"
      >
        <div className="text-center mb-8">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 font-black text-zinc-950 text-xl shadow-lg shadow-emerald-500/20">
            C
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-100">Setup Your Chatify Profile</h2>
          <p className="mt-1 text-xs text-zinc-400">Personalize your identity for synchronous chats and video streams</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar Generator */}
          <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800/80">
            <img
              src={avatarUrl}
              alt="Avatar"
              className="h-20 w-20 rounded-2xl border-2 border-emerald-500/50 bg-zinc-900 object-cover shadow-lg"
            />
            <div className="text-center sm:text-left flex-grow">
              <p className="text-sm font-semibold text-zinc-200">Your 3D Bot Persona</p>
              <p className="text-xs text-zinc-400 mt-0.5">Click to generate a unique avatar seed</p>
              <button
                type="button"
                onClick={() => setAvatarSeed(Math.random().toString(36).substring(7))}
                className="mt-2.5 inline-flex items-center gap-1.5 rounded-xl bg-zinc-800 px-3.5 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-zinc-700 transition-colors border border-zinc-700/60"
              >
                <SparklesIcon className="h-4 w-4" />
                Randomize Avatar
              </button>
            </div>
          </div>

          {/* Display Name */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
              Display Name
            </label>
            <div className="relative">
              <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Alex Rivers"
                className="w-full rounded-xl bg-zinc-950 border border-zinc-800 pl-10 pr-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
          </div>

          {/* Status Message */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
              Status Message
            </label>
            <div className="relative">
              <ChatBubbleBottomCenterTextIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <input
                type="text"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                placeholder="e.g. Ready for video chat"
                className="w-full rounded-xl bg-zinc-950 border border-zinc-800 pl-10 pr-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
              Location (Optional)
            </label>
            <div className="relative">
              <MapPinIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. New York, USA"
                className="w-full rounded-xl bg-zinc-950 border border-zinc-800 pl-10 pr-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting || !displayName.trim()}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3.5 text-sm font-bold text-zinc-950 hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-50"
          >
            <span>{isSubmitting ? 'Finalizing Profile...' : 'Enter Chatify'}</span>
            <ArrowRightIcon className="h-4 w-4" />
          </button>
        </form>
      </motion.div>
    </div>
  );
}