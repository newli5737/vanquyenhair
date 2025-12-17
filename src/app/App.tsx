import { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./components/LoginPage";
import Dashboard from "./components/Dashboard";
import CheckInPage from "./components/CheckInPage";
import AttendanceHistory from "./components/AttendanceHistory";
import ProfilePage from "./components/ProfilePage";
import { Toaster } from "./components/ui/sonner";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route 
            path="/login" 
            element={
              isLoggedIn ? <Navigate to="/" /> : <LoginPage onLogin={() => setIsLoggedIn(true)} />
            } 
          />
          <Route 
            path="/" 
            element={
              isLoggedIn ? <Dashboard onLogout={() => setIsLoggedIn(false)} /> : <Navigate to="/login" />
            } 
          />
          <Route 
            path="/check-in" 
            element={
              isLoggedIn ? <CheckInPage /> : <Navigate to="/login" />
            } 
          />
          <Route 
            path="/history" 
            element={
              isLoggedIn ? <AttendanceHistory /> : <Navigate to="/login" />
            } 
          />
          <Route 
            path="/profile" 
            element={
              isLoggedIn ? <ProfilePage /> : <Navigate to="/login" />
            } 
          />
        </Routes>
        <Toaster />
      </div>
    </Router>
  );
}

export default App;
