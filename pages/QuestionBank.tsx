
import React, { useState, useEffect } from 'react';
import { User, QuestionBankItem, Difficulty, QuestionType } from '../types';
import { fetchFromAPI, postToAPI } from '../services/api';
import { 
  Database, Search, Trash2, Plus, X, ArrowRightLeft, 
  Tags, Filter, BarChart3, Loader2, PlusCircle, Save,
  CheckCircle, HelpCircle, Edit2
} from 'lucide-react';

const QuestionBank: React.FC<{ user: User }> = ({ user }) => {
  const [questions, setQuestions] = useState<QuestionBankItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState<Difficulty | 'All'>('All');
  const [filterTopic, setFilterTopic] = useState('All');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formQ, setFormQ] = useState({
    text: '',
    type: 'multiple_choice' as QuestionType,
    difficulty: 'Medium' as Difficulty,
    category: '',
    correct_answer: '',
    explanation: '',
    options: ['', '', '', ''],
    matchingPairs: [{ left: '', right: '' }]
  });

  useEffect(() => { loadBank(); }, []);

  const loadBank = async () => {
    setLoading(true);
    try {
      const data = await fetchFromAPI<QuestionBankItem[]>('getQuestionBank', { teacher_id: user.id });
      setQuestions(Array.isArray(data) ? data : []);
    } catch (e) { 
      console.error(e);
      setQuestions([]);
    } finally { setLoading(false); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Xóa câu hỏi khỏi kho lưu trữ?")) return;
    try {
      await postToAPI('deleteQuestion', { id });
      setQuestions(prev => prev.filter(q => q.id !== id));
    } catch (e) { alert("Lỗi khi xóa"); }
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormQ({
      text: '',
      type: 'multiple_choice',
      difficulty: 'Medium',
      category: '',
      correct_answer: '',
      explanation: '',
      options: ['', '', '', ''],
      matchingPairs: [{ left: '', right: '' }]
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (q: QuestionBankItem) => {
    setEditingId(q.id);
    
    // Parse options_json logic
    let opts = ['', '', '', ''];
    let pairs = [{ left: '', right: '' }];
    
    if (q.type === 'multiple_choice' || q.type === 'true_false') {
      if (Array.isArray(q.options_json)) {
        q.options_json.forEach((val, i) => { if(i < 4) opts[i] = val; });
      }
    } else if (q.type === 'matching') {
      if (Array.isArray(q.options_json)) pairs = q.options_json;
    }

    setFormQ({
      text: q.text,
      type: q.type as QuestionType,
      difficulty: q.difficulty as Difficulty,
      category: q.category || '',
      correct_answer: q.correct_answer || '',
      explanation: q.explanation || '',
      options: opts,
      matchingPairs: pairs
    });
    setIsModalOpen(true);
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formQ.text.trim()) return alert("Vui lòng nhập nội dung câu hỏi.");
    if (!formQ.category.trim()) return alert("Vui lòng nhập chủ đề.");

    setIsSaving(true);
    try {
      let options_json: any = [];
      if (formQ.type === 'multiple_choice') {
        options_json = formQ.options.filter(o => o.trim() !== '');
      } else if (formQ.type === 'matching') {
        options_json = formQ.matchingPairs.filter(p => p.left.trim() && p.right.trim());
      } else if (formQ.type === 'true_false') {
        options_json = ['True', 'False'];
      }

      const payload = {
        id: editingId,
        text: formQ.text.trim(),
        type: formQ.type,
        difficulty: formQ.difficulty,
        category: formQ.category.trim(),
        correct_answer: String(formQ.correct_answer).trim(),
        explanation: formQ.explanation.trim(),
        options_json: options_json,
        teacher_id: user.id
      };

      const action = editingId ? 'updateQuestion' : 'createBankQuestion';
      await postToAPI(action, payload);
      
      alert(editingId ? "Đã cập nhật câu hỏi!" : "Đã lưu câu hỏi thành công!");
      setIsModalOpen(false);
      loadBank();
    } catch (err: any) {
      console.error("Lỗi khi lưu:", err);
      alert("Lỗi: " + (err.message || "Không thể thực hiện yêu cầu."));
    } finally {
      setIsSaving(false);
    }
  };

  const topics = ['All', ...new Set(questions.map(q => q.category).filter(Boolean))];

  const filtered = questions.filter(q => {
    const rawText = q?.text || "";
    const safeText = String(rawText).toLowerCase();
    const safeSearch = (searchTerm || "").toLowerCase();
    
    const matchesSearch = safeText.includes(safeSearch);
    const matchesDifficulty = filterDifficulty === 'All' || q.difficulty === filterDifficulty;
    const matchesTopic = filterTopic === 'All' || q.category === filterTopic;
    return matchesSearch && matchesDifficulty && matchesTopic;
  });

  const getDifficultyBadge = (d: Difficulty) => {
    if (d === 'Easy') return 'bg-emerald-50 text-emerald-600 border-emerald-100';
    if (d === 'Medium') return 'bg-amber-50 text-amber-600 border-amber-100';
    if (d === 'Hard') return 'bg-rose-50 text-rose-600 border-rose-100';
    return 'bg-slate-50 text-slate-500 border-slate-100';
  };

  return (
    <div className="space-y-8 relative">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Ngân hàng đề thông minh</h2>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">Kho tài liệu đã phân loại AI</p>
        </div>
        <button 
          onClick={handleOpenCreate}
          className="bg-slate-900 text-white px-8 py-4 rounded-[1.5rem] font-black shadow-2xl flex items-center gap-2 hover:bg-blue-600 transition-all active:scale-95"
        >
          <PlusCircle className="w-6 h-6" /> Soạn câu hỏi mới
        </button>
      </div>

      <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 space-y-6">
        <div className="relative">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-semibold outline-none focus:bg-white focus:ring-4 focus:ring-blue-50 transition-all" 
            placeholder="Tìm theo nội dung câu hỏi..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
          />
        </div>

        <div className="flex flex-wrap gap-4 items-center text-sm font-bold">
          <div className="flex items-center gap-2 text-slate-400 uppercase text-[10px] tracking-widest mr-2">
            <Filter className="w-4 h-4"/> Bộ lọc:
          </div>
          
          <select 
            className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl outline-none font-bold"
            value={filterDifficulty}
            onChange={e => setFilterDifficulty(e.target.value as any)}
          >
            <option value="All">Tất cả mức độ</option>
            <option value="Easy">Dễ (Easy)</option>
            <option value="Medium">Trung bình (Medium)</option>
            <option value="Hard">Khó (Hard)</option>
          </select>

          <select 
            className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl outline-none font-bold"
            value={filterTopic}
            onChange={e => setFilterTopic(e.target.value)}
          >
            {topics.map(t => <option key={t} value={t}>{t === 'All' ? 'Tất cả chủ đề' : t}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center animate-pulse font-bold text-slate-400">Đang đồng bộ kho dữ liệu...</div>
      ) : (
        <div className="grid gap-6">
          {filtered.map((q) => (
            <div key={q.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm hover:border-blue-300 transition-all group">
              <div className="flex justify-between items-start mb-6">
                <div className="flex flex-wrap gap-2">
                  <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase border ${getDifficultyBadge(q.difficulty as Difficulty)}`}>
                    {q.difficulty || 'Medium'}
                  </span>
                  <span className="px-3 py-1 bg-purple-50 text-purple-600 border border-purple-100 rounded-lg text-[10px] font-black uppercase flex items-center gap-1">
                    <Tags className="w-3 h-3"/> {q.category || 'General'}
                  </span>
                  <span className="px-3 py-1 bg-slate-50 text-slate-400 border border-slate-100 rounded-lg text-[10px] font-black uppercase">
                    {q.type || 'multiple_choice'}
                  </span>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                  <button onClick={() => handleOpenEdit(q)} className="p-2 text-slate-300 hover:text-blue-600 rounded-xl hover:bg-blue-50 transition-all"><Edit2 className="w-5 h-5" /></button>
                  <button onClick={() => handleDelete(q.id)} className="p-2 text-slate-300 hover:text-red-500 rounded-xl hover:bg-red-50 transition-all"><Trash2 className="w-5 h-5" /></button>
                </div>
              </div>

              <p className="text-xl font-bold text-slate-800 mb-6 leading-relaxed">{q.text}</p>

              {(q.type === 'multiple_choice' || !q.type || q.type === 'true_false') && q.options_json && Array.isArray(q.options_json) && (
                <div className="grid md:grid-cols-2 gap-3">
                  {q.options_json.map((opt: string, i: number) => (
                    <div key={i} className={`p-4 rounded-2xl border font-bold text-sm ${opt === q.correct_answer ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                      <span className="text-slate-300 mr-2">{q.type === 'true_false' ? (opt === 'True' ? '✓' : '✗') : String.fromCharCode(65 + i)}.</span> {opt}
                    </div>
                  ))}
                </div>
              )}

              {q.type === 'matching' && q.options_json && Array.isArray(q.options_json) && (
                <div className="space-y-3 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                  {q.options_json.map((pair: any, i: number) => (
                    <div key={i} className="flex items-center gap-4">
                      <div className="flex-1 p-3 bg-white rounded-xl border border-slate-200 font-bold text-slate-700 text-sm shadow-sm">{pair.left}</div>
                      <ArrowRightLeft className="w-4 h-4 text-blue-400" />
                      <div className="flex-1 p-3 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-md">{pair.right}</div>
                    </div>
                  ))}
                </div>
              )}

              {q.type === 'fill_blank' && (
                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-center gap-3">
                  <div className="bg-blue-600 p-2 rounded-lg text-white"><BarChart3 className="w-4 h-4" /></div>
                  <div>
                    <p className="text-[10px] font-black text-blue-400 uppercase">Đáp án hệ thống</p>
                    <p className="font-bold text-blue-800">{q.correct_answer}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="py-20 text-center bg-slate-100 rounded-[3rem] border-2 border-dashed border-slate-200">
              <Database className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="font-bold text-slate-400">Không tìm thấy câu hỏi phù hợp với bộ lọc.</p>
            </div>
          )}
        </div>
      )}

      {/* Modal Soạn / Sửa câu hỏi */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10 overflow-y-auto">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => !isSaving && setIsModalOpen(false)}></div>
          <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl relative z-10 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-10 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-3xl font-black text-slate-900 tracking-tight">{editingId ? 'Chỉnh sửa câu hỏi' : 'Soạn thảo tài liệu'}</h3>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">Lưu trữ vào ngân hàng đề chung</p>
              </div>
              <button onClick={() => !isSaving && setIsModalOpen(false)} className="p-3 hover:bg-slate-100 rounded-2xl transition-all">
                <X className="w-8 h-8 text-slate-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
              <form onSubmit={handleSaveQuestion} className="space-y-10">
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Loại hình câu hỏi</label>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { id: 'multiple_choice', label: 'Trắc nghiệm', icon: CheckCircle },
                        { id: 'matching', label: 'Nối câu', icon: ArrowRightLeft },
                        { id: 'fill_blank', label: 'Điền từ', icon: BarChart3 },
                        { id: 'true_false', label: 'Đúng/Sai', icon: HelpCircle }
                      ].map(type => (
                        <button
                          key={type.id}
                          type="button"
                          onClick={() => setFormQ({ ...formQ, type: type.id as any, correct_answer: '' })}
                          className={`flex items-center gap-3 p-4 rounded-2xl border font-bold transition-all ${formQ.type === type.id ? 'bg-blue-600 text-white border-blue-600 shadow-lg' : 'bg-slate-50 text-slate-600 border-slate-100 hover:border-blue-200'}`}
                        >
                          <type.icon className="w-5 h-5" />
                          <span className="text-xs">{type.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Phân loại AI</label>
                    <div className="grid grid-cols-2 gap-4">
                      <select 
                        className="p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-50"
                        value={formQ.difficulty}
                        onChange={e => setFormQ({ ...formQ, difficulty: e.target.value as any })}
                      >
                        <option value="Easy">Dễ (Easy)</option>
                        <option value="Medium">Trung bình</option>
                        <option value="Hard">Khó (Hard)</option>
                      </select>
                      <input 
                        className="p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-50"
                        placeholder="Chủ đề (VD: Tenses)"
                        value={formQ.category}
                        onChange={e => setFormQ({ ...formQ, category: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Nội dung câu hỏi</label>
                  <textarea 
                    className="w-full p-8 bg-slate-50 border border-slate-100 rounded-[2rem] font-bold text-xl outline-none focus:bg-white focus:ring-4 focus:ring-blue-50 min-h-[150px] transition-all"
                    placeholder="Nhập nội dung câu hỏi tiếng Anh tại đây..."
                    value={formQ.text}
                    onChange={e => setFormQ({ ...formQ, text: e.target.value })}
                    required
                  />
                </div>

                {formQ.type === 'multiple_choice' && (
                  <div className="space-y-6">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Các phương án lựa chọn</label>
                    <div className="grid md:grid-cols-2 gap-4">
                      {formQ.options.map((opt, i) => (
                        <div key={i} className="relative group">
                          <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-slate-300 group-focus-within:text-blue-500 transition-colors">{String.fromCharCode(65 + i)}.</span>
                          <input 
                            className="w-full pl-14 pr-6 py-5 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:bg-white focus:ring-4 focus:ring-blue-50 transition-all"
                            value={opt}
                            placeholder={`Phương án ${String.fromCharCode(65+i)}`}
                            onChange={e => {
                              const opts = [...formQ.options];
                              opts[i] = e.target.value;
                              setFormQ({ ...formQ, options: opts });
                            }}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100 space-y-3">
                      <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                        <CheckCircle className="w-4 h-4"/> Đáp án đúng
                      </label>
                      <select 
                        className="w-full p-3 bg-white border border-emerald-200 rounded-xl font-black text-emerald-800 outline-none"
                        value={formQ.correct_answer}
                        onChange={e => setFormQ({ ...formQ, correct_answer: e.target.value })}
                      >
                        <option value="">Chọn một phương án...</option>
                        {formQ.options.map((opt, i) => opt.trim() && (
                          <option key={i} value={opt}>{String.fromCharCode(65+i)}. {opt}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {formQ.type === 'true_false' && (
                  <div className="p-8 bg-blue-50 rounded-[2.5rem] border border-blue-100 space-y-6">
                    <label className="text-xs font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                       <HelpCircle className="w-5 h-5" /> Chọn đáp án đúng
                    </label>
                    <div className="flex gap-4">
                      {['True', 'False'].map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setFormQ({ ...formQ, correct_answer: val })}
                          className={`flex-1 py-6 rounded-3xl font-black text-xl transition-all border-2 ${formQ.correct_answer === val ? 'bg-blue-600 text-white border-blue-600 shadow-xl' : 'bg-white text-slate-400 border-slate-100 hover:border-blue-200'}`}
                        >
                          {val === 'True' ? '✓ TRUE' : '✗ FALSE'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {formQ.type === 'matching' && (
                  <div className="space-y-4">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Cặp nối tương ứng</label>
                    <div className="space-y-3">
                      {formQ.matchingPairs.map((pair, i) => (
                        <div key={i} className="flex gap-4 items-center animate-in slide-in-from-left duration-300">
                          <input 
                            className="flex-1 p-4 bg-slate-50 border border-slate-100 rounded-xl font-bold outline-none focus:bg-white transition-all"
                            placeholder="Vế trái (VD: Apple)"
                            value={pair.left}
                            onChange={e => {
                              const pairs = [...formQ.matchingPairs];
                              pairs[i].left = e.target.value;
                              setFormQ({ ...formQ, matchingPairs: pairs });
                            }}
                          />
                          <ArrowRightLeft className="w-5 h-5 text-slate-300" />
                          <input 
                            className="flex-1 p-4 bg-blue-50 border border-blue-100 rounded-xl font-bold outline-none focus:bg-blue-100/50 transition-all"
                            placeholder="Vế phải (VD: Quả táo)"
                            value={pair.right}
                            onChange={e => {
                              const pairs = [...formQ.matchingPairs];
                              pairs[i].right = e.target.value;
                              setFormQ({ ...formQ, matchingPairs: pairs });
                            }}
                          />
                          <button 
                            type="button" 
                            onClick={() => setFormQ({ ...formQ, matchingPairs: formQ.matchingPairs.filter((_, idx) => idx !== i) })}
                            className="p-3 text-rose-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setFormQ({ ...formQ, matchingPairs: [...formQ.matchingPairs, { left: '', right: '' }] })}
                      className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold hover:border-blue-400 hover:text-blue-600 transition-all flex items-center justify-center gap-2"
                    >
                      <Plus className="w-5 h-5" /> Thêm cặp nối mới
                    </button>
                  </div>
                )}

                {formQ.type === 'fill_blank' && (
                  <div className="p-8 bg-blue-50 rounded-[2.5rem] border border-blue-100 space-y-4">
                    <label className="text-xs font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                       <BarChart3 className="w-5 h-5" /> Đáp án điền vào chỗ trống
                    </label>
                    <input 
                      className="w-full p-6 bg-white border border-blue-200 rounded-2xl font-black text-2xl text-blue-800 outline-none focus:ring-4 focus:ring-blue-100"
                      placeholder="VD: has been"
                      value={formQ.correct_answer}
                      onChange={e => setFormQ({ ...formQ, correct_answer: e.target.value })}
                    />
                  </div>
                )}

                <div className="pt-10 border-t border-slate-100">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="w-full bg-slate-900 text-white font-black py-6 rounded-[2rem] shadow-2xl flex items-center justify-center gap-4 text-xl hover:bg-blue-600 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 className="w-7 h-7 animate-spin" /> : <Save className="w-7 h-7" />}
                    {isSaving ? 'Đang đồng bộ dữ liệu...' : (editingId ? 'Cập nhật thay đổi' : 'Lưu vào ngân hàng đề')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionBank;
