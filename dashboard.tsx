import { useState } from 'react';
import { Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sidebar } from '@/components/sidebar';
import { Calendar } from '@/components/calendar';
import { Gamification } from '@/components/gamification';
import { VideoIcon, MessageSquareIcon, CalendarIcon, ListTodo, BarChart3Icon, ClipboardListIcon, Bot } from 'lucide-react';

export default function Dashboard() {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [currentUserId] = useState('default-user-id'); // In real app, get from auth

  const { data: userTeams } = useQuery({
    queryKey: ['/api/users', currentUserId, 'teams'],
  });

  const { data: userTasks } = useQuery({
    queryKey: ['/api/users', currentUserId, 'tasks'],
  });

  const { data: teamMoodData } = useQuery({
    queryKey: ['/api/teams', (userTeams as any)?.[0]?.id, 'mood-ratings'],
    enabled: !!(userTeams as any)?.[0]?.id,
  });

  const createNewMeeting = () => {
    const roomId = `meeting-${Date.now()}`;
    window.location.href = `/meeting/${roomId}`;
  };

  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar 
        currentUserId={currentUserId}
        onCalendarClick={() => setIsCalendarOpen(true)}
      />
      
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold gradient-text">SynergySphere Dashboard</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Input 
                type="text" 
                placeholder="Search meetings, people..." 
                className="w-64"
                data-testid="input-search"
              />
            </div>
            
            <Button variant="outline" size="icon" data-testid="button-notifications">
              <i className="fas fa-bell"></i>
            </Button>
            
            <Button variant="outline" size="icon" data-testid="button-settings">
              <i className="fas fa-cog"></i>
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Quick Actions */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Button 
                    onClick={createNewMeeting}
                    className="h-20 flex flex-col items-center justify-center gradient-bg hover:opacity-90"
                    data-testid="button-new-meeting"
                  >
                    <VideoIcon className="w-6 h-6 mb-2" />
                    <span className="text-sm">Start Meeting</span>
                  </Button>
                  
                  <Button 
                    variant="outline"
                    className="h-20 flex flex-col items-center justify-center"
                    data-testid="button-team-chat"
                  >
                    <MessageSquareIcon className="w-6 h-6 mb-2" />
                    <span className="text-sm">Team Chat</span>
                  </Button>
                  
                  <Button 
                    variant="outline"
                    className="h-20 flex flex-col items-center justify-center"
                    onClick={() => setIsCalendarOpen(true)}
                    data-testid="button-calendar"
                  >
                    <CalendarIcon className="w-6 h-6 mb-2" />
                    <span className="text-sm">Calendar</span>
                  </Button>
                  
                  <Button 
                    variant="outline"
                    className="h-20 flex flex-col items-center justify-center"
                    data-testid="button-tasks"
                  >
                    <ListTodo className="w-6 h-6 mb-2" />
                    <span className="text-sm">Tasks</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Gamification Stats */}
            <Gamification userId={currentUserId} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Tasks */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Tasks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Array.isArray(userTasks) ? userTasks.slice(0, 5).map((task: any) => (
                    <div key={task.id} className="flex items-center justify-between p-3 bg-muted rounded-lg" data-testid={`task-${task.id}`}>
                      <div>
                        <h4 className="font-medium text-sm">{task.title}</h4>
                        <p className="text-xs text-muted-foreground">{task.status}</p>
                      </div>
                      <div className={`px-2 py-1 rounded text-xs ${
                        task.priority === 'high' ? 'bg-red-500 text-white' :
                        task.priority === 'medium' ? 'bg-yellow-500 text-black' :
                        'bg-green-500 text-white'
                      }`}>
                        {task.priority}
                      </div>
                    </div>
                  )) : (
                    <p className="text-muted-foreground text-sm" data-testid="text-no-tasks">No tasks available</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Team Mood */}
            <Card>
              <CardHeader>
                <CardTitle>Team Mood Today</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl mb-4">😊</div>
                  <div className="text-2xl font-bold gradient-text mb-2" data-testid="text-mood-average">
                    {(teamMoodData as any)?.averageRating?.toFixed(1) || '4.2'}/5
                  </div>
                  <p className="text-sm text-muted-foreground">Average mood rating</p>
                  
                  <div className="mt-4 flex justify-center space-x-2">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <Button
                        key={rating}
                        variant="outline"
                        size="sm"
                        className="mood-indicator w-8 h-8 p-0"
                        data-testid={`button-mood-${rating}`}
                      >
                        {rating === 1 ? '😢' : rating === 2 ? '😕' : rating === 3 ? '😐' : rating === 4 ? '😊' : '😄'}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {/* Calendar Modal */}
      {isCalendarOpen && (
        <Calendar onClose={() => setIsCalendarOpen(false)} />
      )}
    </div>
  );
}
