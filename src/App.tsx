import { useEffect } from "react";
import { Routes, Route, useLocation, useNavigate, Navigate } from "react-router";
import AppLayout from "./components/layout/AppLayout";
import HomePage from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Wallets from "./pages/Wallets";
import Tickets from "./pages/Tickets";
import CRM from "./pages/CRM";
import CustomerDetail from "./pages/CustomerDetail";
import Invoices from "./pages/Invoices";
import Receivables from "./pages/Receivables";
import Loans from "./pages/Loans";
import Deposits from "./pages/Deposits";
import PaymentActivation from "./pages/PaymentActivation";
import PaymentLocations from "./pages/PaymentLocations";
import Suppliers from "./pages/Suppliers";
import SupplierDetail from "./pages/SupplierDetail";
import Payables from "./pages/Payables";
import ExchangeRates from "./pages/ExchangeRates";
import BankReconciliation from "./pages/BankReconciliation";
import Reports from "./pages/Reports";
import Documents from "./pages/Documents";
import Expenses from "./pages/Expenses";
import Accounting from "./pages/Accounting";
import AIAssistant from "./pages/AIAssistant";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import Register from "./pages/Register";
import RegisterSuccess from "./pages/RegisterSuccess";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import { useAuth } from "@/hooks/useAuth";
import RequireRouteAccess from "@/components/auth/RequireRouteAccess";
import { hasActiveSubscription } from "@/lib/subscription";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn, loading } = useAuth();

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      navigate("/login", { replace: true, state: { from: location.pathname } });
    }
  }, [navigate, location.pathname, loading, isLoggedIn]);

  if (loading || !isLoggedIn) return null;
  return <>{children}</>;
}

function RequireSuperAdmin({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoggedIn, loading } = useAuth();

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      navigate("/login", { replace: true, state: { from: location.pathname } });
      return;
    }
    if (!loading && user?.role !== "super_admin") {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate, location.pathname, loading, isLoggedIn, user]);

  if (loading || !isLoggedIn || user?.role !== "super_admin") return null;
  return <>{children}</>;
}

function RedirectIfAuth({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { isLoggedIn, loading, user } = useAuth();

  useEffect(() => {
    if (!loading && isLoggedIn) {
      navigate(hasActiveSubscription(user) ? "/dashboard" : "/payment-activation", { replace: true });
    }
  }, [navigate, loading, isLoggedIn, user]);

  if (loading || isLoggedIn) return null;
  return <>{children}</>;
}

function RequireActiveSubscription({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!hasActiveSubscription(user)) {
    return <Navigate to="/payment-activation" replace />;
  }
  return <>{children}</>;
}

function ProtectedPage({
  children,
  requireActiveSubscription = true,
}: {
  children: React.ReactNode;
  requireActiveSubscription?: boolean;
}) {
  return (
    <RequireAuth>
      {requireActiveSubscription ? (
        <RequireActiveSubscription>
          <RequireRouteAccess>
            <AppLayout>{children}</AppLayout>
          </RequireRouteAccess>
        </RequireActiveSubscription>
      ) : (
        <RequireRouteAccess>
          <AppLayout>{children}</AppLayout>
        </RequireRouteAccess>
      )}
    </RequireAuth>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<RedirectIfAuth><Login /></RedirectIfAuth>} />
      <Route path="/register" element={<RedirectIfAuth><Register /></RedirectIfAuth>} />
      <Route path="/register/success" element={<RegisterSuccess />} />
      <Route path="/dashboard" element={<ProtectedPage><Dashboard /></ProtectedPage>} />
      <Route path="/wallets" element={<ProtectedPage><Wallets /></ProtectedPage>} />
      <Route path="/tickets" element={<ProtectedPage><Tickets /></ProtectedPage>} />
      <Route path="/crm" element={<ProtectedPage><CRM /></ProtectedPage>} />
      <Route path="/crm/customers/:id" element={<ProtectedPage><CustomerDetail /></ProtectedPage>} />
      <Route path="/invoices" element={<ProtectedPage><Invoices /></ProtectedPage>} />
      <Route path="/receivables" element={<ProtectedPage><Receivables /></ProtectedPage>} />
      <Route path="/loans" element={<ProtectedPage><Loans /></ProtectedPage>} />
      <Route path="/deposits" element={<ProtectedPage><Deposits /></ProtectedPage>} />
      <Route path="/payment-locations" element={<ProtectedPage><PaymentLocations /></ProtectedPage>} />
      <Route path="/suppliers" element={<ProtectedPage><Suppliers /></ProtectedPage>} />
      <Route path="/suppliers/:id" element={<ProtectedPage><SupplierDetail /></ProtectedPage>} />
      <Route path="/payables" element={<ProtectedPage><Payables /></ProtectedPage>} />
      <Route path="/exchange-rates" element={<ProtectedPage><ExchangeRates /></ProtectedPage>} />
      <Route path="/bank-reconciliation" element={<ProtectedPage><BankReconciliation /></ProtectedPage>} />
      <Route path="/reports" element={<ProtectedPage><Reports /></ProtectedPage>} />
      <Route path="/documents" element={<ProtectedPage><Documents /></ProtectedPage>} />
      <Route path="/expenses" element={<ProtectedPage><Expenses /></ProtectedPage>} />
      <Route path="/accounting" element={<ProtectedPage><Accounting /></ProtectedPage>} />
      <Route path="/ai" element={<ProtectedPage><AIAssistant /></ProtectedPage>} />
      <Route path="/payment-activation" element={<ProtectedPage requireActiveSubscription={false}><PaymentActivation /></ProtectedPage>} />
      <Route path="/settings" element={<ProtectedPage><Settings /></ProtectedPage>} />
      <Route
        path="/admin"
        element={
          <RequireSuperAdmin>
            <AppLayout><Admin /></AppLayout>
          </RequireSuperAdmin>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
