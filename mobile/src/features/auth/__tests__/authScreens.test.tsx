import type { ReactElement } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { testQueryClient } from '../../../testing/queryClient';
import { AxiosError } from 'axios';
import * as auth from '../../../api/auth';
import { useSession } from '../../session/sessionStore';
import { signInWithGoogle } from '../google';
import { SignInScreen } from '../SignInScreen';
import { OtpScreen } from '../OtpScreen';
import { RegisterScreen } from '../RegisterScreen';
import { ForgotPasswordScreen, ResetPasswordScreen } from '../PasswordScreens';
import { FirstPasswordScreen } from '../FirstPasswordScreen';

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({ useRouter: () => mockRouter, useLocalSearchParams: () => mockParams }));
jest.mock('../../../api/auth');
jest.mock('../google', () => ({ configureGoogle: jest.fn(), signInWithGoogle: jest.fn() }));

const api = jest.mocked(auth);
const serverError = (message: string, status = 400) =>
    new AxiosError(message, 'ERR_BAD_REQUEST', undefined, {}, { data: { message }, status, statusText: '', headers: {}, config: {} as never });

const renderScreen = (ui: ReactElement) => render(
    <QueryClientProvider client={testQueryClient()}>{ui}</QueryClientProvider>,
);

const adoptSession = jest.fn();
const refreshUser = jest.fn();

beforeEach(() => {
    jest.clearAllMocks();
    mockParams = {};
    useSession.setState({ adoptSession, refreshUser });
    api.getAuthConfig.mockResolvedValue({ googleEnabled: true, googleClientId: 'web-client-id' });
});

