
import React, { useState, useEffect } from 'react';
import { User, GradebookData } from '../types';
import { fetchFromAPI } from '../services/api';
import { 
  Trophy, Medal, Crown, Loader2, Users, 
  ChevronDown, Flame, Star, Sparkles, TrendingUp
} from 'lucide-react';
import { useOutletContext } from 'react-router-dom';

const Leaderboard: React.FC<{ user: User }> = ({ user }) => {
  const { activeClassId } = useOutletContext<{ activeClassId: string }>();
  const [data, setData] = useState<GradebookData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedColId, setSelectedColId] = useState<string>('overall');

  useEffect(() => { loadGradebook(); }, [activeClassId]);

  const loadGradebook = async () => {
    setIsLoading(true);
    try {
      const result = await fetchFromAPI<GradebookData>('getGradebook', { class_id: activeClassId });
      setData(result);
      if (result.columns.length > 0) {
        // Mặc định chọn cột điểm đầu tiên hoặc để overall
      }
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  };

  const getRankedStudents = () => {
    if (!data) return [];
    
    let list = data.students.map(s => {
      let score = 0;
      if (selectedColId === 'overall') {
        const sum = data.columns.reduce((acc, col) => acc + (s.grades[col.id] || 0), 0);
        score = data.columns.length ? Number((sum / data.columns.length).toFixed(1)) : 0;
      } else {
        score = s.grades[selectedColId] || 0;
      }
      return { ...s, displayScore: score };
    });

    return list.sort((a, b) => b.displayScore - a.displayScore);
  };

  if (isLoading) return <div className="py-20 text-center"><Loader2 className="animate-spin text-blue-600 mx-auto w-12 h-12" /></div>;

  const ranked = getRankedStudents();
  const top3 = ranked.slice(0, 3);
  const others = ranked.slice(3);

  return (
    <div className="space-y-12 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-4">
             <Trophy className="w-10 h-10 text-amber-500" /> Bảng vinh danh học thuật
          </h2>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">Nơi tôn vinh những nỗ lực xuất sắc nhất</p>
        </div>
        
        <div className="flex items-center gap-4 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Xếp hạng theo:</span>
           <select 
             className="px-6 py-3 bg-slate-50 border-none rounded-xl font-black text-slate-700 outline-none"
             value={selectedColId}
             onChange={e => setSelectedColId(e.target.value)}
           >
              <option value="overall">Điểm Trung bình (Overall)</option>
              {data?.columns.map(col => (
                <option key={col.id} value={col.id}>{col.name}</option>
              ))}
           </select>
        </div>
      </div>

      {/* Podium - Top 3 */}
      {ranked.length > 0 ? (
        <div className="grid md:grid-cols-3 gap-8 items-end max-w-5xl mx-auto pt-10">
          {/* Top 2 */}
          {top3[1] && (
            <div className="order-2 md:order-1 flex flex-col items-center animate-in slide-in-from-bottom-10 duration-700">
               <div className="relative group mb-6">
                  <div className="w-32 h-32 rounded-[2rem] bg-white shadow-2xl border-4 border-slate-200 flex items-center justify-center text-5xl font-black text-slate-300 group-hover:scale-110 transition-transform">
                    {top3[1].name[0]}
                  </div>
                  <div className="absolute -top-6 -right-6 w-14 h-14 bg-slate-300 text-white rounded-full flex items-center justify-center shadow-lg border-4 border-white">
                    <Medal className="w-8 h-8" />
                  </div>
               </div>
               <div className="text-center bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 w-full">
                  <p className="font-black text-slate-900 text-xl truncate mb-1">{top3[1].name}</p>
                  <p className="text-3xl font-black text-slate-300">{top3[1].displayScore}đ</p>
                  <div className="mt-4 px-4 py-1.5 bg-slate-50 rounded-full text-[10px] font-black text-slate-400 uppercase tracking-widest">Hạng 2</div>
               </div>
            </div>
          )}

          {/* Top 1 */}
          {top3[0] && (
            <div className="order-1 md:order-2 flex flex-col items-center animate-in zoom-in duration-1000 scale-110 md:scale-125 z-10 mb-10 md:mb-0">
               <div className="relative group mb-6">
                  <div className="absolute -inset-4 bg-gradient-to-tr from-amber-200 via-yellow-400 to-amber-600 rounded-[3rem] blur-xl opacity-40 group-hover:opacity-60 transition-opacity animate-pulse"></div>
                  <div className="relative w-40 h-40 rounded-[2.5rem] bg-white shadow-2xl border-4 border-amber-400 flex items-center justify-center text-7xl font-black text-amber-500 group-hover:scale-105 transition-transform overflow-hidden">
                    <Sparkles className="absolute inset-0 w-full h-full text-amber-50/20" />
                    {top3[0].name[0]}
                  </div>
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex flex-col items-center">
                    <Crown className="w-16 h-16 text-amber-500 drop-shadow-lg animate-bounce" />
                  </div>
               </div>
               <div className="text-center bg-white p-10 rounded-[3rem] shadow-2xl border-2 border-amber-100 w-full relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4"><Star className="w-6 h-6 text-amber-200 fill-amber-200" /></div>
                  <p className="font-black text-slate-900 text-2xl truncate mb-1">{top3[0].name}</p>
                  <p className="text-5xl font-black text-amber-500">{top3[0].displayScore}đ</p>
                  <div className="mt-4 px-6 py-2 bg-amber-500 text-white rounded-full text-xs font-black uppercase tracking-[0.2em] shadow-lg shadow-amber-200">The Champion</div>
               </div>
            </div>
          )}

          {/* Top 3 */}
          {top3[2] && (
            <div className="order-3 flex flex-col items-center animate-in slide-in-from-bottom-10 duration-700 delay-200">
               <div className="relative group mb-6">
                  <div className="w-32 h-32 rounded-[2rem] bg-white shadow-2xl border-4 border-amber-100 flex items-center justify-center text-5xl font-black text-amber-200 group-hover:scale-110 transition-transform">
                    {top3[2].name[0]}
                  </div>
                  <div className="absolute -top-6 -right-6 w-14 h-14 bg-amber-700 text-white rounded-full flex items-center justify-center shadow-lg border-4 border-white">
                    <Medal className="w-8 h-8" />
                  </div>
               </div>
               <div className="text-center bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 w-full">
                  <p className="font-black text-slate-900 text-xl truncate mb-1">{top3[2].name}</p>
                  <p className="text-3xl font-black text-amber-700/50">{top3[2].displayScore}đ</p>
                  <div className="mt-4 px-4 py-1.5 bg-amber-50 rounded-full text-[10px] font-black text-amber-700 uppercase tracking-widest">Hạng 3</div>
               </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-20 bg-slate-50 rounded-[4rem] border-4 border-dashed border-slate-200">
          <Users className="w-16 h-16 text-slate-200 mx-auto mb-4" />
          <p className="font-black text-slate-400 uppercase tracking-widest">Chưa có dữ liệu xếp hạng</p>
        </div>
      )}

      {/* Others List */}
      {others.length > 0 && (
        <div className="max-w-4xl mx-auto bg-white rounded-[3rem] shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h4 className="font-black text-slate-900 uppercase tracking-widest text-sm flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" /> Bảng xếp hạng chi tiết
            </h4>
            <span className="text-xs font-bold text-slate-400">Đang hiển thị các vị trí còn lại</span>
          </div>
          <div className="divide-y divide-slate-50">
            {others.map((s, idx) => (
              <div key={s.id} className="p-8 flex items-center gap-6 hover:bg-slate-50 transition-colors">
                 <div className="w-12 text-center font-black text-slate-400 text-xl">#{idx + 4}</div>
                 <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 font-black text-xl">
                   {s.name[0]}
                 </div>
                 <div className="flex-1">
                    <p className="font-black text-slate-900 text-lg leading-none mb-1">{s.name}</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Xếp hạng thế giới EngConnect</p>
                 </div>
                 <div className="text-right">
                    <p className="text-2xl font-black text-slate-900">{s.displayScore}đ</p>
                    <div className="flex items-center gap-1 text-[9px] font-black text-emerald-500 uppercase tracking-tighter">
                      <Flame className="w-3 h-3" /> Xu hướng tăng
                    </div>
                 </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
