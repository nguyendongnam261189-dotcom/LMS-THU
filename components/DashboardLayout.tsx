
import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  PlusCircle, 
  LogOut, 
  BookOpen,
  GraduationCap,
  Settings,
  Database,
  ClipboardList,
  Trophy,
  ScreenShare,
  Users,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  User as UserIcon
} from 'lucide-react';
import { User } from '../types';
import ClassSwitcher from './ClassSwitcher';

interface DashboardLayoutProps {
  user: User;
  onLogout: () => void;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ user, onLogout }) => {
  const location = useLocation();
  const [activeClassId, setActiveClassId] = useState(user.class_id);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  const currentUser = JSON.parse(localStorage.getItem('engconnect_user') || JSON.stringify(user));

  useEffect(() => {
    if (location.pathname === '/dashboard/live-tools') {
      setIsSidebarCollapsed(true);
    } else {
      setIsSidebarCollapsed(false);
    }
  }, [location.pathname]);

  // Quy tắc rút gọn: 1 lót + 1 tên (2 từ cuối)
  const formatDisplayName = (fullName: string) => {
    if (!fullName) return "";
    const parts = fullName.trim().split(/\s+/);
    if (parts.length <= 2) return fullName;
    return parts.slice(-2).join(' ');
  };

  const navItems = [
    { label: 'Bảng tin lớp', icon: LayoutDashboard, path: '/dashboard' },
    { label: 'Bài tập', icon: BookOpen, path: '/dashboard/assignments' },
    { label: 'Bảng điểm', icon: ClipboardList, path: '/dashboard/grades' },
  ];

  // Chỉ Giáo viên mới thấy các mục quản trị và Vinh danh
  if (user.role === 'teacher') {
    navItems.push({ label: 'Vinh danh', icon: Trophy, path: '/dashboard/leaderboard' });
    navItems.push({ label: 'Học sinh', icon: Users, path: '/dashboard/students' });
    navItems.push({ label: 'Lớp học Trực tiếp', icon: ScreenShare, path: '/dashboard/live-tools' });
    navItems.push({ label: 'Soạn bài tập', icon: PlusCircle, path: '/dashboard/assignments/create' });
    navItems.push({ label: 'Ngân hàng đề', icon: Database, path: '/dashboard/question-bank' });
    navItems.push({ label: 'Quản lý lớp', icon: Settings, path: '/dashboard/classes' });
  }

  const activeClassName = user.managed_classes?.find(c => c.id === activeClassId)?.name || 'Chung';

  const roleLabels: Record<string, string> = {
    teacher: 'Giáo viên',
    student: 'Học sinh',
    parent: 'Phụ huynh'
  };

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <aside 
        className={`bg-white border-r border-slate-200 hidden md:flex flex-col transition-all duration-500 ease-in-out relative z-50 ${
          isSidebarCollapsed ? 'w-20' : 'w-72'
        }`}
      >
        <div className={`p-6 mb-4 flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!isSidebarCollapsed && (
            <Link to="/dashboard" className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-xl shadow-lg">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-black text-slate-800 tracking-tight">
                EngConnect<span className="text-blue-600">LMS</span>
              </h1>
            </Link>
          )}
          {isSidebarCollapsed && (
             <div className="bg-blue-600 p-2 rounded-xl">
                <GraduationCap className="w-6 h-6 text-white" />
             </div>
          )}
        </div>

        {user.role === 'teacher' && user.managed_classes && !isSidebarCollapsed && (
          <div className="animate-in fade-in slide-in-from-left-4 duration-500">
            <ClassSwitcher 
              classes={user.managed_classes} 
              activeClassId={activeClassId} 
              onSwitch={setActiveClassId} 
            />
          </div>
        )}

        <nav className="flex-1 px-4 mt-4 space-y-1 overflow-x-hidden">
          <div className={`px-4 mb-2 ${isSidebarCollapsed ? 'text-center' : ''}`}>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
              {isSidebarCollapsed ? '•••' : 'Danh mục'}
            </p>
          </div>
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                location.pathname === item.path
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-100 font-bold'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <item.icon className={`w-5 h-5 shrink-0 ${location.pathname === item.path ? 'text-white' : 'text-slate-400 group-hover:text-blue-600'}`} />
              {!isSidebarCollapsed && <span className="truncate">{item.label}</span>}
            </Link>
          ))}
          
          <Link
            to="/dashboard/profile"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
              location.pathname === '/dashboard/profile'
                ? 'bg-blue-600 text-white shadow-md font-bold'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <UserIcon className={`w-5 h-5 shrink-0 ${location.pathname === '/dashboard/profile' ? 'text-white' : 'text-slate-400 group-hover:text-blue-600'}`} />
            {!isSidebarCollapsed && <span className="truncate">Cá nhân</span>}
          </Link>
        </nav>

        <div className="p-4 border-t border-slate-100 mt-auto">
          {!isSidebarCollapsed ? (
            <div className="bg-slate-50 rounded-2xl p-4 mb-4">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-full bg-white border-2 border-blue-100 flex items-center justify-center overflow-hidden">
                  {currentUser.avatar_url ? (
                    <img src={currentUser.avatar_url} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-blue-600 font-bold text-lg">{currentUser.name[0]}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-slate-900 truncate">
                    {user.role === 'student' ? formatDisplayName(currentUser.name) : currentUser.name}
                  </p>
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{roleLabels[user.role]}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-10 h-10 mx-auto mb-4 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center overflow-hidden">
              {currentUser.avatar_url ? (
                <img src={currentUser.avatar_url} className="w-full h-full object-cover" />
              ) : (
                <span className="text-blue-600 font-bold">{currentUser.name[0]}</span>
              )}
            </div>
          )}
          
          <button
            onClick={onLogout}
            className={`w-full flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all font-bold ${isSidebarCollapsed ? 'justify-center' : ''}`}
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {!isSidebarCollapsed && <span>Đăng xuất</span>}
          </button>
        </div>

        <button 
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="absolute -right-3 top-20 bg-white border border-slate-200 rounded-full p-1.5 text-slate-400 hover:text-blue-600 shadow-sm z-[60] hover:scale-110 transition-all"
        >
          {isSidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>
      </aside>

      <main className="flex-1 overflow-y-auto flex flex-col">
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40 flex items-center justify-between px-8">
           <div className="flex items-center gap-4">
             <button className="md:hidden p-2 text-slate-500"><Menu className="w-6 h-6"/></button>
             <div className="flex flex-col">
               <h2 className="text-lg font-black text-slate-800 leading-tight">{activeClassName}</h2>
               <p className="text-xs font-bold text-slate-400">Hệ thống {roleLabels[user.role]}</p>
             </div>
           </div>
        </header>

        <div className={`flex-1 transition-all duration-500 ${location.pathname === '/dashboard/live-tools' ? 'p-0 max-w-none' : 'p-4 md:p-10 max-w-6xl mx-auto w-full'}`}>
          <Outlet context={{ activeClassId, setActiveClassId }} />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
