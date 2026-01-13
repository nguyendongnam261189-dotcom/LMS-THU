import React, { useState, useEffect } from 'react';
import { User, Assignment } from '../types';
import { getAssignments, deleteAssignment, updateAssignment } from '../services/api';
import {
  Calendar,
  ChevronRight,
  FileText,
  Settings2,
  Trash2,
  Save,
  Loader2,import React, { useEffect, useMemo, useState } from 'react';
import { User, Assignment } from '../types';
import { getAssignments, deleteAssignment, updateAssignment } from '../services/api';
import {
  Calendar,
  ChevronRight,
  FileText,
  Settings2,
  Trash2,
  Save,
  Loader2,
  CheckCircle2,
  Eye,
  Users
} from 'lucide-react';
import { useOutletContext, useNavigate } from 'react-router-dom';

interface AssignmentsProps {
  user: User;
}

const safeDate = (raw: any): Date | null => {
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isFinite(d.getTime()) ? d : null;
};

// input type="date" -> "YYYY-MM-DD".
// Nên convert thành ISO để lưu vào timestamptz ổn định.
const dateInputToISO = (yyyy_mm_dd: string, endOfDay = true) => {
  if (!yyyy_mm_dd) return '';
  // local time (tránh lệch do timezone khi parse)
  const [y, m, d] = yyyy_mm_dd.split('-').map(Number);
  if (!y || !m || !d) return '';
  const dt = new Date(y, m - 1, d, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0);
  return dt.toISOString();
};

// ISO/string -> "YYYY-MM-DD" cho input date
const isoToDateInput = (raw: any) => {
  const d = safeDate(raw);
  if (!d) return '';
  // lấy theo local yyyy-mm-dd
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const Assignments: React.FC<AssignmentsProps> = ({ user }) => {
  const { activeClassId } = useOutletContext<{ activeClassId: string }>();
  const navigate = useNavigate();

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Edit Modal State
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadAssignments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeClassId]);

  const loadAssignments = async () => {
    setIsLoading(true);
    try {
      const data = await getAssignments({
        class_id: activeClassId,
        student_id: user.role === 'student' ? user.id : ''
      });
      setAssignments(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setAssignments([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa bài tập này?')) return;
    try {
      await deleteAssignment(id);
      setAssignments(prev => prev.filter(a => a.id !== id));
    } catch (e) {
      console.error(e);
      alert('Lỗi khi xóa bài tập.');
    }
  };

  // ✅ KHÔNG nhận event nữa (để dùng onClick an toàn)
  const handleUpdateAssignment = async () => {
    if (!editingAssignment) return;
    setIsSaving(true);
    try {
      await updateAssignment(editingAssignment);
      setAssignments(prev => prev.map(a => (a.id === editingAssignment.id ? editingAssignment : a)));
      setEditingAssignment(null);
      alert('Cập nhật thành công!');
    } catch (err: any) {
      console.error(err);
      alert('Lỗi khi cập nhật.');
    } finally {
      setIsSaving(false);
    }
  };

  const getTypeStyle = (type?: string) => {
    switch (type) {
      case 'Quiz':
        return 'bg-blue-100 text-blue-600';
      case 'Writing':
        return 'bg-purple-100 text-purple-600';
      case 'Homework':
        return 'bg-amber-100 text-amber-600';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  };

  const renderDeadline = (raw: any) => {
    const d = safeDate(raw);
    if (!d) return '—';
    return d.toLocaleDateString('vi-VN');
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Nhiệm vụ học tập</h2>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">Danh sách bài tập của lớp</p>
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto" />
        </div>
      ) : assignments.length > 0 ? (
        <div className="grid gap-6">
          {assignments.map((assignment) => {
            const attemptCount = Number((assignment as any).attempt_count || 0);
            const maxAttempts = Number((assignment as any).max_attempts || 1);

            const isOutAttempts = user.role === 'student' && attemptCount >= maxAttempts;

            return (
              <div
                key={assignment.id}
                className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-8 hover:border-blue-300 transition-all group relative overflow-hidden"
              >
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                    <div className="flex items-start gap-6">
                      <div
                        className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center shadow-lg flex-shrink-0 ${
                          isOutAttempts ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-600 text-white'
                        }`}
                      >
                        {isOutAttempts ? <CheckCircle2 className="w-8 h-8" /> : <FileText className="w-8 h-8" />}
                      </div>

                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <span
                            className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${getTypeStyle(
                              (assignment as any).type
                            )}`}
                          >
                            {(assignment as any).type || 'Assignment'}
                          </span>

                          {user.role === 'student' && (
                            <span
                              className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                                isOutAttempts ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              Lượt làm: {attemptCount}/{maxAttempts}
                            </span>
                          )}
                        </div>

                        <h3 className="text-2xl font-black text-slate-900 leading-tight mb-3">
                          {(assignment as any).title || '(Không có tiêu đề)'}
                        </h3>

                        <div className="flex items-center gap-6 text-sm font-bold text-slate-400">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Hạn: {renderDeadline((assignment as any).deadline)}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end md:self-start">
                      {user.role === 'teacher' ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => navigate(`/dashboard/assignments/${assignment.id}/submissions`)}
                            className="bg-blue-600 text-white px-6 py-4 rounded-2xl font-black flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg"
                          >
                            <Users className="w-5 h-5" /> Danh sách nộp bài
                          </button>

                          <button
                            onClick={() => setEditingAssignment(assignment)}
                            className="p-4 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 transition-all"
                          >
                            <Settings2 className="w-5 h-5" />
                          </button>

                          <button
                            onClick={() => handleDelete(assignment.id)}
                            className="p-4 bg-slate-100 rounded-2xl hover:bg-rose-50 text-rose-500 transition-all"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      ) : isOutAttempts ? (
                        <button
                          onClick={() => navigate(`/dashboard/assignments/do/${assignment.id}`)}
                          className="bg-emerald-500 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-3 hover:bg-emerald-600 transition-all shadow-xl"
                        >
                          <Eye className="w-5 h-5" /> Xem kết quả
                        </button>
                      ) : (
                        <button
                          onClick={() => navigate(`/dashboard/assignments/do/${assignment.id}`)}
                          className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-3 hover:bg-blue-600 transition-all shadow-xl"
                        >
                          Làm bài ngay <ChevronRight className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200 font-bold text-slate-400">
          Chưa có bài tập nào
        </div>
      )}

      {/* Modal Edit Assignment */}
      {editingAssignment && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
            onClick={() => !isSaving && setEditingAssignment(null)}
          />

          <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl relative z-10 p-10 space-y-8 animate-in zoom-in duration-300">
            <h3 className="text-2xl font-black text-slate-900">Chỉnh sửa bài tập</h3>

            <div className="space-y-4">
              <input
                className="w-full px-6 py-4 bg-slate-50 border rounded-2xl font-bold"
                value={(editingAssignment as any).title || ''}
                onChange={e => setEditingAssignment({ ...(editingAssignment as any), title: e.target.value })}
              />

              <div className="grid grid-cols-2 gap-4">
                <input
                  type="date"
                  className="w-full px-6 py-4 bg-slate-50 border rounded-2xl font-bold"
                  value={isoToDateInput((editingAssignment as any).deadline)}
                  onChange={e => {
                    const iso = dateInputToISO(e.target.value, true);
                    setEditingAssignment({ ...(editingAssignment as any), deadline: iso });
                  }}
                />

                <select
                  className="w-full px-6 py-4 bg-slate-50 border rounded-2xl font-bold"
                  value={Number((editingAssignment as any).max_attempts || 1)}
                  onChange={e => setEditingAssignment({ ...(editingAssignment as any), max_attempts: Number(e.target.value) })}
                >
                  {[1, 2, 3, 5, 10, 99].map(n => (
                    <option key={n} value={n}>
                      {n} lần làm
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={handleUpdateAssignment}
              disabled={isSaving}
              className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black flex items-center justify-center gap-3 disabled:opacity-60"
            >
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} Lưu thay đổi
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Assignments;

  CheckCircle2,
  Eye,
  Users
} from 'lucide-react';
import { useOutletContext, useNavigate } from 'react-router-dom';

interface AssignmentsProps {
  user: User;
}

const Assignments: React.FC<AssignmentsProps> = ({ user }) => {
  const { activeClassId } = useOutletContext<{ activeClassId: string }>();
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Edit Modal State
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadAssignments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeClassId]);

  const loadAssignments = async () => {
    setIsLoading(true);
    try {
      const data = await getAssignments({
        class_id: activeClassId,
        student_id: user.role === 'student' ? user.id : ''
      });
      setAssignments(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setAssignments([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa bài tập này?")) return;
    try {
      await deleteAssignment(id);
      setAssignments(prev => prev.filter(a => a.id !== id));
    } catch (e) {
      console.error(e);
      alert("Lỗi khi xóa bài tập.");
    }
  };

  const handleUpdateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAssignment) return;
    setIsSaving(true);
    try {
      await updateAssignment(editingAssignment);
      setAssignments(prev => prev.map(a => a.id === editingAssignment.id ? editingAssignment : a));
      setEditingAssignment(null);
      alert("Cập nhật thành công!");
    } catch (err: any) {
      console.error(err);
      alert("Lỗi khi cập nhật.");
    } finally {
      setIsSaving(false);
    }
  };

  const getTypeStyle = (type: string) => {
    switch (type) {
      case 'Quiz': return 'bg-blue-100 text-blue-600';
      case 'Writing': return 'bg-purple-100 text-purple-600';
      case 'Homework': return 'bg-amber-100 text-amber-600';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Nhiệm vụ học tập</h2>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">Danh sách bài tập của lớp</p>
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto" />
        </div>
      ) : assignments.length > 0 ? (
        <div className="grid gap-6">
          {assignments.map((assignment) => {
            const isOutAttempts =
              user.role === 'student' &&
              (assignment.attempt_count || 0) >= (assignment.max_attempts || 1);

            return (
              <div
                key={assignment.id}
                className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-8 hover:border-blue-300 transition-all group relative overflow-hidden"
              >
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                    <div className="flex items-start gap-6">
                      <div
                        className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center shadow-lg flex-shrink-0 ${
                          isOutAttempts ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-600 text-white'
                        }`}
                      >
                        {isOutAttempts ? <CheckCircle2 className="w-8 h-8" /> : <FileText className="w-8 h-8" />}
                      </div>

                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <span
                            className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${getTypeStyle(
                              assignment.type
                            )}`}
                          >
                            {assignment.type}
                          </span>

                          {user.role === 'student' && (
                            <span
                              className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                                isOutAttempts ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              Lượt làm: {assignment.attempt_count}/{assignment.max_attempts}
                            </span>
                          )}
                        </div>

                        <h3 className="text-2xl font-black text-slate-900 leading-tight mb-3">
                          {assignment.title}
                        </h3>

                        <div className="flex items-center gap-6 text-sm font-bold text-slate-400">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Hạn: {new Date(assignment.deadline).toLocaleDateString('vi-VN')}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end md:self-start">
                      {user.role === 'teacher' ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => navigate(`/dashboard/assignments/${assignment.id}/submissions`)}
                            className="bg-blue-600 text-white px-6 py-4 rounded-2xl font-black flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg"
                          >
                            <Users className="w-5 h-5" /> Danh sách nộp bài
                          </button>

                          <button
                            onClick={() => setEditingAssignment(assignment)}
                            className="p-4 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 transition-all"
                          >
                            <Settings2 className="w-5 h-5" />
                          </button>

                          <button
                            onClick={() => handleDelete(assignment.id)}
                            className="p-4 bg-slate-100 rounded-2xl hover:bg-rose-50 text-rose-500 transition-all"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      ) : isOutAttempts ? (
                        <button
                          onClick={() => navigate(`/dashboard/assignments/do/${assignment.id}`)}
                          className="bg-emerald-500 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-3 hover:bg-emerald-600 transition-all shadow-xl"
                        >
                          <Eye className="w-5 h-5" /> Xem kết quả
                        </button>
                      ) : (
                        <button
                          onClick={() => navigate(`/dashboard/assignments/do/${assignment.id}`)}
                          className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-3 hover:bg-blue-600 transition-all shadow-xl"
                        >
                          Làm bài ngay <ChevronRight className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200 font-bold text-slate-400">
          Chưa có bài tập nào
        </div>
      )}

      {/* Modal Edit Assignment */}
      {editingAssignment && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
            onClick={() => !isSaving && setEditingAssignment(null)}
          ></div>

          <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl relative z-10 p-10 space-y-8 animate-in zoom-in duration-300">
            <h3 className="text-2xl font-black text-slate-900">Chỉnh sửa bài tập</h3>

            <div className="space-y-4">
              <input
                className="w-full px-6 py-4 bg-slate-50 border rounded-2xl font-bold"
                value={editingAssignment.title}
                onChange={e => setEditingAssignment({ ...editingAssignment, title: e.target.value })}
              />

              <div className="grid grid-cols-2 gap-4">
                <input
                  type="date"
                  className="w-full px-6 py-4 bg-slate-50 border rounded-2xl font-bold"
                  value={editingAssignment.deadline ? editingAssignment.deadline.split('T')[0] : ''}
                  onChange={e => setEditingAssignment({ ...editingAssignment, deadline: e.target.value })}
                />

                <select
                  className="w-full px-6 py-4 bg-slate-50 border rounded-2xl font-bold"
                  value={editingAssignment.max_attempts}
                  onChange={e => setEditingAssignment({ ...editingAssignment, max_attempts: Number(e.target.value) })}
                >
                  {[1, 2, 3, 5, 10, 99].map(n => (
                    <option key={n} value={n}>
                      {n} lần làm
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={handleUpdateAssignment}
              disabled={isSaving}
              className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black flex items-center justify-center gap-3"
            >
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} Lưu thay đổi
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Assignments;
