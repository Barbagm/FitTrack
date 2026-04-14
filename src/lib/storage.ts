import { AppState, User, Training } from '../types';

const STORAGE_KEY = 'fittrack_pro_data';

const DEFAULT_STATE: AppState = {
  currentUser: null,
  users: [
    {
      username: 'David',
      email: 'david@fittrack.pro',
      password: '735981467203', // New specific password for admin
      role: 'admin',
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
        nameColor: '#f97316',
        nameStyle: 'neon',
        hasGlow: true,
        frame: 'none',
        phrase: 'Administrador do Sistema'
      },
      createdAt: new Date().toISOString(),
    }
  ],
  trainings: [],
  announcements: [],
  events: [],
  syncActive: true,
  notifications: [],
  weeklyWinners: {
    '3km': null,
    '5km': null,
    '10km': null,
    weekId: '',
  },
};

export const storage = {
  save: (state: AppState) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  },

  load: (): AppState => {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return DEFAULT_STATE;
    try {
      const parsed = JSON.parse(data);
      // Basic migration/merge for new fields
      return {
        ...DEFAULT_STATE,
        ...parsed,
        weeklyWinners: {
          ...DEFAULT_STATE.weeklyWinners,
          ...(parsed.weeklyWinners || {})
        },
        users: parsed.users.map((u: any) => {
          const baseUser = DEFAULT_STATE.users[0];
          const mergedUser = {
            ...baseUser,
            ...u,
            weeklyStats: {
              ...baseUser.weeklyStats,
              ...(u.weeklyStats || {})
            },
            customization: {
              ...baseUser.customization,
              ...(u.customization || {})
            },
            completedEvents: u.completedEvents || [],
            inventory: u.inventory || [],
            activeBoosters: u.activeBoosters || []
          };
          
          // Force correct credentials for primary admin David
          if (mergedUser.username === 'David') {
            mergedUser.password = DEFAULT_STATE.users[0].password;
            mergedUser.role = 'admin';
            mergedUser.active = true;
            mergedUser.blocked = false;
          }
          
          return mergedUser;
        })
      };
    } catch (e) {
      return DEFAULT_STATE;
    }
  },

  updateUserUsage: (username: string, minutes: number) => {
    const state = storage.load();
    const userIndex = state.users.findIndex(u => u.username === username);
    if (userIndex !== -1) {
      state.users[userIndex].usageTime += minutes;
      if (state.currentUser?.username === username) {
        state.currentUser.usageTime += minutes;
      }
      storage.save(state);
    }
  },

  awardTrophies: (username: string, amount: number, message: string, type: 'trophy' | 'bonus' = 'trophy') => {
    const state = storage.load();
    const userIndex = state.users.findIndex(u => u.username === username);
    if (userIndex !== -1) {
      state.users[userIndex].trophies += amount;
      if (state.currentUser?.username === username) {
        state.currentUser.trophies += amount;
      }
      
      const notification = {
        id: Math.random().toString(36).substr(2, 9),
        message,
        type,
        amount,
        createdAt: new Date().toISOString()
      };
      
      state.notifications = [notification, ...state.notifications].slice(0, 50);
      storage.save(state);
      return notification;
    }
    return null;
  },

  checkStreak: (username: string) => {
    const state = storage.load();
    const userIndex = state.users.findIndex(u => u.username === username);
    if (userIndex !== -1) {
      const user = state.users[userIndex];
      const today = new Date().toISOString().split('T')[0];
      const lastDate = user.lastActiveDate?.split('T')[0];
      
      if (lastDate === today) return; // Already checked today
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      if (lastDate === yesterdayStr) {
        user.streak += 1;
        if (user.streak === 7) {
          storage.awardTrophies(username, 10, 'Bônus conquistado: +10 troféus (Consistência de 7 dias)', 'bonus');
        } else if (user.streak === 30) {
          storage.awardTrophies(username, 50, 'Bônus conquistado: +50 troféus (Consistência de 30 dias)', 'bonus');
        }
      } else {
        user.streak = 1;
      }
      
      user.lastActiveDate = new Date().toISOString();
      if (state.currentUser?.username === username) {
        state.currentUser.streak = user.streak;
        state.currentUser.lastActiveDate = user.lastActiveDate;
      }
      storage.save(state);
    }
  },

  getWeekId: () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${d.getFullYear()}-W${weekNo}`;
  },

  checkWeeklyReset: () => {
    const state = storage.load();
    const currentWeekId = storage.getWeekId();
    
    if (state.weeklyWinners.weekId === currentWeekId) return;

    // We have a new week! Determine winners of the PREVIOUS week
    const categories: ('3km' | '5km' | '10km')[] = ['3km', '5km', '10km'];
    const prizes = { '3km': 10, '5km': 15, '10km': 25 };
    
    const newWinners: any = { weekId: currentWeekId };

    categories.forEach(cat => {
      const sortedUsers = [...state.users].sort((a, b) => {
        const aVal = a.weeklyStats?.[cat] || 0;
        const bVal = b.weeklyStats?.[cat] || 0;
        return bVal - aVal;
      });
      const winner = sortedUsers[0];
      
      if (winner && (winner.weeklyStats?.[cat] || 0) > 0) {
        newWinners[cat] = winner.username;
        // Award prize (this will be saved when we save the state later)
        winner.trophies += prizes[cat];
        
        const notification = {
          id: Math.random().toString(36).substr(2, 9),
          message: `Você é o campeão da semana na categoria ${cat.toUpperCase()}! +${prizes[cat]} troféus`,
          type: 'bonus' as const,
          amount: prizes[cat],
          createdAt: new Date().toISOString()
        };
        
        state.notifications = [notification, ...state.notifications].slice(0, 50);
      } else {
        newWinners[cat] = null;
      }
    });

    // Reset all users weekly stats
    state.users.forEach(u => {
      u.weeklyStats = { '3km': 0, '5km': 0, '10km': 0 };
      u.lastWeeklyReset = new Date().toISOString();
    });

    state.weeklyWinners = newWinners;
    if (state.currentUser) {
      const updatedMe = state.users.find(u => u.username === state.currentUser?.username);
      if (updatedMe) state.currentUser = updatedMe;
    }

    storage.save(state);
  }
};
