import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

// SVG Icon for Google
const GoogleIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"></path>
    <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z"></path>
    <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"></path>
    <path fill="#1976D2" d="M43.611 20.083H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.574l6.19 5.238C42.012 35.845 44 30.137 44 24c0-1.341-.138-2.65-.389-3.917z"></path>
  </svg>
);

// SVG Icon for GitHub
const GithubIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
  </svg>
);

// Main Login/Signup Modal Component
function Login({ closeModal, initialMode }) {
  const [isLoginView, setIsLoginView] = useState(initialMode === 'login');
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    setIsLoginView(initialMode === 'login');
    setError('');
    setSuccess('');
  }, [initialMode]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (isLoginView) {
      try {
        const res = await axios.post('http://localhost:3001/api/auth/login', {
          email: formData.email,
          password: formData.password,
        });
        localStorage.setItem('token', res.data.token);
        closeModal();
        navigate('/dashboard');
      } catch (err) {
        if (err.response && typeof err.response.data === 'string') {
          setError(err.response.data);
        } else {
          setError("Login failed. Please check your credentials.");
        }
        console.error("Login error:", err);
      }
    } else {
      try {
        const res = await axios.post('http://localhost:3001/api/auth/register', {
          username: formData.username,
          email: formData.email,
          password: formData.password,
        });
        setSuccess("Registration successful! Please log in.");
        setTimeout(() => {
          setIsLoginView(true);
          setSuccess('');
          setFormData(prev => ({...prev, username: ''}));
        }, 2000);
      } catch (err) {
        if (err.response && typeof err.response.data === 'string') {
          setError(err.response.data);
        } else {
          setError("Registration failed. Please try again.");
        }
        console.error("Registration error:", err);
      }
    }
  };

  const formVariants = {
    hidden: { opacity: 0, x: -50 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.5 } },
    exit: { opacity: 0, x: 50, transition: { duration: 0.3 } },
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30 backdrop-blur-md"
      onClick={closeModal}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="relative w-full max-w-md rounded-2xl bg-gray-800/50 border border-white/10 p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        <button onClick={closeModal} className="absolute top-4 right-4 text-2xl font-bold text-gray-500 hover:text-gray-200">&times;</button>
        
        <div className="mb-6 text-center">
          <h2 className="text-3xl font-bold text-white">{isLoginView ? 'Welcome Back' : 'Create an Account'}</h2>
          <p className="text-gray-400">{isLoginView ? 'Login to continue' : 'Sign up to get started'}</p>
        </div>
        
        <div className="my-6 flex flex-col gap-3">
            <button className="flex w-full items-center justify-center gap-3 rounded-md border border-white/10 bg-white/10 py-2 font-semibold text-white transition-colors hover:bg-white/20"><GoogleIcon /> Continue with Google</button>
            <button className="flex w-full items-center justify-center gap-3 rounded-md border border-white/10 bg-white/10 py-2 font-semibold text-white transition-colors hover:bg-white/20"><GithubIcon /> Continue with GitHub</button>
        </div>
        
        <div className="my-6 flex items-center"><hr className="w-full border-gray-600" /><p className="px-3 text-gray-500">OR</p><hr className="w-full border-gray-600" /></div>

        <form onSubmit={handleSubmit}>
          <AnimatePresence mode="wait">
            {!isLoginView && (
              <motion.div key="signup-username" variants={formVariants} initial="hidden" animate="visible" exit="exit">
                <label className="mb-2 block font-semibold text-gray-300" htmlFor="username">Username</label>
                <input className="w-full rounded-md border border-gray-600 bg-gray-700/50 px-3 py-2 text-white focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500" type="text" id="username" name="username" value={formData.username} onChange={handleChange} required={!isLoginView} />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-4">
            <label className="mb-2 block font-semibold text-gray-300" htmlFor="email">Email</label>
            <input className="w-full rounded-md border border-gray-600 bg-gray-700/50 px-3 py-2 text-white focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500" type="email" id="email" name="email" value={formData.email} onChange={handleChange} required />
          </div>
          <div className="mt-4">
            <label className="mb-2 block font-semibold text-gray-300" htmlFor="password">Password</label>
            <input className="w-full rounded-md border border-gray-600 bg-gray-700/50 px-3 py-2 text-white focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500" type="password" id="password" name="password" value={formData.password} onChange={handleChange} required />
          </div>
          
          {error && <p className="mt-4 text-center text-sm text-red-400">{error}</p>}
          {success && <p className="mt-4 text-center text-sm text-green-400">{success}</p>}

          <button type="submit" className="mt-6 w-full rounded-md bg-teal-600 py-2 font-bold text-white transition-colors hover:bg-teal-700">{isLoginView ? 'Login' : 'Sign Up'}</button>
        </form>
        <p className="mt-6 text-center text-sm text-gray-400">
          {isLoginView ? "Don't have an account?" : 'Already have an account?'}
          <span onClick={() => setIsLoginView(!isLoginView)} className="ml-1 cursor-pointer font-bold text-teal-400 hover:underline">{isLoginView ? 'Sign Up' : 'Login'}</span>
        </p>
      </motion.div>
    </motion.div>
  );
}

export default Login;