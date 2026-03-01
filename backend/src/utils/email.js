import nodemailer from 'nodemailer';

// Create a transporter using Gmail SMTP
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
    }
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
