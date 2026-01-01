
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Assignment, Question, Submission } from '../types';
import { fetchFromAPI, postToAPI, evaluateStudentAnswers } from '../services/api';
import { Loader2, Award, CheckCircle2, ArrowLeft, ArrowRight, MessageSquare, Clock, Send, Info, Lock } from 'lucide-react';

const DoAssignment: React.FC<{ user: User }> = ({ user }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [resultSubmission, setResultSubmission] = useState<any>(null);
  
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  useEffect(() => { loadAssignment(); }, [id]);

  const loadAssignment = async () => {
    setIsLoading(true);
    try {
      const data = await fetchFromAPI<any>('getAssignmentById', { id: id!, student_id: user.id });
      if (data) {
        setAssignment(data);
        const qs = typeof data.questions_json === 'string' ? JSON.parse(data.questions_json || '[]') : data.questions_json;
        setQuestions(Array.isArray(qs) ? qs : []);
        
        if ((data.attempt_count || 0) >= (data.max_attempts || 1) && data.last_submission) {
          const sub = data.last_submission;
          sub.answers_json = typeof sub.answers_json === 'string' ? JSON.parse(sub.answers_json || '{}') : sub.answers_json;
          setResultSubmission(sub);
          setShowResult(true);
        }
      }
    } catch (e) { console.error("Error loading assignment:", e); } finally { setIsLoading(false); }
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const aiEvaluation = await evaluateStudentAnswers(questions, answers);
      
      let autoScore = 0;
      const detailedAnswers: Record<string, any> = {};
      let hasEssay = false;

      questions.forEach(q => {
        const evalResult = aiEvaluation[q.id] || { isCorrect: false, scoreEarned: 0, feedback: "N/A" };
        
        detailedAnswers[q.id] = {
          answer: answers[q.id] || "",
          isCorrect: evalResult.isCorrect,
          scoreEarned: evalResult.scoreEarned,
          feedback: evalResult.feedback,
          isSubjective: q.type === 'essay'
        };
        
        if (q.type !== 'essay') {
          autoScore += evalResult.scoreEarned;
        } else {
          hasEssay = true;
        }
      });

      const totalPossibleScore = questions.reduce((sum, q) => sum + (q.score || 1), 0);

      const payload = {
        assignment_id: id,
        student_id: user.id,
        student_name: user.name,
        score: autoScore,
        auto_score: autoScore,
        total_possible_score: totalPossibleScore,
        is_essay_confirmed: !hasEssay,
        answers_json: JSON.stringify(detailedAnswers),
        status: hasEssay ? 'Submitted' : 'Graded',
        timestamp: Date.now()
      };

      await postToAPI('submitAssignment', payload);
      alert('Đã nộp bài thành công!');
      loadAssignment();
    } catch (e) { alert('Lỗi nộp bài.'); } finally { setIsSubmitting(false); }
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-blue-50/30"><Loader2 className="animate-spin text-blue-600 w-12 h-12" /></div>;

  if (showResult && resultSubmission) {
    const isEssayConfirmed = resultSubmission.is_essay_confirmed;
    const totalMax = resultSubmission.total_possible_score || 0;
    const displayScore = isEssayConfirmed ? resultSubmission.score : resultSubmission.auto_score;
    const submissionAnswers = resultSubmission.answers_json || {};

    return (
      <div className="max-w-4xl mx-auto py-16 px-6">
        <div className="bg-white rounded-[4rem] shadow-2xl border border-slate-100 p-12 text-center">
          <Award className="w-24 h-24 text-blue-600 mx-auto mb-8" />
          <h2 className="text-4xl font-black text-slate-900 mb-2">Kết quả bài làm</h2>
          
          <div className="relative inline-block my-10">
            <div className="text-9xl font-black text-blue-600 flex items-baseline justify-center">
              {displayScore}
              <span className="text-3xl text-slate-300 ml-2 font-bold">/ {totalMax}</span>
            </div>
          </div>

          {!isEssayConfirmed && (
            <div className="bg-amber-50 border border-amber-100 p-6 rounded-[2rem] flex items-center gap-4 text-left max-w-xl mx-auto mb-10">
               <Lock className="w-8 h-8 text-amber-500 shrink-0" />
               <p className="text-amber-800 font-bold text-sm leading-relaxed">
                 Điểm số hiện tại chỉ bao gồm phần trắc nghiệm và điền từ. <br/>
                 <span className="text-[10px] uppercase font-black opacity-60">Phần tự luận đang chờ giáo viên phê duyệt.</span>
               </p>
            </div>
          )}

          <div className="space-y-4 mb-10">
            {Object.entries(submissionAnswers).map(([qId, data]: [string, any], idx) => (
              <div key={qId} className={`p-6 rounded-3xl border text-left flex justify-between items-center ${data.isSubjective && !isEssayConfirmed ? 'bg-slate-50 border-slate-100' : (data.isCorrect ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100')}`}>
                <div className="flex-1">
                  <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Câu {idx + 1}</p>
                  <p className="font-bold text-slate-700">{data.answer || "(Bỏ trống)"}</p>
                </div>
                <div className="text-right">
                  {data.isSubjective && !isEssayConfirmed ? (
                    <Clock className="w-5 h-5 text-slate-300" />
                  ) : (
                    <p className={`font-black ${data.isCorrect ? 'text-emerald-600' : 'text-rose-600'}`}>{data.scoreEarned}đ</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button onClick={() => navigate('/dashboard/assignments')} className="bg-slate-900 text-white px-12 py-5 rounded-2xl font-black text-xl hover:bg-blue-600 transition-all">
            Quay lại danh sách
          </button>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIdx];

  return (
    <div className="max-w-4xl mx-auto py-12 px-6">
      <div className="bg-white rounded-[3.5rem] shadow-2xl border border-slate-100 overflow-hidden flex flex-col min-h-[600px]">
        <div className="p-8 bg-slate-50 border-b flex items-center justify-between">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg font-black">{currentIdx + 1}</div>
             <div>
               <h3 className="font-black text-slate-800 text-lg">{assignment?.title}</h3>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Câu hỏi {currentIdx + 1} / {questions.length} • {currentQ?.score || 1} điểm</p>
             </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setCurrentIdx(i => Math.max(0, i-1))} disabled={currentIdx === 0} className="p-4 hover:bg-white rounded-2xl text-slate-400 disabled:opacity-30"><ArrowLeft className="w-5 h-5"/></button>
            <button onClick={() => setCurrentIdx(i => Math.min(questions.length - 1, i+1))} disabled={currentIdx === questions.length - 1} className="p-4 hover:bg-white rounded-2xl text-slate-400 disabled:opacity-30"><ArrowRight className="w-5 h-5"/></button>
          </div>
        </div>

        <div className="p-12 flex-1">
          <p className="text-2xl font-black text-slate-700 leading-relaxed mb-10">{currentQ?.text}</p>
          
          {currentQ?.type === 'multiple_choice' && (
            <div className="grid gap-4">
              {currentQ.options?.map((opt, i) => (
                <button 
                  key={i} 
                  onClick={() => setAnswers({...answers, [currentQ.id]: opt})}
                  className={`p-6 rounded-3xl border-2 text-left text-lg font-bold transition-all ${answers[currentQ.id] === opt ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 border-slate-100 hover:bg-white'}`}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}

          {(currentQ?.type === 'fill_blank' || currentQ?.type === 'ordering' || currentQ?.type === 'essay') && (
            <textarea 
              className="w-full p-8 bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] font-bold text-xl min-h-[150px] outline-none focus:bg-white focus:border-blue-600 transition-all"
              placeholder="Gõ câu trả lời của bạn..."
              value={answers[currentQ.id] || ''}
              onChange={e => setAnswers({...answers, [currentQ.id]: e.target.value})}
            />
          )}

          {currentQ?.type === 'true_false' && (
            <div className="flex gap-6">
              {['True', 'False'].map(val => (
                <button 
                  key={val} 
                  onClick={() => setAnswers({...answers, [currentQ.id]: val})}
                  className={`flex-1 py-10 rounded-3xl border-2 font-black text-2xl ${answers[currentQ.id] === val ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-300 border-slate-100'}`}
                >
                  {val}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="p-10 bg-slate-50 border-t flex justify-center">
          {currentIdx === questions.length - 1 ? (
            <button onClick={handleSubmit} disabled={isSubmitting} className="bg-emerald-500 text-white px-16 py-5 rounded-[2rem] font-black text-xl shadow-xl hover:bg-emerald-600 active:scale-95 flex items-center gap-3">
              {isSubmitting ? <Loader2 className="animate-spin" /> : <Send className="w-6 h-6" />} NỘP BÀI
            </button>
          ) : (
            <button onClick={() => setCurrentIdx(i => i + 1)} className="bg-slate-900 text-white px-16 py-5 rounded-[2rem] font-black text-xl shadow-xl hover:bg-blue-600 active:scale-95">
              TIẾP THEO
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DoAssignment;
