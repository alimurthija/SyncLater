import { useRef, useEffect } from 'react';

interface VideoCallProps {
  localStream: MediaStream | null;
  participants: Map<string, any>;
  localVideoRef: React.RefObject<HTMLVideoElement>;
  isConnected: boolean;
}

export function VideoCall({ localStream, participants, localVideoRef, isConnected }: VideoCallProps) {
  const participantArray = Array.from(participants.values());
  const totalParticipants = participantArray.length + 1; // +1 for local user

  const getGridClass = () => {
    if (totalParticipants === 1) return 'video-grid grid-1';
    if (totalParticipants === 2) return 'video-grid grid-2';
    if (totalParticipants <= 4) return 'video-grid grid-4';
    return 'video-grid grid-4'; // Max 4 visible at once
  };

  return (
    <div className={`h-full ${getGridClass()}`}>
      {/* Local Video */}
      <div className="video-container rounded-xl p-4 relative overflow-hidden" data-testid="video-local">
        <video 
          ref={localVideoRef}
          autoPlay 
          muted 
          className="w-full h-full object-cover rounded-lg bg-gray-900"
          data-testid="video-element-local"
        />
        <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 px-3 py-1 rounded-full text-sm">
          <span>You</span>
          <i className={`fas fa-microphone${localStream?.getAudioTracks()[0]?.enabled ? '' : '-slash'} ml-2 ${
            localStream?.getAudioTracks()[0]?.enabled ? 'text-green-400' : 'text-red-400'
          }`}></i>
        </div>
        <div className="absolute top-4 right-4 bg-black bg-opacity-50 px-3 py-1 rounded-full text-sm">
          <span className="text-yellow-400">😊 Engaged</span>
        </div>
      </div>
      
      {/* Remote Videos */}
      {participantArray.slice(0, 3).map((participant) => (
        <RemoteVideo 
          key={participant.userId} 
          participant={participant} 
        />
      ))}
      
      {/* Empty slots for grid layout */}
      {Array.from({ length: Math.max(0, 4 - totalParticipants) }).map((_, index) => (
        <div 
          key={`empty-${index}`} 
          className="video-container rounded-xl p-4 flex items-center justify-center bg-muted"
          data-testid={`video-empty-${index}`}
        >
          <div className="text-center text-muted-foreground">
            <div className="w-16 h-16 bg-muted-foreground/20 rounded-full flex items-center justify-center mb-2 mx-auto">
              <i className="fas fa-user text-2xl"></i>
            </div>
            <p className="text-sm">Waiting for participant...</p>
          </div>
        </div>
      ))}

      {/* Connection Status */}
      {!isConnected && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="text-center text-white">
            <div className="loading-spinner w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-4"></div>
            <p>Connecting to meeting...</p>
          </div>
        </div>
      )}
    </div>
  );
}

interface RemoteVideoProps {
  participant: {
    userId: string;
    stream?: MediaStream;
  };
}

function RemoteVideo({ participant }: RemoteVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && participant.stream) {
      videoRef.current.srcObject = participant.stream;
    }
  }, [participant.stream]);

  return (
    <div className="video-container rounded-xl p-4 relative overflow-hidden" data-testid={`video-remote-${participant.userId}`}>
      <video 
        ref={videoRef}
        autoPlay 
        className="w-full h-full object-cover rounded-lg bg-gray-900"
        data-testid={`video-element-${participant.userId}`}
      />
      <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 px-3 py-1 rounded-full text-sm">
        <span data-testid={`participant-name-${participant.userId}`}>
          {participant.userId.split('-')[0] || 'Participant'}
        </span>
        <i className="fas fa-microphone-slash ml-2 text-red-400"></i>
      </div>
      <div className="absolute top-4 right-4 bg-black bg-opacity-50 px-3 py-1 rounded-full text-sm">
        <span className="text-blue-400">🤔 Focused</span>
      </div>
    </div>
  );
}
