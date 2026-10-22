import { api } from './client';
import type { AuthConfig, LoginResult, SessionResult, User } from './types';

// Thin wrappers over /api/auth — request shapes match the backend controllers.
export const getAuthConfig = async () => (await api.get<AuthConfig>('/auth/config')).data;
export const login = async (identifier: string, password: string) =>
    (await api.post<LoginResult>('/auth/login', { identifier, password })).data;
export const verifyOtp = async (userId: string, otp: string) =>
    (await api.post<SessionResult>('/auth/verify-otp', { userId, otp })).data;
export const register = async (name: string, email: string, password: string) =>
    (await api.post<{ message: string; email: string }>('/auth/register', { name, email, password })).data;
export const forgotPassword = async (email: string) =>
    (await api.post<{ message: string }>('/auth/forgot-password', { email })).data;
export const resetPassword = async (email: string, otp: string, newPassword: string) =>
    (await api.post<{ message: string }>('/auth/reset-password', { email, otp, newPassword })).data;
export const firstPassword = async (newPassword: string) =>
    (await api.put<{ message: string }>('/auth/first-password', { newPassword })).data;
export const googleAuth = async (credential: string) =>
    (await api.post<SessionResult>('/auth/google', { credential })).data;
export const getMe = async () => (await api.get<User>('/auth/me')).data;
export const setPin = async (pin: string) => (await api.put('/auth/pin', { pin })).data;
export const verifyPin = async (pin: string) => (await api.post('/auth/verify-pin', { pin })).data;
