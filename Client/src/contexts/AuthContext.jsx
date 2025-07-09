import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = () => {
    try {
      const token = localStorage.getItem('authToken');
      const userRole = localStorage.getItem('userRole');
      const userName = localStorage.getItem('userName');
      const userId = localStorage.getItem('userId');
      
      if (token && userRole) {
        setUser({
          id: userId,
          token,
          role: userRole,
          name: userName
        });
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = (userData) => {
    localStorage.setItem('authToken', userData.token);
    localStorage.setItem('userRole', userData.role);
    localStorage.setItem('userName', userData.name);
    localStorage.setItem('userId', userData.id);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userName');
    localStorage.removeItem('userId');
    setUser(null);
  };

  const isAdmin = () => {
    return user?.role === 'admin';
  };

  const isAuthenticated = () => {
    return !!user && !!user.token;
  };

  const value = {
    user,
    loading,
    login,
    logout,
    isAdmin,
    isAuthenticated,
    checkAuthStatus
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};