import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: any;
}

interface AuthContextType {
  user: User | null;
  business: any | null;
  setUser: (user: User | null) => void;
  setBusiness: (business: any | null) => void;
  hasPermission: (module: string, action: 'view' | 'add' | 'edit' | 'delete') => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [business, setBusiness] = useState<any | null>(null);

  const hasPermission = (module: string, action: 'view' | 'add' | 'edit' | 'delete') => {
    if (!user) return false;
    if (user.role === 'owner' || user.role === 'super_admin') return true;
    if (!user.permissions) return false;
    return !!user.permissions[module]?.[action];
  };

  return (
    <AuthContext.Provider value={{ user, business, setUser, setBusiness, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
