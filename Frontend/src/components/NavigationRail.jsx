import React from 'react';
import { motion } from 'framer-motion';
import {
  ChatBubbleLeftRightIcon,
  VideoCameraIcon,
  UserPlusIcon,
  UsersIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

export default function NavigationRail({
  activeView, // 'chats' | 'streams'
  setActiveView,
  onOpenNewChat,
  onOpenCreateGroup,
  onOpenSettings,
  onLogout,
  currentUser,
  hasLiveStream
}) {
  const avatarUrl =
    currentUser?.avatar ||
    `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser?.username || 'User'}`;

  return (
    <aside className="hidden md:flex w-20 flex-col items-center justify-between border-r border-zinc-800/80 bg-zinc-950 py-5 flex-shrink-0 z-20">
      {/* Brand Logo */}
      <div className="flex flex-col items-center gap-6">
        <div className="relative group cursor-pointer" onClick={() => setActiveView('chats')}>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-zinc-950 font-black text-xl shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-all">
            C
          </div>
          <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full bg-emerald-400 border-2 border-zinc-950 shadow"></span>
        </div>

        {/* Primary Navigation Icons */}
        <div className="flex flex-col items-center gap-3">
          {/* Chats View */}
          <button
            onClick={() => setActiveView('chats')}
            className={`relative flex h-12 w-12 items-center justify-center rounded-2xl transition-all ${
              activeView === 'chats'
                ? 'bg-zinc-800 text-emerald-400 shadow-md border border-zinc-700/80'
                : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
            }`}
            title="Messages & Synchronous Chats"
          >
            <ChatBubbleLeftRightIcon className="h-6 w-6" />
            {activeView === 'chats' && (
              <motion.div
                layoutId="rail-indicator"
                className="absolute -left-3.5 h-6 w-1 rounded-r-full bg-emerald-400"
              />
            )}
          </button>

          {/* Video Streaming View */}
          <button
            onClick={() => setActiveView('streams')}
            className={`relative flex h-12 w-12 items-center justify-center rounded-2xl transition-all ${
              activeView === 'streams'
                ? 'bg-zinc-800 text-emerald-400 shadow-md border border-zinc-700/80'
                : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
            }`}
            title="Live Video Streams"
          >
            <VideoCameraIcon className="h-6 w-6" />
            {hasLiveStream && (
              <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-rose-500 animate-ping"></span>
            )}
            {activeView === 'streams' && (
              <motion.div
                layoutId="rail-indicator"
                className="absolute -left-3.5 h-6 w-1 rounded-r-full bg-emerald-400"
              />
            )}
          </button>

          <div className="my-2 h-[1px] w-8 bg-zinc-800/80"></div>

          {/* Quick Action: Start New Chat */}
          <button
            onClick={onOpenNewChat}
            className="flex h-11 w-11 items-center justify-center rounded-2xl text-zinc-400 hover:bg-zinc-900 hover:text-emerald-400 transition-all border border-transparent hover:border-zinc-800"
            title="New Direct Message"
          >
            <UserPlusIcon className="h-5 w-5" />
          </button>

          {/* Quick Action: Create Group */}
          <button
            onClick={onOpenCreateGroup}
            className="flex h-11 w-11 items-center justify-center rounded-2xl text-zinc-400 hover:bg-zinc-900 hover:text-emerald-400 transition-all border border-transparent hover:border-zinc-800"
            title="Create New Group"
          >
            <UsersIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Bottom User Actions */}
      <div className="flex flex-col items-center gap-3">
        {/* Settings */}
        <button
          onClick={onOpenSettings}
          className="flex h-11 w-11 items-center justify-center rounded-2xl text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 transition-all"
          title="Account Settings"
        >
          <Cog6ToothIcon className="h-5 w-5" />
        </button>

        {/* User Profile Avatar */}
        <div
          onClick={onOpenSettings}
          className="relative cursor-pointer group"
          title={`${currentUser?.username || 'Profile'} (Click for Settings)`}
        >
          <img
            src={avatarUrl}
            alt={currentUser?.username}
            className="h-11 w-11 rounded-2xl border border-zinc-700/80 object-cover group-hover:border-emerald-500/60 transition-all"
          />
          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-400 border-2 border-zinc-950"></span>
        </div>

        {/* Logout */}
        <button
          onClick={onLogout}
          className="flex h-11 w-11 items-center justify-center rounded-2xl text-zinc-500 hover:bg-rose-500/10 hover:text-rose-400 transition-all"
          title="Log out"
        >
          <ArrowRightOnRectangleIcon className="h-5 w-5" />
        </button>
      </div>
    </aside>
  );
}
