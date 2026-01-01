
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { User, Assignment, Submission } from '../types';
import { fetchFromAPI, postToAPI } from '../services/api';
import { Loader2, Users, Clock, Save, MessageSquare, CheckCircle2, Sparkles, AlertCircle, Check } from 'lucide-react';

const AssignmentSubmissions: React.FC<{ user: User }> = ({ user }) => {
  const { id } = useParams<{ id: string }>();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Trạng thái chỉnh sửa điểm câu hỏi cụ thể
  const [localAnswers, setLocalAnswers] = useState<Record<string, any>>({});
  const [commentInput, setCommentInput] = useState('');

  useEffect(() => { loadData(); }, [id]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const assignData = await fetchFromAPI<Assignment>('getAssignmentById', { id: id! });
      const rawSubs = await fetchFromAPI<any[]>('getSubmissionsByAssignment', { assignment_id: id! });
      setAssignment(assignData);
      
      const normalized = (Array.isArray(rawSubs) ? rawSubs : []).map(sub => ({
        ...sub,
        answers_json: typeof sub.answers_json === 'string' ? JSON.parse(sub.answers_json || '{}') : sub.answers_json
      }));
      
      setSubmissions(normalized);
      if (normalized.length > 0) selectSubmission(normalized[0]);
    } catch (e) { console.error("Error loading submissions:", e); } finally { setIsLoading(false); }
  };

  const selectSubmission = (sub: Submission) => {
    setSelectedSubId(sub.id);
    setLocalAnswers(sub.answers_json as any || {});
    setCommentInput(sub.teacher_comments || '');
  };

  const handleUpdateScore = async () => {
    if (!selectedSubId) return;
    setIsSaving(true);
    
    // Fix: Explicitly type 'sum' as number and 'ans' as any to avoid operator '+' errors on 'unknown' types
    // Tính toán lại tổng điểm dựa trên các câu đã chấm/sửa
    const newTotalScore = Object.values(localAnswers).reduce((sum: number, ans: any) => sum + (Number(ans.scoreEarned) || 0), 0);
    
    try {
      await postToAPI('updateSubmissionScore', { 
        id: selectedSubId, 
        score: newTotalScore,
        teacher_comments: commentInput,
        answers_json: JSON.stringify(localAnswers), // Lưu lại trạng thái đã confirm
        status: 'Graded',
        is_essay_confirmed: true
      });
      alert("Đã xác nhận và lưu điểm!");
      loadData();
    } catch (e) { alert("Lỗi khi lưu điểm."); } finally { setIsSaving(false); }
  };

  const selectedSub = submissions.find(s => s.id === selectedSubId);
  const questionsJson = assignment?.questions_json;
  const questions = assignment ? (typeof questionsJson === 'string' ? JSON.parse(questionsJson || '[]') : questionsJson) : [];

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" /></div>;

  return (
    <div className="grid lg:grid-cols-12 gap-8 py-10 px-6">
      <div className="lg:col-span-4 space-y-6">
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden">
          <div className="p-6 bg-slate-50 border-b font-black text-sm uppercase tracking-widest text-slate-400">Danh sách nộp bài</div>
          <div className="max-h-[700px] overflow-y-auto">
            {submissions.map(sub => (
              <button 
                key={sub.id} 
                onClick={() => selectSubmission(sub)}
                className={`w-full p-6 text-left border-b last:border-0 flex items-center gap-4 transition-all ${selectedSubId === sub.id ? 'bg-blue-50 border-l-8 border-l-blue-600' : 'hover:bg-slate-50'}`}
              >
                <div className="flex-1">
                  <p className="font-black text-slate-700">{sub.student_name}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">{sub.is_essay_confirmed ? 'Đã duyệt' : 'Chờ duyệt tự luận'}</p>
                </div>
                <div className="text-right">
                   <p className="text-sm font-black text-blue-600">{sub.score}/{sub.total_possible_score}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="lg:col-span-8">
        {selectedSub ? (
          <div className="bg-white rounded-[3.5rem] shadow-2xl p-10 space-y-10">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-3xl font-black text-slate-900">{selectedSub.student_name}</h3>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">Chi tiết bài làm & AI Suggestion</p>
              </div>
              <div className="text-center bg-slate-900 text-white p-6 rounded-[2rem] min-w-[140px]">
                <p className="text-[10px] font-black uppercase opacity-60 mb-1">Điểm hiện tại</p>
                <p className="text-4xl font-black">
                  {/* Fix: Explicitly type 'sum' as number and 'ans' as any to avoid operator '+' errors on 'unknown' types */}
                  {Object.values(localAnswers).reduce((sum: number, ans: any) => sum + (Number(ans.scoreEarned) || 0), 0)}
                  <span className="text-sm opacity-40 ml-1">/ {selectedSub.total_possible_score}</span>
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {questions.map((q: any, idx: number) => {
                const ans = localAnswers[q.id] || {};
                const isEssay = q.type === 'essay';

                return (
                  <div key={q.id} className={`p-8 rounded-[2.5rem] border-2 transition-all ${isEssay ? 'bg-blue-50/50 border-blue-200 ring-4 ring-blue-50' : 'bg-slate-50 border-slate-100'}`}>
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Câu {idx + 1} - {q.type}</p>
                        <p className="font-bold text-slate-800 text-lg leading-relaxed">{q.text}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                         <div className="flex items-center bg-white p-2 rounded-xl shadow-sm border border-slate-200">
                            <input 
                              type="number" 
                              step="0.1"
                              className="w-16 text-center font-black text-blue-600 outline-none"
                              value={ans.scoreEarned || 0}
                              onChange={e => setLocalAnswers({...localAnswers, [q.id]: {...ans, scoreEarned: Number(e.target.value)}})}
                            />
                            <span className="text-xs font-bold text-slate-300 ml-1">/ {q.score}</span>
                         </div>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                       <div className="space-y-2">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Bài làm của học sinh:</p>
                          <div className="p-4 bg-white rounded-2xl border border-slate-100 font-bold text-slate-700 min-h-[60px]">{ans.answer || "(Trống)"}</div>
                       </div>
                       <div className="space-y-2">
                          <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-1"><Sparkles className="w-3 h-3"/> AI Analysis:</p>
                          <div className="p-4 bg-blue-100/50 rounded-2xl border border-blue-100 font-bold text-blue-800 text-xs italic leading-relaxed">
                            {ans.feedback || "AI không tìm thấy lỗi."}
                          </div>
                       </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-10 border-t border-slate-100 flex flex-col md:flex-row gap-6">
               <div className="flex-1 space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nhận xét của giáo viên</label>
                  <textarea 
                    className="w-full p-6 bg-slate-50 border border-slate-100 rounded-[2rem] font-bold outline-none focus:bg-white" 
                    placeholder="VD: Em cần chú ý hơn về thì quá khứ đơn..."
                    value={commentInput}
                    onChange={e => setCommentInput(e.target.value)}
                  />
               </div>
               <div className="md:w-64 flex flex-col justify-end">
                  <button 
                    onClick={handleUpdateScore}
                    disabled={isSaving}
                    className="w-full bg-blue-600 text-white py-6 rounded-2xl font-black text-lg shadow-xl shadow-blue-100 flex items-center justify-center gap-3 active:scale-95 transition-all"
                  >
                    {isSaving ? <Loader2 className="animate-spin" /> : <Check className="w-6 h-6" />} XÁC NHẬN ĐIỂM
                  </button>
               </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center bg-slate-50 rounded-[4rem] border-4 border-dashed border-slate-200 text-slate-300 font-black uppercase tracking-widest">Chọn bài làm để chấm</div>
        )}
      </div>
    </div>
  );
};

export default AssignmentSubmissions;
