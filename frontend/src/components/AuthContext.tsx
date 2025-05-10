// src/contexts/AuthContext.tsx
import { createContext, useState, useContext, ReactNode, useEffect } from 'react';

interface AuthContextType {
    isAuthenticated: boolean;
    token: string;
    username: string;
    login: (token: string, username: string) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [token, setToken] = useState('');
    const [username, setUsername] = useState('');

    useEffect(() => {
        // Check if user is already logged in
        const storedToken = localStorage.getItem('auth_token');
        const storedUsername = localStorage.getItem('username');

        if (storedToken && storedUsername) {
            setToken(storedToken);
            setUsername(storedUsername);
            setIsAuthenticated(true);

            // Validate the token with the API
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
                // If token is invalid, log out
                handleLogout();
            }
        } catch (err) {
            console.error('Error validating token:', err);
            // Don't logout on network error to allow offline usage
        }
    };

    const handleLogin = (newToken: string, newUsername: string) => {
        localStorage.setItem('auth_token', newToken);
        localStorage.setItem('username', newUsername);
        setToken(newToken);
        setUsername(newUsername);
        setIsAuthenticated(true);
    };

    const handleLogout = () => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('username');
        setToken('');
        setUsername('');
        setIsAuthenticated(false);
    };

    const contextValue: AuthContextType = {
        isAuthenticated,
        token,
        username,
        login: handleLogin,
        logout: handleLogout,
    };

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};