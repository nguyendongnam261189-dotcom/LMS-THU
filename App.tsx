
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import DashboardLayout from './components/DashboardLayout';
import Newsfeed from './pages/Newsfeed';
import Assignments from './pages/Assignments';
import CreateAssignment from './pages/CreateAssignment';
import DoAssignment from './pages/DoAssignment';
import QuestionBank from './pages/QuestionBank';
import ClassManagement from './pages/ClassManagement';
import AssignmentSubmissions from './pages/AssignmentSubmissions';
import Gradebook from './pages/Gradebook';
import Leaderboard from './pages/Leaderboard';
import LiveClassTools from './pages/LiveClassTools';
import Students from './pages/Students';
import Profile from './pages/Profile';
import { User } from './types';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('engconnect_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setIsLoading(false);
  }, []);

  const handleLogin = (userData: User) => {
    setUser(userData);
    localStorage.setItem('engconnect_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('engconnect_user');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route 
          path="/" 
          element={user ? <Navigate to="/dashboard" /> : <Login onLogin={handleLogin} />} 
        />
        
        <Route 
          path="/dashboard" 
          element={user ? <DashboardLayout user={user} onLogout={handleLogout} /> : <Navigate to="/" />}
        >
          <Route index element={<Newsfeed user={user!} />} />
          <Route path="assignments" element={<Assignments user={user!} />} />
          <Route path="assignments/create" element={<CreateAssignment user={user!} />} />
          <Route path="assignments/do/:id" element={<DoAssignment user={user!} />} />
          <Route path="assignments/:id/submissions" element={<AssignmentSubmissions user={user!} />} />
          <Route path="question-bank" element={<QuestionBank user={user!} />} />
          <Route path="classes" element={<ClassManagement user={user!} />} />
          <Route path="grades" element={<Gradebook user={user!} />} />
          <Route path="leaderboard" element={<Leaderboard user={user!} />} />
          <Route path="live-tools" element={<LiveClassTools user={user!} />} />
          <Route path="students" element={<Students user={user!} />} />
          <Route path="profile" element={<Profile user={user!} />} />
        </Route>

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
};

export default App;
