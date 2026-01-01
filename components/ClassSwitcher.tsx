
import React from 'react';
import { ChevronDown, Users } from 'lucide-react';
import { ClassInfo } from '../types';

interface ClassSwitcherProps {
  classes: ClassInfo[];
  activeClassId: string;
  onSwitch: (id: string) => void;
}

const ClassSwitcher: React.FC<ClassSwitcherProps> = ({ classes, activeClassId, onSwitch }) => {
  const activeClass = classes.find(c => c.id === activeClassId) || classes[0];

  return (
    <div className="relative group px-4 py-2">
      <button className="w-full flex items-center justify-between bg-white border border-slate-200 p-3 rounded-xl hover:border-blue-300 transition-all shadow-sm">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
            <Users className="w-4 h-4" />
          </div>
          <div className="text-left overflow-hidden">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Lớp đang chọn</p>
            <p className="font-bold text-slate-900 truncate">{activeClass?.name}</p>
          </div>
        </div>
        <ChevronDown className="w-4 h-4 text-slate-400" />
      </button>

      <div className="absolute top-full left-4 right-4 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl hidden group-hover:block z-50 overflow-hidden">
        {classes.map((c) => (
          <button
            key={c.id}
            onClick={() => onSwitch(c.id)}
            className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors text-sm font-semibold flex items-center justify-between ${
              activeClassId === c.id ? 'text-blue-600 bg-blue-50' : 'text-slate-700'
            }`}
          >
            {c.name}
            {activeClassId === c.id && <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ClassSwitcher;
