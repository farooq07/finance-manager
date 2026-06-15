import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from './components/ui/sonner';
import { ConfirmDialogProvider } from './components/ui/confirm-dialog';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PinProvider } from './context/PinContext';
import PinGate from './components/PinGate';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import OTPVerification from './pages/OTPVerification';
import VerifyEmail from './pages/VerifyEmail';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Expenses from './pages/Expenses';
import MutualFunds from './pages/MutualFunds';
import Stocks from './pages/Stocks';
import StockDetail from './pages/StockDetail';
import DuesLedger from './pages/DuesLedger';
import Accounts from './pages/Accounts';
import BankDetail from './pages/BankDetail';
import WalletDetail from './pages/WalletDetail';
import Settings from './pages/Settings';
import Users from './pages/Users';
import Reports from './pages/Reports';
import DesignSystem from './pages/DesignSystem';
import Personal from './pages/Personal';
import RolesManagement from './pages/RolesManagement';
import BeneficiaryDetail from './pages/BeneficiaryDetail';
import ChangeFirstPassword from './pages/ChangeFirstPassword';
import AiAssistant from './pages/AiAssistant';
import Help from './pages/Help';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
// Insights and Expenses are now the same merged Spending page.
import Insights from './pages/Expenses';
// Net Worth is now folded into the merged Dashboard page.
import NetWorth from './pages/Dashboard';
import DebtDetail from './pages/DebtDetail';
import Ledger from './pages/Ledger';


const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/welcome" replace />;
  if (user.must_change_password) return <Navigate to="/change-password" replace />;
  return children;
};

const AdminRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!['admin', 'super.admin'].includes(user?.role)) return <Navigate to="/" replace />;
  return children;
};

const PublicRoute = ({ children }) => {
  const { user } = useAuth();
  if (user) return <Navigate to="/" replace />;
  return children;
};

function App() {
  return (
    <AuthProvider>
      <PinProvider>
        <ConfirmDialogProvider>
        <Router>
          <Toaster position="bottom-center" richColors theme="system" />
          <PinGate />
          <Routes>
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
            <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
            <Route path="/verify-otp" element={<PublicRoute><OTPVerification /></PublicRoute>} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/welcome" element={<PublicRoute><Landing /></PublicRoute>} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/change-password" element={<ChangeFirstPassword />} />

            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="expenses" element={<Expenses />} />
              <Route path="mutual-funds" element={<MutualFunds />} />
              <Route path="stocks" element={<Stocks />} />
              <Route path="stocks/:id" element={<StockDetail />} />
              <Route path="ledger" element={<Ledger />} />
              {/* Legacy redirects — Dues & Debts merged into Ledger */}
              <Route path="dues" element={<Navigate to="/ledger?tab=people" replace />} />
              <Route path="debts" element={<Navigate to="/ledger?tab=loans" replace />} />
              <Route path="personal" element={<Personal />} />
              {/* Legacy redirects */}
              <Route path="rents" element={<Navigate to="/personal?tab=rent" replace />} />
              <Route path="zakat" element={<Navigate to="/personal?tab=zakat" replace />} />
              <Route path="assets" element={<Navigate to="/personal?tab=assets" replace />} />
              <Route path="psx-engine" element={<Stocks />} />
              <Route path="accounts" element={<Accounts />} />
              <Route path="banks/:id" element={<BankDetail />} />
              <Route path="wallets" element={<Accounts />} />
              <Route path="wallets/:id" element={<WalletDetail />} />
              <Route path="settings" element={<Settings />} />
              <Route path="users" element={<AdminRoute><Users /></AdminRoute>} />
              <Route path="roles" element={<AdminRoute><RolesManagement /></AdminRoute>} />
              <Route path="reports" element={<Reports />} />
              <Route path="insights" element={<Insights />} />
              <Route path="net-worth" element={<NetWorth />} />
              {/* Bills page removed — overlap with Expenses. Backend /api/recurring kept intact. */}
              <Route path="bills" element={<Navigate to="/expenses" replace />} />
              <Route path="debts/:id" element={<DebtDetail />} />
              <Route path="gold" element={<Navigate to="/personal?tab=gold" replace />} />
              <Route path="design-system" element={<DesignSystem />} />
              <Route path="beneficiaries" element={<Navigate to="/accounts?tab=beneficiaries" replace />} />
              <Route path="beneficiaries/:id" element={<BeneficiaryDetail />} />
              <Route path="assistant" element={<AiAssistant />} />
              <Route path="help" element={<Help />} />
            </Route>
          </Routes>
        </Router>
        </ConfirmDialogProvider>
      </PinProvider>
    </AuthProvider>
  );
}

export default App;
