import React, { useEffect, useMemo, useState } from "react";
import { HashRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { createClient, Session } from "@supabase/supabase-js";

import Login from "./pages/Login";
import DashboardLayout from "./components/DashboardLayout";
import Newsfeed from "./pages/Newsfeed";
import Assignments from "./pages/Assignments";
import CreateAssignment from "./pages/CreateAssignment";
import DoAssignment from "./pages/DoAssignment";
import QuestionBank from "./pages/QuestionBank";
import ClassManagement from "./pages/ClassManagement";
import AssignmentSubmissions from "./pages/AssignmentSubmissions";
import Gradebook from "./pages/Gradebook";
import Leaderboard from "./pages/Leaderboard";
import LiveClassTools from "./pages/LiveClassTools";
import Students from "./pages/Students";
import Profile from "./pages/Profile";

import type { User } from "./types";

/**
 * Supabase client (FE dùng anon key là đúng)
 * Lưu ý: bạn phải có VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY trong .env / Vercel Environment Variables
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  // Không throw để tránh crash build; ta hiển thị lỗi rõ ràng ở UI
  console.warn("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");
}

const supabase = createClient(supabaseUrl || "", supabaseAnonKey || "");

async function loadProfileFromSession(session: Session): Promise<User | null> {
  const authId = session.user.id;

  // profiles.id nên là UUID = auth.users.id
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, role, name, class_id, avatar_url")
    .eq("id", authId)
    .single();

  if (error) {
    console.error("Load profile error:", error.message);
    return null;
  }

  // Map đúng theo type User hiện tại của dự án
  return {
    id: data.id,
    username: data.username || "",
    role: (data.role || "student") as any,
    name: data.name || "",
    class_id: data.class_id || "",
    avatar_url: data.avatar_url || undefined,
  };
}

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [envError, setEnvError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabaseUrl || !supabaseAnonKey) {
      setEnvError("Thiếu biến môi trường Supabase. Cần VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY.");
      setChecking(false);
      return;
    }

    let mounted = true;

    const init = async () => {
      setChecking(true);

      const { data } = await supabase.auth.getSession();
      const session = data.session;

      if (!mounted) return;

      if (session) {
        const profile = await loadProfileFromSession(session);
        if (!mounted) return;
        setUser(profile);
      } else {
        setUser(null);
      }

      setChecking(false);
    };

    init();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;

      if (session) {
        const profile = await loadProfileFromSession(session);
        if (!mounted) return;
        setUser(profile);
      } else {
        setUser(null);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Giữ lại callback để tương thích Login.tsx (bạn nói đã sửa xong Login)
  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  if (checking) {
    return (
      <div style={{ padding: 24, fontFamily: "system-ui" }}>
        Đang kiểm tra đăng nhập...
      </div>
    );
  }

  if (envError) {
    return (
      <div style={{ padding: 24, fontFamily: "system-ui", color: "crimson" }}>
        <b>Lỗi cấu hình:</b> {envError}
        <div style={{ marginTop: 8 }}>
          Bạn cần đặt biến môi trường trên Vercel:
          <ul>
            <li>VITE_SUPABASE_URL</li>
            <li>VITE_SUPABASE_ANON_KEY</li>
          </ul>
        </div>
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
