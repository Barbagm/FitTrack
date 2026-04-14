import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User as UserIcon, 
  Lock, 
  Play, 
  Square, 
  History, 
  Settings, 
  Users, 
  LogOut, 
  TrendingUp, 
  Camera,
  Share2,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  Activity,
  Trophy,
  Shield,
  Bike,
  Flame,
  Trash2,
  Download,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceDot
} from 'recharts';
import { format } from 'date-fns';
import { cn, formatDuration, calculatePace, formatPace } from './lib/utils';
import { storage } from './lib/storage';
import { User, Training, AppState, UserCustomization, TrainingType } from './types';
import AdminPanel from './components/AdminPanel';
import AnnouncementPopup from './components/AnnouncementPopup';
import { FitnessEvent, Announcement } from './types';
import { SHOP_ITEMS, getFrameStyle, getPhraseStyle, ShopItem } from './constants';
import { ShoppingBag, Zap } from 'lucide-react';

const GoalSelectionModal = ({ 
  isOpen, 
  onClose, 
  onSelectGoal, 
  onSelectEvent,
  events,
  trainingType 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSelectGoal: (goal: 3 | 5 | 10) => void;
  onSelectEvent: (eventId: string) => void;
  events: FitnessEvent[];
  trainingType: string;
}) => {
  if (!isOpen) return null;

  const filteredEvents = events.filter(e => e.active && e.type === trainingType);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-zinc-900 rounded-3xl border border-zinc-800 p-8 space-y-6"
      >
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">Escolha seu objetivo</h2>
          <p className="text-zinc-500 text-sm">Selecione uma distância para iniciar o treino</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[3, 5, 10].map(goal => (
            <button
              key={goal}
              onClick={() => onSelectGoal(goal as any)}
              className="bg-zinc-800 hover:bg-orange-500/10 border border-zinc-700 hover:border-orange-500/50 p-4 rounded-2xl transition-all group"
            >
              <p className="text-2xl font-black group-hover:text-orange-500">{goal}</p>
              <p className="text-[10px] font-bold uppercase text-zinc-500">KM</p>
            </button>
          ))}
        </div>

        {filteredEvents.length > 0 && (
          <div className="space-y-4 pt-4 border-t border-zinc-800">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-center">Ou participe de um evento</p>
            <div className="space-y-2">
              {filteredEvents.map(event => (
                <button
                  key={event.id}
                  onClick={() => onSelectEvent(event.id)}
                  className="w-full bg-orange-500/5 hover:bg-orange-500/10 border border-orange-500/20 hover:border-orange-500/40 p-4 rounded-2xl flex items-center justify-between transition-all"
                >
                  <div className="text-left">
                    <p className="font-bold text-sm">{event.name}</p>
                    <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">{event.distance} KM • {event.trophies} Troféus</p>
                  </div>
                  <Trophy className="w-5 h-5 text-orange-500" />
                </button>
              ))}
            </div>
          </div>
        )}

        <button 
          onClick={onClose}
          className="w-full py-3 text-zinc-500 text-sm font-medium hover:text-zinc-300 transition-colors"
        >
          Cancelar
        </button>
      </motion.div>
    </div>
  );
};

