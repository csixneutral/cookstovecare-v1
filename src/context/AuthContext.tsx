import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserRole, UserSession } from '../types';
import { authApi } from '../services/authApi';

interface AuthContextType {
  session: UserSession | null;
  isLoading: boolean;
  login: (phoneNumber: string, password: string) => Promise<UserSession>;
  loginAsDemoRole: (role: UserRole) => Promise<UserSession>;
  logout: () => Promise<void>;
  updateProfile: (name: string, centerName?: string) => Promise<void>;
  clearCache: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY_SESSION = '@cookstovecare_user_session';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    loadSavedSession();
  }, []);

  const loadSavedSession = async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY_SESSION);
      if (raw) {
        const parsed = JSON.parse(raw) as UserSession;
        setSession(parsed);
      }
    } catch (e) {
      console.warn('Failed to load session from storage', e);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (phoneNumber: string, password: string): Promise<UserSession> => {
    const userSession = await authApi.login(phoneNumber, password);
    setSession(userSession);
    await AsyncStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(userSession));
    return userSession;
  };

  const loginAsDemoRole = async (role: UserRole): Promise<UserSession> => {
    let demoSession: UserSession;
    switch (role) {
      case UserRole.SUPERVISOR:
        demoSession = {
          userId: 2,
          phoneNumber: '9876543220',
          name: 'Amit Singh (Supervisor)',
          role: UserRole.SUPERVISOR,
          centerName: 'Central Supervisor Hub',
        };
        break;
      case UserRole.TECHNICIAN:
        demoSession = {
          userId: 3,
          phoneNumber: '9876543230',
          name: 'Vikram Yadav (Technician)',
          role: UserRole.TECHNICIAN,
          technicianId: 1,
        };
        break;
      case UserRole.FIELD_COORDINATOR:
        demoSession = {
          userId: 8,
          phoneNumber: '9876543240',
          name: 'Deepak Mishra (Coordinator)',
          role: UserRole.FIELD_COORDINATOR,
        };
        break;
      case UserRole.FIELD_OFFICER:
      default:
        demoSession = {
          userId: 1,
          phoneNumber: '9876543210',
          name: 'Rahul Kumar (Field Officer)',
          role: UserRole.FIELD_OFFICER,
          centerName: 'District Field Office',
        };
        break;
    }

    setSession(demoSession);
    await AsyncStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(demoSession));
    return demoSession;
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY_SESSION);
      setSession(null);
    } catch (e) {
      console.warn('Error during logout', e);
    }
  };

  const updateProfile = async (name: string, centerName?: string) => {
    if (!session) return;
    const updated: UserSession = {
      ...session,
      name,
      centerName,
    };
    setSession(updated);
    await AsyncStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(updated));
  };

  const clearCache = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const nonSessionKeys = keys.filter((k) => k !== STORAGE_KEY_SESSION);
      if (nonSessionKeys.length > 0) {
        await AsyncStorage.multiRemove(nonSessionKeys);
      }
    } catch (e) {
      console.warn('Error clearing cache', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        isLoading,
        login,
        loginAsDemoRole,
        logout,
        updateProfile,
        clearCache,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
