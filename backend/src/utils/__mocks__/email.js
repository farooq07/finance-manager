// Mirrors every export of ../email.js — ESM mocks must provide each named
// import a module under test uses, or the test file fails to load.
export const sendOtpEmail = async () => Promise.resolve();
export const sendVerificationEmail = async () => Promise.resolve();
export const sendReminderEmail = async () => Promise.resolve();
export const sendSummaryEmail = async () => Promise.resolve();
export const sendBillReminderEmail = async () => Promise.resolve();
