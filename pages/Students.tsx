
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { 
  Users, Plus, Trash2, X, Search, Loader2, 
  FileSpreadsheet, Check, Sparkles, UserPlus, Edit2, Save
} from 'lucide-react';
import { fetchFromAPI, postToAPI, parseStudentsFromText } from '../services/api';
import { useOutletContext } from 'react-router-dom';

const Students: React.FC<{ user: User }> = ({ user }) => {
  const { activeClassId } = useOutletContext<{ activeClassId: string }>();
  
  const [students, setStudents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modals
  const [isAddManualOpen, setIsAddManualOpen] = useState(false);
  const [isBatchImportOpen, setIsBatchImportOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  
  // States
  const [manualStudent, setManualStudent] = useState({ name: '', username: '', password: '' });
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [pastedText, setPastedText] = useState('');
  const [isParsingBatch, setIsParsingBatch] = useState(false);
  const [parsedStudents, setParsedStudents] = useState<any[]>([]);

  useEffect(() => {
    loadStudents();
  }, [activeClassId]);

  const loadStudents = async () => {
    setIsLoading(true);
    try {
      const data = await fetchFromAPI<any[]>('getStudentsByClass', { class_id: activeClassId });
      setStudents(Array.isArray(data) ? data : []);
    } catch (e) {
      setStudents([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddManual = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await postToAPI('createStudent', { ...manualStudent, class_id: activeClassId });
      setManualStudent({ name: '', username: '', password: '' });
      setIsAddManualOpen(false);
      loadStudents();
    } catch (e) {
      alert("Lỗi thêm học sinh.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    setIsSubmitting(true);
    try {
      await postToAPI('updateStudent', editingStudent);
      setIsEditOpen(false);
      setEditingStudent(null);
      loadStudents();
    } catch (e) {
      alert("Lỗi cập nhật học sinh.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAIParse = async () => {
    if (!pastedText.trim()) return;
    setIsParsingBatch(true);
    try {
      const result = await parseStudentsFromText(pastedText);
      setParsedStudents(result);
    } catch (e) {
      alert("Lỗi AI phân tích.");
    } finally {
      setIsParsingBatch(false);
    }
  };

  const handleSaveBatch = async () => {
    setIsSubmitting(true);
    try {
      await postToAPI('batchCreateStudents', { students: parsedStudents, class_id: activeClassId });
      setParsedStudents([]);
      setPastedText('');
      setIsBatchImportOpen(false);
      loadStudents();
    } catch (e) {
      alert("Lỗi lưu danh sách.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Xóa học sinh này khỏi lớp?")) return;
    try {
      await postToAPI('deleteStudent', { id });
      setStudents(prev => prev.filter(s => s.id !== id));
    } catch (e) {
      alert("Lỗi khi xóa.");
    }
  };

  const openEditModal = (s: any) => {
    setEditingStudent({ ...s });
    setIsEditOpen(true);
  };

  const filtered = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-600" /> Quản lý Học sinh
          </h2>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">Danh sách thành viên lớp học</p>
        </div>
        <div className="flex gap-3">
           <button 
             onClick={() => setIsBatchImportOpen(true)}
             className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-6 py-4 rounded-2xl font-black text-xs uppercase flex items-center gap-2 hover:bg-emerald-100 transition-all"
           >
             <FileSpreadsheet className="w-5 h-5" /> Nhập từ Excel (AI)
           </button>
           <button 
             onClick={() => setIsAddManualOpen(true)}
             className="bg-slate-900 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase flex items-center gap-2 hover:bg-blue-600 transition-all shadow-xl"
           >
             <Plus className="w-5 h-5" /> Thêm học sinh
           </button>
        </div>
      </div>

      <div className="bg-white rounded-[3rem] shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row gap-4 items-center justify-between">
           <div className="relative w-full md:w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl font-bold outline-none focus:ring-4 focus:ring-blue-50 transition-all" 
                placeholder="Tìm tên hoặc username..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
           </div>
           <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Sĩ số: {students.length}</span>
        </div>

        {isLoading ? (
          <div className="py-20 text-center"><Loader2 className="animate-spin text-blue-600 mx-auto w-10 h-10" /></div>
        ) : filtered.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/30">
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Họ và tên</th>
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tên đăng nhập</th>
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Mật khẩu</th>
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
                    <td className="p-6">
                       <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center font-black text-sm">{s.name[0]}</div>
                          <span className="font-black text-slate-700">{s.name}</span>
                       </div>
                    </td>
                    <td className="p-6 font-bold text-slate-500">{s.username}</td>
                    <td className="p-6 font-mono text-xs text-slate-400">{s.password}</td>
                    <td className="p-6 text-right">
                       <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={() => openEditModal(s)} className="p-2 text-slate-300 hover:text-blue-600 transition-all">
                             <Edit2 className="w-5 h-5" />
                          </button>
                          <button onClick={() => handleDelete(s.id)} className="p-2 text-slate-300 hover:text-rose-500 transition-all">
                             <Trash2 className="w-5 h-5" />
                          </button>
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-24 text-center">
             <Users className="w-16 h-16 text-slate-200 mx-auto mb-4" />
             <p className="font-black text-slate-300 uppercase tracking-widest">Lớp chưa có học sinh nào</p>
          </div>
        )}
      </div>

      {/* Modal Thêm Thủ Công */}
      {isAddManualOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-md bg-slate-900/40">
           <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl p-10 space-y-8 animate-in zoom-in duration-300 border-8 border-white">
              <div className="flex justify-between items-center">
                 <h3 className="text-2xl font-black text-slate-900">Thêm học sinh</h3>
                 <button onClick={() => setIsAddManualOpen(false)}><X className="w-6 h-6 text-slate-300"/></button>
              </div>
              <form onSubmit={handleAddManual} className="space-y-4">
                 <input className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none" placeholder="Họ và tên học sinh" value={manualStudent.name} onChange={e => setManualStudent({...manualStudent, name: e.target.value})} required />
                 <input className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none" placeholder="Tên đăng nhập (VD: nva123)" value={manualStudent.username} onChange={e => setManualStudent({...manualStudent, username: e.target.value})} required />
                 <input className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none" placeholder="Mật khẩu" value={manualStudent.password} onChange={e => setManualStudent({...manualStudent, password: e.target.value})} required />
                 <button disabled={isSubmitting} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-lg shadow-xl hover:bg-blue-600 transition-all flex items-center justify-center gap-2">
                    {isSubmitting ? <Loader2 className="animate-spin w-6 h-6"/> : <Check className="w-6 h-6"/>} Lưu học sinh
                 </button>
              </form>
           </div>
        </div>
      )}

      {/* Modal Edit Học Sinh */}
      {isEditOpen && editingStudent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-md bg-slate-900/40">
           <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl p-10 space-y-8 animate-in zoom-in duration-300 border-8 border-white">
              <div className="flex justify-between items-center">
                 <h3 className="text-2xl font-black text-slate-900">Sửa thông tin</h3>
                 <button onClick={() => { setIsEditOpen(false); setEditingStudent(null); }}><X className="w-6 h-6 text-slate-300"/></button>
              </div>
              <form onSubmit={handleUpdateStudent} className="space-y-4">
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Họ và tên</label>
                    <input className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:bg-white" value={editingStudent.name} onChange={e => setEditingStudent({...editingStudent, name: e.target.value})} required />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Tên đăng nhập</label>
                    <input className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:bg-white" value={editingStudent.username} onChange={e => setEditingStudent({...editingStudent, username: e.target.value})} required />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Mật khẩu</label>
                    <input className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:bg-white" value={editingStudent.password} onChange={e => setEditingStudent({...editingStudent, password: e.target.value})} required />
                 </div>
                 <button disabled={isSubmitting} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-lg shadow-xl hover:bg-slate-900 transition-all flex items-center justify-center gap-2">
                    {isSubmitting ? <Loader2 className="animate-spin w-6 h-6"/> : <Save className="w-6 h-6"/>} Lưu thay đổi
                 </button>
              </form>
           </div>
        </div>
      )}

      {/* Modal Nhập Hàng Loạt */}
      {isBatchImportOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-md bg-slate-900/40">
           <div className="bg-white w-full max-w-3xl rounded-[3rem] shadow-2xl p-12 space-y-8 animate-in zoom-in duration-300 border-8 border-white max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center">
                 <h3 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                   <Sparkles className="w-6 h-6 text-blue-500" /> Nhập học sinh hàng loạt (AI)
                 </h3>
                 <button onClick={() => setIsBatchImportOpen(false)}><X className="w-8 h-8 text-slate-300"/></button>
              </div>

              {parsedStudents.length === 0 ? (
                <div className="space-y-6 flex-1 flex flex-col">
                   <p className="text-sm font-bold text-slate-400">Dán nội dung từ Excel hoặc danh sách văn bản bất kỳ. AI sẽ tự động phân tách dữ liệu cho bạn.</p>
                   <textarea 
                     className="flex-1 w-full p-6 bg-slate-50 border border-slate-100 rounded-3xl font-bold text-slate-600 outline-none focus:bg-white transition-all resize-none min-h-[250px]"
                     placeholder="Ví dụ:
1. Nguyễn Văn A
2. Trần Thị B"
                     value={pastedText}
                     onChange={e => setPastedText(e.target.value)}
                   />
                   <button 
                     onClick={handleAIParse}
                     disabled={isParsingBatch || !pastedText.trim()}
                     className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black shadow-xl hover:bg-slate-900 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                   >
                     {isParsingBatch ? <Loader2 className="animate-spin" /> : <Sparkles className="w-5 h-5" />}
                     AI Phân tích danh sách
                   </button>
                </div>
              ) : (
                <div className="space-y-6 flex-1 flex flex-col overflow-hidden">
                   <div className="flex justify-between items-center">
                      <p className="text-xs font-black text-emerald-600 uppercase">Đã nhận diện {parsedStudents.length} học sinh</p>
                      <button onClick={() => setParsedStudents([])} className="text-[10px] font-black text-slate-300 hover:text-blue-500 uppercase">Sửa lại văn bản</button>
                   </div>
                   <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                      {parsedStudents.map((s, idx) => (
                        <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 grid grid-cols-3 gap-4 text-xs font-bold">
                           <input className="bg-transparent font-black" value={s.name} onChange={e => {
                              const nl = [...parsedStudents]; nl[idx].name = e.target.value; setParsedStudents(nl);
                           }} />
                           <input className="bg-transparent text-slate-400" value={s.username} onChange={e => {
                              const nl = [...parsedStudents]; nl[idx].username = e.target.value; setParsedStudents(nl);
                           }} />
                           <input className="bg-transparent text-slate-400 text-right" value={s.password} onChange={e => {
                              const nl = [...parsedStudents]; nl[idx].password = e.target.value; setParsedStudents(nl);
                           }} />
                        </div>
                      ))}
                   </div>
                   <button 
                     onClick={handleSaveBatch}
                     disabled={isSubmitting}
                     className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black shadow-xl hover:bg-emerald-600 transition-all flex items-center justify-center gap-3"
                   >
                     {isSubmitting ? <Loader2 className="animate-spin" /> : <Check className="w-5 h-5" />}
                     Xác nhận & Lưu toàn bộ
                   </button>
                </div>
              )}
           </div>
        </div>
      )}
    </div>
  );
};

export default Students;
