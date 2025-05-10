// src/components/Header.tsx
import { useState, useEffect } from 'react';

import AuthModal from './AuthModel';
import UserDrawer from './UserDrawer';

const Header = () => {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isUserDrawerOpen, setIsUserDrawerOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [token, setToken] = useState('');

  // Check for existing auth on component mount
  useEffect(() => {
    const storedToken = localStorage.getItem('auth_token');
    const storedUsername = localStorage.getItem('username');

    if (storedToken && storedUsername) {
      setToken(storedToken);
      setUsername(storedUsername);
      setIsAuthenticated(true);

      // Validate token by fetching user details
      validateToken(storedToken);
    }
  }, []);

  const validateToken = async (storedToken: string) => {
    try {
      const response = await fetch(import.meta.env.VITE_API_URL + '/me/user/', {
        headers: {
          'Authorization': `Bearer ${storedToken}`
        }
      });

      if (!response.ok) {
        // Token invalid, clear auth
        handleLogout();
      }
    } catch (err) {
      console.error('Token validation error:', err);
      // Don't logout on network error to allow offline usage
    }
  };

  const handleAuthSuccess = (newToken: string, newUsername: string) => {
    setToken(newToken);
    setUsername(newUsername);
    setIsAuthenticated(true);
    window.location.reload();

  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('username');
    setToken('');
    setUsername('');
    setIsAuthenticated(false);
    setIsUserDrawerOpen(false);
    window.location.reload();
  };

  return (
    <header className="bg-gray-800 py-6 px-8 border-b border-purple-700 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="w-14 h-14 mr-4 relative">
            <div className="absolute inset-0 bg-purple-500 rounded-full opacity-50 animate-pulse"></div>
            <div className="absolute inset-1 bg-gray-800 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-purple-300">XIV DT Updater</h1>
            <p className="text-gray-400 text-sm">Dont we all love dawntrail?</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">


          {isAuthenticated ? (
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsUserDrawerOpen(true)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center space-x-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>{username}</span>
              </button>

              <button
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-white transition-colors"
                title="Logout"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-end space-y-2">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsLoginModalOpen(true)}
                  className="px-4 py-2 bg-purple-800 hover:bg-purple-900 text-white rounded-lg transition-colors"
                >
                  Login
                </button>

                <button
                  onClick={() => setIsRegisterModalOpen(true)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors border border-purple-800"
                >
                  Register
                </button>
              </div>
              <p className="text-xs text-gray-400 max-w-xs text-right">
                Register an account to save your conversions for 30 days and redownload them anytime.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Auth Modals */}
      <AuthModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        mode="login"
        onSuccess={handleAuthSuccess}
      />

      <AuthModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        mode="register"
        onSuccess={handleAuthSuccess}
      />

      {/* User Drawer */}
      <UserDrawer
        isOpen={isUserDrawerOpen}
        onClose={() => setIsUserDrawerOpen(false)}
        username={username}
        token={token}
      />
    </header>
  );
};

export default Header;