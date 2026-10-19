import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { XMarkIcon, SparklesIcon, EnvelopeIcon, LockClosedIcon, UserIcon } from '@heroicons/react/24/outline';
import { API_BASE_URL } from '../config';

export default function Login({ closeModal, initialMode = 'login' }) {
  const [isLoginView, setIsLoginView] = useState(initialMode === 'login');
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    if (isLoginView) {
      try {
        const res = await axios.post(`${API_BASE_URL}/api/auth/login`, {
          email: formData.email.trim(),
          password: formData.password
        });

        localStorage.setItem('token', res.data.token);
        closeModal();

        if (res.data.hasCompletedOnboarding) {
          navigate('/dashboard');
        } else {
          navigate('/onboarding');
        }
      } catch (err) {
        if (err.response && typeof err.response.data === 'string') {
          setError(err.response.data);
        } else {
          setError('Login failed. Please check your credentials.');
        }
      } finally {
        setIsLoading(false);
      }
    } else {
      // Signup Logic
      try {
        await axios.post(`${API_BASE_URL}/api/auth/register`, {
          username: formData.username.trim(),
          email: formData.email.trim(),
          password: formData.password
        });

        setSuccess('Account created successfully! Signing you in...');

        // Automatically log in
        const loginRes = await axios.post(`${API_BASE_URL}/api/auth/login`, {
          email: formData.email.trim(),
          password: formData.password
        });

        localStorage.setItem('token', loginRes.data.token);
        setTimeout(() => {
          closeModal();
          navigate('/onboarding');
        }, 800);
      } catch (err) {
        if (err.response && typeof err.response.data === 'string') {
          setError(err.response.data);
        } else {
          setError('Registration failed. Please try a different email.');
        }
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative w-full max-w-md overflow-hidden rounded-3xl bg-zinc-900 border border-zinc-800 p-7 sm:p-9 shadow-2xl text-zinc-100"
      >
        {/* Close Button */}
        <button
          onClick={closeModal}
          className="absolute top-5 right-5 rounded-full p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>

        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 font-black text-zinc-950 text-xl shadow-lg shadow-emerald-500/20">
            C
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-100">
            {isLoginView ? 'Welcome back to Chatify' : 'Join Chatify Today'}
          </h2>
          <p className="mt-1 text-xs text-zinc-400">
            {isLoginView ? 'Sign in to access your synchronous chats' : 'Create an account to start video streaming & chatting'}
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex rounded-xl bg-zinc-950 p-1 mb-6 border border-zinc-800/80">
          <button
            type="button"
            onClick={() => {
              setIsLoginView(true);
              setError('');
            }}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all ${
              isLoginView
                ? 'bg-zinc-800 text-emerald-400 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsLoginView(false);
              setError('');
            }}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all ${
              !isLoginView
                ? 'bg-zinc-800 text-emerald-400 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <AnimatePresence mode="wait">
            {!isLoginView && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Username
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="alex_rivers"
                    className="w-full rounded-xl bg-zinc-950 border border-zinc-800 pl-10 pr-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                    required={!isLoginView}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <EnvelopeIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@domain.com"
                className="w-full rounded-xl bg-zinc-950 border border-zinc-800 pl-10 pr-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
              Password
            </label>
            <div className="relative">
              <LockClosedIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full rounded-xl bg-zinc-950 border border-zinc-800 pl-10 pr-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-rose-400 text-center font-medium bg-rose-500/10 border border-rose-500/20 py-2 rounded-xl"
            >
              {error}
            </motion.p>
          )}

          {success && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-emerald-400 text-center font-medium bg-emerald-500/10 border border-emerald-500/20 py-2 rounded-xl"
            >
              {success}
            </motion.p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-emerald-500 py-3 text-sm font-bold text-zinc-950 hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-50"
          >
            {isLoading
              ? 'Please wait...'
              : isLoginView
              ? 'Sign In to Chatify'
              : 'Create Account & Continue'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}