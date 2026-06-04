import React, { createContext, useContext, useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { User } from '../types';

interface AuthContextType {
  currentUser: any | null;
  userProfile: User | null;
  loading: boolean;
  logout: () => void;
  loginCustom: (userId: string) => void;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  userProfile: null,
  loading: true,
  logout: () => {},
  loginCustom: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    const userId = localStorage.getItem('customAuthUserId');
    if (userId) {
      try {
        const docRef = doc(db, 'users', userId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setCurrentUser({ uid: userId, email: docSnap.data().email });
          setUserProfile({ id: docSnap.id, ...docSnap.data() } as User);
        } else {
          localStorage.removeItem('customAuthUserId');
          setCurrentUser(null);
          setUserProfile(null);
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
      }
    } else {
      setCurrentUser(null);
      setUserProfile(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const loginCustom = (userId: string) => {
    setLoading(true);
    localStorage.setItem('customAuthUserId', userId);
    checkAuth();
  };

  const logout = () => {
    localStorage.removeItem('customAuthUserId');
    setCurrentUser(null);
    setUserProfile(null);
  };

  return (
    <AuthContext.Provider value={{ currentUser, userProfile, loading, logout, loginCustom }}>
      {children}
    </AuthContext.Provider>
  );
};

