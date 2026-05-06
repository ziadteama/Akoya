import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Login from "./pages/SignIn";
import AdminDashboard from "./pages/AdminDashboard";
import CashierDashboard from "./pages/CashierDashboard";
import AccountantDashboard from "./pages/AccountantDashboard";
import AccountantReports from "./components/AccountantReports";
import AccountantScan from "./components/AccountantScan";
import AccountantCategories from "./components/AccountantCategories";
import AccountantMeals from "./components/AccountantMeals";
import AccountantSelling from "./components/AccountantSelling";
import CreditManagement from "./components/CreditManagement";
import UserRegistration from "./components/UserRegistration";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./contexts/AuthContext"; // ✅ Add this import
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import "./App.css";
import FakeLanding from "./pages/FakeLanding";

function App() {
  return (
    <AuthProvider> {/* ✅ Wrap everything with AuthProvider */}
      <Router>
        <Routes>
          {/* Public route: Fake Blog Landing */}
          <Route path="/" element={<FakeLanding />} />
          {/* Real login page (secret) */}
          <Route path="/signin" element={<Login />} />

          {/* Admin Dashboard - Admin only */}
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute adminOnly={true}>
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />

          {/* Accountant Dashboard with Nested Routes - Accountant and Admin only */}
          <Route 
            path="/accountant" 
            element={
              <ProtectedRoute allowedRoles={['accountant', 'admin']}>
                <AccountantDashboard />
              </ProtectedRoute>
            }
          >
            <Route 
              path="accountant-reports" 
              element={
                <ProtectedRoute allowedRoles={['accountant', 'admin']}>
                  <AccountantReports />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="accountant-scan" 
              element={
                <ProtectedRoute allowedRoles={['accountant', 'admin']}>
                  <AccountantScan />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="accountant-categories" 
              element={
                <ProtectedRoute allowedRoles={['accountant', 'admin']}>
                  <AccountantCategories />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="accountant-meals" 
              element={
                <ProtectedRoute allowedRoles={['accountant', 'admin']}>
                  <AccountantMeals />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="sell-tickets" 
              element={
                <ProtectedRoute allowedRoles={['accountant', 'admin']}>
                  <AccountantSelling />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="credit-management" 
              element={
                <ProtectedRoute allowedRoles={['accountant', 'admin']}>
                  <CreditManagement />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="register-user" 
              element={
                <ProtectedRoute allowedRoles={['accountant', 'admin']}>
                  <UserRegistration />
                </ProtectedRoute>
              } 
            />
          </Route>

          {/* Cashier Dashboard - Cashier and Admin only */}
          <Route 
            path="/cashier" 
            element={
              <ProtectedRoute allowedRoles={['cashier', 'admin']}>
                <CashierDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/cashier/*" 
            element={
              <ProtectedRoute allowedRoles={['cashier', 'admin']}>
                <CashierDashboard />
              </ProtectedRoute>
            } 
          />

          {/* Redirect unknown routes to login */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
      
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </AuthProvider>
  );
}

export default App;