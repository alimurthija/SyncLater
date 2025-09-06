import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { apiRequest } from '@/lib/queryClient';
import { useWebSocket } from '@/hooks/use-websocket';
import { SendIcon, BotIcon, UserIcon, MessageSquareIcon } from 'lucide-react';

interface ChatPanelProps {
  meetingId: string;
  currentUserId: string;
}

interface Message {
  id: string;
  content: string;
  senderId: string;
  type: 'text' | 'ai' | 'system';
  createdAt: string;
  metadata?: any;
}

export function ChatPanel({ meetingId, currentUserId }: ChatPanelProps) {
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { send, on } = useWebSocket();

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['/api/meetings', meetingId, 'messages'],
    refetchInterval: 5000, // Poll for new messages
  });

  const { data: currentUser } = useQuery({
    queryKey: ['/api/users', currentUserId],
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: { content: string; type?: string }) => {
      return apiRequest('POST', '/api/messages', {
        content: messageData.content,
        senderId: currentUserId,
        meetingId,
        type: messageData.type || 'text',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/meetings', meetingId, 'messages'] });
      setNewMessage('');
    },
  });

  const aiChatMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest('POST', '/api/ai/chat', {
        message,
        context: `Meeting room: ${meetingId}`
      });
      return response.json();
    },
    onSuccess: (data) => {
      // Add AI response as a message
      sendMessageMutation.mutate({
        content: data.response,
        type: 'ai'
      });
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const unsubscribe = on('message', (data: any) => {
      if (data.type === 'chat-message' && data.meetingId === meetingId) {
        queryClient.invalidateQueries({ queryKey: ['/api/meetings', meetingId, 'messages'] });
      }
    });

    return unsubscribe;
  }, [on, meetingId, queryClient]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    const messageText = newMessage.trim();
    setIsTyping(true);

    try {
      // Send regular message
      await sendMessageMutation.mutateAsync({ content: messageText });

      // Send via WebSocket for real-time updates
      send({
        type: 'chat-message',
        meetingId,
        data: {
          content: messageText,
          senderId: currentUserId,
          timestamp: new Date().toISOString()
        }
      });

      // Check if message is directed to AI
      if (messageText.toLowerCase().includes('@ai') || messageText.toLowerCase().includes('hey ai')) {
        const aiPrompt = messageText.replace(/@ai|hey ai/gi, '').trim();
        if (aiPrompt) {
          await aiChatMutation.mutateAsync(aiPrompt);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatMessageTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getMessageBubbleClass = (message: Message) => {
    if (message.type === 'ai') {
      return 'chat-bubble-ai text-white p-3 rounded-lg max-w-xs';
    }
    if (message.senderId === currentUserId) {
      return 'chat-bubble-user text-white p-3 rounded-lg max-w-xs ml-auto';
    }
    return 'bg-muted p-3 rounded-lg max-w-xs';
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center" data-testid="chat-loading">
        <div className="loading-spinner w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-4">
      <h3 className="font-semibold mb-4">Team Chat</h3>
      
      {/* Chat Messages */}
      <ScrollArea className="flex-1 mb-4" data-testid="chat-messages">
        <div className="space-y-4">
          {!Array.isArray(messages) || messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8" data-testid="chat-empty">
              <MessageSquareIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            Array.isArray(messages) ? messages.map((message: Message) => (
              <div key={message.id} className="flex items-start space-x-3" data-testid={`message-${message.id}`}>
                {message.type === 'ai' ? (
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <BotIcon className="w-4 h-4 text-white" />
                  </div>
                ) : (
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarImage src={message.senderId === currentUserId ? (currentUser as any)?.profileImage : undefined} />
                    <AvatarFallback>
                      {message.senderId === currentUserId ? 
                        ((currentUser as any)?.fullName?.split(' ').map((n: string) => n[0]).join('') || 'U') : 
                        'T'
                      }
                    </AvatarFallback>
                  </Avatar>
                )}
                
                <div className="flex-1 min-w-0">
                  <div className={getMessageBubbleClass(message)}>
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {message.type === 'ai' ? 'AI Assistant' : 
                     message.senderId === currentUserId ? 'You' : 'Team Member'} • {formatMessageTime(message.createdAt)}
                  </div>
                </div>
              </div>
            )) : []
          )}
          
          {isTyping && (
            <div className="flex items-center space-x-2 text-muted-foreground" data-testid="typing-indicator">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
              <span className="text-xs">Sending message...</span>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      
      {/* Message Input */}
      <div className="flex space-x-2">
        <Input
          type="text"
          placeholder="Type a message... (Use @AI to ask AI assistant)"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={sendMessageMutation.isPending}
          className="flex-1"
          data-testid="input-message"
        />
        <Button
          onClick={handleSendMessage}
          disabled={!newMessage.trim() || sendMessageMutation.isPending}
          className="gradient-bg text-white hover:opacity-90"
          data-testid="button-send-message"
        >
          {sendMessageMutation.isPending ? (
            <div className="loading-spinner w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
          ) : (
            <SendIcon className="w-4 h-4" />
          )}
        </Button>
      </div>
      
      {/* AI Helper */}
      <div className="mt-2 text-xs text-muted-foreground">
        💡 Tip: Type "@AI" or "Hey AI" followed by your question to get instant assistance
      </div>
    </div>
  );
}
