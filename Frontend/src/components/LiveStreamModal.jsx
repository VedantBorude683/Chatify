import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  VideoCameraIcon,
  VideoCameraSlashIcon,
  MicrophoneIcon,
  ComputerDesktopIcon,
  XMarkIcon,
  UserGroupIcon,
  SparklesIcon,
  StopIcon
} from '@heroicons/react/24/outline';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

export default function LiveStreamModal({
  isOpen,
  isHost,
  conversation,
  currentUser,
  socket,
  onClose
}) {
  const [streamTitle, setStreamTitle] = useState(
    conversation?.activeStream?.streamTitle || `${currentUser?.username}'s Live Stream`
  );
  const [isStreaming, setIsStreaming] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [viewerCount, setViewerCount] = useState(1);
  const [streamDuration, setStreamDuration] = useState(0);

  const videoRef = useRef(null);
  const localStreamRef = useRef(null);
  const viewerPeerConnections = useRef({}); // host: { viewerSocketId: RTCPeerConnection }
  const viewerPeer = useRef(null); // viewer: RTCPeerConnection
  const timerRef = useRef(null);

  // Timer
  useEffect(() => {
    if (isStreaming) {
      timerRef.current = setInterval(() => {
        setStreamDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setStreamDuration(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isStreaming]);

  // Host: Start Live Stream
  const handleStartBroadcast = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true
      });

      localStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsStreaming(true);

      if (socket.current) {
        socket.current.emit('stream:start', {
          conversationId: conversation._id,
          streamTitle: streamTitle.trim() || `${currentUser?.username}'s Live Stream`,
          host: currentUser
        });
      }
    } catch (err) {
      console.error('Error starting live broadcast:', err);
      alert('Could not start live stream. Please check camera and microphone permissions.');
    }
  };

  // Viewer: Join Stream
  useEffect(() => {
    if (!isOpen) return;

    if (!isHost && socket.current && conversation) {
      setIsStreaming(true);
      console.log('Viewer joining stream:', conversation._id);
      socket.current.emit('stream:join', {
        conversationId: conversation._id,
        viewer: currentUser
      });
    }

    return () => {
      cleanupStream();
    };
  }, [isOpen, isHost]);

  // Socket signaling for stream
  useEffect(() => {
    const currentSocket = socket.current;
    if (!currentSocket) return;

    // HOST handles new viewer joining
    const handleViewerJoined = async ({ viewerSocketId, viewer }) => {
      console.log('Viewer joined stream:', viewer?.username, viewerSocketId);
      setViewerCount(prev => prev + 1);

      if (localStreamRef.current) {
        const pc = new RTCPeerConnection(ICE_SERVERS);
        viewerPeerConnections.current[viewerSocketId] = pc;

        localStreamRef.current.getTracks().forEach(track => {
          pc.addTrack(track, localStreamRef.current);
        });

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            currentSocket.emit('stream:signal', {
              toSocketId: viewerSocketId,
              signal: { candidate: event.candidate },
              fromHost: true
            });
          }
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        currentSocket.emit('stream:signal', {
          toSocketId: viewerSocketId,
          signal: { sdp: offer },
          fromHost: true
        });
      }
    };

    // VIEWER & HOST handle WebRTC signals
    const handleStreamSignal = async ({ signal, fromSocketId, fromHost, fromViewer }) => {
      if (!isHost && fromHost) {
        // Viewer receiving signal from host
        if (signal.sdp) {
          const pc = new RTCPeerConnection(ICE_SERVERS);
          viewerPeer.current = pc;

          pc.ontrack = (event) => {
            console.log('Viewer received stream track:', event.streams[0]);
            if (videoRef.current) {
              videoRef.current.srcObject = event.streams[0];
            }
          };

          pc.onicecandidate = (event) => {
            if (event.candidate) {
              currentSocket.emit('stream:signal', {
                toSocketId: fromSocketId,
                signal: { candidate: event.candidate },
                fromViewer: true
              });
            }
          };

          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          currentSocket.emit('stream:signal', {
            toSocketId: fromSocketId,
            signal: { sdp: answer },
            fromViewer: true
          });
        } else if (signal.candidate && viewerPeer.current) {
          try {
            await viewerPeer.current.addIceCandidate(new RTCIceCandidate(signal.candidate));
          } catch (e) {
            console.error('Error adding ICE candidate to viewer peer:', e);
          }
        }
      } else if (isHost && fromViewer) {
        // Host receiving answer or candidate from viewer
        const pc = viewerPeerConnections.current[fromSocketId];
        if (pc) {
          if (signal.sdp) {
            await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          } else if (signal.candidate) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
            } catch (e) {
              console.error('Error adding ICE candidate to host peer:', e);
            }
          }
        }
      }
    };

    const handleStreamEnded = () => {
      alert('The live stream has ended.');
      cleanupStream();
      onClose();
    };

    currentSocket.on('stream:viewer-joined', handleViewerJoined);
    currentSocket.on('stream:signal', handleStreamSignal);
    currentSocket.on('stream:ended', handleStreamEnded);

    return () => {
      currentSocket.off('stream:viewer-joined', handleViewerJoined);
      currentSocket.off('stream:signal', handleStreamSignal);
      currentSocket.off('stream:ended', handleStreamEnded);
    };
  }, [isHost, socket.current]);

  const cleanupStream = () => {
    if (timerRef.current) clearInterval(timerRef.current);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }

    Object.values(viewerPeerConnections.current).forEach(pc => pc.close());
    viewerPeerConnections.current = {};

    if (viewerPeer.current) {
      viewerPeer.current.close();
      viewerPeer.current = null;
    }
  };

  const handleEndStream = () => {
    if (isHost && socket.current && conversation) {
      socket.current.emit('stream:end', { conversationId: conversation._id });
    }
    cleanupStream();
    onClose();
  };

  // Toggle Screen Share for Host
  const toggleScreenShare = async () => {
    if (!isHost || !localStreamRef.current) return;

    if (isScreenSharing) {
      try {
        const camStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const camTrack = camStream.getVideoTracks()[0];

        Object.values(viewerPeerConnections.current).forEach(pc => {
          const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
          if (sender) sender.replaceTrack(camTrack);
        });

        if (videoRef.current) videoRef.current.srcObject = camStream;
        localStreamRef.current = camStream;
        setIsScreenSharing(false);
      } catch (err) {
        console.error('Error switching back to camera:', err);
      }
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];

        Object.values(viewerPeerConnections.current).forEach(pc => {
          const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
          if (sender) sender.replaceTrack(screenTrack);
        });

        if (videoRef.current) videoRef.current.srcObject = screenStream;

        screenTrack.onended = () => {
          toggleScreenShare();
        };

        setIsScreenSharing(true);
      } catch (err) {
        console.warn('Screen share cancelled:', err);
      }
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xl p-3 sm:p-6">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-zinc-950 border border-zinc-800 shadow-2xl"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/60 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full bg-rose-500/10 border border-rose-500/20 px-3 py-1">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse"></span>
              <span className="text-xs font-bold uppercase tracking-wider text-rose-400">LIVE</span>
            </div>
            <div>
              <h3 className="font-bold text-zinc-100 flex items-center gap-2 text-base sm:text-lg">
                {streamTitle}
              </h3>
              <p className="text-xs text-zinc-400 flex items-center gap-3 mt-0.5">
                <span className="flex items-center gap-1 text-emerald-400">
                  <UserGroupIcon className="h-3.5 w-3.5" />
                  {viewerCount} Watching
                </span>
                <span>•</span>
                <span>{formatDuration(streamDuration)}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleEndStream}
              className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Video Stage */}
        <div className="relative flex-grow overflow-hidden bg-black flex items-center justify-center">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={isHost} // Mute self on host to avoid feedback
            className="h-full w-full object-contain bg-zinc-950"
          />

          {!isStreaming && isHost && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/90 p-6 text-center">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <VideoCameraIcon className="h-10 w-10" />
              </div>
              <h3 className="text-2xl font-bold text-zinc-100">Start Live Video Stream</h3>
              <p className="mt-2 text-sm text-zinc-400 max-w-md">
                Broadcast live video and audio synchronously to all members in {conversation?.groupName || 'this chat'}.
              </p>

              <div className="mt-6 w-full max-w-sm">
                <input
                  type="text"
                  value={streamTitle}
                  onChange={(e) => setStreamTitle(e.target.value)}
                  placeholder="Stream Title..."
                  className="w-full rounded-xl bg-zinc-900 border border-zinc-700 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                />
                <button
                  onClick={handleStartBroadcast}
                  className="mt-4 w-full rounded-xl bg-emerald-500 py-3 font-semibold text-zinc-950 shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 transition-all"
                >
                  Go Live Now
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Stream Controls */}
        <div className="flex items-center justify-between border-t border-zinc-800/80 bg-zinc-900/60 p-4 px-6 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-zinc-400">
              Host: <span className="text-zinc-200">{conversation?.activeStream?.hostId?.username || currentUser?.username}</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            {isHost && (
              <>
                <button
                  onClick={toggleScreenShare}
                  className={`flex h-11 px-4 items-center gap-2 rounded-xl text-xs font-semibold transition-all ${
                    isScreenSharing ? 'bg-emerald-500 text-zinc-950' : 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
                  }`}
                >
                  <ComputerDesktopIcon className="h-4 w-4" />
                  <span>{isScreenSharing ? 'Sharing Screen' : 'Share Screen'}</span>
                </button>

                <button
                  onClick={handleEndStream}
                  className="flex h-11 px-5 items-center gap-2 rounded-xl bg-rose-600 text-xs font-bold text-white hover:bg-rose-500 shadow-lg shadow-rose-600/20 transition-all"
                >
                  <StopIcon className="h-4 w-4" />
                  <span>End Stream</span>
                </button>
              </>
            )}

            {!isHost && (
              <button
                onClick={handleEndStream}
                className="flex h-11 px-5 items-center gap-2 rounded-xl bg-zinc-800 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 transition-all"
              >
                <span>Leave Stream</span>
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
