import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ChatBubbleLeftRightIcon,
  VideoCameraIcon,
  ShieldCheckIcon,
  BoltIcon,
  SparklesIcon,
  SignalIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  ComputerDesktopIcon
} from '@heroicons/react/24/outline';
import Login from './Login';

export default function Home({ openModal }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('login');
  const navigate = useNavigate();

  const handleOpenModal = (mode) => {
    if (openModal) {
      openModal(mode);
    } else {
      setModalMode(mode);
      setIsModalOpen(true);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  // If user is already authenticated, allow direct access to Dashboard
  const token = localStorage.getItem('token');

  return (
    <>
      <div className="relative min-h-screen w-full overflow-x-hidden bg-zinc-950 text-zinc-100 selection:bg-emerald-500 selection:text-zinc-950">
        {/* Soft Ambient Radial Lights (Strictly Obsidian / Zinc & Emerald, NO Dark Blue!) */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-emerald-500/10 blur-[130px]" />
          <div className="absolute top-1/3 -left-40 h-[400px] w-[500px] rounded-full bg-teal-500/5 blur-[120px]" />
          <div className="absolute bottom-10 right-0 h-[400px] w-[500px] rounded-full bg-emerald-600/5 blur-[120px]" />
        </div>

        {/* --- Navbar --- */}
        <nav className="sticky top-0 z-40 flex items-center justify-between border-b border-zinc-800/80 bg-zinc-950/70 px-6 py-4 backdrop-blur-xl sm:px-12">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 font-black text-zinc-950 text-xl shadow-lg shadow-emerald-500/20">
              C
            </div>
            <span className="text-xl font-bold tracking-tight text-zinc-100">Chatify</span>
          </div>

          <div className="flex items-center gap-4">
            {token ? (
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2 text-sm font-bold text-zinc-950 hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20"
              >
                Go to Dashboard
                <ArrowRightIcon className="h-4 w-4" />
              </button>
            ) : (
              <>
                <button
                  onClick={() => handleOpenModal('login')}
                  className="px-4 py-2 text-sm font-semibold text-zinc-300 hover:text-white transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={() => handleOpenModal('signup')}
                  className="rounded-xl bg-emerald-500 px-5 py-2 text-sm font-bold text-zinc-950 hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20"
                >
                  Get Started
                </button>
              </>
            )}
          </div>
        </nav>

        {/* --- Hero Section --- */}
        <section className="relative z-10 mx-auto max-w-7xl px-6 pt-16 pb-24 md:pt-24 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-12">
            {/* Left Hero Pitch */}
            <div className="text-center lg:col-span-7 lg:text-left">
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold text-emerald-400 mb-6"
              >
                <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Next-Gen Synchronous Communication & Video
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-4xl font-black tracking-tight sm:text-6xl md:text-7xl text-zinc-100"
              >
                Synchronous Chat. <br />
                <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                  Live Video Streams.
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-6 text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto lg:mx-0 leading-relaxed"
              >
                Chatify unites real-time instantaneous messaging, peer-to-peer WebRTC video calling, and live broadcast streaming in one ultra-fast, beautifully designed workspace.
              </motion.p>

              {/* Call to Actions */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-8 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4"
              >
                <button
                  onClick={() => handleOpenModal('signup')}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-8 py-3.5 text-base font-bold text-zinc-950 hover:bg-emerald-400 transition-all shadow-xl shadow-emerald-500/25 active:scale-95"
                >
                  Start Chatting for Free
                  <ArrowRightIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={() => handleOpenModal('login')}
                  className="w-full sm:w-auto rounded-2xl border border-zinc-800 bg-zinc-900/60 px-8 py-3.5 text-base font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-white transition-all"
                >
                  Sign In to Account
                </button>
              </motion.div>

              {/* Key Bullet Highlights */}
              <div className="mt-10 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs text-zinc-400 font-medium">
                <span className="flex items-center gap-1.5">
                  <CheckCircleIcon className="h-4 w-4 text-emerald-400" />
                  Instant Socket.io Sync
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircleIcon className="h-4 w-4 text-emerald-400" />
                  WebRTC Audio & Video Calls
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircleIcon className="h-4 w-4 text-emerald-400" />
                  Live Group Broadcasting
                </span>
              </div>
            </div>

            {/* Right Live Interactive App Showcase Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.25, duration: 0.5 }}
              className="lg:col-span-5"
            >
              <div className="relative rounded-3xl border border-zinc-800 bg-zinc-900/90 p-5 shadow-2xl backdrop-blur-2xl">
                {/* Header of mock app */}
                <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img
                        src="https://api.dicebear.com/7.x/bottts/svg?seed=Alex"
                        alt="Alex"
                        className="h-10 w-10 rounded-xl bg-zinc-950 border border-zinc-700"
                      />
                      <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 border-2 border-zinc-900"></span>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-zinc-100">Alex Rivers</h4>
                      <p className="text-[11px] text-emerald-400 font-medium">● Online • Video Ready</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-400 border border-emerald-500/20">
                      <VideoCameraIcon className="h-3.5 w-3.5" />
                      HD Call
                    </span>
                  </div>
                </div>

                {/* Animated Chat Exchange */}
                <div className="py-5 space-y-3">
                  <div className="flex justify-start">
                    <div className="max-w-[80%] rounded-2xl rounded-bl-xs bg-zinc-800 border border-zinc-700/60 p-3 text-xs text-zinc-200">
                      Hey! Have you tested the new synchronous chat and video streaming on Chatify? 🚀
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <div className="max-w-[80%] rounded-2xl rounded-br-xs bg-emerald-500 p-3 text-xs font-medium text-zinc-950 shadow-md">
                      Yes! The video call latency is practically zero, and live group streaming is super smooth!
                    </div>
                  </div>

                  {/* Incoming Call / Stream preview pill */}
                  <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      <div>
                        <p className="text-xs font-bold text-zinc-100">Live Video Stream Active</p>
                        <p className="text-[10px] text-zinc-400">P2P WebRTC 1080p Stream</p>
                      </div>
                    </div>
                    <span className="rounded-lg bg-emerald-500 px-3 py-1 text-[11px] font-bold text-zinc-950">
                      Watch
                    </span>
                  </div>

                  <div className="flex justify-start">
                    <div className="rounded-2xl rounded-bl-xs bg-zinc-800/80 border border-zinc-700/40 px-3 py-1.5 text-[11px] text-emerald-400 flex items-center gap-1.5 animate-pulse">
                      <span>Alex is typing</span>
                      <span className="flex gap-0.5">
                        <span className="h-1 w-1 rounded-full bg-emerald-400"></span>
                        <span className="h-1 w-1 rounded-full bg-emerald-400"></span>
                        <span className="h-1 w-1 rounded-full bg-emerald-400"></span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Mock Input */}
                <div className="flex items-center gap-2 rounded-xl bg-zinc-950 border border-zinc-800 p-2 text-xs text-zinc-500">
                  <span className="flex-grow pl-2">Type your message...</span>
                  <div className="h-7 w-7 rounded-lg bg-emerald-500 flex items-center justify-center text-zinc-950 font-bold">
                    →
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* --- Features Grid Section --- */}
        <section className="relative z-10 border-t border-zinc-800/80 bg-zinc-900/40 py-24 backdrop-blur-md">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-2">
                Engineered for Modern Teams
              </h2>
              <p className="text-3xl font-extrabold text-zinc-100 sm:text-4xl">
                Everything you need for instant collaboration
              </p>
            </div>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              {/* Feature 1 */}
              <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-8 hover:border-emerald-500/40 transition-all hover:-translate-y-1">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-6">
                  <BoltIcon className="h-7 w-7" />
                </div>
                <h3 className="text-xl font-bold text-zinc-100">Synchronous Chat</h3>
                <p className="mt-3 text-sm text-zinc-400 leading-relaxed">
                  Real-time bidirectional message sync powered by Socket.io and MongoDB. Immediate delivery, live typing status, and read ticks.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-8 hover:border-emerald-500/40 transition-all hover:-translate-y-1">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-6">
                  <VideoCameraIcon className="h-7 w-7" />
                </div>
                <h3 className="text-xl font-bold text-zinc-100">WebRTC Video Calling</h3>
                <p className="mt-3 text-sm text-zinc-400 leading-relaxed">
                  Crystal clear peer-to-peer 1-on-1 audio and video calls with screen sharing and Picture-in-Picture minimize mode so you can chat while calling.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-8 hover:border-emerald-500/40 transition-all hover:-translate-y-1">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-6">
                  <SignalIcon className="h-7 w-7" />
                </div>
                <h3 className="text-xl font-bold text-zinc-100">Live Video Streams</h3>
                <p className="mt-3 text-sm text-zinc-400 leading-relaxed">
                  Broadcast your camera or screen live to groups and channels. Members can tune in synchronously with 1 click and join the live chat.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* --- Footer --- */}
        <footer className="relative z-10 border-t border-zinc-800/80 bg-zinc-950 py-10 px-6 sm:px-12 text-center text-xs text-zinc-500">
          <div className="flex items-center justify-center gap-2 mb-2 font-bold text-zinc-300">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400"></span>
            Chatify — Synchronous Chat & Video Streaming
          </div>
          <p>© {new Date().getFullYear()} Chatify. All rights reserved.</p>
        </footer>
      </div>

      {/* Auth Modal */}
      {isModalOpen && <Login closeModal={handleCloseModal} initialMode={modalMode} />}
    </>
  );
}