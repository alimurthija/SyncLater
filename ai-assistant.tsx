import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { apiRequest } from '@/lib/queryClient';
import { BotIcon, SparklesIcon, TrendingUpIcon, ClockIcon, UsersIcon } from 'lucide-react';

interface AIAssistantProps {
  meetingId: string;
  transcript?: string;
}

interface AIInsight {
  type: 'summary' | 'action-item' | 'suggestion' | 'sentiment';
  title: string;
  content: string;
  confidence?: number;
  priority?: 'low' | 'medium' | 'high';
}

export function AIAssistant({ meetingId, transcript = '' }: AIAssistantProps) {
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>>([]);
  const [insights, setInsights] = useState<AIInsight[]>([]);

  const generateSummaryMutation = useMutation({
    mutationFn: async () => {
      if (!transcript.trim()) {
        throw new Error('No transcript available for summarization');
      }
      const response = await apiRequest('POST', '/api/ai/summarize', { text: transcript });
      return response.json();
    },
    onSuccess: (data) => {
      const newInsight: AIInsight = {
        type: 'summary',
        title: 'Meeting Summary Generated',
        content: data.summary,
        confidence: 0.9
      };
      setInsights(prev => [newInsight, ...prev]);
    },
  });

  const analyzeSentimentMutation = useMutation({
    mutationFn: async () => {
      if (!transcript.trim()) {
        throw new Error('No transcript available for sentiment analysis');
      }
      const response = await apiRequest('POST', '/api/ai/sentiment', { text: transcript });
      return response.json();
    },
    onSuccess: (data) => {
      const moodEmoji = data.rating >= 4 ? '😊' : data.rating >= 3 ? '😐' : '😕';
      const newInsight: AIInsight = {
        type: 'sentiment',
        title: 'Meeting Sentiment Analysis',
        content: `Overall mood: ${moodEmoji} ${data.mood} (${data.rating}/5 stars with ${Math.round(data.confidence * 100)}% confidence)`,
        confidence: data.confidence
      };
      setInsights(prev => [newInsight, ...prev]);
    },
  });

  const generateInsightsMutation = useMutation({
    mutationFn: async () => {
      if (!transcript.trim()) {
        throw new Error('No transcript available for insights');
      }
      const response = await apiRequest('POST', '/api/ai/meeting-insights', {
        transcript,
        participants: ['current-user', 'other-participant']
      });
      return response.json();
    },
    onSuccess: (data) => {
      const newInsights: AIInsight[] = [
        ...data.actionItems.map((item: string) => ({
          type: 'action-item' as const,
          title: 'Action Item Identified',
          content: item,
          priority: 'high' as const
        })),
        ...data.nextSteps.map((step: string) => ({
          type: 'suggestion' as const,
          title: 'Next Step Suggestion',
          content: step,
          priority: 'medium' as const
        }))
      ];
      setInsights(prev => [...newInsights, ...prev]);
    },
  });

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest('POST', '/api/ai/chat', {
        message,
        context: `Meeting ID: ${meetingId}. Recent transcript: ${transcript.slice(-500)}`
      });
      return response.json();
    },
    onSuccess: (data, variables) => {
      setChatHistory(prev => [
        ...prev,
        { role: 'user', content: variables, timestamp: new Date() },
        { role: 'assistant', content: data.response, timestamp: new Date() }
      ]);
      setChatMessage('');
    },
  });

  const handleChatSubmit = () => {
    if (!chatMessage.trim()) return;
    chatMutation.mutate(chatMessage);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleChatSubmit();
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'summary': return <SparklesIcon className="w-4 h-4" />;
      case 'action-item': return <ClockIcon className="w-4 h-4" />;
      case 'suggestion': return <TrendingUpIcon className="w-4 h-4" />;
      case 'sentiment': return <UsersIcon className="w-4 h-4" />;
      default: return <BotIcon className="w-4 h-4" />;
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'summary': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'action-item': return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'suggestion': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'sentiment': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      default: return 'bg-muted';
    }
  };

  return (
    <div className="flex-1 flex flex-col p-4">
      <h3 className="font-semibold mb-4">AI Assistant</h3>
      
      {/* AI Actions */}
      <div className="space-y-4 mb-6">
        <Card className="p-4 bg-muted/50">
          <h4 className="text-sm font-medium mb-3">Quick Actions</h4>
          <div className="grid grid-cols-1 gap-2">
            <Button
              onClick={() => generateSummaryMutation.mutate()}
              disabled={generateSummaryMutation.isPending || !transcript.trim()}
              variant="outline"
              className="justify-start text-left h-auto p-3"
              data-testid="button-generate-summary"
            >
              <SparklesIcon className="w-4 h-4 mr-2 flex-shrink-0" />
              <div>
                <div className="font-medium">Generate Summary</div>
                <div className="text-xs text-muted-foreground">Create meeting summary</div>
              </div>
            </Button>
            
            <Button
              onClick={() => analyzeSentimentMutation.mutate()}
              disabled={analyzeSentimentMutation.isPending || !transcript.trim()}
              variant="outline"
              className="justify-start text-left h-auto p-3"
              data-testid="button-analyze-sentiment"
            >
              <UsersIcon className="w-4 h-4 mr-2 flex-shrink-0" />
              <div>
                <div className="font-medium">Analyze Sentiment</div>
                <div className="text-xs text-muted-foreground">Check meeting mood</div>
              </div>
            </Button>
            
            <Button
              onClick={() => generateInsightsMutation.mutate()}
              disabled={generateInsightsMutation.isPending || !transcript.trim()}
              variant="outline"
              className="justify-start text-left h-auto p-3"
              data-testid="button-generate-insights"
            >
              <TrendingUpIcon className="w-4 h-4 mr-2 flex-shrink-0" />
              <div>
                <div className="font-medium">Generate Insights</div>
                <div className="text-xs text-muted-foreground">Find action items & next steps</div>
              </div>
            </Button>
          </div>
        </Card>
        
        {/* AI Insights */}
        {insights.length > 0 && (
          <Card className="p-4">
            <h4 className="text-sm font-medium mb-3">AI Insights</h4>
            <ScrollArea className="h-48">
              <div className="space-y-3" data-testid="ai-insights">
                {insights.map((insight, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border ${getInsightColor(insight.type)}`}
                    data-testid={`insight-${insight.type}-${index}`}
                  >
                    <div className="flex items-start space-x-2">
                      {getInsightIcon(insight.type)}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{insight.title}</div>
                        <div className="text-xs mt-1 opacity-90">{insight.content}</div>
                        {insight.confidence && (
                          <Badge variant="outline" className="mt-2">
                            {Math.round(insight.confidence * 100)}% confidence
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </Card>
        )}
      </div>
      
      {/* AI Chat */}
      <Card className="flex-1 flex flex-col p-4">
        <h4 className="text-sm font-medium mb-3">Chat with AI</h4>
        
        <ScrollArea className="flex-1 mb-4" data-testid="ai-chat-history">
          <div className="space-y-3">
            {chatHistory.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <BotIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">Ask me anything about:</p>
                <ul className="text-xs mt-2 space-y-1 opacity-75">
                  <li>• Meeting summaries</li>
                  <li>• Task prioritization</li>
                  <li>• Schedule optimization</li>
                  <li>• Team performance</li>
                </ul>
              </div>
            ) : (
              chatHistory.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  data-testid={`chat-message-${message.role}-${index}`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-lg text-sm ${
                      message.role === 'user'
                        ? 'chat-bubble-user text-white'
                        : 'chat-bubble-ai text-white'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    <div className="text-xs mt-1 opacity-75">
                      {message.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))
            )}
            
            {chatMutation.isPending && (
              <div className="flex justify-start" data-testid="ai-thinking">
                <div className="chat-bubble-ai text-white p-3 rounded-lg max-w-[80%]">
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    <span className="text-xs">AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        
        {/* Chat Input */}
        <div className="flex space-x-2">
          <Input
            type="text"
            placeholder="Ask AI anything..."
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={chatMutation.isPending}
            className="flex-1"
            data-testid="input-ai-chat"
          />
          <Button
            onClick={handleChatSubmit}
            disabled={!chatMessage.trim() || chatMutation.isPending}
            className="gradient-bg text-white hover:opacity-90"
            data-testid="button-send-ai-chat"
          >
            {chatMutation.isPending ? (
              <div className="loading-spinner w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <SparklesIcon className="w-4 h-4" />
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