describe('SignInScreen', () => {
    it('login → OTP screen with userId and email', async () => {
        api.login.mockResolvedValue({ userId: 'u1', email: 'ali@example.com', requiresOtp: true });
        await renderScreen(<SignInScreen />);
        await fireEvent.changeText(screen.getByLabelText('Email or username'), 'ali@example.com');
        await fireEvent.changeText(screen.getByLabelText('Password'), 'secret123');
        await fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
        await waitFor(() => expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/(auth)/otp', params: { userId: 'u1', email: 'ali@example.com' } }));
        expect(api.login).toHaveBeenCalledWith('ali@example.com', 'secret123');
    });

    it('shows the server message when login fails', async () => {
        api.login.mockRejectedValue(serverError('Invalid email or password'));
        await renderScreen(<SignInScreen />);
        await fireEvent.changeText(screen.getByLabelText('Email or username'), 'ali');
        await fireEvent.changeText(screen.getByLabelText('Password'), 'x');
        await fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
        expect(await screen.findByText('Invalid email or password')).toBeTruthy();
    });

    it('Google success posts the ID token and adopts the session', async () => {
        jest.mocked(signInWithGoogle).mockResolvedValue('google-id-token');
        api.googleAuth.mockResolvedValue({ token: 'jwt', user: { id: 'u1', role: 'user' } });
        await renderScreen(<SignInScreen />);
        await fireEvent.press(await screen.findByRole('button', { name: 'Continue with Google' }));
        await waitFor(() => expect(adoptSession).toHaveBeenCalledWith('jwt', { id: 'u1', role: 'user' }));
        expect(api.googleAuth).toHaveBeenCalledWith('google-id-token');
    });

    it('Google cancelled → nothing happens, no error shown', async () => {
        jest.mocked(signInWithGoogle).mockResolvedValue(null);
        await renderScreen(<SignInScreen />);
        await fireEvent.press(await screen.findByRole('button', { name: 'Continue with Google' }));
        await waitFor(() => expect(signInWithGoogle).toHaveBeenCalled());
        expect(api.googleAuth).not.toHaveBeenCalled();
        expect(screen.queryByTestId('form-error')).toBeNull();
    });

    it('hides Google when the server has no Google client', async () => {
        api.getAuthConfig.mockResolvedValue({ googleEnabled: false, googleClientId: null });
        await renderScreen(<SignInScreen />);
        await waitFor(() => expect(api.getAuthConfig).toHaveBeenCalled());
        expect(screen.queryByRole('button', { name: 'Continue with Google' })).toBeNull();
    });

    it('links to register and forgot password', async () => {
        await renderScreen(<SignInScreen />);
        await fireEvent.press(screen.getByRole('button', { name: 'Create an account' }));
        await fireEvent.press(screen.getByRole('button', { name: 'Forgot password?' }));
        expect(mockRouter.push).toHaveBeenCalledWith('/(auth)/register');
        expect(mockRouter.push).toHaveBeenCalledWith('/(auth)/forgot-password');
    });
});

describe('OtpScreen', () => {
    beforeEach(() => { mockParams = { userId: 'u1', email: 'ali@example.com' }; });

    it('a correct code adopts the session', async () => {
        api.verifyOtp.mockResolvedValue({ token: 'jwt', user: { id: 'u1', role: 'user' } });
        await renderScreen(<OtpScreen />);
        expect(screen.getByText(/ali@example.com/)).toBeTruthy();
        await fireEvent.changeText(screen.getByLabelText('6-digit code'), '123456');
        await fireEvent.press(screen.getByRole('button', { name: 'Verify' }));
        await waitFor(() => expect(adoptSession).toHaveBeenCalledWith('jwt', { id: 'u1', role: 'user' }));
        expect(api.verifyOtp).toHaveBeenCalledWith('u1', '123456');
    });

    it('a wrong code shows the server message', async () => {
        api.verifyOtp.mockRejectedValue(serverError('Invalid or expired OTP'));
        await renderScreen(<OtpScreen />);
        await fireEvent.changeText(screen.getByLabelText('6-digit code'), '000000');
        await fireEvent.press(screen.getByRole('button', { name: 'Verify' }));
        expect(await screen.findByText('Invalid or expired OTP')).toBeTruthy();
    });

    it('Verify needs all 6 digits', async () => {
        await renderScreen(<OtpScreen />);
        await fireEvent.changeText(screen.getByLabelText('6-digit code'), '123');
        expect(screen.getByRole('button', { name: 'Verify' })).toBeDisabled();
    });

    it('can resend the code', async () => {
        api.resendOtp.mockResolvedValue({ message: 'sent' });
        await renderScreen(<OtpScreen />);
        await fireEvent.press(screen.getByRole('button', { name: 'Send a new code' }));
        await waitFor(() => expect(api.resendOtp).toHaveBeenCalledWith('u1'));
        expect(await screen.findByText('A new code is on its way.')).toBeTruthy();
    });
});

describe('RegisterScreen', () => {
    it('shows "check your email" after signing up', async () => {
        api.register.mockResolvedValue({ message: 'ok', email: 'sara@example.com' });
        await renderScreen(<RegisterScreen />);
        await fireEvent.changeText(screen.getByLabelText('Full name'), 'Sara Ahmed');
        await fireEvent.changeText(screen.getByLabelText('Email'), 'sara@example.com');
        await fireEvent.changeText(screen.getByLabelText('Password'), 'longpassword');
        await fireEvent.press(screen.getByRole('button', { name: 'Create account' }));
        expect(await screen.findByText('Check your email')).toBeTruthy();
        expect(api.register).toHaveBeenCalledWith('Sara Ahmed', 'sara@example.com', 'longpassword');
    });
});

describe('Password reset', () => {
    it('forgot password sends the code and opens the reset screen', async () => {
        api.forgotPassword.mockResolvedValue({ message: 'sent' });
        await renderScreen(<ForgotPasswordScreen />);
        await fireEvent.changeText(screen.getByLabelText('Email'), 'ali@example.com');
        await fireEvent.press(screen.getByRole('button', { name: 'Send code' }));
        await waitFor(() => expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/(auth)/reset-password', params: { email: 'ali@example.com' } }));
    });

    it('reset password sets the new password and returns to sign in', async () => {
        mockParams = { email: 'ali@example.com' };
        api.resetPassword.mockResolvedValue({ message: 'ok' });
        await renderScreen(<ResetPasswordScreen />);
        await fireEvent.changeText(screen.getByLabelText('6-digit code'), '123456');
        await fireEvent.changeText(screen.getByLabelText('New password'), 'newpassword1');
        await fireEvent.press(screen.getByRole('button', { name: 'Reset password' }));
        await waitFor(() => expect(api.resetPassword).toHaveBeenCalledWith('ali@example.com', '123456', 'newpassword1'));
        expect(mockRouter.replace).toHaveBeenCalledWith('/(auth)/sign-in');
    });
});

describe('FirstPasswordScreen', () => {
    it('passwords must match', async () => {
        await renderScreen(<FirstPasswordScreen />);
        await fireEvent.changeText(screen.getByLabelText('New password'), 'newpassword1');
        await fireEvent.changeText(screen.getByLabelText('Confirm password'), 'different');
        await fireEvent.press(screen.getByRole('button', { name: 'Save password' }));
        expect(await screen.findByText("Passwords don't match")).toBeTruthy();
        expect(api.firstPassword).not.toHaveBeenCalled();
    });

    it('saves the password then reloads the user', async () => {
        api.firstPassword.mockResolvedValue({ message: 'ok' });
        await renderScreen(<FirstPasswordScreen />);
        await fireEvent.changeText(screen.getByLabelText('New password'), 'newpassword1');
        await fireEvent.changeText(screen.getByLabelText('Confirm password'), 'newpassword1');
        await fireEvent.press(screen.getByRole('button', { name: 'Save password' }));
        await waitFor(() => expect(refreshUser).toHaveBeenCalled());
        expect(api.firstPassword).toHaveBeenCalledWith('newpassword1');
    });
});
