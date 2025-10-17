import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useMotionValueEvent } from 'framer-motion';
import { ChatBubbleLeftRightIcon, LockClosedIcon, PaperAirplaneIcon, StarIcon } from '@heroicons/react/24/solid';
import Login from './Login';

// Main Home Component
function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('login');
  const [isNavbarHidden, setIsNavbarHidden] = useState(false);

  // Hook to detect scroll direction for the navbar
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious();
    if (latest > previous && latest > 150) {
      setIsNavbarHidden(true);
    } else {
      setIsNavbarHidden(false);
    }
  });

  const openModal = (mode) => {
    setModalMode(mode);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const headlineText = "Have your best chat";
  const sentence = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };
  const letter = { hidden: { opacity: 0, y: 50 }, visible: { opacity: 1, y: 0 } };

  return (
    <>
      <div className="w-full overflow-x-hidden bg-gray-900 text-white">
        {/* --- Aurora Background Effect --- */}
        <div className="fixed top-0 left-0 -translate-x-1/4 -translate-y-1/2 w-[150%] h-[150%] bg-gradient-to-r from-teal-500/20 via-purple-500/20 to-blue-500/20 blur-3xl opacity-50 animate-pulse" style={{ animationDuration: '10s' }}></div>
        
        {/* --- Navbar Section --- */}
        <motion.nav
          variants={{ visible: { y: 0 }, hidden: { y: "-100%" } }}
          animate={isNavbarHidden ? "hidden" : "visible"}
          transition={{ duration: 0.35, ease: "easeInOut" }}
          className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 sm:px-10 bg-gray-900/50 backdrop-blur-md border-b border-white/10"
        >
          <div className="text-2xl font-bold"><Link to="/">ChatApp</Link></div>
          <div className="flex items-center gap-4">
            <button onClick={() => openModal('login')} className="px-4 py-2 font-semibold transition-colors hover:text-teal-400">Login</button>
            <button onClick={() => openModal('signup')} className="rounded-md bg-teal-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-teal-700 shadow-lg shadow-teal-600/30">Sign Up</button>
          </div>
        </motion.nav>

        {/* --- Hero Section with Animated App Preview --- */}
        <main className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-6 py-20 md:grid-cols-2 md:py-32">
          <div className="text-center md:text-left">
            <motion.h1 variants={sentence} initial="hidden" animate="visible" className="text-5xl font-extrabold tracking-tight sm:text-6xl md:text-7xl">
              {headlineText.split("").map((char, index) => (
                <motion.span key={char + "-" + index} variants={letter}>{char}</motion.span>
              ))}
            </motion.h1>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5, duration: 0.8 }} className="mt-6 max-w-2xl text-lg text-gray-300 md:mx-0">
              Fast, simple, and secure messaging. Built with the best technology for a seamless experience.
            </motion.p>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.8, duration: 0.8 }}>
              <button onClick={() => openModal('signup')} className="mt-8 inline-block rounded-md bg-teal-600 px-10 py-3 font-bold text-white transition-colors hover:bg-teal-700">Get Started for Free</button>
            </motion.div>
          </div>
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 2, duration: 0.8 }} className="hidden md:block">
            <div className="rounded-xl bg-gray-800/50 p-4 border border-white/10 shadow-2xl">
              <div className="h-16 bg-gray-700/50 rounded-t-lg flex items-center px-4"><div className="w-12 h-12 rounded-full bg-teal-500/50"></div></div>
              <div className="p-4 space-y-4">
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 2.5, duration: 0.5 }} className="w-3/4 p-3 bg-gray-700 rounded-lg">Typing...</motion.div>
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 3, duration: 0.5 }} className="w-3/4 p-3 bg-teal-600 rounded-lg ml-auto">Hello there!</motion.div>
              </div>
            </div>
          </motion.div>
        </main>
        
        {/* --- Social Proof Section --- */}
        <section className="relative z-10 py-12">
            <div className="mx-auto max-w-6xl px-6 text-center">
                <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Trusted by the world's best teams</p>
                <div className="mt-6 flex flex-wrap justify-center items-center gap-x-8 gap-y-4">
                    <span className="text-2xl font-bold text-gray-500 grayscale opacity-60">Company A</span>
                    <span className="text-2xl font-bold text-gray-500 grayscale opacity-60">Enterprise B</span>
                    <span className="text-2xl font-bold text-gray-500 grayscale opacity-60">Startup C</span>
                    <span className="text-2xl font-bold text-gray-500 grayscale opacity-60">Venture D</span>
                </div>
            </div>
        </section>

        {/* --- Features Section --- */}
        <section className="relative z-10 bg-gray-900/50 backdrop-blur-md py-20">
          <div className="mx-auto max-w-6xl px-6 text-center">
            <h2 className="text-4xl font-bold mb-12">Next-Generation Features</h2>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              {[
                { icon: ChatBubbleLeftRightIcon, title: "Real-Time Sync", description: "Messages sync instantly across all your devices." },
                { icon: LockClosedIcon, title: "Ironclad Security", description: "State-of-the-art end-to-end encryption keeps you safe." },
                { icon: PaperAirplaneIcon, title: "Blazing Fast", description: "Engineered for speed, delivering your messages in a blink." }
              ].map((feature, index) => (
                <motion.div key={feature.title} className="rounded-xl border border-white/10 bg-white/5 p-8"
                  initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -5, backgroundColor: 'rgba(255, 255, 255, 0.1)', boxShadow: '0 0 20px rgba(13, 148, 136, 0.5)' }}
                  viewport={{ once: true, amount: 0.5 }} transition={{ duration: 0.5, delay: index * 0.2 }}
                >
                  <feature.icon className="mx-auto h-12 w-12 text-teal-400" />
                  <h3 className="mt-6 text-xl font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-gray-400">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* --- Scrolling Testimonials Section --- */}
        <section className="relative z-10 py-20 overflow-hidden">
          <div className="mx-auto max-w-6xl px-6 text-center">
            <h2 className="text-4xl font-bold mb-12">Loved by Professionals</h2>
          </div>
          <div className="flex space-x-8 animate-marquee">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex-shrink-0 w-80 rounded-xl border border-white/10 bg-white/5 p-8 text-left">
                <div className="flex text-yellow-400">{[...Array(5)].map((_, j) => <StarIcon key={j} className="h-5 w-5"/>)}</div>
                <p className="mt-4 text-gray-300 italic">"This app has revolutionized how our team communicates. It's fast, reliable, and incredibly secure."</p>
                <div className="mt-6 flex items-center gap-4">
                  <img className="h-12 w-12 rounded-full" src={`https://randomuser.me/api/portraits/women/${44+i}.jpg`} alt="User" />
                  <div><p className="font-semibold">Sarah J.</p><p className="text-sm text-gray-400">Project Manager</p></div>
                </div>
              </div>
            ))}
          </div>
        </section>
        
        {/* --- Call to Action Section --- */}
        <section className="relative z-10 py-20">
          <div className="mx-auto max-w-6xl px-6 text-center">
            <h2 className="text-4xl font-bold">Ready to Join the Conversation?</h2>
            <p className="mt-4 mx-auto max-w-2xl text-lg text-gray-300">Create an account in seconds and experience the future of communication. No credit card required.</p>
            <button onClick={() => openModal('signup')} className="mt-8 inline-block rounded-md bg-teal-600 px-10 py-3 font-bold text-white transition-colors hover:bg-teal-700">
              Sign Up For Free
            </button>
          </div>
        </section>

        {/* --- Footer Section --- */}
        <footer className="relative z-10 border-t border-white/10 bg-gray-900/50 py-12">
          <div className="mx-auto max-w-6xl px-6"><div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            <div><h3 className="font-semibold mb-4">Product</h3><ul className="space-y-2 text-gray-400">
              <li><a href="#" className="hover:text-white">Features</a></li><li><a href="#" className="hover:text-white">Security</a></li><li><a href="#" className="hover:text-white">Pricing</a></li></ul></div>
            <div><h3 className="font-semibold mb-4">Company</h3><ul className="space-y-2 text-gray-400">
              <li><a href="#" className="hover:text-white">About Us</a></li><li><a href="#" className="hover:text-white">Careers</a></li><li><a href="#" className="hover:text-white">Contact</a></li></ul></div>
            <div><h3 className="font-semibold mb-4">Resources</h3><ul className="space-y-2 text-gray-400">
              <li><a href="#" className="hover:text-white">Blog</a></li><li><a href="#" className="hover:text-white">Help Center</a></li></ul></div>
            <div><h3 className="font-semibold mb-4">Legal</h3><ul className="space-y-2 text-gray-400">
              <li><a href="#" className="hover:text-white">Privacy</a></li><li><a href="#" className="hover:text-white">Terms</a></li></ul></div>
          </div><div className="mt-12 border-t border-white/10 pt-8 text-center text-gray-400">
            <p>&copy; {new Date().getFullYear()} ChatApp. Built for a better conversation.</p></div></div>
        </footer>
      </div>

      {isModalOpen && <Login closeModal={closeModal} initialMode={modalMode} />}
    </>
  );
}

export default Home;