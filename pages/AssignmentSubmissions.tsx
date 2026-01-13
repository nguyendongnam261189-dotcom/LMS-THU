import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Assignment, Submission, User } from '../types';
import { fetchFromAPI, postToAPI } from '../services/api';
import { Loader2, Sparkles, Check } from 'lucide-react';

const safeJsonParse = <T,>(raw: any, fallback: T): T => {
  if (raw == null) return fallback;

  // Supabase jsonb thường trả object/array sẵn
  if (typeof raw === 'object') return raw as T;

  if (typeof raw === 'string') {
    const s = raw.trim();
    if (!s) return fallback;
    try {
      return JSON.parse(s) as T;
    } catch {
      return fallback;
    }
  }

  return fallback;
};

const toNumber = (v: any, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

const AssignmentSubmissions: React.FC<{ user: User }> = ({ user }) => {
  const { id } = useParams<{ id: string }>();

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // local editable state
  const [localAnswers, setLocalAnswers] = useState<Record<string, any>>({});
  const [commentInput, setCommentInput] = useState('');

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadData = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      // 1) assignment
      const assignData = await fetchFromAPI<Assignment>('getAssignmentById', { id });
      setAssignment(assignData || null);

      // 2) submissions
      const rawSubs = await fetchFromAPI<any[]>('getSubmissionsByAssignment', { assignment_id: id });
      const normalized: Submission[] = (Array.isArray(rawSubs) ? rawSubs : []).map((sub: any) => ({
        ...sub,
        answers_json: safeJsonParse<Record<string, any>>(sub?.answers_json, {})
      }));

      setSubmissions(normalized);

      // auto select first if not selected / selected missing
      if (normalized.length > 0) {
        const existing = normalized.find(s => s.id === selectedSubId);
        const first = existing || normalized[0];
        selectSubmission(first);
      } else {
        setSelectedSubId(null);
        setLocalAnswers({});
        setCommentInput('');
      }
    } catch (e) {
      console.error('Error loading submissions:', e);
      setSubmissions([]);
      setSelectedSubId(null);
      setLocalAnswers({});
      setCommentInput('');
    } finally {
      setIsLoading(false);
    }
  };

  const selectSubmission = (sub: Submission) => {
    setSelectedSubId(sub.id);
    setLocalAnswers((sub as any)?.answers_json || {});
    setCommentInput((sub as any)?.teacher_comments || '');
  };

  const questions = useMemo(() => {
    if (!assignment) return [];
    const qs = safeJsonParse<any[]>(assignment.questions_json as any, []);
    return Array.isArray(qs) ? qs : [];
  }, [assignment]);

  const selectedSub = useMemo(() => submissions.find(s => s.id === selectedSubId) || null, [submissions, selectedSubId]);

  const currentScore = useMemo(() => {
    return Object.values(localAnswers).reduce((sum: number, ans: any) => sum + (toNumber(ans?.scoreEarned, 0) || 0), 0);
  }, [localAnswers]);

  const handleUpdateScore = async () => {
    if (!selectedSubId) return;
    if (isSaving) return;

    setIsSaving(true);

    try {
      await postToAPI('updateSubmissionScore', {
        id: selectedSubId,
        score: currentScore,
        teacher_comments: commentInput,
        answers_json: JSON.stringify(localAnswers),
        status: 'Graded',
        is_essay_confirmed: true
      });

      alert('Đã xác nhận và lưu điểm!');
      await loadData();
    } catch (e) {
      console.error(e);
      alert('Lỗi khi lưu điểm.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-12 gap-8 py-10 px-6">
      {/* Left: list */}
      <div className="lg:col-span-4 space-y-6">
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden">
          <div className="p-6 bg-slate-50 border-b font-black text-sm uppercase tracking-widest text-slate-400">
            Danh sách nộp bài
          </div>

          <div className="max-h-[700px] overflow-y-auto">
            {submissions.length === 0 ? (
              <div className="p-10 text-center text-slate-300 font-black uppercase tracking-widest">
                Chưa có bài nộp
              </div>
            ) : (
              submissions.map((sub: any) => (
                <button
                  key={sub.id}
                  onClick={() => selectSubmission(sub)}
                  className={`w-full p-6 text-left border-b last:border-0 flex items-center gap-4 transition-all ${
                    selectedSubId === sub.id
                      ? 'bg-blue-50 border-l-8 border-l-blue-600'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex-1">
                    <p className="font-black text-slate-700">{sub.student_name || '(No name)'}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">
                      {sub.is_essay_confirmed ? 'Đã duyệt' : 'Chờ duyệt tự luận'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-blue-600">
                      {toNumber(sub.score, 0)}/{toNumber(sub.total_possible_score, 0)}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Right: detail */}
      <div className="lg:col-span-8">
        {selectedSub ? (
          <div className="bg-white rounded-[3.5rem] shadow-2xl p-10 space-y-10">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-3xl font-black text-slate-900">{(selectedSub as any).student_name || '(No name)'}</h3>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">
                  Chi tiết bài làm & AI Suggestion
                </p>
              </div>

              <div className="text-center bg-slate-900 text-white p-6 rounded-[2rem] min-w-[140px]">
                <p className="text-[10px] font-black uppercase opacity-60 mb-1">Điểm hiện tại</p>
                <p className="text-4xl font-black">
                  {currentScore}
                  <span className="text-sm opacity-40 ml-1">/ {toNumber((selectedSub as any).total_possible_score, 0)}</span>
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {questions.map((q: any, idx: number) => {
                const qId = String(q?.id ?? `q_${idx}`);
                const ans = localAnswers[qId] || {};
                const maxScore = toNumber(q?.score, 1);
                const isEssay = q?.type === 'essay';

                const scoreValue = toNumber(ans?.scoreEarned, 0);

                return (
                  <div
                    key={qId}
                    className={`p-8 rounded-[2.5rem] border-2 transition-all ${
                      isEssay ? 'bg-blue-50/50 border-blue-200 ring-4 ring-blue-50' : 'bg-slate-50 border-slate-100'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-2">
                          Câu {idx + 1} - {q?.type || 'unknown'}
                        </p>
                        <p className="font-bold text-slate-800 text-lg leading-relaxed">{q?.text || '(Không có nội dung)'}</p>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center bg-white p-2 rounded-xl shadow-sm border border-slate-200">
                          <input
                            type="number"
                            step="0.1"
                            min={0}
                            max={maxScore}
                            className="w-16 text-center font-black text-blue-600 outline-none"
                            value={scoreValue}
                            onChange={e => {
                              const next = clamp(toNumber(e.target.value, 0), 0, maxScore);
                              setLocalAnswers(prev => ({
                                ...prev,
                                [qId]: { ...ans, scoreEarned: next }
                              }));
                            }}
                          />
                          <span className="text-xs font-bold text-slate-300 ml-1">/ {maxScore}</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Bài làm của học sinh:</p>
                        <div className="p-4 bg-white rounded-2xl border border-slate-100 font-bold text-slate-700 min-h-[60px]">
                          {ans?.answer ? String(ans.answer) : '(Trống)'}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> AI Analysis:
                        </p>
                        <div className="p-4 bg-blue-100/50 rounded-2xl border border-blue-100 font-bold text-blue-800 text-xs italic leading-relaxed">
                          {ans?.feedback ? String(ans.feedback) : 'AI không tìm thấy lỗi.'}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {questions.length === 0 && (
                <div className="p-10 text-center bg-slate-50 rounded-[2.5rem] border border-slate-100 text-slate-300 font-black uppercase tracking-widest">
                  Bài tập chưa có câu hỏi
                </div>
              )}
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
                  className="w-full bg-blue-600 text-white py-6 rounded-2xl font-black text-lg shadow-xl shadow-blue-100 flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-60"
                >
                  {isSaving ? <Loader2 className="animate-spin" /> : <Check className="w-6 h-6" />} XÁC NHẬN ĐIỂM
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center bg-slate-50 rounded-[4rem] border-4 border-dashed border-slate-200 text-slate-300 font-black uppercase tracking-widest">
            Chọn bài làm để chấm
          </div>
        )}
      </div>
    </div>
  );
};

export default AssignmentSubmissions;
