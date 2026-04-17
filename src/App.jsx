import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import Dashboard from './pages/Dashboard';
import Expenses from './pages/Expenses';
import Delivery from './pages/Delivery';
import Earnings from './pages/Earnings';
import Reports from './pages/Reports';
import Analytics from './pages/Analytics';
import Customers from './pages/Customers';
import Maps from './pages/Maps';
import Checklist from './pages/Checklist';
import Settings from './pages/Settings';
import Calculator from './pages/Calculator';
import Management from './pages/Management';
import Profiles from './pages/Profiles';
import Onboarding from './pages/Onboarding';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return <div className="h-screen w-screen bg-[#0a0c10] flex items-center justify-center text-primary">Loading...</div>;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

function AppContent() {
  return (
    <Routes>
      <Route path="/login" element={<Onboarding />} />
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="delivery" element={<Delivery />} />
        <Route path="earnings" element={<Earnings />} />
        <Route path="reports" element={<Reports />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="checklist" element={<Checklist />} />
        <Route path="customers" element={<Customers />} />
        <Route path="maps" element={<Maps />} />
        <Route path="calculator" element={<Calculator />} />
        <Route path="settings" element={<Settings />} />
        <Route path="management" element={<Management />} />
        <Route path="profiles" element={<Profiles />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <ToastProvider>
            <AppContent />
          </ToastProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
