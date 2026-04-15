import { AppState, User, Training, FitnessEvent, Announcement, Post, FriendRequest } from '../types';
import { db, auth } from '../firebase';
import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  onSnapshot, 
  query, 
  where,
  getDocs,
  writeBatch
} from 'firebase/firestore';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const STORAGE_KEY = 'fittrack_pro_data';

const DEFAULT_STATE: AppState = {
  currentUser: null,
  users: [
    {
      username: 'David',
      email: 'david@dstraining.pro',
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
      followers: [],
      following: [],
      friends: [],
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
  posts: [],
  friendRequests: [],
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
        posts: (parsed.posts || []).map((p: any) => ({
          ...p,
          likes: p.likes || [],
          comments: p.comments || []
        })),
        friendRequests: parsed.friendRequests || [],
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
            activeBoosters: u.activeBoosters || [],
            followers: u.followers || [],
            following: u.following || [],
            friends: u.friends || []
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

  checkWeeklyReset: async () => {
    const state = storage.load();
    const currentWeekId = storage.getWeekId();
    
    if (state.weeklyWinners.weekId === currentWeekId) return;

    // We have a new week! Determine winners of the PREVIOUS week
    const categories: ('3km' | '5km' | '10km')[] = ['3km', '5km', '10km'];
    const prizes = { '3km': 10, '5km': 15, '10km': 25 };
    const badges = {
      '3km': 'Campeão da Semana (3KM)',
      '5km': 'Campeão da Semana (5KM)',
      '10km': 'Campeão da Semana (10KM)'
    };
    
    const newWinners: any = { weekId: currentWeekId };
    const badgeExpiry = new Date();
    badgeExpiry.setDate(badgeExpiry.getDate() + 7);

    categories.forEach(cat => {
      const sortedUsers = [...state.users].sort((a, b) => {
        const aVal = a.weeklyStats?.[cat] || 0;
        const bVal = b.weeklyStats?.[cat] || 0;
        return bVal - aVal;
      });
      
      // Top 3 get badges
      sortedUsers.slice(0, 3).forEach((winner, idx) => {
        if (winner && (winner.weeklyStats?.[cat] || 0) > 0) {
          if (idx === 0) {
            newWinners[cat] = winner.username;
            winner.trophies += prizes[cat];
            winner.customization.weeklyBadge = 'Campeão da Semana';
          } else if (idx === 1) {
            winner.customization.weeklyBadge = 'Vice-campeão';
          } else if (idx === 2) {
            winner.customization.weeklyBadge = 'Top 3 da Semana';
          }
          winner.customization.weeklyBadgeExpiresAt = badgeExpiry.toISOString();
        }
      });
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
    
    // Push to Firestore
    const batch = writeBatch(db);
    state.users.forEach(u => {
      batch.set(doc(db, 'users', u.username), u);
    });
    batch.set(doc(db, 'weeklyWinners', 'current'), state.weeklyWinners);
    await batch.commit();
  },

  syncWithFirestore: (onUpdate: (state: AppState) => void) => {
    // Listen for users
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const users: User[] = [];
      snapshot.forEach(doc => users.push(doc.data() as User));
      
      // Ensure David is ALWAYS in the list and has correct credentials
      const davidExists = users.find(u => u.username === 'David');
      if (!davidExists) {
        users.push(DEFAULT_STATE.users[0]);
      } else {
        // Force correct credentials for David even if he comes from Firestore
        const davidIdx = users.findIndex(u => u.username === 'David');
        users[davidIdx] = {
          ...users[davidIdx],
          password: DEFAULT_STATE.users[0].password,
          role: 'admin',
          active: true,
          blocked: false
        };
      }

      const currentState = storage.load();
      const newState = { ...currentState, users };
      
      // Update current user if exists
      if (currentState.currentUser) {
        const updatedMe = users.find(u => u.username === currentState.currentUser?.username);
        if (updatedMe) newState.currentUser = updatedMe;
      }
      
      storage.save(newState);
      onUpdate(newState);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });

    // Listen for trainings
    const unsubTrainings = onSnapshot(collection(db, 'trainings'), (snapshot) => {
      const trainings: Training[] = [];
      snapshot.forEach(doc => trainings.push(doc.data() as Training));
      const currentState = storage.load();
      const newState = { ...currentState, trainings };
      storage.save(newState);
      onUpdate(newState);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'trainings');
    });

    // Listen for events
    const unsubEvents = onSnapshot(collection(db, 'events'), (snapshot) => {
      const events: FitnessEvent[] = [];
      snapshot.forEach(doc => events.push(doc.data() as FitnessEvent));
      const currentState = storage.load();
      const newState = { ...currentState, events };
      storage.save(newState);
      onUpdate(newState);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'events');
    });

    // Listen for announcements
    const unsubAnnouncements = onSnapshot(collection(db, 'announcements'), (snapshot) => {
      const announcements: Announcement[] = [];
      snapshot.forEach(doc => announcements.push(doc.data() as Announcement));
      const currentState = storage.load();
      const newState = { ...currentState, announcements };
      storage.save(newState);
      onUpdate(newState);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'announcements');
    });

    // Listen for weekly winners
    const unsubWinners = onSnapshot(doc(db, 'weeklyWinners', 'current'), (doc) => {
      if (doc.exists()) {
        const weeklyWinners = doc.data() as any;
        const currentState = storage.load();
        const newState = { ...currentState, weeklyWinners };
        storage.save(newState);
        onUpdate(newState);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'weeklyWinners/current');
    });

    // Listen for posts
    const unsubPosts = onSnapshot(collection(db, 'posts'), (snapshot) => {
      const posts: Post[] = [];
      snapshot.forEach(doc => {
        const data = doc.data() as Post;
        posts.push({
          ...data,
          likes: data.likes || [],
          comments: data.comments || []
        });
      });
      const currentState = storage.load();
      const newState = { ...currentState, posts: posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) };
      storage.save(newState);
      onUpdate(newState);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'posts');
    });

    // Listen for friend requests
    const unsubRequests = onSnapshot(collection(db, 'friendRequests'), (snapshot) => {
      const friendRequests: FriendRequest[] = [];
      snapshot.forEach(doc => friendRequests.push(doc.data() as FriendRequest));
      const currentState = storage.load();
      const newState = { ...currentState, friendRequests };
      storage.save(newState);
      onUpdate(newState);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'friendRequests');
    });

    return () => {
      unsubUsers();
      unsubTrainings();
      unsubEvents();
      unsubAnnouncements();
      unsubWinners();
      unsubPosts();
      unsubRequests();
    };
  },

  pushToFirestore: async (state: AppState) => {
    try {
      if (state.currentUser) {
        await setDoc(doc(db, 'users', state.currentUser.username), state.currentUser);
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, state.currentUser ? `users/${state.currentUser.username}` : 'users');
    }
  },

  pushPost: async (post: Post) => {
    try {
      await setDoc(doc(db, 'posts', post.id), post);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `posts/${post.id}`);
    }
  },

  deletePost: async (postId: string) => {
    try {
      const { deleteDoc } = await import('firebase/firestore');
      await deleteDoc(doc(db, 'posts', postId));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `posts/${postId}`);
    }
  },

  pushFriendRequest: async (request: FriendRequest) => {
    const id = `${request.from}_${request.to}`;
    try {
      await setDoc(doc(db, 'friendRequests', id), request);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `friendRequests/${id}`);
    }
  },

  clear: () => {
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  }
};
