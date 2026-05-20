import nodemailer from 'nodemailer';

// Create a transporter using Gmail SMTP.
// Gmail App Passwords are displayed with spaces in the Google UI — strip them,
// otherwise SMTP AUTH silently hangs for ~2 minutes and then 535 fails.
const gmailPass = (process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '');

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: process.env.GMAIL_USER,
        pass: gmailPass
    },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000
});

/**
 * Sends an OTP email to the user.
 * @param {string} to - Recipient email address
 * @param {string} otp - The 6-digit OTP code
 */
export const sendOtpEmail = async (to, otp) => {
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
        console.warn('⚠️ GMAIL_USER or GMAIL_APP_PASSWORD is not set in .env. Email will not be sent.');
        console.warn(`[DEV MODE] Generated OTP for ${to} is: ${otp}`);
        return;
    }

    const mailOptions = {
        from: `"Finance Manager" <${process.env.GMAIL_USER}>`,
        to,
        subject: 'Your Finance Manager Login Code',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaec; border-radius: 10px;">
                <h2 style="color: #064fcc; text-align: center;">Finance Manager</h2>
                <p style="font-size: 16px; color: #333;">Hello,</p>
                <p style="font-size: 16px; color: #333;">Please use the verification code below to securely log in to your account. This code will expire in <strong>10 minutes</strong>.</p>
                <div style="text-align: center; margin: 30px 0;">
                    <span style="display: inline-block; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1f2937; background-color: #f3f4f6; padding: 15px 25px; border-radius: 8px;">
                        ${otp}
                    </span>
                </div>
                <p style="font-size: 14px; color: #666; text-align: center;">If you didn't request this code, you can safely ignore this email.</p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`OTP email sent successfully to ${to}`);
    } catch (error) {
        console.error('Error sending OTP email:', error);
        throw new Error('Failed to send OTP email');
    }
};

/**
 * Sends an account verification email after signup.
 * @param {string} to - Recipient email address
 * @param {string} name - Recipient display name
 * @param {string} token - The opaque verification token
 */
export const sendVerificationEmail = async (to, name, token) => {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const verifyLink = `${frontendUrl}/verify-email?token=${encodeURIComponent(token)}`;

    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
        console.warn('⚠️ GMAIL_USER or GMAIL_APP_PASSWORD not set — verification email will not be sent.');
        console.warn(`[DEV MODE] Verification link for ${to}: ${verifyLink}`);
        return;
    }

    const mailOptions = {
        from: `"FSWealth Axis" <${process.env.GMAIL_USER}>`,
        to,
        subject: 'Confirm your FSWealth Axis account',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #eaeaec; border-radius: 10px;">
                <h2 style="color: #059669; text-align: center; margin-bottom: 8px;">FSWealth Axis</h2>
                <p style="text-align: center; color: #6b7280; margin-top: 0;">Personal finance, sorted.</p>
                <p style="font-size: 16px; color: #111827;">Hi ${name || 'there'},</p>
                <p style="font-size: 15px; color: #374151; line-height: 1.6;">
                    Welcome! Please confirm your email address to activate your account. This link will expire in <strong>24 hours</strong>.
                </p>
                <div style="text-align: center; margin: 32px 0;">
                    <a href="${verifyLink}"
                       style="display: inline-block; padding: 14px 32px; background-color: #059669; color: #ffffff;
                              text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">
                        Confirm my email
                    </a>
                </div>
                <p style="font-size: 13px; color: #6b7280; word-break: break-all;">
                    Or paste this URL into your browser:<br/>
                    <a href="${verifyLink}" style="color: #059669;">${verifyLink}</a>
                </p>
                <hr style="border: none; border-top: 1px solid #eaeaec; margin: 24px 0;" />
                <p style="font-size: 13px; color: #9ca3af; text-align: center;">
                    Didn't sign up? You can safely ignore this email.
                </p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Verification email sent to ${to}`);
    } catch (error) {
        console.error('Error sending verification email:', error);
        throw new Error('Failed to send verification email');
    }
};

/**
 * Sends a reminder email to a person about pending dues.
 * @param {string} to - Recipient email address
 * @param {string} personName - Name of the recipient
 * @param {number} netBalance - The pending amount to be collected
 */
export const sendReminderEmail = async (to, personName, netBalance) => {
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
        console.warn('⚠️ GMAIL_USER or GMAIL_APP_PASSWORD is not set in .env. Reminder email will not be sent.');
        console.warn(`[DEV MODE] Simulated reminder would have sent to ${to} for Rs. ${netBalance}`);
        return;
    }

    const mailOptions = {
        from: `"Finance Manager" <${process.env.GMAIL_USER}>`,
        to,
        subject: 'Pending Dues Reminder - Finance Manager',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaec; border-radius: 10px;">
                <h2 style="color: #059669; text-align: center;">Dues Ledger Reminder</h2>
                <p style="font-size: 16px; color: #333;">Hello <strong>${personName}</strong>,</p>
                <p style="font-size: 16px; color: #333;">This is a courteous reminder that there is a pending balance recorded in the Finance Manager ledger.</p>
                <div style="text-align: center; margin: 30px 0;">
                    <span style="display: block; font-size: 14px; color: #666; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 1px;">Outstanding Balance</span>
                    <span style="display: inline-block; font-size: 32px; font-weight: bold; color: #10b981; background-color: #f0fdf4; padding: 15px 30px; border-radius: 8px; border: 1px solid #a7f3d0;">
                        Rs. ${netBalance.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </span>
                </div>
                <p style="font-size: 14px; color: #666; text-align: center; margin-top: 30px;">Thank you!</p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Reminder email sent successfully to ${to}`);
    } catch (error) {
        console.error('Error sending reminder email:', error);
        throw new Error('Failed to send reminder email');
    }
};

