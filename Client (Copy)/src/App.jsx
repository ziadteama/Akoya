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
import AccountantSelling from "./components/AccountantSelling"; // Add this import
import UserRegistration from "./components/UserRegistration";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import "./App.css";

function App() {
  return (
    <>
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/admin" element={<AdminDashboard />} />

          {/* Accountant Dashboard with Nested Routes */}
          <Route path="/accountant" element={<AccountantDashboard />}>
            <Route path="accountant-reports" element={<AccountantReports />} />
            <Route path="accountant-scan" element={<AccountantScan />} />
            <Route path="accountant-categories" element={<AccountantCategories />} />
            <Route path="accountant-meals" element={<AccountantMeals/>} />
            <Route path="sell-tickets" element={<AccountantSelling />} /> {/* Add this route */}
            <Route path="register-user" element={<UserRegistration />} />
          </Route>

          {/* Cashier Dashboard - Single route, no nested routes, no sidebar */}
          <Route path="/cashier" element={<CashierDashboard />} />
          <Route path="/cashier/*" element={<CashierDashboard />} />

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
    </>
  );
}

export default App;
