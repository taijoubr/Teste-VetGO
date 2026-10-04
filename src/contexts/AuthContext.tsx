import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isVet: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<User>;
  loginWithGoogle: (payload: { email: string; name?: string; first_name?: string; last_name?: string; picture?: string; credential?: string }) => Promise<{ user: User; is_new?: boolean }>;
  register: (data: any) => Promise<{ user: User; email_sent?: boolean; dev_code?: string }>;
  verifyEmail: (code: string, email?: string) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  switchDemoUser: (role: 'VET' | 'ADMIN') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const initAuth = async () => {
    try {
      const currentUser = await api.getCurrentUser();
      setUser(currentUser);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initAuth();
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    setIsLoading(true);
    try {
      const { user: loggedInUser } = await api.login(email, password);
      setUser(loggedInUser);
      return loggedInUser;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async (payload: {
    email: string;
    name?: string;
    first_name?: string;
    last_name?: string;
    picture?: string;
    credential?: string;
  }): Promise<{ user: User; is_new?: boolean }> => {
    setIsLoading(true);
    try {
      const res = await api.loginWithGoogle(payload);
      setUser(res.user);
      return { user: res.user, is_new: res.is_new };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: any): Promise<{ user: User; email_sent?: boolean; dev_code?: string }> => {
    setIsLoading(true);
    try {
      const res = await api.register(data);
      setUser(res.user);
      return res;
    } finally {
      setIsLoading(false);
    }
  };

  const verifyEmail = async (code: string, email?: string): Promise<User> => {
    const targetEmail = email || user?.email;
    if (!targetEmail) throw new Error('E-mail não informado.');
    const res = await api.verifyEmail(targetEmail, code);
    setUser(res.user);
    return res.user;
  };

  const logout = () => {
    api.removeToken();
    localStorage.removeItem('vetgo_current_user');
    setUser(null);
  };

  const refreshUser = async () => {
    const updated = await api.getCurrentUser();
    setUser(updated);
  };

  const switchDemoUser = async (role: 'VET' | 'ADMIN') => {
    setIsLoading(true);
    try {
      if (role === 'VET') {
        const { user: vetUser } = await api.login('vetteste@gmail.com', 'Nikolas13');
        setUser(vetUser);
      } else {
        const { user: adminUser } = await api.login('ncodestechnologies@gmail.com', 'Taijou13!');
        setUser(adminUser);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        isVet: user?.role === 'VET',
        isAdmin: user?.role === 'ADMIN',
        login,
        loginWithGoogle,
        register,
        verifyEmail,
        logout,
        refreshUser,
        switchDemoUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
