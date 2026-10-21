import { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkUser = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const { data } = await api.get('/auth/me');
                    setUser(data);
                } catch (error) {
                    localStorage.removeItem('token');
                }
            }
            setLoading(false);
        };

        checkUser();
    }, []);

    const refreshUser = async () => {
        const { data } = await api.get('/auth/me');
        setUser(data);
    };

    const login = async (identifier, password) => {
        const { data } = await api.post('/auth/login', { identifier, password });
        return data; // Returns { userId, email, requiresOtp: true }
    };

    const verifyOtp = async (userId, otp) => {
        const { data } = await api.post('/auth/verify-otp', { userId, otp });
        localStorage.setItem('token', data.token);
        await refreshUser(); // full profile incl. onboarding fields, not the login reply's subset
        return data; // includes mustChangePassword flag
    };

    const register = async (name, email, password) => {
        // After signup the user must confirm via email before they can log in.
        // No token is returned — caller should show a "check your email" screen.
        const { data } = await api.post('/auth/register', { name, email, password });
        return data;
    };

    const resendVerification = async (email) => {
        const { data } = await api.post('/auth/resend-verification', { email });
        return data;
    };

    const verifyEmail = async (token) => {
        const { data } = await api.post('/auth/verify-email', { token });
        return data;
    };

    const forgotPassword = async (email) => {
        const { data } = await api.post('/auth/forgot-password', { email });
        return data;
    };

    const resetPassword = async (email, otp, newPassword) => {
        const { data } = await api.post('/auth/reset-password', { email, otp, newPassword });
        return data;
    };

    // OAuth — Google returns an id_token (credential); we forward it to the
    // backend which verifies it and returns our session JWT. No OTP step.
    const googleLogin = async (credential) => {
        const { data } = await api.post('/auth/google', { credential });
        localStorage.setItem('token', data.token);
        await refreshUser();
        return data;
    };

    // Apple returns identityToken + (first sign-in only) the user's name.
    const appleLogin = async ({ identityToken, user: appleUser }) => {
        const { data } = await api.post('/auth/apple', { identityToken, user: appleUser });
        localStorage.setItem('token', data.token);
        await refreshUser();
        return data;
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, verifyOtp, register, verifyEmail, resendVerification, forgotPassword, resetPassword, googleLogin, appleLogin, logout, refreshUser }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
