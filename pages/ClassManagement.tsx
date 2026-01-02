import React, { useState, useEffect } from 'react';
import { User, ClassInfo } from '../types';
import { Users, Plus, Edit2, Trash2, X, AlertCircle, Loader2, Save, ChevronRight } from 'lucide-react';
import { fetchFromAPI, postToAPI } from '../services/api';
import { useOutletContext, useNavigate } from 'react-router-dom';

const ClassManagement: React.FC<{ user: User }> = ({ user }) => {
  const { activeClassId, setActiveClassId } = useOutletContext<{
    activeClassId: string;
    setActiveClassId: (id: string) => void;
  }>();

  const navigate = useNavigate();

  // ✅ Không lấy từ user.managed_classes nữa, tải từ DB
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [newClassName, setNewClassName] = useState('');
  const [newClassCode, setNewClassCode] = useState('');
  const [editingClass, setEditingClass] = useState<ClassInfo | null>(null);

  useEffect(() => {
    loadClasses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const loadClasses = async () => {
    setIsLoading(true);
    setError('');
    try {
      // ✅ action này phải được map sang Supabase trong api.ts của bạn
      // Gợi ý: supabase.from('classes').select('*').eq('teacher_id', teacher_id)
      const data = await fetchFromAPI<ClassInfo[]>('getClassesByTeacher', { teacher_id: user.id });
      const list = Array.isArray(data) ? data : [];
      setClasses(list);

      // Nếu chưa có activeClassId thì set lớp đầu
      if ((!activeClassId || activeClassId === '') && list.length > 0) {
        setActiveClassId(list[0].id);
      }
    } catch (err: any) {
      console.error(err);
      setClasses([]);
      setError(err?.message || 'Không tải được danh sách lớp.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName || !newClassCode) return setError('Vui lòng nhập đầy đủ tên lớp và mã lớp.');

    setIsSubmitting(true);
    setError('');

    try {
      // ✅ action này phải được map sang Supabase trong api.ts
      // insert vào bảng classes
      const newClass = await postToAPI<ClassInfo>('createClass', {
        name: newClassName,
        code: newClassCode,
        teacher_id: user.id
      });

      const updated = [newClass, ...classes];
      setClasses(updated);

      // nếu chưa có active class -> set luôn
      if (!activeClassId) setActiveClassId(newClass.id);

      setIsModalOpen(false);
      setNewClassName('');
      setNewClassCode('');
    } catch (err: any) {
      setError(err?.message || 'Lỗi khi tạo lớp học.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass) return;

    setIsSubmitting(true);
    setError('');

    try {
      // ✅ action này map sang Supabase update classes
      await postToAPI('updateClass', editingClass);

      const updated = classes.map(c => (c.id === editingClass.id ? editingClass : c));
      setClasses(updated);

      setIsEditModalOpen(false);
      setEditingClass(null);
    } catch (err: any) {
      alert(err?.message || 'Lỗi cập nhật');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClass = async (id: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa lớp học này? Mọi dữ liệu liên quan sẽ bị ảnh hưởng.")) return;

    try {
      // ✅ action này map sang Supabase delete classes
      await postToAPI('deleteClass', { id });

      const updated = classes.filter(c => c.id !== id);
      setClasses(updated);

      if (activeClassId === id) {
        if (updated.length > 0) setActiveClassId(updated[0].id);
        else setActiveClassId('');
      }
    } catch (err: any) {
      alert(err?.message || "Lỗi khi xóa lớp.");
    }
  };

  return (
    <div className="space-y-8 relative">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Trung tâm Quản lý Lớp</h2>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">Quản trị và điều phối các khóa học</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-2 shadow-xl hover:bg-blue-600 transition-all active:scale-95"
        >
          <Plus className="w-6 h-6" /> Tạo lớp mới
        </button>
      </div>

      {isLoading ? (
        <div className="py-20 text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto" />
          <div className="mt-3 font-bold text-slate-400">Đang tải danh sách lớp...</div>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-8">
          {classes.map((c) => (
            <div
              key={c.id}
              className={`bg-white p-8 rounded-[3.5rem] border-2 transition-all relative overflow-hidden group ${
                activeClassId === c.id
                  ? 'border-blue-500 shadow-2xl shadow-blue-100 ring-4 ring-blue-50'
                  : 'border-slate-100 hover:border-blue-200 shadow-sm'
              }`}
            >
              <div className="relative z-10 space-y-6">
                <div className="flex justify-between items-start">
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${
                      activeClassId === c.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    <Users className="w-7 h-7" />
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        setEditingClass(c);
                        setIsEditModalOpen(true);
                      }}
                      className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteClass(c.id)}
                      className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-black text-slate-900 mb-1">{c.name}</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    Code: <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded ml-1">{c.code}</span>
                  </p>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => {
                      setActiveClassId(c.id);
                      navigate('/dashboard/students');
                    }}
                    className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-emerald-50 text-emerald-700 font-black text-xs uppercase tracking-widest hover:bg-emerald-100 transition-all border border-emerald-200"
                  >
                    <Users className="w-4 h-4" /> Danh sách học sinh
                  </button>
                  <button
                    onClick={() => {
                      setActiveClassId(c.id);
                      navigate('/dashboard');
                    }}
                    className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2 active:scale-95 ${
                      activeClassId === c.id ? 'bg-blue-600 text-white' : 'bg-slate-900 text-white hover:bg-blue-600'
                    }`}
                  >
                    Truy cập bảng tin <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {classes.length === 0 && (
            <div className="md:col-span-2 text-center py-20 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200 font-bold text-slate-400">
              Chưa có lớp nào. Bấm “Tạo lớp mới” để bắt đầu.
            </div>
          )}
        </div>
      )}

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => !isSubmitting && setIsModalOpen(false)} />
          <div className="bg-white w-full max-w-lg rounded-[3.5rem] shadow-2xl relative z-10 overflow-hidden animate-in zoom-in duration-300">
            <div className="p-10 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">Khai mở lớp mới</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-slate-200 rounded-2xl transition-all">
                <X className="w-8 h-8 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleCreateClass} className="p-10 space-y-8">
              {error && (
                <div className="p-5 bg-rose-50 text-rose-600 rounded-3xl flex items-center gap-4 text-sm font-bold border border-rose-100">
                  <AlertCircle className="w-6 h-6 flex-shrink-0" />
                  {error}
                </div>
              )}
              <div className="space-y-6">
                <input
                  required
                  placeholder="Tên lớp học"
                  className="w-full px-8 py-5 rounded-3xl bg-slate-50 border-2 border-slate-100 focus:bg-white focus:border-blue-600 outline-none transition-all font-black text-lg"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                />
                <input
                  required
                  placeholder="Mã định danh (Code)"
                  className="w-full px-8 py-5 rounded-3xl bg-slate-50 border-2 border-slate-100 focus:bg-white focus:border-blue-600 outline-none transition-all font-black text-lg"
                  value={newClassCode}
                  onChange={(e) => setNewClassCode(e.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-slate-900 text-white font-black py-6 rounded-3xl shadow-2xl flex items-center justify-center gap-4 text-xl hover:bg-blue-600 transition-all disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="w-7 h-7 animate-spin" /> : <><Plus className="w-7 h-7" /> Thiết lập ngay</>}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && editingClass && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => !isSubmitting && setIsEditModalOpen(false)} />
          <div className="bg-white w-full max-w-lg rounded-[3.5rem] shadow-2xl relative z-10 overflow-hidden animate-in zoom-in duration-300">
            <div className="p-10 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">Cập nhật thông tin</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="p-3 hover:bg-slate-100 rounded-2xl">
                <X className="w-8 h-8 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleUpdateClass} className="p-10 space-y-8">
              <div className="space-y-6">
                <input
                  required
                  className="w-full px-8 py-5 rounded-3xl bg-slate-50 border-2 border-slate-100 focus:bg-white focus:border-blue-600 transition-all font-black text-lg"
                  value={editingClass.name}
                  onChange={(e) => setEditingClass({ ...editingClass, name: e.target.value })}
                />
                <input
                  required
                  className="w-full px-8 py-5 rounded-3xl bg-slate-50 border-2 border-slate-100 focus:bg-white focus:border-blue-600 transition-all font-black text-lg"
                  value={editingClass.code}
                  onChange={(e) => setEditingClass({ ...editingClass, code: e.target.value })}
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 text-white font-black py-6 rounded-3xl shadow-xl flex items-center justify-center gap-4 text-xl hover:bg-slate-900 transition-all disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="w-7 h-7 animate-spin" /> : <><Save className="w-7 h-7" /> Lưu thay đổi</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassManagement;
