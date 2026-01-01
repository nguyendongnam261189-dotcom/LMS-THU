import React, { useState } from "react";
import { GraduationCap, LogIn, AlertCircle } from "lucide-react";
import type { User } from "../types";
import { supabase } from "../services/api";

interface LoginProps {
  onLogin: (user: User) => void;
}

function toUsername(email: string) {
  const at = email.indexOf("@");
  return at > 0 ? email.slice(0, at) : email;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      // 1) Đăng nhập Supabase Auth
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) throw signInError;

      const authUser = data.user;
      if (!authUser) throw new Error("Không lấy được thông tin người dùng.");

      // 2) Lấy hồ sơ từ bảng profiles theo id = authUser.id
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, username, role, name, class_id, avatar_url")
        .eq("id", authUser.id)
        .maybeSingle();

      // 3) Nếu chưa có profile => tạo tự động (teacher mặc định)
      let finalProfile = profile;

      if (!finalProfile) {
        const insertPayload = {
          id: authUser.id,
          username: toUsername(authUser.email || email.trim()),
          role: "teacher",
          name: authUser.user_metadata?.full_name || "Giáo viên",
          class_id: "",
          avatar_url: "",
        };

        const { data: created, error: createErr } = await supabase
          .from("profiles")
          .insert(insertPayload)
          .select("id, username, role, name, class_id, avatar_url")
          .single();

        if (createErr) throw createErr;
        finalProfile = created;
      }

      if (profileError) {
        // Nếu lỗi thật sự khi đọc profile
        // (maybeSingle không có dòng thì không tính là lỗi)
        console.error(profileError);
      }

      const userData: User = {
        id: finalProfile.id,
        username: finalProfile.username,
        role: finalProfile.role,
        name: finalProfile.name,
        class_id: finalProfile.class_id || "",
        avatar_url: finalProfile.avatar_url || "",
      };

      onLogin(userData);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Đăng nhập thất bại. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100 rounded-full blur-3xl opacity-50" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-indigo-100 rounded-full blur-3xl opacity-50" />

      <div className="w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl border border-white/50 relative z-10 overflow-hidden">
        <div className="p-12 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 text-white rounded-3xl shadow-xl mb-6 transform -rotate-3">
            <GraduationCap className="w-10 h-10" />
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">
            ClassLingo <span className="text-blue-600">LMS</span>
          </h1>
          <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">
            Hệ thống Quản lý Học tập
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-12 pb-12 space-y-6">
          {error && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl">
              <AlertCircle className="w-5 h-5" />
              <div className="text-sm font-semibold">{error}</div>
            </div>
          )}

          <div className="space-y-3">
            <label className="block text-sm font-bold text-slate-700">Email</label>
            <input
              type="email"
              required
              className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-blue-100 outline-none transition-all font-semibold"
              placeholder="vd: yourname@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-bold text-slate-700">Mật khẩu</label>
            <input
              type="password"
              required
              className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-blue-100 outline-none transition-all font-semibold"
              placeholder="Mật khẩu"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-slate-900 hover:bg-blue-600 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 transition-all duration-300 disabled:opacity-50 shadow-xl"
          >
            {isSubmitting ? (
              <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <LogIn className="w-6 h-6" /> Đăng nhập ngay
              </>
            )}
          </button>

          <div className="text-center text-xs text-slate-400 font-semibold">
            Lưu ý: bạn đăng nhập bằng <b>Email</b> đã tạo trong Supabase Auth.
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
