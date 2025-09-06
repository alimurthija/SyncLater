import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { 
  TrophyIcon, 
  StarIcon, 
  FlameIcon, 
  TargetIcon, 
  TrendingUpIcon,
  AwardIcon,
  ZapIcon,
  CrownIcon
} from 'lucide-react';

interface GamificationProps {
  userId: string;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  points: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlockedAt?: Date;
}

interface Level {
  level: number;
  title: string;
  pointsRequired: number;
  perks: string[];
}

export function Gamification({ userId }: GamificationProps) {
  const [showAchievementAnimation, setShowAchievementAnimation] = useState<Achievement | null>(null);
  const [pointsAnimation, setPointsAnimation] = useState(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['/api/users', userId],
  });

  const { data: userTeams } = useQuery({
    queryKey: ['/api/users', userId, 'teams'],
  });

  // Mock achievements data
  const achievements: Achievement[] = [
    {
      id: '1',
      title: 'Early Bird',
      description: 'Join your first meeting of the day',
      icon: '🌅',
      points: 50,
      rarity: 'common',
      unlockedAt: new Date()
    },
    {
      id: '2',
      title: 'Team Player',
      description: 'Participate in 10 meetings this month',
      icon: '🤝',
      points: 200,
      rarity: 'rare',
      unlockedAt: new Date()
    },
    {
      id: '3',
      title: 'Meeting Master',
      description: 'Host 5 successful meetings',
      icon: '👑',
      points: 500,
      rarity: 'epic'
    },
    {
      id: '4',
      title: 'AI Whisperer',
      description: 'Use AI features 50 times',
      icon: '🤖',
      points: 300,
      rarity: 'epic'
    },
    {
      id: '5',
      title: 'Collaboration Champion',
      description: 'Complete 100 collaborative tasks',
      icon: '🏆',
      points: 1000,
      rarity: 'legendary'
    }
  ];

  // Mock levels data
  const levels: Level[] = [
    { level: 1, title: 'Newcomer', pointsRequired: 0, perks: ['Basic features access'] },
    { level: 2, title: 'Contributor', pointsRequired: 500, perks: ['Custom themes', 'Priority support'] },
    { level: 3, title: 'Collaborator', pointsRequired: 1500, perks: ['Advanced AI features', 'Custom workflows'] },
    { level: 4, title: 'Team Lead', pointsRequired: 3000, perks: ['Team analytics', 'Advanced scheduling'] },
    { level: 5, title: 'Master', pointsRequired: 5000, perks: ['All features unlocked', 'Exclusive badges'] },
  ];

  const updatePointsMutation = useMutation({
    mutationFn: async (points: number) => {
      const response = await apiRequest('PUT', `/api/users/${userId}/points`, { points });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/users', userId] });
      setPointsAnimation(data.points - ((user as any)?.points || 0));
      setTimeout(() => setPointsAnimation(0), 2000);
    },
  });

  const getCurrentLevel = () => {
    const userPoints = (user as any)?.points || 0;
    let currentLevel = levels[0];
    
    for (const level of levels) {
      if (userPoints >= level.pointsRequired) {
        currentLevel = level;
      } else {
        break;
      }
    }
    
    return currentLevel;
  };

  const getNextLevel = () => {
    const currentLevel = getCurrentLevel();
    const currentIndex = levels.findIndex(l => l.level === currentLevel.level);
    return currentIndex < levels.length - 1 ? levels[currentIndex + 1] : null;
  };

  const getProgressToNextLevel = () => {
    const userPoints = (user as any)?.points || 0;
    const currentLevel = getCurrentLevel();
    const nextLevel = getNextLevel();
    
    if (!nextLevel) return 100;
    
    const progress = ((userPoints - currentLevel.pointsRequired) / (nextLevel.pointsRequired - currentLevel.pointsRequired)) * 100;
    return Math.min(100, Math.max(0, progress));
  };

  const getRarityColor = (rarity: Achievement['rarity']) => {
    switch (rarity) {
      case 'common': return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
      case 'rare': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'epic': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'legendary': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      default: return 'bg-muted';
    }
  };

  const getRarityIcon = (rarity: Achievement['rarity']) => {
    switch (rarity) {
      case 'common': return <StarIcon className="w-4 h-4" />;
      case 'rare': return <AwardIcon className="w-4 h-4" />;
      case 'epic': return <TrophyIcon className="w-4 h-4" />;
      case 'legendary': return <CrownIcon className="w-4 h-4" />;
      default: return <StarIcon className="w-4 h-4" />;
    }
  };

  const handleDailyStreak = () => {
    // Simulate daily check-in
    updatePointsMutation.mutate(25);
    toast({
      title: "Daily Streak!",
      description: "+25 points for checking in today! 🔥",
    });
  };

  const simulateAchievement = () => {
    const unlockedAchievement = achievements.find(a => !a.unlockedAt);
    if (unlockedAchievement) {
      setShowAchievementAnimation(unlockedAchievement);
      updatePointsMutation.mutate(unlockedAchievement.points);
      setTimeout(() => setShowAchievementAnimation(null), 3000);
    }
  };

  const currentLevel = getCurrentLevel();
  const nextLevel = getNextLevel();
  const progressToNext = getProgressToNextLevel();
  const unlockedAchievements = achievements.filter(a => a.unlockedAt);
  const lockedAchievements = achievements.filter(a => !a.unlockedAt);

  return (
    <Card className="relative overflow-hidden" data-testid="gamification-card">
      {/* Points Animation */}
      {pointsAnimation > 0 && (
        <div className="absolute top-4 right-4 z-10 points-animation">
          <div className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-bold">
            +{pointsAnimation} points!
          </div>
        </div>
      )}

      {/* Achievement Unlock Animation */}
      {showAchievementAnimation && (
        <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-20 badge-unlock">
          <div className="text-center">
            <div className="text-6xl mb-4">{showAchievementAnimation.icon}</div>
            <h3 className="text-2xl font-bold text-yellow-400 mb-2">Achievement Unlocked!</h3>
            <p className="text-lg font-medium mb-2">{showAchievementAnimation.title}</p>
            <p className="text-sm text-muted-foreground mb-4">{showAchievementAnimation.description}</p>
            <Badge className="gradient-bg text-white">
              +{showAchievementAnimation.points} points
            </Badge>
          </div>
        </div>
      )}

      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <TrophyIcon className="w-5 h-5 gradient-text" />
          <span>Your Progress</span>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Level & Points */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg" data-testid="text-user-level">
                Level {currentLevel.level} - {currentLevel.title}
              </h3>
              <p className="text-sm text-muted-foreground">{(user as any)?.points || 0} points</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold gradient-text" data-testid="text-user-points">
                {(user as any)?.points || 2847}
              </div>
              <p className="text-xs text-muted-foreground">Total Points</p>
            </div>
          </div>
          
          {nextLevel && (
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Progress to {nextLevel.title}</span>
                <span>{Math.round(progressToNext)}%</span>
              </div>
              <Progress value={progressToNext} className="h-2" data-testid="progress-next-level" />
              <p className="text-xs text-muted-foreground mt-1">
                {nextLevel.pointsRequired - ((user as any)?.points || 0)} points to next level
              </p>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-400" data-testid="text-user-badges">
              {Array.isArray((user as any)?.badges) ? (user as any).badges.length : 12}
            </div>
            <div className="text-xs text-muted-foreground">Badges</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-400 flex items-center justify-center" data-testid="text-user-streak">
              <FlameIcon className="w-6 h-6 mr-1" />
              {(user as any)?.streak || 7}
            </div>
            <div className="text-xs text-muted-foreground">Day Streak</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-400" data-testid="text-user-rank">
              #{Math.floor(Math.random() * 50) + 1}
            </div>
            <div className="text-xs text-muted-foreground">Team Rank</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-2">
          <Button
            onClick={handleDailyStreak}
            className="w-full gradient-bg text-white hover:opacity-90"
            data-testid="button-daily-checkin"
          >
            <FlameIcon className="w-4 h-4 mr-2" />
            Daily Check-in (+25 points)
          </Button>
          
          <Button
            onClick={simulateAchievement}
            variant="outline"
            className="w-full"
            disabled={lockedAchievements.length === 0}
            data-testid="button-simulate-achievement"
          >
            <ZapIcon className="w-4 h-4 mr-2" />
            Simulate Achievement Unlock
          </Button>
        </div>

        {/* Recent Achievements */}
        <div>
          <h4 className="font-medium mb-3">Recent Achievements</h4>
          <div className="space-y-2 max-h-32 overflow-y-auto" data-testid="recent-achievements">
            {unlockedAchievements.slice(0, 3).map((achievement) => (
              <div
                key={achievement.id}
                className={`flex items-center space-x-3 p-3 rounded-lg border ${getRarityColor(achievement.rarity)}`}
                data-testid={`achievement-${achievement.id}`}
              >
                <div className="text-2xl">{achievement.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-sm">{achievement.title}</span>
                    {getRarityIcon(achievement.rarity)}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {achievement.description}
                  </p>
                </div>
                <Badge variant="outline" className="text-xs">
                  +{achievement.points}
                </Badge>
              </div>
            ))}
            
            {unlockedAchievements.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Complete tasks to unlock achievements!
              </p>
            )}
          </div>
        </div>

        {/* Level Perks */}
        {currentLevel.perks.length > 0 && (
          <div>
            <h4 className="font-medium mb-2">Current Level Perks</h4>
            <div className="space-y-1" data-testid="level-perks">
              {currentLevel.perks.map((perk, index) => (
                <div key={index} className="flex items-center space-x-2 text-sm">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                  <span>{perk}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Leaderboard Preview */}
        <div>
          <h4 className="font-medium mb-3">Team Leaderboard</h4>
          <div className="space-y-2" data-testid="leaderboard">
            {[
              { name: 'You', points: (user as any)?.points || 2847, rank: 1 },
              { name: 'Sarah Chen', points: 2654, rank: 2 },
              { name: 'Mike Johnson', points: 2341, rank: 3 },
            ].map((player, index) => (
              <div
                key={index}
                className={`flex items-center space-x-3 p-2 rounded ${
                  player.name === 'You' ? 'bg-primary/10 border border-primary/20' : 'bg-muted/50'
                }`}
                data-testid={`leaderboard-${index}`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  player.rank === 1 ? 'bg-yellow-500 text-black' :
                  player.rank === 2 ? 'bg-gray-400 text-white' :
                  player.rank === 3 ? 'bg-orange-500 text-white' :
                  'bg-muted-foreground text-white'
                }`}>
                  {player.rank}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm">{player.name}</div>
                  <div className="text-xs text-muted-foreground">{player.points} points</div>
                </div>
                {player.rank === 1 && <CrownIcon className="w-4 h-4 text-yellow-500" />}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
