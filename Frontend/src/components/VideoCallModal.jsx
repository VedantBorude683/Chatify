import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PhoneIcon,
  PhoneXMarkIcon,
  VideoCameraIcon,
  VideoCameraSlashIcon,
  MicrophoneIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  ComputerDesktopIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]
};

export default function VideoCallModal({
  callState, // { isActive, isIncoming, isVideo, peerUser, callerSignal, conversationId }
  currentUser,
  socket,
  onEndCall
}) {
  const [callStatus, setCallStatus] = useState(callState.isIncoming ? 'incoming' : 'calling');
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoDisabled, setIsVideoDisabled] = useState(!callState.isVideo);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnection = useRef(null);
  const originalVideoTrack = useRef(null);
  const timerRef = useRef(null);
  const pendingIceCandidates = useRef([]);

  // Setup Local Media Stream
  useEffect(() => {
    let mounted = true;

    async function initMedia() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: callState.isVideo ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false,
          audio: true
        });

        if (!mounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        if (callState.isVideo) {
          originalVideoTrack.current = stream.getVideoTracks()[0] || null;
        }

        // If initiating call, create peer connection and send offer
        if (!callState.isIncoming && socket.current) {
          startOutgoingCall(stream);
        }
      } catch (err) {
        console.warn('Could not access requested media devices:', err.message);
        // Fallback to audio only if video failed
        try {
          const audioOnlyStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          if (mounted) {
            setLocalStream(audioOnlyStream);
            setIsVideoDisabled(true);
            if (!callState.isIncoming && socket.current) {
              startOutgoingCall(audioOnlyStream);
            }
          }
        } catch (audioErr) {
          console.error('Failed to get audio stream:', audioErr);
          alert('Could not access camera or microphone. Please check your browser permissions.');
          onEndCall();
        }
      }
    }

    initMedia();

    return () => {
      mounted = false;
      cleanupCall();
    };
  }, []);

  // Sync video refs when streams change
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, isMinimized, callStatus]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, isMinimized, callStatus]);

  // Call duration timer
  useEffect(() => {
    if (callStatus === 'connected') {
      timerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callStatus]);

  // Create & configure RTCPeerConnection
  const createPeer = (stream) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnection.current = pc;

    if (stream) {
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });
    }

    pc.ontrack = (event) => {
      console.log('Received remote track:', event.streams[0]);
      setRemoteStream(event.streams[0]);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && socket.current && callState.peerUser?._id) {
        socket.current.emit('call:ice-candidate', {
          to: callState.peerUser._id,
          candidate: event.candidate
        });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('WebRTC Connection state:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        setCallStatus('connected');
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        handleEndCall();
      }
    };

    return pc;
  };

  // Start outgoing call
  const startOutgoingCall = async (stream) => {
    const pc = createPeer(stream);
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.current.emit('call:user', {
        userToCall: callState.peerUser._id,
        signalData: offer,
        from: currentUser._id,
        callerName: currentUser.username,
        callerAvatar: currentUser.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.username}`,
        isVideo: callState.isVideo,
        conversationId: callState.conversationId
      });
    } catch (err) {
      console.error('Error starting outgoing call:', err);
    }
  };

  // Answer incoming call
  const handleAnswerCall = async () => {
    if (!localStream) return;
    setCallStatus('connected');

    const pc = createPeer(localStream);
    try {
      if (callState.callerSignal) {
        await pc.setRemoteDescription(new RTCSessionDescription(callState.callerSignal));
        // Flush any queued ICE candidates
        while (pendingIceCandidates.current.length > 0) {
          const candidate = pendingIceCandidates.current.shift();
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
      }

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.current.emit('call:accept', {
        to: callState.peerUser._id,
        signal: answer
      });
    } catch (err) {
      console.error('Error answering call:', err);
    }
  };

  // Socket event listeners for signaling
  useEffect(() => {
    const currentSocket = socket.current;
    if (!currentSocket) return;

    const handleCallAccepted = async ({ signal }) => {
      console.log('Call was accepted by peer, setting remote description');
      if (peerConnection.current) {
        try {
          await peerConnection.current.setRemoteDescription(new RTCSessionDescription(signal));
          setCallStatus('connected');
          while (pendingIceCandidates.current.length > 0) {
            const candidate = pendingIceCandidates.current.shift();
            await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
          }
        } catch (err) {
          console.error('Error setting remote description on call:accepted:', err);
        }
      }
    };

    const handleIceCandidate = async ({ candidate }) => {
      if (peerConnection.current && peerConnection.current.remoteDescription) {
        try {
          await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error('Error adding ICE candidate:', err);
        }
      } else {
        pendingIceCandidates.current.push(candidate);
      }
    };

    const handleCallRejected = ({ reason }) => {
      alert(`Call was declined: ${reason || 'User is busy'}`);
      handleEndCall();
    };

    const handleCallUnavailable = ({ message }) => {
      alert(message || 'User is currently offline.');
      handleEndCall();
    };

    const handleCallEnded = () => {
      console.log('Peer ended the call');
      handleEndCall();
    };

    currentSocket.on('call:accepted', handleCallAccepted);
    currentSocket.on('call:ice-candidate', handleIceCandidate);
    currentSocket.on('call:rejected', handleCallRejected);
    currentSocket.on('call:unavailable', handleCallUnavailable);
    currentSocket.on('call:ended', handleCallEnded);

    return () => {
      currentSocket.off('call:accepted', handleCallAccepted);
      currentSocket.off('call:ice-candidate', handleIceCandidate);
      currentSocket.off('call:rejected', handleCallRejected);
      currentSocket.off('call:unavailable', handleCallUnavailable);
      currentSocket.off('call:ended', handleCallEnded);
    };
  }, [socket.current, callState.peerUser]);

  // Clean up media and peer connection
  const cleanupCall = () => {
    if (timerRef.current) clearInterval(timerRef.current);

    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (remoteStream) {
      remoteStream.getTracks().forEach(track => track.stop());
    }
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
  };

  const handleEndCall = () => {
    if (socket.current && callState.peerUser?._id) {
      socket.current.emit('call:end', {
        to: callState.peerUser._id,
        conversationId: callState.conversationId
      });
    }
    cleanupCall();
    onEndCall();
  };

  const handleDeclineCall = () => {
    if (socket.current && callState.peerUser?._id) {
      socket.current.emit('call:reject', {
        to: callState.peerUser._id,
        reason: 'Call declined by user'
      });
    }
    cleanupCall();
    onEndCall();
  };

  // Toggle Microphone
  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioMuted(!audioTrack.enabled);
      }
    }
  };

  // Toggle Camera
  const toggleVideo = async () => {
    if (!localStream) return;
    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoDisabled(!videoTrack.enabled);
    } else {
      // Add video track if none was present
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        const newTrack = stream.getVideoTracks()[0];
        localStream.addTrack(newTrack);
        if (peerConnection.current) {
          peerConnection.current.addTrack(newTrack, localStream);
        }
        setIsVideoDisabled(false);
      } catch (err) {
        console.error('Could not enable camera:', err);
      }
    }
  };

  // Toggle Screen Sharing
  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      // Switch back to camera
      if (originalVideoTrack.current && peerConnection.current) {
        const senders = peerConnection.current.getSenders();
        const videoSender = senders.find(s => s.track && s.track.kind === 'video');
        if (videoSender) {
          videoSender.replaceTrack(originalVideoTrack.current);
        }
      }
      setIsScreenSharing(false);
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];

        if (peerConnection.current) {
          const senders = peerConnection.current.getSenders();
          const videoSender = senders.find(s => s.track && s.track.kind === 'video');
          if (videoSender) {
            videoSender.replaceTrack(screenTrack);
          } else {
            peerConnection.current.addTrack(screenTrack, localStream);
          }
        }

        screenTrack.onended = () => {
          toggleScreenShare();
        };

        setIsScreenSharing(true);
      } catch (err) {
        console.warn('Screen share cancelled or failed:', err);
      }
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const peer = callState.peerUser || { username: 'User' };
  const peerAvatar = peer.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${peer.username || 'User'}`;

  // ==========================================
  // INCOMING CALL VIEW
  // ==========================================
  if (callStatus === 'incoming') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="w-full max-w-sm rounded-3xl bg-zinc-900 border border-zinc-800 p-8 text-center shadow-2xl shadow-emerald-500/10"
        >
          <div className="relative mx-auto mb-6 flex h-28 w-28 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-20"></span>
            <img
              src={peerAvatar}
              alt={peer.username}
              className="relative h-24 w-24 rounded-full border-2 border-emerald-500 object-cover shadow-lg"
            />
          </div>

          <h3 className="text-2xl font-bold text-zinc-100">{peer.username}</h3>
          <p className="mt-1 text-sm font-medium text-emerald-400 flex items-center justify-center gap-1.5">
            <SparklesIcon className="h-4 w-4 animate-spin" style={{ animationDuration: '4s' }} />
            Incoming {callState.isVideo ? 'Video Call' : 'Audio Call'}...
          </p>

          <div className="mt-8 flex items-center justify-center gap-6">
            <button
              onClick={handleDeclineCall}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-600 text-white shadow-lg hover:bg-rose-500 transition-all transform active:scale-95"
              title="Decline"
            >
              <PhoneXMarkIcon className="h-7 w-7" />
            </button>

            <button
              onClick={handleAnswerCall}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-zinc-950 shadow-lg shadow-emerald-500/30 hover:bg-emerald-400 transition-all transform active:scale-95"
              title="Accept"
            >
              {callState.isVideo ? (
                <VideoCameraIcon className="h-7 w-7 text-zinc-950" />
              ) : (
                <PhoneIcon className="h-7 w-7 text-zinc-950" />
              )}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ==========================================
  // MINIMIZED PICTURE-IN-PICTURE FLOATING WIDGET
  // ==========================================
  if (isMinimized) {
    return (
      <motion.div
        drag
        dragConstraints={{ left: 10, right: window.innerWidth - 320, top: 10, bottom: window.innerHeight - 200 }}
        className="fixed bottom-6 right-6 z-50 w-72 rounded-2xl bg-zinc-900/95 border border-zinc-700/80 p-3 shadow-2xl backdrop-blur-xl cursor-grab active:cursor-grabbing"
      >
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-semibold text-zinc-200 truncate max-w-[120px]">{peer.username}</span>
            <span className="text-zinc-500">{formatDuration(callDuration)}</span>
          </div>
          <button
            onClick={() => setIsMinimized(false)}
            className="text-zinc-400 hover:text-white p-1 rounded hover:bg-zinc-800"
            title="Expand"
          >
            <ArrowsPointingOutIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="relative h-40 w-full overflow-hidden rounded-xl bg-zinc-950">
          {remoteStream ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center">
              <img src={peerAvatar} alt={peer.username} className="h-14 w-14 rounded-full border border-zinc-700" />
              <p className="mt-2 text-xs text-zinc-400 font-medium">Connecting...</p>
            </div>
          )}

          {/* Local PiP */}
          <div className="absolute bottom-2 right-2 h-14 w-20 overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900 shadow">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`h-full w-full object-cover ${isVideoDisabled ? 'hidden' : ''}`}
            />
            {isVideoDisabled && (
              <div className="flex h-full w-full items-center justify-center bg-zinc-800 text-[10px] text-zinc-400">
                Muted
              </div>
            )}
          </div>
        </div>

        {/* Floating Mini Controls */}
        <div className="mt-2 flex items-center justify-around">
          <button
            onClick={toggleAudio}
            className={`p-2 rounded-full text-xs ${isAudioMuted ? 'bg-rose-500/20 text-rose-400' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}
          >
            <MicrophoneIcon className="h-4 w-4" />
          </button>
          <button
            onClick={toggleVideo}
            className={`p-2 rounded-full text-xs ${isVideoDisabled ? 'bg-rose-500/20 text-rose-400' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}
          >
            {isVideoDisabled ? <VideoCameraSlashIcon className="h-4 w-4" /> : <VideoCameraIcon className="h-4 w-4" />}
          </button>
          <button
            onClick={handleEndCall}
            className="p-2 rounded-full bg-rose-600 text-white hover:bg-rose-500 shadow"
          >
            <PhoneXMarkIcon className="h-4 w-4" />
          </button>
        </div>
      </motion.div>
    );
  }

  // ==========================================
  // FULL VIDEO CALL MODAL
  // ==========================================
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xl p-2 sm:p-6">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-zinc-950 border border-zinc-800 shadow-2xl"
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/60 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img src={peerAvatar} alt={peer.username} className="h-10 w-10 rounded-full border border-emerald-500/40 object-cover" />
              <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-zinc-950 ${callStatus === 'connected' ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`}></span>
            </div>
            <div>
              <h4 className="font-bold text-zinc-100 flex items-center gap-2">
                {peer.username}
                <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs font-normal text-zinc-400">
                  {callStatus === 'connected' ? formatDuration(callDuration) : 'Connecting...'}
                </span>
              </h4>
              <p className="text-xs text-zinc-400">
                {callStatus === 'connected' ? 'Secure WebRTC Peer-to-Peer Stream' : 'Establishing connection...'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMinimized(true)}
              className="flex items-center gap-1.5 rounded-xl bg-zinc-800/80 px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-700 hover:text-white transition-all"
              title="Minimize to Picture-in-Picture to chat simultaneously"
            >
              <ArrowsPointingInIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Minimize to Chat</span>
            </button>
          </div>
        </div>

        {/* Video Display Area */}
        <div className="relative flex-grow overflow-hidden bg-zinc-950 flex items-center justify-center p-4">
          {/* Remote Video Stream or Avatar Placeholder */}
          {remoteStream ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="h-full w-full max-h-[70vh] rounded-2xl object-contain bg-zinc-900"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-center">
              <div className="relative mb-4 flex h-32 w-32 items-center justify-center">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-20"></span>
                <img
                  src={peerAvatar}
                  alt={peer.username}
                  className="relative h-28 w-28 rounded-full border-2 border-zinc-700 object-cover shadow-2xl"
                />
              </div>
              <h3 className="text-xl font-bold text-zinc-100">{peer.username}</h3>
              <p className="mt-1 text-sm text-zinc-400">
                {callStatus === 'calling' ? 'Calling, waiting for answer...' : 'Connecting media stream...'}
              </p>
            </div>
          )}

          {/* Local User Preview (Picture in Picture) */}
          <motion.div
            drag
            dragConstraints={{ left: -300, right: 0, top: -200, bottom: 0 }}
            className="absolute bottom-6 right-6 h-36 w-52 overflow-hidden rounded-2xl border-2 border-zinc-700/80 bg-zinc-900 shadow-2xl cursor-grab active:cursor-grabbing"
          >
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`h-full w-full object-cover ${isVideoDisabled ? 'hidden' : ''}`}
            />
            {isVideoDisabled && (
              <div className="flex h-full w-full flex-col items-center justify-center bg-zinc-900 p-2 text-center">
                <VideoCameraSlashIcon className="h-6 w-6 text-zinc-500 mb-1" />
                <span className="text-xs text-zinc-400 font-medium">Camera is Off</span>
              </div>
            )}
            <div className="absolute bottom-1.5 left-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
              You {isAudioMuted ? '(Muted)' : ''}
            </div>
          </motion.div>
        </div>

        {/* Bottom Control Bar */}
        <div className="flex items-center justify-center gap-4 border-t border-zinc-800/80 bg-zinc-900/60 p-5 backdrop-blur-md">
          {/* Mute Audio */}
          <button
            onClick={toggleAudio}
            className={`flex h-13 w-13 items-center justify-center rounded-2xl transition-all transform active:scale-95 ${isAudioMuted ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700 hover:text-white border border-zinc-700'}`}
            title={isAudioMuted ? 'Unmute Microphone' : 'Mute Microphone'}
          >
            <MicrophoneIcon className="h-6 w-6" />
          </button>

          {/* Toggle Video */}
          <button
            onClick={toggleVideo}
            className={`flex h-13 w-13 items-center justify-center rounded-2xl transition-all transform active:scale-95 ${isVideoDisabled ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700 hover:text-white border border-zinc-700'}`}
            title={isVideoDisabled ? 'Turn Camera On' : 'Turn Camera Off'}
          >
            {isVideoDisabled ? <VideoCameraSlashIcon className="h-6 w-6" /> : <VideoCameraIcon className="h-6 w-6" />}
          </button>

          {/* Screen Share */}
          <button
            onClick={toggleScreenShare}
            className={`flex h-13 w-13 items-center justify-center rounded-2xl transition-all transform active:scale-95 ${isScreenSharing ? 'bg-emerald-500 text-zinc-950 font-bold shadow-lg shadow-emerald-500/20' : 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700 hover:text-white border border-zinc-700'}`}
            title={isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
          >
            <ComputerDesktopIcon className="h-6 w-6" />
          </button>

          {/* End Call Button */}
          <button
            onClick={handleEndCall}
            className="flex h-13 px-6 items-center justify-center gap-2 rounded-2xl bg-rose-600 text-white font-semibold shadow-lg shadow-rose-600/30 hover:bg-rose-500 transition-all transform active:scale-95"
            title="End Call"
          >
            <PhoneXMarkIcon className="h-6 w-6" />
            <span className="hidden sm:inline">End Call</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
