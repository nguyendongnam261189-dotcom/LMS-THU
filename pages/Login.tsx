
import React, { useState } from 'react';
import { GraduationCap, LogIn, AlertCircle } from 'lucide-react';
import { User } from '../types';
import { fetchFromAPI } from '../services/api';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const userData = await fetchFromAPI<User>('login', { username, password });
      onLogin(userData);
    } catch (err: any) {
      setError(err.message || 'Thông tin đăng nhập không chính xác.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100 rounded-full blur-3xl opacity-50"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-indigo-100 rounded-full blur-3xl opacity-50"></div>

      <div className="w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl border border-white/50 relative z-10 overflow-hidden">
        <div className="p-12 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 text-white rounded-3xl shadow-xl mb-6 transform -rotate-3">
            <GraduationCap className="w-10 h-10" />
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">ClassLingo <span className="text-blue-600">LMS</span></h1>
          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Hệ thống Quản lý Học tập Chuyên nghiệp</p>
        </div>

        <form onSubmit={handleSubmit} className="px-12 pb-12 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-5 rounded-2xl flex items-center gap-4 text-sm font-bold border border-red-100">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-4">
            <input
              type="text"
              required
              className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:ring-4 focus:ring-blue-100 outline-none transition-all font-semibold"
              placeholder="Tên đăng nhập"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <input
              type="password"
              required
              className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:ring-4 focus:ring-blue-100 outline-none transition-all font-semibold"
              placeholder="Mật khẩu"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-slate-900 hover:bg-blue-600 text-white font-black py-5 px-6 rounded-2xl flex items-center justify-center gap-3 transition-all duration-300 disabled:opacity-50 shadow-xl"
          >
            {isSubmitting ? <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div> : <><LogIn className="w-6 h-6" /> Đăng nhập ngay</>}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