export default function App() {
  const [rankingCategory, setRankingCategory] = useState<'global' | '3km' | '5km' | '10km'>('global');
  const [state, setState] = useState<AppState>(storage.load());
  const [view, setView] = useState<'login' | 'register' | 'admin-login' | 'home' | 'training' | 'admin' | 'history' | 'ranking'>('login');
  const [activeTab, setActiveTab] = useState<'home' | 'training' | 'history' | 'admin' | 'ranking' | 'shop'>('home');
  
  // Login/Register Form State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Training State
  const [isTraining, setIsTraining] = useState(false);
  const [trainingType, setTrainingType] = useState<TrainingType>('Corrida');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [distance, setDistance] = useState(0);
  const [paceHistory, setPaceHistory] = useState<{ time: number, pace: number }[]>([]);
  const [showStartConfirm, setShowStartConfirm] = useState(false);
  const [showPurchaseConfirm, setShowPurchaseConfirm] = useState(false);
  const [pendingPurchaseItem, setPendingPurchaseItem] = useState<ShopItem | null>(null);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showGoalSelection, setShowGoalSelection] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<3 | 5 | 10 | null>(null);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [checkpointTrophiesEarned, setCheckpointTrophiesEarned] = useState(0);
  const [lastCheckpointDistance, setLastCheckpointDistance] = useState(0);
  const [lastTraining, setLastTraining] = useState<Training | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const trainingInterval = useRef<NodeJS.Timeout | null>(null);

  // Usage Timer
  useEffect(() => {
    storage.checkWeeklyReset();
    let interval: NodeJS.Timeout;
    if (state.currentUser) {
      interval = setInterval(() => {
        setState(prev => {
          const newState = { ...prev };
          if (newState.currentUser) {
            newState.currentUser.usageTime += 1;
            const userIdx = newState.users.findIndex(u => u.username === newState.currentUser?.username);
            if (userIdx !== -1) {
              newState.users[userIdx].usageTime += 1;
              // Award trophy every 60 minutes
              if (newState.users[userIdx].usageTime % 60 === 0) {
                const notification = {
                  id: Math.random().toString(36).substr(2, 9),
                  message: 'Você ganhou 1 troféu (1 hora de uso)',
                  type: 'trophy' as const,
                  amount: 1,
                  createdAt: new Date().toISOString()
                };
                newState.users[userIdx].trophies += 1;
                newState.notifications = [notification, ...newState.notifications].slice(0, 50);
                if (newState.currentUser) newState.currentUser.trophies += 1;
              }
            }
            storage.save(newState);
          }
          return newState;
        });
      }, 60000); // Every minute
    }
    return () => clearInterval(interval);
  }, [state.currentUser?.username]);

  // Persistence
  useEffect(() => {
    storage.save(state);
  }, [state]);

  // Auth Handlers
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = state.users.find(u => u.username === username && u.password === password);
    
    if (user) {
      if (user.blocked) {
        setError('Seu acesso foi bloqueado pelo administrador');
        return;
      }
      if (!user.active) {
        setError('Usuário inativo. Entre em contato com o administrador.');
        return;
      }
      
      // If logging in through standard login, prevent admin access if it's David
      if (user.username === 'David' && view !== 'admin-login') {
        setError('Acesso administrativo deve ser feito pelo portal exclusivo.');
        return;
      }

      setState(prev => ({ ...prev, currentUser: user }));
      storage.checkStreak(user.username);
      
      if (user.role === 'admin') {
        setView('admin');
        setActiveTab('admin');
      } else {
        setView('home');
        setActiveTab('home');
      }
      setError('');
    } else {
      setError('Usuário ou senha inválidos.');
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = state.users.find(u => u.username === username && u.password === password && u.role === 'admin');
    
    if (user) {
      setState(prev => ({ ...prev, currentUser: user }));
      setView('admin');
      setActiveTab('admin');
      setError('');
    } else {
      setError('Credenciais administrativas inválidas.');
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (state.users.find(u => u.username === username)) {
      setError('Usuário já existe.');
      return;
    }
    const newUser: User = {
      username,
      email: `${username.toLowerCase()}@fittrack.pro`,
      password,
      role: 'user',
      active: true,
      blocked: false,
      usageTime: 0,
      trophies: 0,
      streak: 0,
      totalActivities: 0,
      totalDistance: 0,
      totalTime: 0,
      runCount: 0,
      walkCount: 0,
      weeklyStats: {
        '3km': 0,
        '5km': 0,
        '10km': 0
      },
      completedEvents: [],
      inventory: [],
      activeBoosters: [],
      customization: {
        nameColor: '#ffffff',
        nameStyle: 'matte',
        hasGlow: false,
        frame: 'none',
        phrase: 'Novo atleta no FitTrack'
      },
      createdAt: new Date().toISOString(),
    };
    setState(prev => ({
      ...prev,
      users: [...prev.users, newUser],
      currentUser: newUser
    }));
    setView('home');
    setActiveTab('home');
    setError('');
  };

  const handleLogout = () => {
    setState(prev => ({ ...prev, currentUser: null }));
    setView('login');
    setUsername('');
    setPassword('');
  };

  // Training Handlers
  const startTraining = () => {
    if (['Corrida', 'Caminhada'].includes(trainingType)) {
      setShowGoalSelection(true);
    } else if (trainingType === 'Pedal na Rua') {
      setShowStartConfirm(true);
    } else {
      executeStartTraining();
    }
  };

  const stopTraining = () => {
    if (['Corrida', 'Caminhada', 'Pedal na Rua'].includes(trainingType)) {
      setShowEndConfirm(true);
    } else {
      executeStopTraining();
    }
  };

  const executeStartTraining = () => {
    const now = Date.now();
    setIsTraining(true);
    setStartTime(now);
    setElapsedSeconds(0);
    setDistance(0);
    setPaceHistory([]);
    setCheckpointTrophiesEarned(0);
    setLastCheckpointDistance(0);
    setShowStartConfirm(false);
    setShowGoalSelection(false);
    
    trainingInterval.current = setInterval(() => {
      const currentNow = Date.now();
      const diffSeconds = Math.floor((currentNow - now) / 1000);
      setElapsedSeconds(diffSeconds);
      
      // Simulate GPS movement for GPS-based trainings
      setDistance(prevDist => {
        let newDist = prevDist;
        if (['Corrida', 'Caminhada', 'Pedal na Rua'].includes(trainingType)) {
          const speed = trainingType === 'Corrida' ? 0.003 : trainingType === 'Pedal na Rua' ? 0.006 : 0.0015;
          const variation = (Math.random() - 0.4) * 0.001; // Some variation
          newDist = prevDist + speed + variation;
        }
        return newDist;
      });
    }, 1000);
  };

  // Checkpoint effect
  useEffect(() => {
    if (isTraining && activeEventId) {
      const event = state.events.find(e => e.id === activeEventId);
      if (event?.useCheckpoints && event.checkpointInterval && event.checkpointTrophies) {
        const intervalKm = event.checkpointInterval / 1000;
        if (distance - lastCheckpointDistance >= intervalKm) {
          setCheckpointTrophiesEarned(prev => prev + event.checkpointTrophies!);
          setLastCheckpointDistance(distance);
        }
      }
    }
  }, [distance, isTraining, activeEventId, state.events, lastCheckpointDistance]);

  useEffect(() => {
    if (isTraining && ['Corrida', 'Caminhada', 'Pedal na Rua'].includes(trainingType)) {
      const currentPace = calculatePace(elapsedSeconds / 60, distance);
      if (currentPace > 0 && currentPace < 30) {
        setPaceHistory(prev => [...prev.slice(-20), { time: elapsedSeconds, pace: currentPace }]);
      }
    }
  }, [elapsedSeconds, isTraining, distance, trainingType]);

  // Sync timer when returning to app
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isTraining && startTime) {
        const now = Date.now();
        const diffSeconds = Math.floor((now - startTime) / 1000);
        setElapsedSeconds(diffSeconds);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isTraining, startTime]);

  // Expiry check for temporary rewards
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setState(prev => {
        if (!prev.currentUser) return prev;
        let changed = false;
        const updatedUser = { ...prev.currentUser };

        if (updatedUser.customization.phraseExpiresAt && new Date(updatedUser.customization.phraseExpiresAt) < now) {
          updatedUser.customization.phrase = 'Atleta FitTrack';
          updatedUser.customization.phraseColor = undefined;
          updatedUser.customization.phraseExpiresAt = undefined;
          changed = true;
        }

        if (updatedUser.customization.frameExpiresAt && new Date(updatedUser.customization.frameExpiresAt) < now) {
          updatedUser.customization.frame = 'none';
          updatedUser.customization.frameExpiresAt = undefined;
          changed = true;
        }

        if (changed) {
          const users = prev.users.map(u => u.username === updatedUser.username ? updatedUser : u);
          return { ...prev, currentUser: updatedUser, users };
        }
        return prev;
      });
    }, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  const calculateCalories = (type: TrainingType, dist: number, timeSec: number) => {
    const timeMin = timeSec / 60;
    switch (type) {
      case 'Corrida': return dist * 60;
      case 'Caminhada': return dist * 40;
      case 'Muay Thai': return timeMin * 10;
      case 'Boxe': return timeMin * 8;
      case 'Jiu Jitsu': return timeMin * 7;
      case 'Pedal na Rua': return dist * 50;
      case 'Bicicleta (Academia)': return timeMin * 6;
      default: return 0;
    }
  };

  const executeStopTraining = () => {
    if (trainingInterval.current) clearInterval(trainingInterval.current);
    setIsTraining(false);
    setStartTime(null);
    setShowEndConfirm(false);

    const newTraining: Training = {
      id: Math.random().toString(36).substr(2, 9),
      username: state.currentUser!.username,
      type: trainingType,
      duration: elapsedSeconds,
      distance: parseFloat(distance.toFixed(2)),
      pace: calculatePace(elapsedSeconds / 60, distance),
      calories: Math.round(calculateCalories(trainingType, distance, elapsedSeconds)),
      date: new Date().toISOString(),
    };

    // Calculate trophies
    let trophiesEarned = 0;
    if (['Corrida', 'Caminhada'].includes(trainingType) && selectedGoal) {
      const goalTrophies = selectedGoal === 3 ? 5 : selectedGoal === 5 ? 10 : 20;
      trophiesEarned = Math.floor(Math.min(1, distance / selectedGoal) * goalTrophies);
    }
    
    // Add checkpoint trophies earned during training
    trophiesEarned += checkpointTrophiesEarned;

    // XP Booster Logic
    const now = new Date();
    const activeBooster = state.currentUser?.activeBoosters.find(b => b.type === 'xp-2x' && new Date(b.expiresAt) > now);
    if (activeBooster) {
      trophiesEarned *= 2;
    }

    setState(prev => {
      const newState = {
        ...prev,
        trainings: [newTraining, ...prev.trainings]
      };
      
      if (newState.currentUser) {
        // Check if it was an event
        if (activeEventId) {
          const event = newState.events.find(e => e.id === activeEventId);
          if (event && distance >= event.distance && !(newState.currentUser.completedEvents || []).includes(event.id)) {
            // Event Completed!
            trophiesEarned += event.trophies;
            if (!newState.currentUser.completedEvents) newState.currentUser.completedEvents = [];
            newState.currentUser.completedEvents.push(event.id);
            
            // Apply rewards
            if (event.rewardFrame) {
              newState.currentUser.customization.frame = event.rewardFrame;
              if (event.rewardDuration) {
                const expiry = new Date();
                expiry.setDate(expiry.getDate() + event.rewardDuration);
                newState.currentUser.customization.frameExpiresAt = expiry.toISOString();
              } else {
                newState.currentUser.customization.frameExpiresAt = undefined;
              }
            }
            if (event.rewardPhrase) {
              newState.currentUser.customization.phrase = event.rewardPhrase;
              if (event.rewardDuration) {
                const expiry = new Date();
                expiry.setDate(expiry.getDate() + event.rewardDuration);
                newState.currentUser.customization.phraseExpiresAt = expiry.toISOString();
              } else {
                newState.currentUser.customization.phraseExpiresAt = undefined;
              }
            }
            if (event.rewardPhraseColor) newState.currentUser.customization.phraseColor = event.rewardPhraseColor;
            
            const eventNotification = {
              id: Math.random().toString(36).substr(2, 10),
              message: `Evento Concluído: ${event.name}! ${event.rewardPhrase || ''}`,
              type: 'bonus' as const,
              amount: event.trophies,
              createdAt: new Date().toISOString()
            };
            newState.notifications = [eventNotification, ...newState.notifications].slice(0, 50);
          }
        }

        newState.currentUser.trophies += trophiesEarned;
        newState.currentUser.totalActivities += 1;
        newState.currentUser.totalDistance += newTraining.distance;
        newState.currentUser.totalTime += newTraining.duration;
        if (trainingType === 'Corrida') newState.currentUser.runCount += 1;
        if (trainingType === 'Caminhada') newState.currentUser.walkCount += 1;
        
        // Weekly Category Points
        if (trainingType === 'Corrida' || trainingType === 'Caminhada') {
          if (distance >= 10) {
            newState.currentUser.weeklyStats['10km'] += trophiesEarned;
          } else if (distance >= 5) {
            newState.currentUser.weeklyStats['5km'] += trophiesEarned;
          } else if (distance >= 3) {
            newState.currentUser.weeklyStats['3km'] += trophiesEarned;
          }
        }

        // Check daily calorie goal (e.g., 500 kcal)
        const todayTrainings = newState.trainings.filter(t => 
          t.username === newState.currentUser?.username && 
          t.date.split('T')[0] === new Date().toISOString().split('T')[0]
        );
        const totalTodayCalories = todayTrainings.reduce((sum, t) => sum + t.calories, 0);
        const prevTodayCalories = totalTodayCalories - newTraining.calories;
        
        if (prevTodayCalories < 500 && totalTodayCalories >= 500) {
          trophiesEarned += 2;
          newState.currentUser.trophies += 2;
          const goalNotification = {
            id: Math.random().toString(36).substr(2, 10),
            message: 'Meta diária de calorias batida! +2 troféus',
            type: 'bonus' as const,
            amount: 2,
            createdAt: new Date().toISOString()
          };
          newState.notifications = [goalNotification, ...newState.notifications].slice(0, 50);
        }

        const userIdx = newState.users.findIndex(u => u.username === newState.currentUser?.username);
        if (userIdx !== -1) {
          newState.users[userIdx] = { ...newState.currentUser };
        }

        if (trophiesEarned > 0) {
          const notification = {
            id: Math.random().toString(36).substr(2, 9),
            message: `Você ganhou ${trophiesEarned} troféus (${trainingType})`,
            type: 'trophy' as const,
            amount: trophiesEarned,
            createdAt: new Date().toISOString()
          };
          newState.notifications = [notification, ...newState.notifications].slice(0, 50);
        }
      }
      
      return newState;
    });
    
    setLastTraining(newTraining);
    storage.updateUserUsage(state.currentUser!.username, Math.ceil(elapsedSeconds / 60));
  };

  const deleteTraining = (id: string) => {
    setState(prev => ({
      ...prev,
      trainings: prev.trainings.filter(t => t.id !== id)
    }));
    setShowDeleteConfirm(null);
  };

  // Admin Handlers
  const toggleUserStatus = (username: string) => {
    setState(prev => {
      const users = prev.users.map(u => 
        u.username === username ? { ...u, active: !u.active } : u
      );
      return { ...prev, users };
    });
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setState(prev => {
          if (!prev.currentUser) return prev;
          const updatedUser = { ...prev.currentUser, profilePhoto: base64 };
          const users = prev.users.map(u => u.username === prev.currentUser?.username ? updatedUser : u);
          return { ...prev, currentUser: updatedUser, users };
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const generateInviteLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    alert('Link de convite copiado para a área de transferência!');
  };

  // Chart Data Preparation
  const userTrainings = state.trainings
    .filter(t => t.username === state.currentUser?.username)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const chartData = [...userTrainings]
    .filter(t => ['Corrida', 'Caminhada', 'Pedal na Rua'].includes(t.type))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(t => ({
      date: format(new Date(t.date), 'dd/MM'),
      pace: t.pace,
      fullDate: format(new Date(t.date), 'PPP'),
    }));

  const bestPace = chartData.length > 0 ? Math.min(...chartData.map(d => d.pace)) : null;
  const worstPace = chartData.length > 0 ? Math.max(...chartData.map(d => d.pace)) : null;

  // Views
  if (!state.currentUser) {
    if (view === 'admin-login') {
      return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6 font-sans">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md space-y-8 bg-zinc-900 p-8 rounded-3xl border-2 border-orange-500/30 shadow-[0_0_50px_rgba(249,115,22,0.1)]"
          >
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-orange-500 text-white mb-4 shadow-lg shadow-orange-500/20">
                <Shield className="w-8 h-8" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight">Portal Admin</h1>
              <p className="text-zinc-500 text-sm">Acesso restrito ao gerenciamento</p>
            </div>

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 ml-1">Admin ID</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input 
                    type="text" 
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                    placeholder="Identificação"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 ml-1">Chave de Acesso</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input 
                    type="password" 
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              {error && (
                <p className="text-red-400 text-xs text-center font-medium bg-red-400/10 py-2 rounded-lg border border-red-400/20">
                  {error}
                </p>
              )}

              <button 
                type="submit"
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-xl shadow-lg transition-all active:scale-95"
              >
                Autenticar Admin
              </button>
            </form>

            <div className="text-center">
              <button 
                onClick={() => {
                  setView('login');
                  setError('');
                }}
                className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Voltar ao Login de Usuário
              </button>
            </div>
          </motion.div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6 font-sans">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md space-y-8 bg-zinc-900/50 p-8 rounded-3xl border border-zinc-800 backdrop-blur-xl"
        >
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/20 mb-4">
              <Activity className="w-8 h-8 text-orange-500" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">FitTrack Pro</h1>
            <p className="text-zinc-400 text-sm">Sua jornada fitness começa aqui</p>
          </div>

          <form onSubmit={view === 'login' ? handleLogin : handleRegister} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 ml-1">Usuário</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input 
                  type="text" 
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
                  placeholder="Seu nome de usuário"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 ml-1">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input 
                  type="password" 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {error && (
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-red-400 text-xs text-center font-medium bg-red-400/10 py-2 rounded-lg border border-red-400/20"
              >
                {error}
              </motion.p>
            )}

            <button 
              type="submit"
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-orange-500/20 transition-all active:scale-95"
            >
              {view === 'login' ? 'Entrar' : 'Criar Conta'}
            </button>
          </form>

          <div className="flex flex-col gap-4 text-center">
            <button 
              onClick={() => {
                setView(view === 'login' ? 'register' : 'login');
                setError('');
              }}
              className="text-sm text-zinc-400 hover:text-orange-400 transition-colors"
            >
              {view === 'login' ? 'Não tem conta? Registre-se' : 'Já tem conta? Faça login'}
            </button>
            
            <button 
              onClick={() => {
                setView('admin-login');
                setError('');
                setUsername('');
                setPassword('');
              }}
              className="text-[10px] font-bold uppercase tracking-widest text-zinc-700 hover:text-orange-500/50 transition-all"
            >
              Acesso Administrativo
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  const handleBuyItem = (item: ShopItem) => {
    if (!state.currentUser) return;
    
    if (item.isSpecial) {
      if (!(state.currentUser.inventory || []).includes(item.id)) {
        setError('Esta moldura é exclusiva e não pode ser comprada!');
        setTimeout(() => setError(''), 3000);
        return;
      }
      // If owned, just apply
      executeBuyItem(item);
      return;
    }

    if (item.type === 'frame' && (state.currentUser.inventory || []).includes(item.id)) {
      executeBuyItem(item);
      return;
    }

    if (item.type === 'booster' && (state.currentUser.activeBoosters || []).some(b => b.type === item.boosterType)) {
      setError('Você já possui um booster ativo deste tipo!');
      setTimeout(() => setError(''), 3000);
      return;
    }

    if (state.currentUser.trophies < item.price) {
      setError('Troféus insuficientes!');
      setTimeout(() => setError(''), 3000);
      return;
    }

    setPendingPurchaseItem(item);
    setShowPurchaseConfirm(true);
  };

  const executeBuyItem = (item: ShopItem) => {
    if (!state.currentUser) return;

    if (item.type === 'frame' && (state.currentUser.inventory || []).includes(item.id)) {
      // Already owned, just apply
      setState(prev => ({
        ...prev,
        currentUser: prev.currentUser ? {
          ...prev.currentUser,
          customization: { ...prev.currentUser.customization, frame: item.frameValue as any }
        } : null,
        users: prev.users.map(u => u.username === prev.currentUser?.username ? {
          ...u,
          customization: { ...u.customization, frame: item.frameValue as any }
        } : u)
      }));
      return;
    }

    setState(prev => {
      if (!prev.currentUser) return prev;
      const now = new Date();
      const expiresAt = new Date(now.getTime() + (item.durationHours || 0) * 60 * 60 * 1000).toISOString();
      
      const updatedUser = {
        ...prev.currentUser,
        trophies: prev.currentUser.trophies - item.price,
        inventory: item.type === 'frame' ? [...(prev.currentUser.inventory || []), item.id] : (prev.currentUser.inventory || []),
        activeBoosters: item.type === 'booster' ? [...(prev.currentUser.activeBoosters || []), { type: item.boosterType!, expiresAt }] : (prev.currentUser.activeBoosters || []),
        customization: item.type === 'frame' ? { ...prev.currentUser.customization, frame: item.frameValue as any } : prev.currentUser.customization
      };

      return {
        ...prev,
        currentUser: updatedMeInUsers(updatedUser, prev.users) ? updatedUser : updatedUser,
        users: prev.users.map(u => u.username === updatedUser.username ? updatedUser : u),
        notifications: [{
          id: Math.random().toString(36).substr(2, 9),
          message: `Compra realizada: ${item.name}!`,
          type: 'info' as const,
          createdAt: new Date().toISOString()
        }, ...prev.notifications].slice(0, 50)
      };
    });
    setShowPurchaseConfirm(false);
    setPendingPurchaseItem(null);
  };

  const updatedMeInUsers = (updatedUser: User, users: User[]) => {
    return users.find(u => u.username === updatedUser.username);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans pb-24">
      <GoalSelectionModal 
        isOpen={showGoalSelection}
        onClose={() => setShowGoalSelection(false)}
        onSelectGoal={(goal) => {
          setSelectedGoal(goal);
          setActiveEventId(null);
          setShowStartConfirm(true);
        }}
        onSelectEvent={(eventId) => {
          const event = state.events.find(e => e.id === eventId);
          if (event) {
            setSelectedGoal(event.distance as any);
            setActiveEventId(eventId);
            setShowStartConfirm(true);
          }
        }}
        events={state.events}
        trainingType={trainingType}
      />
      <AnnouncementPopup 
        announcements={state.announcements} 
        onClose={(id) => setState(prev => ({ ...prev, announcements: prev.announcements.filter(a => a.id !== id) }))} 
      />
      {/* Header */}
      <header className="p-6 flex items-center justify-between sticky top-0 bg-zinc-950/80 backdrop-blur-md z-50 border-bottom border-zinc-900">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">FitTrack</h1>
        </div>
        <button 
          onClick={handleLogout}
          className="p-2 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-red-400 transition-colors"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      <main className="max-w-md mx-auto p-6 space-y-8">
        <AnimatePresence mode="wait">
          {activeTab === 'home' && (
            <motion.div 
              key="home"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              {/* Profile Card */}
              <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 space-y-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 blur-3xl rounded-full -mr-16 -mt-16" />
                
                <div className="flex items-center gap-4 relative">
                  <div className="relative group">
                    <div className={cn(
                      "w-20 h-20 rounded-2xl bg-zinc-800 border-2 overflow-hidden flex items-center justify-center relative",
                      state.currentUser.customization.frame === 'none' ? "border-zinc-700" : ""
                    )} style={getFrameStyle(state.currentUser.customization.frame)}>
                      <div className="absolute inset-0 rounded-2xl border-inherit" />
                      {state.currentUser.profilePhoto ? (
                        <img src={state.currentUser.profilePhoto} alt="Profile" className="w-full h-full object-cover rounded-2xl" />
                      ) : (
                        <UserIcon className="w-10 h-10 text-zinc-600" />
                      )}
                    </div>
                    <label className="absolute -bottom-2 -right-2 p-2 bg-orange-500 rounded-lg cursor-pointer shadow-lg hover:bg-orange-600 transition-colors">
                      <Camera className="w-4 h-4 text-white" />
                      <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                    </label>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2" style={{ 
                      color: state.currentUser.customization.nameColor,
                      textShadow: state.currentUser.customization.hasGlow ? `0 0 15px ${state.currentUser.customization.nameColor}` : 'none',
                      filter: state.currentUser.customization.nameStyle === 'neon' ? 'brightness(1.5)' : 'none'
                    }}>
                      {state.currentUser.username}
                      {state.currentUser.trophies > 0 && (
                        <div className="flex items-center gap-1 bg-yellow-500/10 text-yellow-500 px-2 py-0.5 rounded-full text-[10px] border border-yellow-500/20">
                          <Trophy className="w-3 h-3" />
                          {state.currentUser.trophies}
                        </div>
                      )}
                    </h2>
                    <p className="text-zinc-500 text-sm flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Membro desde {format(new Date(state.currentUser.createdAt), 'MMM yyyy')}
                    </p>
                    <p className="text-xs italic mt-1" style={getPhraseStyle(state.currentUser.customization.phraseColor)}>"{state.currentUser.customization.phrase}"</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-zinc-800/50 p-4 rounded-2xl border border-zinc-700/50">
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1">Tempo de Uso</p>
                    <p className="text-xl font-mono font-bold text-orange-400">{formatDuration(state.currentUser.usageTime)}</p>
                  </div>
                  <div className="bg-zinc-800/50 p-4 rounded-2xl border border-zinc-700/50">
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1">Sequência</p>
                    <p className="text-xl font-bold flex items-center gap-2">
                      {state.currentUser.streak} dias
                      {state.currentUser.streak >= 7 && <Flame className="w-5 h-5 text-orange-500" />}
                    </p>
                  </div>
                </div>

                {/* Daily Goals Progress */}
                <div className="space-y-4 pt-4 border-t border-zinc-800">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Metas Diárias</h3>
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                      <div className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {/* Calorie Goal */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                        <span className="text-zinc-400">Calorias</span>
                        <span className="text-orange-500">
                          {state.trainings
                            .filter(t => t.username === state.currentUser?.username && t.date.split('T')[0] === new Date().toISOString().split('T')[0])
                            .reduce((sum, t) => sum + t.calories, 0)} / 500 kcal
                        </span>
                      </div>
                      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-orange-500"
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, (state.trainings
                            .filter(t => t.username === state.currentUser?.username && t.date.split('T')[0] === new Date().toISOString().split('T')[0])
                            .reduce((sum, t) => sum + t.calories, 0) / 500) * 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Water Goal (Simulated) */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                        <span className="text-zinc-400">Água</span>
                        <span className="text-blue-500">1.2 / 2.0 L</span>
                      </div>
                      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-blue-500"
                          initial={{ width: 0 }}
                          animate={{ width: '60%' }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Performance Chart */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-orange-500" />
                  Evolução do Pace
                </h3>
                <div className="bg-zinc-900 p-4 rounded-3xl border border-zinc-800 h-64">
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                        <XAxis 
                          dataKey="date" 
                          stroke="#71717a" 
                          fontSize={10} 
                          tickLine={false} 
                          axisLine={false}
                        />
                        <YAxis 
                          stroke="#71717a" 
                          fontSize={10} 
                          tickLine={false} 
                          axisLine={false}
                          label={{ value: 'min/km', angle: -90, position: 'insideLeft', style: { fill: '#71717a', fontSize: 10 } }}
                        />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px' }}
                          itemStyle={{ color: '#f97316' }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="pace" 
                          stroke="#f97316" 
                          strokeWidth={3} 
                          dot={{ r: 4, fill: '#f97316', strokeWidth: 0 }}
                          activeDot={{ r: 6, strokeWidth: 0 }}
                        />
                        {/* Highlight Best Pace */}
                        {chartData.map((entry, index) => (
                          entry.pace === bestPace && (
                            <ReferenceDot 
                              key={`best-${index}`}
                              x={entry.date} 
                              y={entry.pace} 
                              r={8} 
                              fill="rgba(34, 197, 94, 0.2)" 
                              stroke="#22c55e" 
                              strokeWidth={2}
                            />
                          )
                        ))}
                        {/* Highlight Worst Pace */}
                        {chartData.map((entry, index) => (
                          entry.pace === worstPace && (
                            <ReferenceDot 
                              key={`worst-${index}`}
                              x={entry.date} 
                              y={entry.pace} 
                              r={8} 
                              fill="rgba(239, 68, 68, 0.2)" 
                              stroke="#ef4444" 
                              strokeWidth={2}
                            />
                          )
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-600 space-y-2">
                      <TrendingUp className="w-12 h-12 opacity-20" />
                      <p className="text-sm">Nenhum dado de treino ainda</p>
                    </div>
                  )}
                </div>
                {chartData.length > 0 && (
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest px-2">
                    <div className="flex items-center gap-2 text-green-500">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      Melhor Pace: {formatPace(bestPace!)}
                    </div>
                    <div className="flex items-center gap-2 text-red-500">
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                      Pior Pace: {formatPace(worstPace!)}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'training' && (
            <motion.div 
              key="training"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              {/* Modality Selector */}
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                {(['Corrida', 'Caminhada', 'Muay Thai', 'Boxe', 'Jiu Jitsu', 'Bicicleta (Academia)', 'Pedal na Rua'] as TrainingType[]).map(type => (
                  <button
                    key={type}
                    onClick={() => !isTraining && setTrainingType(type)}
                    disabled={isTraining}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border",
                      trainingType === type 
                        ? "bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-500/20" 
                        : "bg-zinc-900 text-zinc-500 border-zinc-800 hover:border-zinc-700"
                    )}
                  >
                    {type}
                  </button>
                ))}
              </div>

              <div className="bg-zinc-900 p-8 rounded-3xl border border-zinc-800 text-center space-y-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-orange-500/20">
                  <motion.div 
                    className="h-full bg-orange-500"
                    animate={{ width: isTraining ? '100%' : '0%' }}
                    transition={{ duration: 1, repeat: isTraining ? Infinity : 0 }}
                  />
                </div>

                <div className="space-y-1">
                  <p className="text-6xl font-mono font-black tracking-tighter">
                    {Math.floor(elapsedSeconds / 60).toString().padStart(2, '0')}:
                    {(elapsedSeconds % 60).toString().padStart(2, '0')}
                  </p>
                  <p className="text-zinc-500 text-sm font-medium">Tempo Decorrido</p>
                </div>

                {['Corrida', 'Caminhada', 'Pedal na Rua'].includes(trainingType) ? (
                  <div className="grid grid-cols-2 gap-8 py-4">
                    <div className="space-y-1">
                      <p className="text-3xl font-bold">{distance.toFixed(2)}</p>
                      <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">KM</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-3xl font-bold">{formatPace(calculatePace(elapsedSeconds / 60, distance)).split(' ')[0]}</p>
                      <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Pace</p>
                    </div>
                  </div>
                ) : (
                  <div className="py-4">
                    <p className="text-3xl font-bold text-orange-500">
                      {Math.round(calculateCalories(trainingType, distance, elapsedSeconds))}
                    </p>
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Kcal Estimadas</p>
                  </div>
                )}

                {/* Goal Progress */}
                {isTraining && selectedGoal && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                      <span>Progresso do Objetivo</span>
                      <span>{Math.min(100, Math.round((distance / selectedGoal) * 100))}%</span>
                    </div>
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-orange-500"
                        animate={{ width: `${Math.min(100, (distance / selectedGoal) * 100)}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase">Meta: {selectedGoal} KM</p>
                    {activeEventId && (
                      <div className="flex items-center justify-center gap-1 text-orange-500">
                        <Trophy className="w-3 h-3" />
                        <span className="text-[10px] font-bold uppercase">Evento Ativo: {state.events.find(e => e.id === activeEventId)?.name}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Real-time Chart for GPS Trainings */}
                {isTraining && ['Corrida', 'Caminhada', 'Pedal na Rua'].includes(trainingType) && paceHistory.length > 2 && (
                  <div className="h-24 w-full opacity-50">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={paceHistory}>
                        <Line 
                          type="monotone" 
                          dataKey="pace" 
                          stroke="#f97316" 
                          strokeWidth={2} 
                          dot={false}
                          isAnimationActive={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                <button 
                  onClick={isTraining ? stopTraining : startTraining}
                  className={cn(
                    "w-24 h-24 rounded-full flex items-center justify-center mx-auto shadow-2xl transition-all active:scale-90",
                    isTraining ? "bg-red-500 shadow-red-500/20" : "bg-orange-500 shadow-orange-500/20"
                  )}
                >
                  {isTraining ? <Square className="w-10 h-10 text-white fill-white" /> : <Play className="w-10 h-10 text-white fill-white ml-1" />}
                </button>
              </div>

              {/* Active Events */}
              {state.events.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold flex items-center gap-2 px-2">
                    <Trophy className="w-4 h-4 text-orange-500" />
                    Eventos Disponíveis
                  </h3>
                  <div className="space-y-3">
                    {state.events.map(event => (
                      <div key={event.id} className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800 flex items-center justify-between relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-orange-500/5 blur-2xl rounded-full -mr-8 -mt-8" />
                        <div className="space-y-1 relative">
                          <p className="font-bold text-sm">{event.name}</p>
                          <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">{event.distance} KM • {event.type}</p>
                          {event.useCheckpoints && <p className="text-[9px] text-orange-500/70 font-bold uppercase">Checkpoints Ativos</p>}
                        </div>
                        <div className="text-right relative">
                          <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Prêmio</p>
                          <p className="text-xs font-bold text-orange-400">+{event.trophies} Troféus</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'ranking' && (
            <motion.div 
              key="ranking"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between px-2">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Trophy className="w-6 h-6 text-orange-500" />
                  Ranking Global
                </h2>
                <div className="bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Sua Posição: #{state.users.sort((a, b) => b.trophies - a.trophies).findIndex(u => u.username === state.currentUser?.username) + 1}</p>
                </div>
              </div>

              {/* Category Filters */}
              <div className="flex gap-2 overflow-x-auto no-scrollbar px-2">
                {(['global', '3km', '5km', '10km'] as const).map(cat => (
                  <button
                    key={cat}
                    onClick={() => setRankingCategory(cat)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap border",
                      rankingCategory === cat 
                        ? "bg-orange-500 text-white border-orange-400 shadow-lg shadow-orange-500/20" 
                        : "bg-zinc-900 text-zinc-500 border-zinc-800 hover:text-zinc-300"
                    )}
                  >
                    {cat === 'global' ? 'Geral' : cat.toUpperCase()}
                  </button>
                ))}
              </div>

              {/* Weekly Champions Banner */}
              {rankingCategory !== 'global' && state.weeklyWinners?.[rankingCategory] && (
                <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-2xl flex items-center gap-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 blur-2xl rounded-full -mr-12 -mt-12" />
                  <div className="w-12 h-12 rounded-xl bg-orange-500 flex items-center justify-center shrink-0 shadow-lg shadow-orange-500/20">
                    <Trophy className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">Campeão da Semana ({rankingCategory.toUpperCase()})</p>
                    <p className="text-lg font-black text-white">{state.weeklyWinners?.[rankingCategory]}</p>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {state.users
                  .sort((a, b) => {
                    if (rankingCategory === 'global') return b.trophies - a.trophies;
                    const aVal = a.weeklyStats?.[rankingCategory] || 0;
                    const bVal = b.weeklyStats?.[rankingCategory] || 0;
                    return bVal - aVal;
                  })
                  .map((user, index) => (
                    <div 
                      key={user.username} 
                      className={cn(
                        "bg-zinc-900 p-4 rounded-2xl border flex items-center justify-between relative overflow-hidden",
                        user.username === state.currentUser?.username ? "border-orange-500/50 bg-orange-500/5" : "border-zinc-800"
                      )}
                    >
                      {index < 3 && (
                        <div className={cn(
                          "absolute top-0 left-0 w-1 h-full",
                          index === 0 ? "bg-yellow-500" : index === 1 ? "bg-zinc-400" : "bg-orange-700"
                        )} />
                      )}
                      
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className={cn(
                            "w-12 h-12 rounded-xl bg-zinc-800 border-2 overflow-hidden flex items-center justify-center transition-all relative",
                            user.customization.frame === 'none' ? "border-zinc-700" : ""
                          )} style={getFrameStyle(user.customization.frame)}>
                            <div className="absolute inset-0 rounded-xl border-inherit" />
                            {user.profilePhoto ? (
                              <img src={user.profilePhoto} alt="" className="w-full h-full object-cover rounded-xl" referrerPolicy="no-referrer" />
                            ) : (
                              <UserIcon className="w-6 h-6 text-zinc-500" />
                            )}
                          </div>
                          {index < 3 && (
                            <div className={cn(
                              "absolute -top-1 -left-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-zinc-900 z-10",
                              index === 0 ? "bg-yellow-500 text-yellow-950" : index === 1 ? "bg-zinc-400 text-zinc-950" : "bg-orange-700 text-orange-50"
                            )}>
                              {index + 1}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-sm flex items-center gap-2" style={{ 
                            color: user.customization.nameColor,
                            textShadow: user.customization.hasGlow ? `0 0 10px ${user.customization.nameColor}` : 'none',
                            filter: user.customization.nameStyle === 'neon' ? 'brightness(1.5)' : 'none'
                          }}>
                            {user.username}
                            {user.streak >= 7 && <Flame className="w-3 h-3 text-orange-500" />}
                          </p>
                          {user.customization.phrase && (
                            <p className="text-[10px] italic leading-tight font-medium" style={getPhraseStyle(user.customization.phraseColor)}>"{user.customization.phrase}"</p>
                          )}
                          <div className="flex items-center gap-3 mt-0.5">
                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {Math.floor(user.totalTime / 3600)}h {Math.floor((user.totalTime % 3600) / 60)}m
                            </p>
                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest flex items-center gap-1">
                              <Activity className="w-3 h-3" /> {user.runCount + user.walkCount} Ativ.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="flex items-center justify-end gap-1 text-orange-500">
                          <Trophy className="w-4 h-4 fill-orange-500" />
                          <p className="text-lg font-black tracking-tighter">
                            {rankingCategory === 'global' ? user.trophies : (user.weeklyStats?.[rankingCategory] || 0)}
                          </p>
                        </div>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                          {rankingCategory === 'global' ? 'Troféus' : 'Pontos Sem.'}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'shop' && (
            <motion.div 
              key="shop"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between px-2">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <ShoppingBag className="w-6 h-6 text-orange-500" />
                  Loja de Itens
                </h2>
                <div className="flex items-center gap-1 bg-zinc-900 px-3 py-1.5 rounded-full border border-zinc-800">
                  <Trophy className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm font-bold">{state.currentUser?.trophies}</span>
                </div>
              </div>

              {/* Boosters Section */}
              <div className="space-y-3">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 px-2">Boosters Especiais</h3>
                <div className="grid grid-cols-1 gap-3">
                  {SHOP_ITEMS.filter(i => i.type === 'booster').map(item => {
                    const isActive = (state.currentUser?.activeBoosters || []).some(b => b.type === item.boosterType && new Date(b.expiresAt) > new Date());
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleBuyItem(item)}
                        disabled={isActive}
                        className={cn(
                          "bg-zinc-900 p-4 rounded-2xl border flex items-center justify-between transition-all relative overflow-hidden",
                          isActive ? "border-green-500/50 bg-green-500/5" : "border-zinc-800 hover:border-orange-500/50"
                        )}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
                            <Zap className={cn("w-6 h-6", isActive ? "text-green-500" : "text-orange-500")} />
                          </div>
                          <div className="text-left">
                            <p className="font-bold text-sm">{item.name}</p>
                            <p className="text-[10px] text-zinc-500">{item.description}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          {isActive ? (
                            <span className="text-[10px] font-bold text-green-500 uppercase">Ativo</span>
                          ) : (
                            <div className="flex items-center gap-1 text-yellow-500 font-bold">
                              <Trophy className="w-3 h-3" />
                              <span className="text-sm">{item.price}</span>
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Frames Section */}
              <div className="space-y-3">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 px-2">Molduras de Perfil</h3>
                <div className="grid grid-cols-2 gap-3">
                  {SHOP_ITEMS.filter(i => i.type === 'frame' && !i.isSpecial).map(item => {
                    const isOwned = (state.currentUser?.inventory || []).includes(item.id);
                    const isEquipped = state.currentUser?.customization.frame === item.frameValue;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleBuyItem(item)}
                        className={cn(
                          "bg-zinc-900 p-4 rounded-2xl border flex flex-col items-center gap-3 transition-all relative overflow-hidden",
                          isEquipped ? "border-orange-500 bg-orange-500/5" : isOwned ? "border-blue-500/50 bg-blue-500/5" : "border-zinc-800 hover:border-orange-500/50"
                        )}
                      >
                        <div className="w-16 h-16 rounded-xl bg-zinc-800 border-2 flex items-center justify-center overflow-hidden" style={getFrameStyle(item.frameValue)}>
                          <UserIcon className="w-8 h-8 text-zinc-700" />
                        </div>
                        <div className="text-center">
                          <p className="font-bold text-xs truncate w-32">{item.name}</p>
                          {isEquipped ? (
                            <span className="text-[9px] font-bold text-orange-500 uppercase">Equipado</span>
                          ) : isOwned ? (
                            <span className="text-[9px] font-bold text-blue-500 uppercase">Aplicar</span>
                          ) : (
                            <div className="flex items-center justify-center gap-1 text-yellow-500 font-bold mt-1">
                              <Trophy className="w-3 h-3" />
                              <span className="text-xs">{item.price}</span>
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Special Frames Section */}
              <div className="space-y-3">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-purple-500 px-2">Molduras Exclusivas (Especiais)</h3>
                <div className="grid grid-cols-2 gap-3">
                  {SHOP_ITEMS.filter(i => i.isSpecial).map(item => {
                    const isOwned = (state.currentUser?.inventory || []).includes(item.id);
                    const isEquipped = state.currentUser?.customization.frame === item.frameValue;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleBuyItem(item)}
                        className={cn(
                          "bg-zinc-900 p-4 rounded-2xl border flex flex-col items-center gap-3 transition-all relative overflow-hidden",
                          isEquipped ? "border-purple-500 bg-purple-500/5" : isOwned ? "border-blue-500/50 bg-blue-500/5" : "border-zinc-800 opacity-80"
                        )}
                      >
                        <div className="w-16 h-16 rounded-xl bg-zinc-800 border-2 flex items-center justify-center overflow-hidden" style={getFrameStyle(item.frameValue)}>
                          <UserIcon className="w-8 h-8 text-zinc-700" />
                        </div>
                        <div className="text-center">
                          <p className="font-bold text-xs truncate w-32">{item.name}</p>
                          {isEquipped ? (
                            <span className="text-[9px] font-bold text-purple-500 uppercase">Equipado</span>
                          ) : isOwned ? (
                            <span className="text-[9px] font-bold text-blue-500 uppercase">Aplicar</span>
                          ) : (
                            <div className="flex items-center justify-center gap-1 text-zinc-500 font-bold mt-1">
                              <Lock className="w-3 h-3" />
                              <span className="text-[9px] uppercase tracking-tighter">Bloqueada</span>
                            </div>
                          )}
                        </div>
                        {!isOwned && (
                          <div className="absolute top-0 right-0 bg-purple-500 text-white text-[8px] font-black px-2 py-0.5 rounded-bl-lg uppercase tracking-tighter">
                            Raro
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div 
              key="history"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              <h2 className="text-xl font-bold flex items-center gap-2 px-2">
                <History className="w-6 h-6 text-orange-500" />
                Histórico de Treinos
              </h2>
              <div className="space-y-3">
                {userTrainings.length > 0 ? (
                  userTrainings.map(t => (
                    <div key={t.id} className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800 flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center">
                          {t.type === 'Corrida' || t.type === 'Pedal na Rua' ? <Activity className="w-6 h-6 text-orange-500" /> : 
                           t.type === 'Bicicleta (Academia)' ? <Bike className="w-6 h-6 text-blue-500" /> :
                           <Flame className="w-6 h-6 text-red-500" />}
                        </div>
                        <div>
                          <p className="font-bold text-sm">{t.type}</p>
                          <p className="text-zinc-500 text-[10px]">{format(new Date(t.date), 'dd/MM/yyyy HH:mm')}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] bg-orange-500/10 text-orange-500 px-1.5 rounded font-bold">{t.calories} kcal</span>
                            {t.distance > 0 && <span className="text-[10px] bg-blue-500/10 text-blue-500 px-1.5 rounded font-bold">{t.distance} km</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-xs font-bold">{formatDuration(Math.ceil(t.duration / 60))}</p>
                          {t.pace > 0 && <p className="text-zinc-500 text-[10px]">{formatPace(t.pace)}</p>}
                        </div>
                        <button 
                          onClick={() => setShowDeleteConfirm(t.id)}
                          className="p-2 text-zinc-700 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-zinc-600">
                    <History className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    <p>Nenhum treino registrado</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'admin' && state.currentUser.role === 'admin' && (
            <motion.div 
              key="admin"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <AdminPanel state={state} setState={setState} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Modals */}
      {/* Purchase Confirmation Modal */}
      <AnimatePresence>
        {showPurchaseConfirm && pendingPurchaseItem && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl max-w-xs w-full space-y-6 text-center shadow-2xl"
            >
              <div className="w-20 h-20 rounded-2xl bg-orange-500/10 flex items-center justify-center mx-auto">
                <ShoppingBag className="w-10 h-10 text-orange-500" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold">Confirmar Compra</h3>
                <p className="text-zinc-400 text-sm">
                  Deseja realmente comprar o item <span className="text-white font-bold">{pendingPurchaseItem.name}</span> por <span className="text-yellow-500 font-bold">{pendingPurchaseItem.price} troféus</span>?
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => executeBuyItem(pendingPurchaseItem)}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition-all"
                >
                  Confirmar Compra
                </button>
                <button 
                  onClick={() => {
                    setShowPurchaseConfirm(false);
                    setPendingPurchaseItem(null);
                  }}
                  className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold py-3 rounded-xl transition-all"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showStartConfirm && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl max-w-xs w-full text-center space-y-6"
            >
              <div className="w-16 h-16 bg-orange-500/10 text-orange-500 rounded-2xl mx-auto flex items-center justify-center">
                <Play className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold">Iniciar Treino?</h3>
                <p className="text-zinc-500 text-sm">Deseja iniciar o treino de {trainingType} agora?</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowStartConfirm(false)} className="flex-1 py-3 rounded-xl bg-zinc-800 font-bold text-sm">Cancelar</button>
                <button onClick={executeStartTraining} className="flex-1 py-3 rounded-xl bg-orange-500 text-white font-bold text-sm">Sim, Iniciar</button>
              </div>
            </motion.div>
          </div>
        )}

        {showEndConfirm && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl max-w-xs w-full text-center space-y-6"
            >
              <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-2xl mx-auto flex items-center justify-center">
                <Square className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold">Finalizar Treino?</h3>
                <p className="text-zinc-500 text-sm">Deseja encerrar sua sessão de {trainingType}?</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowEndConfirm(false)} className="flex-1 py-3 rounded-xl bg-zinc-800 font-bold text-sm">Continuar</button>
                <button onClick={executeStopTraining} className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold text-sm">Finalizar</button>
              </div>
            </motion.div>
          </div>
        )}

        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl max-w-xs w-full text-center space-y-6"
            >
              <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-2xl mx-auto flex items-center justify-center">
                <Trash2 className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold">Excluir Treino?</h3>
                <p className="text-zinc-500 text-sm">Esta ação não pode ser desfeita. Deseja realmente excluir este registro?</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowDeleteConfirm(null)} className="flex-1 py-3 rounded-xl bg-zinc-800 font-bold text-sm">Cancelar</button>
                <button onClick={() => deleteTraining(showDeleteConfirm)} className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold text-sm">Excluir</button>
              </div>
            </motion.div>
          </div>
        )}

        {lastTraining && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl"
            >
              <div className="bg-orange-500 p-8 text-white text-center space-y-2 relative">
                <div className="absolute top-4 right-4">
                  <button onClick={() => setLastTraining(null)} className="p-2 hover:bg-white/10 rounded-full">
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>
                <Trophy className="w-12 h-12 mx-auto mb-2" />
                <h3 className="text-2xl font-black uppercase tracking-tighter">Treino Concluído!</h3>
                <p className="text-white/80 text-xs font-bold uppercase tracking-widest">{lastTraining.type} • {format(new Date(lastTraining.date), 'dd/MM/yyyy')}</p>
              </div>
              
              <div className="p-8 space-y-8">
                <div className="grid grid-cols-2 gap-8">
                  <SummaryItem label="Tempo" value={formatDuration(Math.ceil(lastTraining.duration / 60))} />
                  <SummaryItem label="Distância" value={`${lastTraining.distance} km`} />
                  <SummaryItem label="Pace Médio" value={formatPace(lastTraining.pace)} />
                  <SummaryItem label="Calorias" value={`${lastTraining.calories} kcal`} />
                </div>

                <div className="pt-6 border-t border-zinc-800 flex flex-col gap-3">
                  <button 
                    onClick={() => {
                      alert('Resumo salvo na galeria (simulado)');
                      setLastTraining(null);
                    }}
                    className="w-full bg-zinc-100 text-zinc-900 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-white transition-all"
                  >
                    <Download className="w-5 h-5" />
                    Salvar na Galeria
                  </button>
                  <button 
                    onClick={() => setLastTraining(null)}
                    className="w-full py-4 rounded-2xl font-bold text-zinc-500 hover:text-zinc-300 transition-all"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-zinc-900/80 backdrop-blur-xl border-t border-zinc-800 px-6 py-4 z-50">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <NavButton 
            active={activeTab === 'home'} 
            onClick={() => setActiveTab('home')} 
            icon={<UserIcon className="w-6 h-6" />} 
            label="Perfil"
          />
          <NavButton 
            active={activeTab === 'training'} 
            onClick={() => setActiveTab('training')} 
            icon={<Activity className="w-6 h-6" />} 
            label="Treino"
          />
          <NavButton 
            active={activeTab === 'ranking'} 
            onClick={() => setActiveTab('ranking')} 
            icon={<Trophy className="w-6 h-6" />} 
            label="Ranking"
          />
          <NavButton 
            active={activeTab === 'shop'} 
            onClick={() => setActiveTab('shop')} 
            icon={<ShoppingBag className="w-6 h-6" />} 
            label="Loja"
          />
          <NavButton 
            active={activeTab === 'history'} 
            onClick={() => setActiveTab('history')} 
            icon={<History className="w-6 h-6" />} 
            label="Histórico"
          />
          {state.currentUser.role === 'admin' && (
            <NavButton 
              active={activeTab === 'admin'} 
              onClick={() => setActiveTab('admin')} 
              icon={<Settings className="w-6 h-6" />} 
              label="Admin"
            />
          )}
        </div>
      </nav>

      {/* Notifications Toast */}
      <div className="fixed top-6 left-0 right-0 z-[300] pointer-events-none flex flex-col items-center gap-2 px-6">
        <AnimatePresence>
          {state.notifications.slice(0, 3).map((notif, idx) => (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={cn(
                "pointer-events-auto w-full max-w-xs p-4 rounded-2xl border shadow-2xl flex items-center gap-3",
                notif.type === 'trophy' ? "bg-orange-500 border-orange-400 text-white" : 
                notif.type === 'bonus' ? "bg-yellow-500 border-yellow-400 text-yellow-950" :
                "bg-zinc-900 border-zinc-800 text-white"
              )}
            >
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                {notif.type === 'trophy' ? <Trophy className="w-4 h-4" /> : 
                 notif.type === 'bonus' ? <Flame className="w-4 h-4" /> : 
                 <AlertCircle className="w-4 h-4" />}
              </div>
              <p className="text-xs font-bold leading-tight">{notif.message}</p>
              <button 
                onClick={() => {
                  setState(prev => ({
                    ...prev,
                    notifications: prev.notifications.filter(n => n.id !== notif.id)
                  }));
                }}
                className="ml-auto p-1 hover:bg-black/10 rounded-full"
              >
                <XCircle className="w-4 h-4 opacity-50" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 transition-all relative",
        active ? "text-orange-500" : "text-zinc-500 hover:text-zinc-300"
      )}
    >
      {active && (
        <motion.div 
          layoutId="nav-indicator"
          className="absolute -top-4 w-8 h-1 bg-orange-500 rounded-full"
        />
      )}
      {icon}
      <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
    </button>
  );
}

function SummaryItem({ label, value }: { label: string, value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}
