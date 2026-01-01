
import React, { useState, useRef, useEffect } from 'react';
import { User, Question, Difficulty, QuestionBankItem, Assignment, QuestionType } from '../types';
import { 
  Sparkles, Save, Trash2, CheckCircle2, ListChecks, FileUp, 
  ArrowRightLeft, Tags, BarChart3, FileText, Info, Loader2, 
  CloudUpload, Edit3, Check, X as CloseIcon, Database, Plus, Search, Filter, BookOpen,
  MessageSquareQuote, Repeat, FileType, HelpCircle, ChevronRight, PlusCircle,
  GripVertical, Copy, SaveAll, Hash, PencilLine
} from 'lucide-react';
import { recognizeQuestionsFromText, postToAPI, fetchFromAPI } from '../services/api';
import { useOutletContext } from 'react-router-dom';

declare var mammoth: any;
declare var pdfjsLib: any;

const CreateAssignment: React.FC<{ user: User }> = ({ user }) => {
  const { activeClassId } = useOutletContext<{ activeClassId: string }>();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [type, setType] = useState<'Quiz' | 'Writing' | 'Homework'>('Quiz');
  const [maxAttempts, setMaxAttempts] = useState(1);

  const [mode, setMode] = useState<'ai' | 'bank' | 'manual'>('ai');
  const [aiProposedQuestions, setAiProposedQuestions] = useState<Question[]>([]);
  const [draftQuestions, setDraftQuestions] = useState<Question[]>([]);
  const [bankQuestions, setBankQuestions] = useState<QuestionBankItem[]>([]);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingBank, setIsLoadingBank] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [bankSearch, setBankSearch] = useState('');
  
  const [editingIndex, setEditingIndex] = useState<{ type: 'ai' | 'draft', index: number } | null>(null);
  const [editingData, setEditingData] = useState<Question | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mode === 'bank' && bankQuestions.length === 0) loadBank();
  }, [mode]);

  const loadBank = async () => {
    setIsLoadingBank(true);
    try {
      const data = await fetchFromAPI<QuestionBankItem[]>('getQuestionBank', { teacher_id: user.id });
      setBankQuestions(Array.isArray(data) ? data : []);
    } catch (e) { setBankQuestions([]); } finally { setIsLoadingBank(false); }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(''); setIsProcessing(true); setAiProposedQuestions([]);
    try {
      let text = "";
      if (file.type === "application/pdf") {
        const doc = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i);
          const content = await page.getTextContent();
          text += content.items.map((item: any) => item.str).join(" ") + "\n";
        }
      } else if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        text = (await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })).value;
      } else text = await file.text();

      const results = await recognizeQuestionsFromText(text);
      setAiProposedQuestions(results.map((q, i) => ({ ...q, id: `ai-${Date.now()}-${i}`, score: q.score || 1 })));
    } catch (err: any) { setError(err.message || "Lỗi tệp."); } finally { setIsProcessing(false); }
  };

  const addManualQuestion = () => {
    const newQ: Question = {
      id: `manual-${Date.now()}`,
      type: 'multiple_choice',
      text: 'Câu hỏi mới...',
      options: ['A', 'B', 'C', 'D'],
      correctAnswer: '',
      difficulty: 'Medium',
      topic: 'General',
      score: 1
    };
    setDraftQuestions(prev => [...prev, newQ]);
    startEditing('draft', draftQuestions.length);
  };

  const addQuestionToAssignment = (q: Question, fromIndex: number) => {
    setDraftQuestions(prev => [...prev, { ...q, id: `draft-${Date.now()}-${prev.length}` }]);
    setAiProposedQuestions(prev => prev.filter((_, i) => i !== fromIndex));
  };

  const startEditing = (type: 'ai' | 'draft', index: number) => {
    setEditingIndex({ type, index });
    setEditingData({ ...(type === 'ai' ? aiProposedQuestions[index] : draftQuestions[index]) });
  };

  const saveEdit = () => {
    if (editingIndex && editingData) {
      if (editingIndex.type === 'ai') {
        const updated = [...aiProposedQuestions]; updated[editingIndex.index] = editingData;
        setAiProposedQuestions(updated);
      } else {
        const updated = [...draftQuestions]; updated[editingIndex.index] = editingData;
        setDraftQuestions(updated);
      }
      setEditingIndex(null); setEditingData(null);
    }
  };

  const handleSaveAssignment = async () => {
    if (!title || !deadline) return setError('Thiếu tiêu đề/hạn nộp.');
    setIsSaving(true);
    try {
      await postToAPI('createAssignment', {
        class_id: activeClassId,
        title, deadline, type, max_attempts: maxAttempts,
        questions_json: JSON.stringify(draftQuestions),
        teacher_id: user.id
      });
      alert('Đã xuất bản bài tập!');
      setDraftQuestions([]); setTitle('');
    } catch (e: any) { setError(e.message); } finally { setIsSaving(false); }
  };

  const totalPoints = draftQuestions.reduce((sum, q) => sum + (q.score || 0), 0);

  return (
    <div className="space-y-8 pb-32 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg"><BookOpen className="w-8 h-8" /></div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Soạn bài tập</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Tổng điểm đề thi: <span className="text-blue-600">{totalPoints}đ</span></p>
          </div>
        </div>
        <button onClick={handleSaveAssignment} disabled={isSaving || draftQuestions.length === 0} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black shadow-xl hover:bg-blue-600 transition-all flex items-center gap-3 disabled:opacity-30">
          {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <SaveAll className="w-5 h-5" />} Xuất bản ({draftQuestions.length} câu)
        </button>
      </div>

      <div className="grid lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 space-y-8">
          <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-50 space-y-6">
            <h3 className="text-xl font-black text-slate-800 flex items-center gap-3"><PlusCircle className="w-5 h-5 text-blue-600" /> Cấu hình</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <input className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold outline-none" placeholder="Tên bài tập" value={title} onChange={e => setTitle(e.target.value)} />
              <input type="date" className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold outline-none" value={deadline} onChange={e => setDeadline(e.target.value)} />
            </div>
          </div>

          <div className="flex p-2 bg-white rounded-[2rem] shadow-sm border border-slate-100">
            {['ai', 'bank', 'manual'].map(m => (
              <button key={m} onClick={() => setMode(m as any)} className={`flex-1 py-4 rounded-[1.5rem] font-black text-xs uppercase tracking-widest transition-all ${mode === m ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400'}`}>
                {m === 'ai' ? 'File AI' : m === 'bank' ? 'Ngân hàng' : 'Thủ công'}
              </button>
            ))}
          </div>

          <div className="min-h-[500px]">
            {mode === 'ai' && (
              <div className="space-y-6">
                {aiProposedQuestions.length === 0 ? (
                  <div onClick={() => !isProcessing && fileInputRef.current?.click()} className="bg-white border-4 border-dashed rounded-[3rem] p-16 text-center cursor-pointer hover:bg-blue-50/30">
                    <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.docx,.txt" onChange={handleFileSelect} />
                    {isProcessing ? <Loader2 className="w-16 h-16 text-blue-600 animate-spin mx-auto" /> : <CloudUpload className="w-16 h-16 text-blue-600 mx-auto mb-4" />}
                    <h4 className="text-2xl font-black text-slate-800">Tải đề thô lên</h4>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {aiProposedQuestions.map((q, i) => (
                      <div key={q.id} className="bg-white p-6 rounded-[2rem] shadow-md border border-slate-100 flex items-start gap-6 group">
                        <div className="flex-1 space-y-2">
                          <div className="flex gap-2">
                            <span className="px-2 py-0.5 rounded-md text-[9px] font-black bg-blue-50 text-blue-500 border border-blue-100 uppercase">{q.type}</span>
                            <span className="px-2 py-0.5 rounded-md text-[9px] font-black bg-slate-100 text-slate-500 border border-slate-200 uppercase">{q.score}đ</span>
                          </div>
                          <p className="font-bold text-slate-700 text-sm">{q.text}</p>
                        </div>
                        <div className="flex flex-col gap-2">
                          <button onClick={() => addQuestionToAssignment(q, i)} className="p-3 bg-blue-600 text-white rounded-xl shadow-lg hover:bg-slate-900 transition-all text-[10px] font-black uppercase">Thêm</button>
                          <button onClick={() => startEditing('ai', i)} className="p-3 bg-slate-100 text-slate-500 rounded-xl text-[10px] font-black uppercase">Sửa</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {mode === 'manual' && (
              <div className="bg-white border-4 border-dashed rounded-[3rem] p-20 text-center space-y-6">
                <Edit3 className="w-16 h-16 text-blue-600 mx-auto" />
                <button onClick={addManualQuestion} className="bg-blue-600 text-white px-10 py-5 rounded-2xl font-black text-lg shadow-xl hover:scale-105 transition-all">Tạo câu hỏi mới</button>
              </div>
            )}
            {mode === 'bank' && (
              <div className="bg-white rounded-[3rem] shadow-xl p-8 h-[600px] overflow-y-auto space-y-4 custom-scrollbar">
                {bankQuestions.map(q => (
                  <div key={q.id} className="p-5 bg-slate-50 rounded-[2rem] border border-slate-100 flex justify-between items-center group">
                    <p className="font-bold text-slate-700 truncate text-sm flex-1 pr-4">{q.text}</p>
                    <button onClick={() => setDraftQuestions(prev => [...prev, { ...q, id: `bank-${q.id}-${Date.now()}`, score: 1 } as any])} className="w-10 h-10 bg-white text-blue-600 rounded-xl shadow-sm flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all"><Plus className="w-5 h-5"/></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-4 sticky top-24">
          <div className="bg-slate-900 p-8 rounded-[3.5rem] shadow-2xl h-[750px] text-white flex flex-col">
            <h3 className="text-xl font-black mb-8">Danh sách câu hỏi ({draftQuestions.length})</h3>
            <div className="flex-1 overflow-y-auto space-y-5 custom-scrollbar pr-1 pb-6">
              {draftQuestions.map((q, idx) => (
                <div key={q.id} onClick={() => startEditing('draft', idx)} className="p-5 rounded-[2rem] bg-white/5 border border-white/10 group hover:bg-white/10 transition-all cursor-pointer">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">CÂU {idx + 1} - {q.score}đ</span>
                    <button onClick={(e) => { e.stopPropagation(); setDraftQuestions(prev => prev.filter(p => p.id !== q.id)); }} className="text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4" /></button>
                  </div>
                  <p className="font-bold text-sm leading-relaxed text-white/90 line-clamp-2">{q.text}</p>
                  <span className="mt-2 inline-block px-2 py-0.5 rounded-md text-[8px] font-black uppercase bg-blue-500/20 text-blue-400">{q.type}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {editingData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-md bg-slate-900/60">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in duration-300">
            <div className="p-8 border-b flex items-center justify-between bg-slate-50/50">
              <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3"><PencilLine className="w-6 h-6 text-blue-600" /> Tinh chỉnh câu hỏi</h3>
              <button onClick={saveEdit} className="p-2 hover:bg-slate-200 rounded-xl transition-all"><CloseIcon className="w-6 h-6 text-slate-400" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nội dung câu hỏi</label>
                <textarea className="w-full p-6 bg-slate-50 border border-slate-100 rounded-3xl font-bold text-lg outline-none focus:bg-white transition-all min-h-[100px]" value={editingData.text} onChange={e => setEditingData({...editingData, text: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Loại câu hỏi</label>
                  <select className="w-full px-6 py-4 bg-slate-50 border rounded-2xl font-bold outline-none" value={editingData.type} onChange={e => setEditingData({...editingData, type: e.target.value as any})}>
                    <option value="multiple_choice">Trắc nghiệm</option>
                    <option value="fill_blank">Điền từ/Chia từ</option>
                    <option value="essay">Tự luận ngắn</option>
                    <option value="true_false">Đúng/Sai</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2"><Hash className="w-3 h-3"/> Điểm số</label>
                  <input type="number" className="w-full px-6 py-4 bg-blue-50 border border-blue-100 text-blue-600 rounded-2xl font-black outline-none" value={editingData.score} onChange={e => setEditingData({...editingData, score: Number(e.target.value)})} />
                </div>
              </div>

              {editingData.type === 'multiple_choice' && editingData.options && (
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phương án & Đáp án</label>
                  {editingData.options.map((opt, i) => (
                    <div key={i} className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all ${editingData.correctAnswer === opt ? 'bg-emerald-50 border-emerald-500' : 'bg-slate-50 border-slate-100'}`}>
                      <button onClick={() => setEditingData({...editingData, correctAnswer: opt})} className={`w-8 h-8 rounded-full flex items-center justify-center font-black ${editingData.correctAnswer === opt ? 'bg-emerald-500 text-white shadow-md' : 'bg-white text-slate-300 border'}`}>{String.fromCharCode(65+i)}</button>
                      <input className="flex-1 bg-transparent border-none outline-none font-bold text-slate-700" value={opt} onChange={e => {
                        const opts = [...(editingData.options || [])]; opts[i] = e.target.value; setEditingData({...editingData, options: opts});
                      }} />
                    </div>
                  ))}
                </div>
              )}

              {(editingData.type === 'fill_blank' || editingData.type === 'essay') && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Đáp án gợi ý (Hệ thống so khớp)</label>
                  <input className="w-full px-6 py-4 bg-emerald-50 border border-emerald-100 rounded-2xl font-black text-emerald-600 outline-none" value={editingData.correctAnswer || ''} onChange={e => setEditingData({...editingData, correctAnswer: e.target.value})} placeholder="VD: goes / has been..." />
                </div>
              )}
            </div>
            <div className="p-8 bg-slate-50 border-t flex gap-4">
              <button onClick={() => setEditingData(null)} className="flex-1 px-8 py-4 bg-white border border-slate-200 rounded-2xl font-black text-slate-400">Hủy</button>
              <button onClick={saveEdit} className="flex-[2] px-8 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg">Lưu cập nhật</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateAssignment;
