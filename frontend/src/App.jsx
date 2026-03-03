import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from './components/ui/sonner';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PinProvider } from './context/PinContext';
import PinGate from './components/PinGate';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import OTPVerification from './pages/OTPVerification';
import Dashboard from './pages/Dashboard';
import Expenses from './pages/Expenses';
import MutualFunds from './pages/MutualFunds';
import Stocks from './pages/Stocks';
import DuesLedger from './pages/DuesLedger';
import RentTracker from './pages/RentTracker';
import Accounts from './pages/Accounts';
import BankDetail from './pages/BankDetail';
import Settings from './pages/Settings';
import Reports from './pages/Reports';
import DesignSystem from './pages/DesignSystem';


const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
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
        <Router>
          <Toaster position="bottom-center" richColors theme="system" />
          <PinGate />
          <Routes>
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
            <Route path="/verify-otp" element={<PublicRoute><OTPVerification /></PublicRoute>} />

            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="expenses" element={<Expenses />} />
              <Route path="mutual-funds" element={<MutualFunds />} />
              <Route path="stocks" element={<Stocks />} />
              <Route path="dues" element={<DuesLedger />} />
              <Route path="rents" element={<RentTracker />} />
              <Route path="psx-engine" element={<Stocks />} />
              <Route path="accounts" element={<Accounts />} />
              <Route path="banks/:id" element={<BankDetail />} />
              <Route path="settings" element={<Settings />} />
              <Route path="reports" element={<Reports />} />
              <Route path="design-system" element={<DesignSystem />} />
            </Route>
          </Routes>
        </Router>
      </PinProvider>
    </AuthProvider>
  );
}

export default App;
