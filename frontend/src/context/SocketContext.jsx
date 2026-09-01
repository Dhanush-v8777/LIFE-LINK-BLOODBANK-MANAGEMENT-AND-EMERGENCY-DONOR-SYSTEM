/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import api from '../utils/api';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket] = useState(() => io('http://localhost:5000', {
    transports: ['websocket', 'polling']
  }));
  const [notifications, setNotifications] = useState([]);
  const [activeAlert, setActiveAlert] = useState(null);

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      return;
    }
    try {
      const res = await api.get('/notifications');
      if (res.data && res.data.success) {
        // Normalize DB fields for frontend (request_id -> requestId, request_type -> requestType)
        const formatted = (res.data.notifications || []).map(n => ({
          id: n.id,
          message: n.message,
          type: n.type,
          requestId: n.request_id || n.requestId,
          requestType: n.request_type || n.requestType,
          isRead: n.is_read || false,
          createdAt: n.created_at
        }));
        setNotifications(formatted);
      }
    } catch (err) {
      console.error('Failed to fetch notifications from DB:', err);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    // Listen for connection
    socket.on('connect', () => {
      console.log('Socket connected successfully:', socket.id);
    });

    return () => {
      socket.close();
    };
  }, [socket]);

  useEffect(() => {
    if (!socket) return;

    // Join rooms based on auth state
    if (user) {
      socket.emit('join', user.id);
      socket.emit('join_role', user.roleName);
      console.log(`Socket emitted room joins for user_${user.id} and role_${user.roleName}`);
    }

    // Standard notification listener
    const handleNotification = (data) => {
      console.log('Received notification from socket:', data);
      setNotifications((prev) => [
        {
          id: data.id || Date.now(),
          message: data.message,
          type: data.type,
          requestId: data.requestId || data.request_id,
          requestType: data.requestType || data.request_type,
          isRead: false,
          createdAt: new Date().toISOString()
        },
        ...prev
      ]);
      setActiveAlert(data);
      // Auto-clear alert after 6 seconds
      setTimeout(() => {
        setActiveAlert(null);
      }, 6000);
    };

    socket.on('notification', handleNotification);
    socket.on('new_blood_request', (data) => {
      if (user && ['Admin', 'Blood Bank Staff'].includes(user.roleName)) {
        handleNotification({
          message: `URGENT: New ${data.urgency} Request for ${data.bloodGroup} ${data.component}`,
          type: 'NewRequest',
          requestId: data.requestId,
          requestType: 'blood_request'
        });
      }
    });

    return () => {
      socket.off('notification', handleNotification);
      socket.off('new_blood_request');
    };
  }, [socket, user]);

  const clearAlert = () => setActiveAlert(null);

  const markNotificationRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  };

  const clearNotifications = async () => {
    try {
      await api.post('/notifications/clear');
      setNotifications([]);
    } catch (err) {
      console.error('Failed to clear notifications:', err);
      setNotifications([]);
    }
  };

  return (
    <SocketContext.Provider value={{ 
      socket, 
      notifications, 
      activeAlert, 
      clearAlert, 
      setNotifications, 
      fetchNotifications,
      markNotificationRead,
      clearNotifications 
    }}>
      {children}
      
      {/* Realtime Toast notification alert */}
      {activeAlert && (
        <div className="fixed bottom-5 right-5 z-50 animate-fade-in max-w-sm w-full bg-white dark:bg-slate-800 border-l-4 border-brand-600 rounded-r-lg shadow-2xl p-4 flex items-start space-x-3 pointer-events-auto">
          <div className="flex-1">
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Live Notification</p>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{activeAlert.message}</p>
          </div>
          <button 
            onClick={clearAlert}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
export default SocketContext;
