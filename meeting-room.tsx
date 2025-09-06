import { useState, useEffect } from 'react';
import { useRoute } from 'wouter';
import { useWebRTC } from '@/hooks/use-webrtc';
import { VideoCall } from '@/components/video-call';
import { ChatPanel } from '@/components/chat-panel';
import { AIAssistant } from '@/components/ai-assistant';
import { Whiteboard } from '@/components/whiteboard';
import { Sidebar } from '@/components/sidebar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { 
  MicIcon, 
  MicOffIcon, 
  VideoIcon, 
  VideoOffIcon, 
  PhoneIcon, 
  PhoneOffIcon, 
  ScreenShareIcon, 
  PaintbrushVertical,
  SearchIcon,
  BellIcon,
  SettingsIcon
} from 'lucide-react';

export default function MeetingRoom() {
  const [, params] = useRoute('/meeting/:roomId');
  const roomId = params?.roomId || '';
  const [currentUserId] = useState('default-user-id'); // In real app, get from auth
  const [activeTab, setActiveTab] = useState('transcription');
  const [isWhiteboardOpen, setIsWhiteboardOpen] = useState(false);
  const [transcriptions, setTranscriptions] = useState<Array<{
    id: string;
    speaker: string;
    text: string;
    timestamp: Date;
  }>>([]);

  const {
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
    shareScreen
  } = useWebRTC({ roomId, userId: currentUserId });

  useEffect(() => {
    if (roomId) {
      joinRoom().catch(error => {
        console.error('Failed to join room:', error);
      });
    }

    return () => {
      leaveRoom();
    };
  }, [roomId, joinRoom, leaveRoom]);

  // Mock transcription updates
  useEffect(() => {
    const mockTranscriptions = [
      "Let's discuss the quarterly goals and how we can improve our team collaboration.",
      "I think we should focus on the new project management workflow we discussed last week.",
      "The AI integration looks promising for automating our meeting summaries."
    ];

    let index = 0;
    const interval = setInterval(() => {
      if (index < mockTranscriptions.length) {
        setTranscriptions(prev => [...prev, {
          id: `transcript-${Date.now()}`,
          speaker: index % 2 === 0 ? 'Alex Johnson' : 'Sarah Chen',
          text: mockTranscriptions[index],
          timestamp: new Date()
        }]);
        index++;
      }
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const handleLeaveCall = () => {
    leaveRoom();
    window.location.href = '/';
  };

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Left Sidebar */}
      <Sidebar 
        currentUserId={currentUserId}
        compact={true}
      />
      
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold gradient-text">SynergySphere Meeting</h1>
            <div className="text-sm text-muted-foreground">
              <span data-testid="text-room-id">Room: #{roomId}</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Input 
                type="text" 
                placeholder="Search meetings, people..." 
                className="w-64"
                data-testid="input-search"
              />
              <SearchIcon className="absolute right-3 top-3 w-4 h-4 text-muted-foreground" />
            </div>
            
            <Button variant="outline" size="icon" data-testid="button-notifications">
              <BellIcon className="w-4 h-4" />
            </Button>
            
            <Button variant="outline" size="icon" data-testid="button-settings">
              <SettingsIcon className="w-4 h-4" />
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex overflow-hidden">
          {/* Video Call Section */}
          <div className="flex-1 p-6">
            <div className="h-full flex flex-col">
              {/* Video Grid */}
              <div className="flex-1 mb-6">
                <VideoCall
                  localStream={localStream}
                  participants={participants}
                  localVideoRef={localVideoRef}
                  isConnected={isConnected}
                />
              </div>
              
              {/* Call Controls */}
              <div className="flex items-center justify-center space-x-4">
                <Button
                  onClick={toggleMicrophone}
                  className={`w-12 h-12 rounded-full flex items-center justify-center hover-glow ${
                    isMicEnabled ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                  }`}
                  data-testid="button-toggle-mic"
                >
                  {isMicEnabled ? (
                    <MicIcon className="w-5 h-5 text-white" />
                  ) : (
                    <MicOffIcon className="w-5 h-5 text-white" />
                  )}
                </Button>
                
                <Button
                  onClick={toggleCamera}
                  className={`w-12 h-12 rounded-full flex items-center justify-center hover-glow ${
                    isCameraEnabled ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'
                  }`}
                  data-testid="button-toggle-camera"
                >
                  {isCameraEnabled ? (
                    <VideoIcon className="w-5 h-5 text-white" />
                  ) : (
                    <VideoOffIcon className="w-5 h-5 text-white" />
                  )}
                </Button>
                
                <Button
                  onClick={shareScreen}
                  className={`w-12 h-12 rounded-full flex items-center justify-center hover-glow ${
                    isScreenSharing ? 'bg-orange-600 hover:bg-orange-700' : 'bg-purple-600 hover:bg-purple-700'
                  }`}
                  data-testid="button-share-screen"
                >
                  <ScreenShareIcon className="w-5 h-5 text-white" />
                </Button>
                
                <Button
                  onClick={() => setIsWhiteboardOpen(true)}
                  className="w-12 h-12 bg-orange-600 hover:bg-orange-700 rounded-full flex items-center justify-center hover-glow"
                  data-testid="button-whiteboard"
                >
                  <PaintbrushVertical className="w-5 h-5 text-white" />
                </Button>
                
                <Button
                  onClick={handleLeaveCall}
                  className="w-12 h-12 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center hover-glow"
                  data-testid="button-hang-up"
                >
                  <PhoneOffIcon className="w-5 h-5 text-white" />
                </Button>
              </div>
            </div>
          </div>
          
          {/* Right Sidebar - Chat & AI Features */}
          <div className="w-96 bg-card border-l border-border flex flex-col">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <TabsList className="flex border-b border-border rounded-none">
                <TabsTrigger 
                  value="transcription" 
                  className="flex-1"
                  data-testid="tab-transcription"
                >
                  Transcription
                </TabsTrigger>
                <TabsTrigger 
                  value="chat" 
                  className="flex-1"
                  data-testid="tab-chat"
                >
                  Chat
                </TabsTrigger>
                <TabsTrigger 
                  value="ai" 
                  className="flex-1"
                  data-testid="tab-ai"
                >
                  AI Assistant
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="transcription" className="flex-1 flex flex-col p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Live Transcription</h3>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full notification-dot"></div>
                    <span className="text-xs text-muted-foreground">Recording</span>
                  </div>
                </div>
                
                <Card className="flex-1 p-4 overflow-y-auto bg-muted">
                  <div className="space-y-3" data-testid="transcription-content">
                    {transcriptions.map((item) => (
                      <div key={item.id} className="space-y-1">
                        <div className="text-xs text-muted-foreground">
                          {item.speaker} • {item.timestamp.toLocaleTimeString()}
                        </div>
                        <div className="text-sm">{item.text}</div>
                      </div>
                    ))}
                    {transcriptions.length === 0 && (
                      <div className="text-sm text-muted-foreground text-center py-8">
                        Waiting for speech to transcribe...
                      </div>
                    )}
                  </div>
                </Card>
                
                <div className="mt-4 space-y-2">
                  <Button 
                    className="w-full gradient-bg text-white hover:opacity-90"
                    data-testid="button-generate-summary"
                  >
                    <i className="fas fa-magic mr-2"></i>
                    Generate AI Summary
                  </Button>
                  <div className="flex space-x-2">
                    <Button 
                      variant="secondary" 
                      className="flex-1"
                      data-testid="button-export"
                    >
                      <i className="fas fa-download mr-2"></i>
                      Export
                    </Button>
                    <Button 
                      variant="secondary" 
                      className="flex-1"
                      data-testid="button-translate"
                    >
                      <i className="fas fa-language mr-2"></i>
                      Translate
                    </Button>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="chat" className="flex-1">
                <ChatPanel meetingId={roomId} currentUserId={currentUserId} />
              </TabsContent>
              
              <TabsContent value="ai" className="flex-1">
                <AIAssistant 
                  meetingId={roomId} 
                  transcript={transcriptions.map(t => t.text).join(' ')}
                />
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>

      {/* Whiteboard Modal */}
      {isWhiteboardOpen && (
        <Whiteboard 
          meetingId={roomId}
          onClose={() => setIsWhiteboardOpen(false)}
        />
      )}
    </div>
  );
}
