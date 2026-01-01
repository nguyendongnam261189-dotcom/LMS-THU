
import React, { useState, useEffect } from 'react';
import { User, GradeColumn, GradebookData } from '../types';
import { fetchFromAPI, postToAPI } from '../services/api';
import { 
  ClipboardList, Plus, Trash2, Save, Loader2, Search, 
  FileSpreadsheet, Filter, CheckCircle2, AlertCircle, X,
  ChevronDown, Settings2
} from 'lucide-react';
import { useOutletContext } from 'react-router-dom';

const Gradebook: React.FC<{ user: User }> = ({ user }) => {
  const { activeClassId } = useOutletContext<{ activeClassId: string }>();
  const [data, setData] = useState<GradebookData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [isAddColumnOpen, setIsAddColumnOpen] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [newColMax, setNewColMax] = useState(10);

  useEffect(() => { loadGradebook(); }, [activeClassId]);

  const loadGradebook = async () => {
    setIsLoading(true);
    try {
      const result = await fetchFromAPI<GradebookData>('getGradebook', { class_id: activeClassId });
      setData(result);
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  };

  const handleCreateColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColName) return;
    setIsSaving(true);
    try {
      await postToAPI('createGradeColumn', {
        class_id: activeClassId,
        name: newColName,
        max_score: newColMax,
        type: 'manual'
      });
      setNewColName('');
      setIsAddColumnOpen(false);
      loadGradebook();
    } catch (e) { alert("Lỗi khi thêm cột."); } finally { setIsSaving(false); }
  };

  const handleUpdateGrade = async (studentId: string, studentName: string, columnId: string, score: number) => {
    try {
      await postToAPI('upsertGrade', {
        student_id: studentId,
        student_name: studentName,
        column_id: columnId,
        score: score
      });
      // Cập nhật local state
      setData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          students: prev.students.map(s => {
            if (s.id === studentId) {
              return { ...s, grades: { ...s.grades, [columnId]: score } };
            }
            return s;
          })
        };
      });
    } catch (e) { console.error("Lỗi cập nhật điểm"); }
  };

  const handleDeleteColumn = async (id: string) => {
    if (!window.confirm("Xóa cột điểm này sẽ xóa toàn bộ điểm của học sinh trong cột. Bạn chắc chứ?")) return;
    try {
      await postToAPI('deleteGradeColumn', { id });
      loadGradebook();
    } catch (e) { alert("Lỗi khi xóa cột."); }
  };

  if (isLoading) return <div className="py-20 text-center"><Loader2 className="animate-spin text-blue-600 mx-auto w-12 h-12" /></div>;

  // Logic: Nếu là học sinh, chỉ lọc lấy chính bản thân mình
  const filteredStudents = data?.students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
    if (user.role === 'student') {
      return s.id === user.id && matchesSearch;
    }
    return matchesSearch;
  }) || [];

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
             <ClipboardList className="w-8 h-8 text-blue-600" /> {user.role === 'student' ? 'Kết quả học tập cá nhân' : 'Sổ điểm lớp học'}
          </h2>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">
            {user.role === 'student' ? 'Theo dõi tiến độ và điểm số của bạn' : 'Quản lý và theo dõi kết quả định kỳ'}
          </p>
        </div>
        {user.role === 'teacher' && (
          <button 
            onClick={() => setIsAddColumnOpen(true)}
            className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black shadow-xl hover:bg-blue-600 transition-all flex items-center gap-2 active:scale-95"
          >
            {/* Fix: Capitalized Plus component */}
            <Plus className="w-5 h-5" /> Thêm cột điểm
          </button>
        )}
      </div>

      <div className="bg-white rounded-[3rem] shadow-sm border border-slate-200 overflow-hidden">
        {user.role === 'teacher' && (
          <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-50/50">
            <div className="relative w-full md:w-96">
              {/* Fix: Capitalized Search component */}
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl font-bold outline-none focus:ring-4 focus:ring-blue-50"
                placeholder="Tìm tên học sinh..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3">
               <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Hiển thị: {filteredStudents.length} học sinh</span>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="p-6 font-black text-slate-400 uppercase text-[10px] tracking-widest sticky left-0 bg-slate-50 z-10 w-64">Học sinh</th>
                {data?.columns.map(col => (
                  <th key={col.id} className="p-6 font-black text-slate-900 text-xs min-w-[150px] border-l border-slate-100 group relative">
                    <div className="flex flex-col">
                      <span>{col.name}</span>
                      <span className="text-[10px] text-slate-400">Tối đa: {col.max_score}đ</span>
                    </div>
                    {user.role === 'teacher' && (
                      <button 
                        onClick={() => handleDeleteColumn(col.id)}
                        className="absolute right-2 top-2 p-1 text-slate-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        {/* Fix: Capitalized Trash2 component */}
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </th>
                ))}
                <th className="p-6 font-black text-blue-600 uppercase text-[10px] tracking-widest border-l border-slate-100 text-center">Trung bình</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((s, idx) => {
                // Tính trung bình
                let sum = 0;
                data?.columns.forEach(c => sum += s.grades[c.id] || 0);
                const avg = data?.columns.length ? (sum / data.columns.length).toFixed(1) : 0;

                const isMe = user.id === s.id;

                return (
                  <tr key={s.id} className={`border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors ${isMe ? 'bg-blue-50/30' : ''}`}>
                    <td className="p-6 sticky left-0 bg-white/95 backdrop-blur-sm z-10 font-bold text-slate-700 flex items-center gap-3 shadow-[5px_0_10px_-5px_rgba(0,0,0,0.05)]">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400">{idx + 1}</div>
                      {s.name}
                      {user.role === 'student' && <span className="text-[8px] bg-blue-600 text-white px-2 py-0.5 rounded-full uppercase">Cá nhân</span>}
                    </td>
                    {data?.columns.map(col => {
                      const score = s.grades[col.id] || 0;
                      return (
                        <td key={col.id} className="p-4 border-l border-slate-50">
                          {user.role === 'teacher' ? (
                            <input 
                              type="number"
                              step="0.1"
                              className="w-full bg-transparent p-2 rounded-lg font-black text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none text-center"
                              defaultValue={score}
                              onBlur={(e) => handleUpdateGrade(s.id, s.name, col.id, Number(e.target.value))}
                            />
                          ) : (
                            <div className="text-center font-black text-slate-700">{score}</div>
                          )}
                        </td>
                      );
                    })}
                    <td className="p-6 border-l border-slate-100 text-center">
                       <span className={`px-4 py-1.5 rounded-full font-black text-sm ${Number(avg) >= 8 ? 'bg-emerald-100 text-emerald-600' : Number(avg) >= 5 ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                         {avg}
                       </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {isAddColumnOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-md bg-slate-900/40">
          <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl relative z-10 p-10 space-y-8 animate-in zoom-in duration-300">
             <div className="flex justify-between items-center">
                <h3 className="text-2xl font-black text-slate-900">Thiết lập cột điểm mới</h3>
                {/* Fix: Capitalized X component */}
                <button onClick={() => setIsAddColumnOpen(false)}><X className="w-6 h-6 text-slate-300"/></button>
             </div>
             <form onSubmit={handleCreateColumn} className="space-y-6">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Tên cột điểm</label>
                   <input 
                     className="w-full px-6 py-4 bg-slate-50 border rounded-2xl font-bold outline-none focus:ring-4 focus:ring-blue-50"
                     placeholder="VD: Kiểm tra 15p, Mid-term..."
                     value={newColName}
                     onChange={e => setNewColName(e.target.value)}
                     required
                   />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Thang điểm tối đa</label>
                   <input 
                     type="number"
                     className="w-full px-6 py-4 bg-slate-50 border rounded-2xl font-bold outline-none"
                     value={newColMax}
                     onChange={e => setNewColMax(Number(e.target.value))}
                     required
                   />
                </div>
                <button 
                  type="submit"
                  disabled={isSaving}
                  className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-lg shadow-xl hover:bg-blue-600 transition-all flex items-center justify-center gap-2"
                >
                  {/* Fix: Capitalized Loader2 and Save components */}
                  {isSaving ? <Loader2 className="animate-spin w-5 h-5"/> : <Save className="w-5 h-5"/>} Xác nhận thêm
                </button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Gradebook;
