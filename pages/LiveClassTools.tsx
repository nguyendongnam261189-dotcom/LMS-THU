
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { User, Behavior, Seat, ClassToolsData } from '../types';
import { fetchFromAPI, postToAPI } from '../services/api';
import { 
  Users, UserPlus, Star, Award, RotateCw, 
  Trash2, Plus, X, Loader2, Save, 
  LayoutGrid, ThumbsUp, ThumbsDown, Sparkles,
  Settings, 
  ChevronDown, ChevronUp,
  MinusCircle, PlusCircle, 
  MousePointer2,
  Trophy,
  Maximize,
  Minimize,
  Check,
  Zap,
  Plus as PlusIcon,
  Minus as MinusIcon,
  Shuffle,
  Dog,
  Cat,
  Rabbit,
  Car,
  Flag,
  Trophy as TrophyIcon,
  CircleDot,
  Play
} from 'lucide-react';
import { useOutletContext } from 'react-router-dom';

const LiveClassTools: React.FC<{ user: User }> = ({ user }) => {
  const { activeClassId } = useOutletContext<{ activeClassId: string }>();
  const [data, setData] = useState<ClassToolsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  // Grid Config
  const [gridSize, setGridSize] = useState(() => {
    const saved = localStorage.getItem(`engconnect_grid_v2_${activeClassId}`);
    if (saved) {
      try {
        const config = JSON.parse(saved);
        return config.gridSize || { rows: 4, cols: 6 };
      } catch (e) { return { rows: 4, cols: 6 }; }
    }
    return { rows: 4, cols: 6 };
  });

  const [pairMode, setPairMode] = useState(false);
  const [viewFromBack, setViewFromBack] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(0.85); 
  
  const [showSidebar, setShowSidebar] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  
  const [isEditSeating, setIsEditSeating] = useState(false);
  const [selectedSeat, setSelectedSeat] = useState<{row: number, col: number} | null>(null);
  const [isAwardModalOpen, setIsAwardModalOpen] = useState(false);

  // Quick Points State
  const [quickPointsAmount, setQuickPointsAmount] = useState<number>(1);

  // Random Picker / Games States
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [gameMode, setGameMode] = useState<'menu' | 'wheel' | 'race_animal' | 'race_car'>('menu');
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState<any>(null);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [raceProgress, setRaceProgress] = useState<Record<string, number>>({});
  const [gameStatus, setGameStatus] = useState<'waiting' | 'playing' | 'finished'>('waiting');

  const containerRef = useRef<HTMLDivElement>(null);
  const audioAwardRef = useRef<HTMLAudioElement | null>(null);
  const audioPenaltyRef = useRef<HTMLAudioElement | null>(null);
  const audioShuffleRef = useRef<HTMLAudioElement | null>(null);
  const audioRaceRef = useRef<HTMLAudioElement | null>(null);

  const unassignedStudents = useMemo(() => {
    if (!data) return [];
    const assignedIds = new Set(data.seats.map(s => s.student_id));
    return data.students.filter(s => !assignedIds.has(s.id));
  }, [data]);

  const candidates = useMemo(() => {
    if (!data) return [];
    if (selectedStudentIds.size > 0) {
      return data.students.filter(s => selectedStudentIds.has(s.id));
    }
    const assignedIds = new Set(data.seats.map(s => s.student_id));
    return data.students.filter(s => assignedIds.has(s.id));
  }, [data, selectedStudentIds]);

  const rewards = useMemo(() => data?.behaviors.filter(b => b.points > 0) || [], [data]);
  const penalties = useMemo(() => data?.behaviors.filter(b => b.points <= 0) || [], [data]);

  const formatShortName = (fullName: string) => {
    if (!fullName) return "";
    const parts = fullName.trim().split(/\s+/);
    if (parts.length <= 2) return fullName;
    return parts.slice(-2).join(' ');
  };

  const getSelectedStudentName = () => {
    if (selectedStudentIds.size !== 1 || !data) return "";
    const firstId = Array.from(selectedStudentIds)[0];
    return data.students.find(s => s.id === firstId)?.name || "";
  };

  const autoFitScale = () => {
    if (!containerRef.current) return;
    const cardBaseSize = 140; 
    const horizontalGap = pairMode ? 40 : 24;
    const verticalGap = 24;
    const blackboardHeight = 180;
    
    const totalW = gridSize.cols * cardBaseSize + (gridSize.cols - 1) * horizontalGap + (pairMode ? (gridSize.cols / 2) * 40 : 0);
    const totalH = gridSize.rows * cardBaseSize + (gridSize.rows - 1) * verticalGap + blackboardHeight;
    
    const availableW = containerRef.current.clientWidth - 120;
    const availableH = containerRef.current.clientHeight - 120;
    
    const scaleW = availableW / totalW;
    const scaleH = availableH / totalH;
    const fitScale = Math.min(scaleW, scaleH, 1.1);
    setZoomLevel(Math.max(Number(fitScale.toFixed(2)), 0.5));
  };

  useEffect(() => {
    const key = `engconnect_grid_v2_${activeClassId}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const config = JSON.parse(saved);
        setGridSize(config.gridSize || { rows: 4, cols: 6 });
        setPairMode(!!config.pairMode);
        setViewFromBack(!!config.viewFromBack);
        if (config.zoomLevel) setZoomLevel(config.zoomLevel);
      } catch (e) {}
    } else {
      setTimeout(autoFitScale, 300);
    }
    loadClassTools();
  }, [activeClassId]);

  useEffect(() => {
    audioAwardRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3');
    audioPenaltyRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3');
    audioShuffleRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/1103/1103-preview.mp3');
    audioRaceRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/1541/1541-preview.mp3');
  }, []);

  const loadClassTools = async () => {
    setIsLoading(true);
    try {
      const result = await fetchFromAPI<ClassToolsData>('getClassTools', { class_id: activeClassId });
      setData(result);
    } catch (e) {} finally { setIsLoading(false); }
  };

  const saveGridConfig = () => {
    const key = `engconnect_grid_v2_${activeClassId}`;
    localStorage.setItem(key, JSON.stringify({ gridSize, pairMode, viewFromBack, zoomLevel }));
    setShowConfig(false);
  };

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudentIds(prev => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  };

  // Logic Games
  const startWheelGame = () => {
    if (isSpinning) return;
    setIsSpinning(true);
    setWinner(null);
    setGameStatus('playing');

    const extraRotations = 8 + Math.random() * 5; 
    const winnerIdx = Math.floor(Math.random() * candidates.length);
    const sliceDegrees = 360 / candidates.length;
    const targetRotation = (extraRotations * 360) + (360 - (winnerIdx * sliceDegrees) - (sliceDegrees / 2));
    
    setWheelRotation(targetRotation);
    
    if (soundEnabled && audioShuffleRef.current) {
      audioShuffleRef.current.currentTime = 0;
      audioShuffleRef.current.play().catch(() => {});
    }

    setTimeout(() => {
      setIsSpinning(false);
      setWinner(candidates[winnerIdx]);
      setGameStatus('finished');
      if (soundEnabled && audioAwardRef.current) audioAwardRef.current.play().catch(() => {});
      if (audioShuffleRef.current) audioShuffleRef.current.pause();
    }, 5000);
  };

  const startRaceGame = () => {
    if (isSpinning) return;
    setIsSpinning(true);
    setWinner(null);
    setGameStatus('playing');

    if (soundEnabled && audioRaceRef.current) {
      audioRaceRef.current.loop = true;
      audioRaceRef.current.play().catch(() => {});
    }

    const interval = setInterval(() => {
      setRaceProgress(prev => {
        const next = { ...prev };
        let finishedId: string | null = null;
        
        candidates.forEach(r => {
          if (next[r.id] < 92) {
            next[r.id] += Math.random() * 3.5;
          } else if (!finishedId && next[r.id] < 100) {
             if (Math.random() > 0.8) {
               next[r.id] = 100;
               finishedId = r.id;
             } else {
               next[r.id] += Math.random() * 0.5;
             }
          }
        });

        if (finishedId) {
          clearInterval(interval);
          setIsSpinning(false);
          setWinner(candidates.find(r => r.id === finishedId));
          setGameStatus('finished');
          if (audioRaceRef.current) {
            audioRaceRef.current.pause();
            audioRaceRef.current.currentTime = 0;
          }
          if (soundEnabled && audioAwardRef.current) audioAwardRef.current.play().catch(() => {});
        }
        return next;
      });
    }, 80);
  };

  const handleGameModeSelect = (mode: 'wheel' | 'race_animal' | 'race_car') => {
    if (candidates.length < 2) return alert("Cần ít nhất 2 học sinh để chơi.");
    setGameMode(mode);
    setWinner(null);
    setGameStatus('waiting');
    setWheelRotation(0);
    const initialProgress: Record<string, number> = {};
    candidates.forEach(c => initialProgress[c.id] = 0);
    setRaceProgress(initialProgress);
  };

  const handleAwardPointBulk = async (behaviorOrPoints: Behavior | number) => {
    if (selectedStudentIds.size === 0 && !winner) return;
    setIsSaving(true);
    const points = typeof behaviorOrPoints === 'number' ? behaviorOrPoints : Number(behaviorOrPoints.points);
    const behaviorId = typeof behaviorOrPoints === 'number' ? 'manual' : behaviorOrPoints.id;
    const targets = (winner) ? [winner.id] : Array.from(selectedStudentIds);

    try {
      const promises = targets.map(studentId => 
        postToAPI('awardPoint', { student_id: studentId, behavior_id: behaviorId, points: points })
      );
      await Promise.all(promises);
      setData(prev => {
        if (!prev) return null;
        return {
          ...prev,
          students: prev.students.map(s => targets.includes(s.id) ? { ...s, total_points: (s.total_points || 0) + points } : s)
        };
      });
      if (soundEnabled) {
        const audio = points > 0 ? audioAwardRef.current : audioPenaltyRef.current;
        if (audio) { audio.currentTime = 0; audio.play().catch(() => {}); }
      }
      setIsAwardModalOpen(false);
      setIsPickerOpen(false);
      setWinner(null);
      if (!multiSelectMode) setSelectedStudentIds(new Set());
    } catch (e) { alert("Lỗi cộng điểm."); } finally { setIsSaving(false); }
  };

  const handleSaveSeating = async () => {
    if (!data) return;
    setIsSaving(true);
    try {
      await postToAPI('saveSeating', { class_id: activeClassId, seats: data.seats });
      setIsEditSeating(false);
      const key = `engconnect_grid_v2_${activeClassId}`;
      localStorage.setItem(key, JSON.stringify({ gridSize, pairMode, viewFromBack, zoomLevel }));
    } catch (e) { alert("Lỗi lưu sơ đồ."); } finally { setIsSaving(false); }
  };

  const assignStudentToSeat = (studentId: string) => {
    if (!selectedSeat || !data) return;
    const newSeats = data.seats.filter(s => s.student_id !== studentId && !(s.row === selectedSeat.row && s.col === selectedSeat.col));
    newSeats.push({ student_id: studentId, row: selectedSeat.row, col: selectedSeat.col });
    setData({ ...data, seats: newSeats });
    setSelectedSeat(null);
  };

  if (isLoading) return <div className="py-20 text-center"><Loader2 className="animate-spin text-blue-600 mx-auto w-12 h-12" /></div>;

  const renderGrid = () => {
    const rowsArr = Array.from({ length: gridSize.rows }, (_, i) => i);
    const colsArr = Array.from({ length: gridSize.cols }, (_, i) => i);
    const sortedRows = viewFromBack ? [...rowsArr].reverse() : rowsArr;

    return sortedRows.map(r => (
      <div key={`row-${r}`} className="flex justify-center transition-all duration-300" style={{ marginBottom: `${24 * zoomLevel}px`, gap: pairMode ? `${16 * zoomLevel}px` : `${24 * zoomLevel}px` }}>
        {colsArr.map(c => {
          const seat = data?.seats.find(s => s.row === r && s.col === c);
          const student = data?.students.find(s => s.id === seat?.student_id);
          const isSelected = student && selectedStudentIds.has(student.id);
          const isEndOfPair = pairMode && c % 2 === 1 && c < gridSize.cols - 1;
          const seatSize = 135 * zoomLevel;

          return (
            <div key={`seat-${r}-${c}`} className={`relative transition-all duration-300 ${isEndOfPair ? 'mr-10 md:mr-16' : ''}`}>
              <div 
                onClick={() => (isEditSeating ? setSelectedSeat({ row: r, col: c }) : student && (multiSelectMode ? toggleStudentSelection(student.id) : (setSelectedStudentIds(new Set([student.id])), setIsAwardModalOpen(true))))}
                style={{ width: `${seatSize}px`, height: `${seatSize}px` }}
                className={`rounded-[2.5rem] border-2 transition-all duration-300 cursor-pointer flex flex-col items-center justify-center p-2 group relative ${student ? 'bg-white border-slate-100 shadow-sm hover:shadow-xl' : 'bg-slate-200/20 border-dashed border-slate-200 hover:border-blue-300'} ${selectedSeat?.row === r && selectedSeat?.col === c ? 'ring-4 ring-blue-500 border-blue-500 bg-blue-50' : ''} ${isSelected ? 'ring-4 ring-blue-600 border-blue-600 bg-blue-50 scale-110 z-10 shadow-2xl shadow-blue-100' : ''}`}
              >
                {student ? (
                  <>
                    <div style={{ width: `${55 * zoomLevel}px`, height: `${55 * zoomLevel}px` }} className={`rounded-2xl text-white flex items-center justify-center font-black shadow-lg transition-all overflow-hidden ${isSelected ? 'bg-slate-900' : 'bg-blue-600 group-hover:bg-slate-900'}`}>
                      {student.avatar_url ? <img src={student.avatar_url} className="w-full h-full object-cover" /> : <span style={{ fontSize: `${24 * zoomLevel}px` }}>{student.name[0]}</span>}
                    </div>
                    <p className="font-black text-slate-800 text-center truncate w-full px-1 mt-2 leading-none" style={{ fontSize: `${13 * zoomLevel}px` }}>{formatShortName(student.name)}</p>
                    <div className="flex items-center gap-1 opacity-60 mt-1">
                       <Star className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />
                       <span className="text-[10px] font-black">{student.total_points || 0}</span>
                    </div>
                  </>
                ) : <Plus className="w-8 h-8 text-slate-300 opacity-40 group-hover:opacity-100" />}
                {isEditSeating && student && (
                  <button onClick={(e) => { e.stopPropagation(); setData({ ...data!, seats: data!.seats.filter(s => s.student_id !== student.id) }); }} className="absolute -top-2 -right-2 bg-rose-500 text-white p-1.5 rounded-full shadow-lg z-20 hover:scale-110"><X className="w-4 h-4"/></button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    ));
  };

  return (
    <div className="flex flex-col h-screen bg-[#F1F5F9]">
      <div className="p-6 sticky top-0 z-[45] bg-white/95 backdrop-blur-xl border-b border-slate-200 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
           <div className="bg-slate-900 p-2.5 rounded-2xl shadow-lg"><LayoutGrid className="w-5 h-5 text-white" /></div>
           <div>
             <h2 className="text-xl font-black text-slate-900 tracking-tight leading-none mb-1">Sơ đồ Lớp học</h2>
             <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{gridSize.rows} Hàng x {gridSize.cols} Cột</p>
           </div>
        </div>
        <div className="flex items-center gap-2">
           <button onClick={() => { setIsPickerOpen(true); setGameMode('menu'); }} className="px-5 py-3 rounded-2xl bg-amber-500 text-white font-black text-xs uppercase flex items-center gap-2 shadow-lg hover:bg-amber-600 transition-all"><Shuffle className="w-4 h-4" /> Quay chọn</button>
           <button onClick={() => { setMultiSelectMode(!multiSelectMode); setSelectedStudentIds(new Set()); }} className={`px-5 py-3 rounded-2xl font-black text-xs uppercase flex items-center gap-2 transition-all ${multiSelectMode ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}><MousePointer2 className="w-4 h-4" /> Chọn nhiều</button>
           <button onClick={() => setShowConfig(!showConfig)} className={`p-3.5 rounded-2xl transition-all ${showConfig ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}><Settings className="w-5 h-5" /></button>
           <button onClick={() => isEditSeating ? handleSaveSeating() : setIsEditSeating(true)} className={`px-7 py-3.5 rounded-2xl font-black text-xs transition-all shadow-xl flex items-center gap-2 active:scale-95 ${isEditSeating ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white hover:bg-blue-600'}`}>{isEditSeating ? <Save className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}{isEditSeating ? 'Lưu' : 'Xếp chỗ'}</button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative" ref={containerRef}>
        <div className="flex-1 overflow-auto bg-[#F1F5F9] flex flex-col p-10 relative scroll-smooth">
           <div className={`flex flex-col items-center justify-center min-h-full py-16 animate-in fade-in duration-700 ${viewFromBack ? 'flex-col-reverse' : 'flex-col'}`}>
              <div className="mb-16 bg-slate-900 text-white px-32 py-4 rounded-[3rem] font-black text-[13px] uppercase tracking-[0.6em] shadow-2xl border-4 border-white/10">BẢNG ĐEN</div>
              <div className="transition-all duration-300">{renderGrid()}</div>
           </div>
        </div>

        {isEditSeating && (
          <div className="w-96 bg-white border-l border-slate-200 shadow-2xl flex flex-col animate-in slide-in-from-right duration-500 z-50">
             <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Học sinh chưa xếp</h3>
                <button onClick={() => setIsEditSeating(false)} className="p-2 hover:bg-slate-50 rounded-xl text-slate-300"><X className="w-5 h-5"/></button>
             </div>
             <div className="flex-1 overflow-y-auto p-8 space-y-4">
                {unassignedStudents.map(s => (
                  <button key={s.id} onClick={() => assignStudentToSeat(s.id)} className={`w-full p-5 rounded-2xl border-2 flex items-center justify-between transition-all font-bold text-sm ${selectedSeat ? 'bg-white border-blue-100 hover:bg-blue-600 hover:text-white' : 'bg-slate-50 border-slate-100 opacity-40 cursor-default'}`}>
                    {s.name}
                  </button>
                ))}
             </div>
          </div>
        )}
      </div>

      {/* Random Picker Modal */}
      {isPickerOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 backdrop-blur-3xl bg-slate-900/80 overflow-hidden">
           <div className="bg-white w-full h-full max-w-[95vw] max-h-[90vh] rounded-[4rem] shadow-2xl p-6 md:p-12 animate-in zoom-in duration-500 border-[12px] border-white flex flex-col items-center relative overflow-hidden">
              
              <button onClick={() => { setIsPickerOpen(false); setWinner(null); }} className="absolute top-8 right-8 p-3 bg-slate-100 text-slate-400 hover:bg-rose-500 hover:text-white rounded-full transition-all z-20"><X className="w-6 h-6"/></button>

              {gameMode === 'menu' && (
                <div className="text-center space-y-8 my-auto animate-in fade-in duration-500">
                   <h3 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight uppercase">Chọn trò chơi</h3>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                      <button onClick={() => handleGameModeSelect('wheel')} className="group p-8 bg-blue-50 border-4 border-transparent hover:border-blue-600 rounded-[3rem] transition-all flex flex-col items-center gap-4">
                         <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center shadow-xl group-hover:rotate-[360deg] transition-all duration-1000"><CircleDot className="w-10 h-10 text-white" /></div>
                         <p className="font-black text-lg text-blue-900">Vòng quay tên</p>
                      </button>
                      <button onClick={() => handleGameModeSelect('race_animal')} className="group p-8 bg-emerald-50 border-4 border-transparent hover:border-emerald-600 rounded-[3rem] transition-all flex flex-col items-center gap-4">
                         <div className="w-20 h-20 bg-emerald-600 rounded-full flex items-center justify-center shadow-xl group-hover:scale-110 transition-all"><Rabbit className="w-10 h-10 text-white" /></div>
                         <p className="font-black text-lg text-emerald-900">Đua thú</p>
                      </button>
                      <button onClick={() => handleGameModeSelect('race_car')} className="group p-8 bg-rose-50 border-4 border-transparent hover:border-rose-600 rounded-[3rem] transition-all flex flex-col items-center gap-4">
                         <div className="w-20 h-20 bg-rose-600 rounded-full flex items-center justify-center shadow-xl group-hover:translate-x-2 transition-all"><Car className="w-10 h-10 text-white" /></div>
                         <p className="font-black text-lg text-rose-900">Đua xe F1</p>
                      </button>
                   </div>
                </div>
              )}

              {gameMode === 'wheel' && !winner && (
                <div className="flex flex-col items-center justify-center w-full h-full relative my-auto animate-in zoom-in duration-500">
                   <div className="relative w-full max-w-[min(70vh,600px)] aspect-square mb-8">
                      {/* Wheel Pointer */}
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-6 z-10 text-rose-600 flex flex-col items-center drop-shadow-2xl">
                        <Flag className="w-12 h-12 md:w-16 md:h-16 fill-rose-600" />
                        <div className="w-2 h-6 bg-slate-900 rounded-full -mt-2"></div>
                      </div>
                      
                      <div 
                        style={{ 
                          transform: `rotate(${wheelRotation}deg)`, 
                          transition: isSpinning ? 'transform 5s cubic-bezier(0.15, 0, 0.15, 1)' : 'none' 
                        }}
                        className="w-full h-full rounded-full border-[10px] border-slate-900 shadow-2xl relative"
                      >
                         <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
                            {candidates.map((s, i, arr) => {
                               const angle = 360 / arr.length;
                               const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F43F5E'];
                               const startAngle = i * angle;
                               const endAngle = (i + 1) * angle;
                               const radStart = (startAngle - 90) * (Math.PI / 180);
                               const radEnd = (endAngle - 90) * (Math.PI / 180);
                               const x1 = 50 + 50 * Math.cos(radStart);
                               const y1 = 50 + 50 * Math.sin(radStart);
                               const x2 = 50 + 50 * Math.cos(radEnd);
                               const y2 = 50 + 50 * Math.sin(radEnd);
                               const largeArc = angle > 180 ? 1 : 0;
                               
                               // Tự động thu nhỏ font chữ dựa trên số lượng học sinh
                               const fontSize = Math.max(1.5, Math.min(4, 50 / arr.length * 1.5));
                               
                               return (
                                 <g key={s.id}>
                                   <path d={`M 50 50 L ${x1} ${y1} A 50 50 0 ${largeArc} 1 ${x2} ${y2} Z`} fill={colors[i % colors.length]} stroke="white" strokeWidth="0.3" />
                                   <text 
                                     x="80" y="50" 
                                     fill="white" fontSize={fontSize} fontWeight="bold" 
                                     transform={`rotate(${(startAngle + endAngle) / 2}, 50, 50)`}
                                     textAnchor="middle"
                                   >{formatShortName(s.name)}</text>
                                 </g>
                               );
                            })}
                            <circle cx="50" cy="50" r="6" fill="white" stroke="#1E293B" strokeWidth="1.5" />
                         </svg>
                      </div>
                   </div>
                   {gameStatus === 'waiting' && (
                     <button onClick={startWheelGame} className="bg-blue-600 text-white px-12 py-5 rounded-[2.5rem] font-black text-2xl shadow-2xl hover:bg-slate-900 hover:scale-105 transition-all flex items-center gap-4 active:scale-95">
                       <Play className="w-8 h-8 fill-white" /> BẮT ĐẦU QUAY
                     </button>
                   )}
                </div>
              )}

              {(gameMode === 'race_animal' || gameMode === 'race_car') && !winner && (
                <div className="w-full h-full flex flex-col animate-in slide-in-from-bottom-10 duration-500 overflow-hidden">
                   <h3 className="text-3xl font-black text-slate-900 text-center uppercase tracking-widest mb-6">
                     {gameMode === 'race_animal' ? 'Đường đua thú cưng' : 'Đua xe siêu tốc'}
                   </h3>
                   
                   {/* Race Track Container: Sử dụng Flex để tự co giãn các lane */}
                   <div className="flex-1 flex flex-col gap-2 bg-slate-900 p-6 md:p-8 rounded-[3rem] border-[10px] border-slate-800 shadow-inner relative overflow-hidden min-h-0">
                      {/* Finish Line Indicator */}
                      <div className="absolute right-24 top-0 bottom-0 w-2 border-r-4 border-dashed border-white/10 z-0"></div>
                      
                      {candidates.map((student, idx) => {
                         const progress = raceProgress[student.id] || 0;
                         const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F43F5E'];
                         
                         // Tính toán chiều cao linh hoạt cho mỗi lane để tất cả cùng khớp trên 1 màn hình
                         // Tối đa 64px, tối thiểu đủ để hiển thị nội dung
                         return (
                           <div key={student.id} className="relative flex-1 min-h-[24px] max-h-16 bg-white/5 rounded-full overflow-hidden border border-white/10 group flex items-center transition-all duration-300">
                              <div className="absolute left-6 font-black text-white/20 uppercase text-[9px] tracking-widest z-0 group-hover:text-white/40">
                                {idx + 1}. {student.name}
                              </div>
                              
                              <div 
                                style={{ 
                                  left: `calc(${progress}% - 50px)`, 
                                  transition: gameStatus === 'playing' ? 'left 0.1s linear' : 'none',
                                  // Thu nhỏ kích thước racer nếu quá nhiều người đua
                                  transform: candidates.length > 15 ? 'scale(0.8)' : 'scale(1)'
                                }} 
                                className="absolute z-10 flex items-center gap-2 transition-all"
                              >
                                 <div className="bg-white p-2 rounded-xl shadow-xl border-2 flex items-center gap-2" style={{ borderColor: colors[idx % colors.length] }}>
                                    {gameMode === 'race_animal' ? (
                                      idx % 3 === 0 ? <Dog className="w-5 h-5 text-slate-800"/> : 
                                      idx % 3 === 1 ? <Cat className="w-5 h-5 text-slate-800"/> : 
                                      <Rabbit className="w-5 h-5 text-slate-800"/>
                                    ) : (
                                      <Car className="w-5 h-5 text-slate-800"/>
                                    )}
                                    <span className="text-[9px] font-black text-slate-400 truncate max-w-[60px]">{formatShortName(student.name)}</span>
                                 </div>
                                 {progress >= 100 && <TrophyIcon className="w-8 h-8 text-amber-400 animate-bounce" />}
                              </div>
                              {/* Cờ đích cho mỗi lane */}
                              <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20"><Flag className="w-4 h-4 text-white" /></div>
                           </div>
                         );
                      })}
                   </div>

                   {gameStatus === 'waiting' && (
                     <div className="mt-8 flex justify-center pb-4">
                       <button onClick={startRaceGame} className="bg-emerald-500 text-white px-16 py-5 rounded-[2.5rem] font-black text-xl shadow-2xl hover:bg-slate-900 transition-all flex items-center gap-4 hover:scale-105 active:scale-95">
                         <Play className="w-8 h-8 fill-white" /> BẮT ĐẦU CUỘC ĐUA
                       </button>
                     </div>
                   )}
                </div>
              )}

              {winner && (
                <div className="my-auto w-full animate-in zoom-in duration-500 flex flex-col items-center p-8">
                   <div className="relative">
                      <div className="absolute -inset-24 bg-amber-400 blur-[100px] opacity-40 animate-pulse"></div>
                      <div className="relative w-48 h-48 md:w-56 md:h-56 bg-white rounded-[5rem] border-[10px] border-amber-400 shadow-2xl flex items-center justify-center overflow-hidden">
                        {winner.avatar_url ? <img src={winner.avatar_url} className="w-full h-full object-cover" /> : <span className="text-8xl font-black text-amber-500">{winner.name[0]}</span>}
                      </div>
                      <div className="absolute -top-8 -right-8 bg-amber-500 text-white p-5 rounded-full shadow-xl border-4 border-white animate-bounce">
                        <TrophyIcon className="w-10 h-10" />
                      </div>
                   </div>
                   
                   <div className="text-center mt-10 space-y-4">
                      <p className="text-sm font-black text-slate-400 uppercase tracking-[0.4em]">The Champion</p>
                      <h3 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tight">{winner.name}</h3>
                   </div>

                   <div className="grid grid-cols-2 gap-6 w-full max-w-lg mt-10">
                      <button onClick={() => setIsAwardModalOpen(true)} className="bg-blue-600 text-white p-6 md:p-7 rounded-[2.5rem] font-black text-base uppercase shadow-xl hover:bg-slate-900 transition-all flex items-center justify-center gap-3"><Award className="w-7 h-7 md:w-8 md:h-8" /> Cộng điểm</button>
                      <button onClick={() => { setWinner(null); setGameMode('menu'); }} className="bg-slate-100 text-slate-400 p-6 md:p-7 rounded-[2.5rem] font-black text-base uppercase hover:bg-amber-100 hover:text-amber-600 transition-all">Lại từ đầu</button>
                   </div>
                </div>
              )}
           </div>
        </div>
      )}

      {/* Point Award Modal */}
      {isAwardModalOpen && (selectedStudentIds.size > 0 || winner) && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-6 backdrop-blur-2xl bg-slate-900/60 overflow-y-auto">
           <div className="bg-white w-full max-w-4xl rounded-[5rem] shadow-2xl p-12 animate-in zoom-in duration-300 border-[12px] border-white max-h-[90vh] overflow-y-auto custom-scrollbar">
              <div className="flex justify-between items-start mb-8">
                 <div>
                    <h3 className="text-4xl font-black text-slate-900 tracking-tight">Khen thưởng</h3>
                    <p className="text-lg font-bold text-slate-400 mt-2">Đang chọn: <span className="text-blue-600 font-black px-5 py-1.5 bg-blue-50 rounded-full">{winner ? winner.name : (selectedStudentIds.size === 1 ? getSelectedStudentName() : `${selectedStudentIds.size} Học sinh`)}</span></p>
                 </div>
                 <button onClick={() => { setIsAwardModalOpen(false); setWinner(null); if(!multiSelectMode) setSelectedStudentIds(new Set()); }} className="p-4 bg-slate-50 text-slate-300 hover:text-rose-500 rounded-3xl transition-all"><X className="w-10 h-10"/></button>
              </div>

              {/* Quick Points */}
              <div className="mb-12 bg-slate-50 p-8 rounded-[4rem] border border-slate-100 flex flex-col md:flex-row items-center gap-8 shadow-inner">
                 <div className="flex items-center gap-4">
                    <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-lg shadow-blue-200"><Zap className="w-6 h-6" /></div>
                    <div className="text-left">
                       <h4 className="font-black text-slate-900 text-sm uppercase tracking-widest">Điểm đột xuất</h4>
                    </div>
                 </div>
                 <div className="flex-1 flex items-center justify-center gap-4">
                    <button onClick={() => setQuickPointsAmount(prev => Math.max(1, prev - 1))} className="p-4 bg-white rounded-2xl border border-slate-200 hover:bg-slate-100 transition-all text-slate-400"><MinusIcon className="w-5 h-5"/></button>
                    <input type="number" className="w-24 text-center bg-transparent text-3xl font-black text-slate-900 outline-none" value={quickPointsAmount} onChange={(e) => setQuickPointsAmount(Number(e.target.value))} />
                    <button onClick={() => setQuickPointsAmount(prev => prev + 1)} className="p-4 bg-white rounded-2xl border border-slate-200 hover:bg-slate-100 transition-all text-slate-400"><PlusIcon className="w-5 h-5"/></button>
                 </div>
                 <div className="flex gap-4">
                    <button onClick={() => handleAwardPointBulk(quickPointsAmount)} className="bg-emerald-500 text-white px-8 py-4 rounded-3xl font-black text-xs uppercase flex items-center gap-2 hover:scale-105 shadow-xl transition-all"><PlusIcon className="w-5 h-5" /> Cộng</button>
                    <button onClick={() => handleAwardPointBulk(-quickPointsAmount)} className="bg-rose-500 text-white px-8 py-4 rounded-3xl font-black text-xs uppercase flex items-center gap-2 hover:scale-105 shadow-xl transition-all"><MinusIcon className="w-5 h-5" /> Trừ</button>
                 </div>
              </div>

              <div className="grid md:grid-cols-2 gap-12">
                 <div className="space-y-6">
                    <h4 className="flex items-center gap-3 text-lg font-black text-emerald-500 uppercase tracking-widest"><ThumbsUp className="w-6 h-6"/> Tích cực (+)</h4>
                    <div className="grid grid-cols-2 gap-4">
                       {rewards.map(b => (
                         <button key={b.id} onClick={() => handleAwardPointBulk(b)} disabled={isSaving} className="p-8 bg-emerald-50/30 border-2 border-emerald-100 rounded-[3rem] hover:bg-emerald-500 hover:text-white transition-all group flex flex-col items-center gap-3 disabled:opacity-50"><span className="text-5xl group-hover:scale-125 transition-transform duration-300">{b.icon}</span><span className="font-black text-[11px] uppercase tracking-tight text-center">{b.name}</span></button>
                       ))}
                    </div>
                 </div>
                 <div className="space-y-6">
                    <h4 className="flex items-center gap-3 text-lg font-black text-rose-500 uppercase tracking-widest"><ThumbsDown className="w-6 h-6"/> Cần cố gắng (-)</h4>
                    <div className="grid grid-cols-2 gap-4">
                       {penalties.map(b => (
                         <button key={b.id} onClick={() => handleAwardPointBulk(b)} disabled={isSaving} className="p-8 bg-rose-50/30 border-2 border-rose-100 rounded-[3rem] hover:bg-rose-500 hover:text-white transition-all group flex flex-col items-center gap-3 disabled:opacity-50"><span className="text-5xl group-hover:scale-125 transition-transform duration-300">{b.icon}</span><span className="font-black text-[11px] uppercase tracking-tight text-center">{b.name}</span></button>
                       ))}
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}
      
      {/* Configuration Sidebar */}
      {showConfig && (
        <div className="fixed inset-0 z-[100] flex justify-end">
           <div className="absolute inset-0 bg-slate-900/20" onClick={() => setShowConfig(false)}></div>
           <div className="bg-white w-96 h-full shadow-2xl relative z-10 p-10 flex flex-col animate-in slide-in-from-right duration-300">
              <div className="flex justify-between items-center mb-10">
                 <h3 className="text-xl font-black text-slate-900 uppercase tracking-widest">Cấu hình sơ đồ</h3>
                 <button onClick={() => setShowConfig(false)} className="p-2 bg-slate-50 rounded-xl"><X className="w-5 h-5 text-slate-400"/></button>
              </div>
              
              <div className="space-y-8 flex-1 overflow-y-auto">
                 <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kích thước Grid</label>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between">
                          <span className="text-xs font-bold">Hàng</span>
                          <div className="flex items-center gap-2">
                             <button onClick={() => setGridSize(g => ({...g, rows: Math.max(1, g.rows-1)}))} className="p-1 hover:bg-white rounded"><MinusCircle className="w-4 h-4 text-slate-400"/></button>
                             <span className="font-black">{gridSize.rows}</span>
                             <button onClick={() => setGridSize(g => ({...g, rows: g.rows+1}))} className="p-1 hover:bg-white rounded"><PlusCircle className="w-4 h-4 text-slate-400"/></button>
                          </div>
                       </div>
                       <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between">
                          <span className="text-xs font-bold">Cột</span>
                          <div className="flex items-center gap-2">
                             <button onClick={() => setGridSize(g => ({...g, cols: Math.max(1, g.cols-1)}))} className="p-1 hover:bg-white rounded"><MinusCircle className="w-4 h-4 text-slate-400"/></button>
                             <span className="font-black">{gridSize.cols}</span>
                             <button onClick={() => setGridSize(g => ({...g, cols: g.cols+1}))} className="p-1 hover:bg-white rounded"><PlusCircle className="w-4 h-4 text-slate-400"/></button>
                          </div>
                       </div>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hiển thị</label>
                    <div className="space-y-3">
                       <button onClick={() => setPairMode(!pairMode)} className={`w-full p-4 rounded-2xl font-black text-xs uppercase flex items-center justify-between border-2 transition-all ${pairMode ? 'bg-blue-600 text-white border-blue-600 shadow-lg' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                          Chế độ bàn đôi {pairMode ? <Check className="w-4 h-4"/> : <PlusIcon className="w-4 h-4"/>}
                       </button>
                       <button onClick={() => setViewFromBack(!viewFromBack)} className={`w-full p-4 rounded-2xl font-black text-xs uppercase flex items-center justify-between border-2 transition-all ${viewFromBack ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                          Nhìn từ cuối lớp {viewFromBack ? <Check className="w-4 h-4"/> : <RotateCw className="w-4 h-4"/>}
                       </button>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tùy chỉnh khác</label>
                    <button onClick={() => setSoundEnabled(!soundEnabled)} className={`w-full p-4 rounded-2xl font-black text-xs uppercase flex items-center justify-between border-2 transition-all ${soundEnabled ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                       Âm thanh thông báo {soundEnabled ? <Check className="w-4 h-4"/> : <PlusIcon className="w-4 h-4"/>}
                    </button>
                 </div>
              </div>

              <div className="pt-10">
                 <button onClick={saveGridConfig} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl flex items-center justify-center gap-2 hover:bg-blue-600 transition-all">
                    <Save className="w-5 h-5"/> Lưu cấu hình
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default LiveClassTools;
