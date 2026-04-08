import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import '@/App.css';
import Home from './components/Home';
import Login from './components/Login';
import LeaderDashboard from './components/LeaderDashboard';
import AdminDashboard from './components/AdminDashboard';
import { Toaster } from './components/ui/sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    
    if (token && role) {
      try {
        await axios.get(`${API}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setIsAuthenticated(true);
        setUserRole(role);
      } catch (error) {
        localStorage.clear();
        setIsAuthenticated(false);
        setUserRole(null);
      }
    }
    setLoading(false);
  };

  const handleLogin = (token, role, username, classId) => {
    localStorage.setItem('token', token);
    localStorage.setItem('role', role);
    localStorage.setItem('username', username);
    if (classId) localStorage.setItem('classId', classId);
    setIsAuthenticated(true);
    setUserRole(role);
    setShowLogin(false);
    setShowRegister(false);
  };

  const handleLogout = () => {
    localStorage.clear();
    setIsAuthenticated(false);
    setUserRole(null);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
      </div>
    );
  }

  // If authenticated, redirect to appropriate dashboard
  if (isAuthenticated) {
    return (
      <div className="App">
        <Toaster position="top-right" />
        <BrowserRouter>
          <Routes>
            <Route
              path="/"
              element={
                userRole === 'leader' ? (
                  <Navigate to="/leader" replace />
                ) : (
                  <Navigate to="/admin" replace />
                )
              }
            />
            <Route
              path="/leader"
              element={
                userRole === 'leader' ? (
                  <LeaderDashboard onLogout={handleLogout} />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />
            <Route
              path="/admin"
              element={
                (userRole === 'admin' || userRole === 'master') ? (
                  <AdminDashboard onLogout={handleLogout} userRole={userRole} />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />
          </Routes>
        </BrowserRouter>
      </div>
    );
  }

  // If showing login or register modal
  if (showLogin || showRegister) {
    return (
      <div className="App">
        <Toaster position="top-right" />
        <Login
          onLogin={handleLogin}
          initialMode={showRegister ? 'register' : 'login'}
          onClose={() => {
            setShowLogin(false);
            setShowRegister(false);
          }}
        />
      </div>
    );
  }

  // Show home page
  return (
    <div className="App">
      <Toaster position="top-right" />
      <Home
        onShowLogin={() => setShowLogin(true)}
        onShowRegister={() => setShowRegister(true)}
      />
    </div>
  );
}

export default App;
