
import React, { useState, useRef } from 'react';
import { User } from '../types';
import { postToAPI } from '../services/api';
import { Camera, Save, Lock, User as UserIcon, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

const Profile: React.FC<{ user: User }> = ({ user }) => {
  const [name, setName] = useState(user.name);
  const [password, setPassword] = useState(user.password || '');
  const [avatar, setAvatar] = useState(user.avatar_url || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setAvatar(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setIsSuccess(false);
    try {
      await postToAPI('updateProfile', {
        id: user.id,
        name: user.role === 'student' ? user.name : name, // Nếu là học sinh, luôn giữ tên cũ
        password,
        avatar_url: avatar
      });
      
      // Cập nhật local storage
      const updatedUser = { 
        ...user, 
        name: user.role === 'student' ? user.name : name, 
        password, 
        avatar_url: avatar 
      };
      localStorage.setItem('engconnect_user', JSON.stringify(updatedUser));
      
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 3000);
    } catch (e) {
      alert("Lỗi khi cập nhật thông tin.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-[3.5rem] shadow-2xl border border-slate-100 overflow-hidden">
        <div className="h-40 bg-gradient-to-r from-blue-600 to-indigo-700 relative">
          <div className="absolute -bottom-16 left-1/2 -translate-x-1/2">
            <div className="relative group">
              <div className="w-32 h-32 rounded-full border-4 border-white bg-white shadow-xl overflow-hidden">
                {avatar ? (
                  <img src={avatar} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-300">
                    <UserIcon className="w-16 h-16" />
                  </div>
                )}
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 p-2 bg-slate-900 text-white rounded-full shadow-lg hover:bg-blue-600 transition-all"
              >
                <Camera className="w-5 h-5" />
              </button>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarChange} />
            </div>
          </div>
        </div>

        <div className="px-10 pt-24 pb-12">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-black text-slate-900">{user.name}</h2>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">
              {user.role === 'teacher' ? 'Giáo viên Quản trị' : 'Học sinh'} • @{user.username}
            </p>
          </div>

          <form onSubmit={handleUpdate} className="space-y-8">
            {isSuccess && (
              <div className="bg-emerald-50 text-emerald-600 p-4 rounded-2xl flex items-center gap-3 font-bold border border-emerald-100 animate-in zoom-in">
                <CheckCircle2 className="w-5 h-5" /> Đã cập nhật thông tin thành công!
              </div>
            )}

            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center px-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Họ và tên hiển thị</label>
                  {user.role === 'student' && (
                    <span className="text-[9px] font-bold text-amber-500 flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Liên hệ giáo viên để đổi tên
                    </span>
                  )}
                </div>
                <div className="relative">
                  <UserIcon className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                  <input 
                    className={`w-full pl-14 pr-8 py-5 border-2 border-transparent rounded-[2rem] font-bold outline-none transition-all ${
                      user.role === 'student' 
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                        : 'bg-slate-50 focus:bg-white focus:border-blue-600'
                    }`}
                    value={name}
                    onChange={e => setName(e.target.value)}
                    disabled={user.role === 'student'}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Đổi mật khẩu</label>
                <div className="relative">
                  <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                  <input 
                    type="text"
                    className="w-full pl-14 pr-8 py-5 bg-slate-50 border-2 border-transparent rounded-[2rem] font-bold focus:bg-white focus:border-blue-600 transition-all outline-none"
                    placeholder="Nhập mật khẩu mới..."
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            <button 
              type="submit"
              disabled={isSaving}
              className="w-full bg-slate-900 text-white py-6 rounded-[2rem] font-black text-lg shadow-2xl hover:bg-blue-600 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="animate-spin w-6 h-6" /> : <Save className="w-6 h-6" />}
              Lưu thay đổi hồ sơ
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;
