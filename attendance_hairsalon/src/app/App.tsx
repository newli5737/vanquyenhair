import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./components/LoginPage";
import Dashboard from "./components/Dashboard";
import CheckInPage from "./components/CheckInPage";
import AttendanceHistory from "./components/AttendanceHistory";
import ProfilePage from "./components/ProfilePage";
import AdminLoginPage from "./components/admin/AdminLoginPage";
import AdminDashboard from "./components/admin/AdminDashboard";
import StudentManagement from "./components/admin/StudentManagement";
import SessionManagement from "./components/admin/SessionManagement";
import AttendanceViewer from "./components/admin/AttendanceViewer";
import ClassManagement from "./components/admin/ClassManagement";
import ClassEnrollmentPage from "./components/admin/ClassEnrollmentPage";
import AdminLayout from "./components/admin/AdminLayout";
import RegisterPage from "./components/RegisterPage";
import ClassRegistrationPage from "./components/ClassRegistrationPage";
import AvailableClassesPage from "./components/AvailableClassesPage";
import Statistics from "./components/admin/Statistics";
import { Toaster } from "./components/ui/sonner";

function App() {
  const savedUser = JSON.parse(localStorage.getItem('user') || 'null');
  const accessToken = localStorage.getItem('accessToken');
  const refreshToken = localStorage.getItem('refreshToken');

  console.log('🔍 App.tsx - Checking localStorage:');
  console.log('  savedUser:', savedUser);
  console.log('  accessToken:', accessToken ? `${accessToken.substring(0, 20)}...` : 'null');
  console.log('  refreshToken:', refreshToken ? `${refreshToken.substring(0, 20)}...` : 'null');
  console.log('  isLoggedIn will be:', !!accessToken);
  console.log('  isAdmin will be:', savedUser?.role === 'ADMIN');

  const [isLoggedIn, setIsLoggedIn] = useState(!!accessToken);
  const [isAdmin, setIsAdmin] = useState(savedUser?.role === 'ADMIN');

  const handleLogin = (user: any) => {
    setIsLoggedIn(true);
    setIsAdmin(user.role === 'ADMIN');
  };

  const handleLogout = async () => {
    try {
      const { authApi } = await import('./services/api');
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    }

    setIsLoggedIn(false);
    setIsAdmin(false);
    localStorage.removeItem('user');
  };

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          {/* Student Routes */}
          <Route
            path="/login"
            element={
              isLoggedIn ? (
                isAdmin ? <Navigate to="/admin/dashboard" /> : <Navigate to="/" />
              ) : (
                <LoginPage onLogin={handleLogin} />
              )
            }
          />
          <Route
            path="/register"
            element={
              isLoggedIn ? (
                isAdmin ? <Navigate to="/admin/dashboard" /> : <Navigate to="/" />
              ) : (
                <RegisterPage onLogin={handleLogin} />
              )
            }
          />
          <Route
            path="/class-registration"
            element={
              isLoggedIn ? <ClassRegistrationPage /> : <Navigate to="/login" />
            }
          />
          <Route
            path="/"
            element={
              isLoggedIn && !isAdmin ? <Dashboard onLogout={handleLogout} /> : <Navigate to="/login" />
            }
          />
          <Route
            path="/check-in"
            element={
              isLoggedIn && !isAdmin ? <CheckInPage onLogout={handleLogout} /> : <Navigate to="/login" />
            }
          />
          <Route
            path="/history"
            element={
              isLoggedIn && !isAdmin ? <AttendanceHistory onLogout={handleLogout} /> : <Navigate to="/login" />
            }
          />
          <Route
            path="/classes"
            element={
              isLoggedIn && !isAdmin ? <AvailableClassesPage onLogout={handleLogout} /> : <Navigate to="/login" />
            }
          />
          <Route
            path="/profile"
            element={
              isLoggedIn && !isAdmin ? <ProfilePage onLogout={handleLogout} /> : <Navigate to="/login" />
            }
          />

          {/* Admin Routes */}
          <Route
            path="/admin/login"
            element={
              isLoggedIn && isAdmin ? <Navigate to="/admin/dashboard" /> : <AdminLoginPage onLogin={handleLogin} />
            }
          />

          <Route
            path="/admin"
            element={
              isLoggedIn && isAdmin ? <AdminLayout onLogout={handleLogout} /> : <Navigate to="/admin/login" />
            }
          >
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="students" element={<StudentManagement />} />
            <Route path="classes" element={<ClassManagement />} />
            <Route path="class-enrollment" element={<ClassEnrollmentPage />} />
            <Route path="sessions" element={<SessionManagement />} />
            <Route path="attendance" element={<AttendanceViewer />} />
            <Route path="statistics" element={<Statistics />} />
            {/* Redirect /admin to /admin/dashboard */}
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
          </Route>

          {/* Default redirect */}
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
        <Toaster />
      </div>
    </Router>
  );
}

export default App;
