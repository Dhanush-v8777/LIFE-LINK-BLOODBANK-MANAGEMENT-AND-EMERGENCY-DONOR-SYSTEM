/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useContext } from 'react';
import api from '../utils/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('user');
      const savedToken = localStorage.getItem('token');
      if (savedUser && savedToken) {
        return JSON.parse(savedUser);
      }
    } catch (err) {
      console.error('Error parsing saved auth user:', err);
    }
    return null;
  });
  const [loading, setLoading] = useState(false);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data.success) {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        setUser(res.data.user);
        return { success: true };
      }
      return { success: false, message: res.data.message || 'Login failed' };
    } catch (error) {
      console.error('Login request error:', error);
      return { 
        success: false, 
        unverified: error.response?.data?.unverified || false,
        message: error.response?.data?.message || 'Invalid credentials' 
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const register = async (formData) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/register', formData);
      return res.data;
    } catch (error) {
      console.error('Registration API error:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Registration failed' 
      };
    } finally {
      setLoading(false);
    }
  };

  const getProfile = async () => {
    try {
      const res = await api.get('/auth/profile');
      return res.data;
    } catch (error) {
      console.error('Fetch profile API error:', error);
      throw error;
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const res = await api.put('/auth/profile', profileData);
      if (res.data.success) {
        // Refresh local user name if updated
        if (profileData.name) {
          const updated = { ...user, name: profileData.name };
          localStorage.setItem('user', JSON.stringify(updated));
          setUser(updated);
        }
      }
      return res.data;
    } catch (error) {
      console.error('Update profile API error:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Profile update failed' 
      };
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register, getProfile, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export default AuthContext;
