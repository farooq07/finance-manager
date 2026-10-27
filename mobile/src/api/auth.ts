import { api } from './client';
import type { AuthConfig, LoginResult, SessionResult, User } from './types';

// Thin wrappers over /api/auth — request shapes match the backend controllers.
export const getAuthConfig = async () => (await api.get<AuthConfig>('/auth/config')).data;
export const login = async (identifier: string, password: string) =>
    (await api.post<LoginResult>('/auth/login', { identifier, password })).data;
export const verifyOtp = async (userId: string, otp: string) =>
    (await api.post<SessionResult>('/auth/verify-otp', { userId, otp })).data;
export const resendOtp = async (userId: string) =>
    (await api.post<{ message: string }>('/auth/resend-otp', { userId })).data;
export const register = async (name: string, email: string, password: string) =>
    (await api.post<{ message: string; email: string }>('/auth/register', { name, email, password })).data;
export const forgotPassword = async (email: string) =>
    (await api.post<{ message: string }>('/auth/forgot-password', { email })).data;
export const resetPassword = async (email: string, otp: string, newPassword: string) =>
    (await api.post<{ message: string }>('/auth/reset-password', { email, otp, newPassword })).data;
// Changing the password signs out every other session; the reply carries a
// fresh token for this device.
export const firstPassword = async (newPassword: string) =>
    (await api.put<{ message: string; token?: string }>('/auth/first-password', { newPassword })).data;
export const googleAuth = async (credential: string) =>
    (await api.post<SessionResult>('/auth/google', { credential })).data;
export const getMe = async () => (await api.get<User>('/auth/me')).data;
export const setPin = async (pin: string) => (await api.put('/auth/pin', { pin })).data;
export const verifyPin = async (pin: string) => (await api.post('/auth/verify-pin', { pin })).data;

// Settings -------------------------------------------------------------------
export const changePin = async (currentPin: string, newPin: string) =>
    (await api.put('/auth/pin/change', { currentPin, newPin })).data;
/** Signs out every other device; returns a fresh token for this one (old tokens stop working). */
export const revokeOtherSessions = async () =>
    (await api.post<{ message: string; token: string }>('/auth/sessions/revoke-all')).data;
/** Deactivates the account and queues it for deletion. Password-less (Google) accounts need a sign-in in the last 10 minutes. */
export const requestAccountDeletion = async (password?: string) =>
    (await api.post<{ message: string }>('/users/me/deletion-request', { password })).data;
