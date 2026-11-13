import { SessionRecord, UserProfile } from '../types';

const HISTORY_KEY = 'wordsmith_user_history';
const USERS_KEY = 'wordsmith_users';

// --- User Management ---

export const getUsers = (): UserProfile[] => {
  try {
    const item = localStorage.getItem(USERS_KEY);
    return item ? JSON.parse(item) : [];
  } catch (e) {
    console.error("Failed to load users", e);
    return [];
  }
};

export const createUser = (name: string, pin: string): UserProfile => {
  const users = getUsers();
  
  // Simple color rotation
  const colors = ['blue', 'emerald', 'violet', 'amber', 'rose', 'cyan'];
  const color = colors[users.length % colors.length];

  const newUser: UserProfile = {
    id: Date.now().toString(), // Simple ID generation
    name: name.trim(),
    pin: pin,
    color: color,
    createdAt: Date.now()
  };

  const updatedUsers = [...users, newUser];
  localStorage.setItem(USERS_KEY, JSON.stringify(updatedUsers));
  return newUser;
};

export const updateUserProfile = (userId: string, updates: Partial<UserProfile>): UserProfile | null => {
  const users = getUsers();
  const userIndex = users.findIndex(u => u.id === userId);
  if (userIndex === -1) return null;

  const updatedUser = { ...users[userIndex], ...updates };
  const updatedUsers = [...users];
  updatedUsers[userIndex] = updatedUser;
  
  localStorage.setItem(USERS_KEY, JSON.stringify(updatedUsers));
  return updatedUser;
};

// --- Session History Management ---

export const saveSession = (session: SessionRecord): SessionRecord[] => {
  const history = getAllHistory(); // Get raw history
  const updated = [session, ...history];
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error("Failed to save history to localStorage", e);
  }
  return updated.filter(s => s.userId === session.userId); // Return only this user's history
};

// Internal helper to get all records
const getAllHistory = (): SessionRecord[] => {
  try {
    const item = localStorage.getItem(HISTORY_KEY);
    return item ? JSON.parse(item) : [];
  } catch (e) {
    console.error("Failed to load history from localStorage", e);
    return [];
  }
};

// Public method to get history for a specific user
export const getUserHistory = (userId: string): SessionRecord[] => {
  const all = getAllHistory();
  return all.filter(session => session.userId === userId);
};

export const clearUserHistory = (userId: string): SessionRecord[] => {
    const all = getAllHistory();
    const kept = all.filter(session => session.userId !== userId);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(kept));
    return [];
};