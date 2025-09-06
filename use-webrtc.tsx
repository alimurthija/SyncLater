import { useState, useRef, useCallback, useEffect } from 'react';
import { useWebSocket } from './use-websocket';

interface UseWebRTCProps {
  roomId: string;
  userId: string;
}

interface Participant {
  userId: string;
  stream?: MediaStream;
  peerConnection?: RTCPeerConnection;
}

export function useWebRTC({ roomId, userId }: UseWebRTCProps) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [participants, setParticipants] = useState<Map<string, Participant>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [isCameraEnabled, setIsCameraEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const { connect, disconnect, send, on } = useWebSocket();

  const configuration: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  const getUserMedia = useCallback(async (constraints: MediaStreamConstraints = { video: true, audio: true }) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      return stream;
    } catch (error) {
      console.error('Error getting user media:', error);
      throw error;
    }
  }, []);

  const createPeerConnection = useCallback((targetUserId: string) => {
    const peerConnection = new RTCPeerConnection(configuration);
    
    // Add local stream tracks
    if (localStream) {
      localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
      });
    }

    // Handle incoming stream
    peerConnection.ontrack = (event) => {
      const [remoteStream] = event.streams;
      setParticipants(prev => {
        const newParticipants = new Map(prev);
        const participant = newParticipants.get(targetUserId) || { userId: targetUserId };
        participant.stream = remoteStream;
        participant.peerConnection = peerConnection;
        newParticipants.set(targetUserId, participant);
        return newParticipants;
      });
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        send({
          type: 'ice-candidate',
          roomId,
          data: {
            candidate: event.candidate,
            targetUserId
          }
        });
      }
    };

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      console.log(`Peer connection state with ${targetUserId}:`, peerConnection.connectionState);
      
      if (peerConnection.connectionState === 'connected') {
        setIsConnected(true);
      } else if (peerConnection.connectionState === 'disconnected' || 
                 peerConnection.connectionState === 'failed') {
        setParticipants(prev => {
          const newParticipants = new Map(prev);
          newParticipants.delete(targetUserId);
          return newParticipants;
        });
        peerConnections.current.delete(targetUserId);
      }
    };

    peerConnections.current.set(targetUserId, peerConnection);
    return peerConnection;
  }, [localStream, roomId, send]);

  const createOffer = useCallback(async (targetUserId: string) => {
    const peerConnection = createPeerConnection(targetUserId);
    
    try {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      
      send({
        type: 'offer',
        roomId,
        data: {
          offer,
          targetUserId
        }
      });
    } catch (error) {
      console.error('Error creating offer:', error);
    }
  }, [createPeerConnection, roomId, send]);

  const createAnswer = useCallback(async (offer: RTCSessionDescriptionInit, fromUserId: string) => {
    const peerConnection = createPeerConnection(fromUserId);
    
    try {
      await peerConnection.setRemoteDescription(offer);
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      
      send({
        type: 'answer',
        roomId,
        data: {
          answer,
          targetUserId: fromUserId
        }
      });
    } catch (error) {
      console.error('Error creating answer:', error);
    }
  }, [createPeerConnection, roomId, send]);

  const joinRoom = useCallback(async () => {
    try {
      await connect();
      await getUserMedia();
      
      send({
        type: 'join-room',
        roomId,
        userId,
        data: { timestamp: Date.now() }
      });
    } catch (error) {
      console.error('Error joining room:', error);
      throw error;
    }
  }, [connect, getUserMedia, roomId, userId, send]);

  const leaveRoom = useCallback(() => {
    send({
      type: 'leave-room',
      roomId,
      userId
    });
    
    // Close all peer connections
    peerConnections.current.forEach(pc => pc.close());
    peerConnections.current.clear();
    
    // Stop local stream
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    
    setParticipants(new Map());
    setIsConnected(false);
    disconnect();
  }, [roomId, userId, send, localStream, disconnect]);

  const toggleMicrophone = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicEnabled(audioTrack.enabled);
      }
    }
  }, [localStream]);

  const toggleCamera = useCallback(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraEnabled(videoTrack.enabled);
      }
    }
  }, [localStream]);

  const shareScreen = useCallback(async () => {
    try {
      if (isScreenSharing) {
        // Stop screen sharing, return to camera
        await getUserMedia({ video: true, audio: true });
        setIsScreenSharing(false);
      } else {
        // Start screen sharing
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ 
          video: true, 
          audio: true 
        });
        
        setLocalStream(screenStream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }
        
        // Replace video tracks in all peer connections
        const videoTrack = screenStream.getVideoTracks()[0];
        peerConnections.current.forEach(pc => {
          const sender = pc.getSenders().find(s => 
            s.track && s.track.kind === 'video'
          );
          if (sender) {
            sender.replaceTrack(videoTrack);
          }
        });
        
        setIsScreenSharing(true);
        
        // Handle screen share end
        videoTrack.onended = () => {
          getUserMedia({ video: true, audio: true });
          setIsScreenSharing(false);
        };
      }
    } catch (error) {
      console.error('Error sharing screen:', error);
    }
  }, [isScreenSharing, getUserMedia]);

  // WebSocket event handlers
  useEffect(() => {
    const unsubscribeFunctions: (() => void)[] = [];

    // Handle user joined
    unsubscribeFunctions.push(on('user-joined', (data: any) => {
      console.log('User joined:', data.userId);
      if (data.userId !== userId) {
        createOffer(data.userId);
      }
    }));

    // Handle user left
    unsubscribeFunctions.push(on('user-left', (data: any) => {
      console.log('User left:', data.userId);
      const peerConnection = peerConnections.current.get(data.userId);
      if (peerConnection) {
        peerConnection.close();
        peerConnections.current.delete(data.userId);
      }
      
      setParticipants(prev => {
        const newParticipants = new Map(prev);
        newParticipants.delete(data.userId);
        return newParticipants;
      });
    }));

    // Handle offer
    unsubscribeFunctions.push(on('offer', (data: any) => {
      createAnswer(data.data.offer, data.data.fromUserId || data.userId);
    }));

    // Handle answer
    unsubscribeFunctions.push(on('answer', async (data: any) => {
      const peerConnection = peerConnections.current.get(data.data.fromUserId || data.userId);
      if (peerConnection) {
        try {
          await peerConnection.setRemoteDescription(data.data.answer);
        } catch (error) {
          console.error('Error setting remote description:', error);
        }
      }
    }));

    // Handle ICE candidate
    unsubscribeFunctions.push(on('ice-candidate', async (data: any) => {
      const peerConnection = peerConnections.current.get(data.data.fromUserId || data.userId);
      if (peerConnection) {
        try {
          await peerConnection.addIceCandidate(data.data.candidate);
        } catch (error) {
          console.error('Error adding ICE candidate:', error);
        }
      }
    }));

    // Handle joined room confirmation
    unsubscribeFunctions.push(on('joined-room', (data: any) => {
      console.log('Joined room successfully:', data);
      setIsConnected(true);
    }));

    return () => {
      unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
    };
  }, [on, userId, createOffer, createAnswer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      leaveRoom();
    };
  }, [leaveRoom]);

  return {
    localStream,
    participants,
    isConnected,
    isMicEnabled,
    isCameraEnabled,
    isScreenSharing,
    localVideoRef,
    joinRoom,
    leaveRoom,
    toggleMicrophone,
    toggleCamera,
    shareScreen,
    getUserMedia
  };
}