/**
 * Sends a weekly or manual dashboard summary email to the user.
 * @param {string} to - Recipient email address
 * @param {string} userName - Name of the recipient
 * @param {object} metrics - Dashboard metrics object
 */
export const sendSummaryEmail = async (to, userName, metrics) => {
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
        console.warn('⚠️ GMAIL_USER or GMAIL_APP_PASSWORD is not set in .env. Summary email will not be sent.');
        console.warn(`[DEV MODE] Simulated summary would have sent to ${to}`);
        return;
    }

    const formatCurrency = (amount) => {
        return `Rs. ${Number(amount || 0).toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    };

    const mailOptions = {
        from: `"Finance Manager" <${process.env.GMAIL_USER}>`,
        to,
        subject: 'Your Finance Manager Summary',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaec; border-radius: 10px;">
                <h2 style="color: #4f46e5; text-align: center;">Finance Manager Summary</h2>
                <p style="font-size: 16px; color: #333;">Hello <strong>${userName}</strong>,</p>
                <p style="font-size: 16px; color: #333;">Here is your latest financial summary overview:</p>
                
                <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Net Worth Overview</h3>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <span style="color: #4b5563;">Total Net Worth:</span>
                        <strong style="color: #4f46e5; font-size: 18px;">${formatCurrency(metrics.netWorth)}</strong>
                    </div>
                </div>

                <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Key Balances</h3>
                    
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #f3f4f6;">
                        <span style="color: #4b5563;">Bank & Wallet Balance:</span>
                        <strong style="color: #1f2937;">${formatCurrency(metrics.totalBankBalance + metrics.totalWalletBalance)}</strong>
                    </div>
                    
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #f3f4f6;">
                        <span style="color: #4b5563;">Total Invested (Stocks & Funds):</span>
                        <strong style="color: #10b981;">${formatCurrency(metrics.totalInvestments)}</strong>
                    </div>

                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #f3f4f6;">
                        <span style="color: #4b5563;">Ledger Receivables (To Receive):</span>
                        <strong style="color: #10b981;">${formatCurrency(metrics.totalReceivable)}</strong>
                    </div>

                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <span style="color: #4b5563;">Ledger Payables (To Pay):</span>
                        <strong style="color: #ef4444;">${formatCurrency(metrics.totalPayable)}</strong>
                    </div>
                </div>

                <p style="font-size: 14px; color: #666; text-align: center; margin-top: 30px;">
                    Log in to your dashboard to view more detailed insights and track your financial journey.
                </p>
                <p style="font-size: 12px; color: #9ca3af; text-align: center; margin-top: 10px;">
                    Finance Manager Automated Summary
                </p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Summary email sent successfully to ${to}`);
    } catch (error) {
        console.error('Error sending summary email:', error);
        throw new Error('Failed to send summary email');
    }
};

