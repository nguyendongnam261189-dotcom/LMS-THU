import React, { useMemo, useState } from "react";
import { ChevronDown, Users } from "lucide-react";
import type { ClassInfo } from "../types";

interface ClassSwitcherProps {
  classes: ClassInfo[];
  activeClassId: string;
  onSwitch: (id: string) => void;
}

const ClassSwitcher: React.FC<ClassSwitcherProps> = ({
  classes,
  activeClassId,
  onSwitch,
}) => {
  const [open, setOpen] = useState(false);

  const activeClass = useMemo(() => {
    if (!classes || classes.length === 0) return undefined;
    return classes.find((c) => c.id === activeClassId) || classes[0];
  }, [classes, activeClassId]);

  if (!classes || classes.length === 0) return null;

  return (
    <div className="px-4">
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-white border border-slate-200 shadow-sm hover:bg-slate-50 transition"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-slate-600" />
            </div>

            <div className="min-w-0 text-left">
              <p className="text-sm font-bold text-slate-900 truncate">
                {activeClass?.name || "Chọn lớp"}
              </p>
              <p className="text-xs text-slate-500 truncate">
                Mã lớp: {activeClass?.code || "---"}
              </p>
            </div>
          </div>

          <ChevronDown
            className={`w-5 h-5 text-slate-500 transition ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>

        {open && (
          <div className="absolute z-20 mt-2 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
            <div className="max-h-64 overflow-auto">
              {classes.map((c) => {
                const isActive = c.id === (activeClass?.id ?? "");
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      onSwitch(c.id);
                      setOpen(false);
                    }}
                    className={`w-full text-left px-4 py-3 flex items-center justify-between gap-3 hover:bg-slate-50 transition ${
                      isActive ? "bg-slate-50" : ""
                    }`}
                  >
                    <div className="min-w-0">
                      <p
                        className={`text-sm font-semibold truncate ${
                          isActive ? "text-slate-900" : "text-slate-800"
                        }`}
                      >
                        {c.name}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        Mã lớp: {c.code}
                        {typeof c.student_count === "number"
                          ? ` • ${c.student_count} HS`
                          : ""}
                      </p>
                    </div>
                    {isActive && (
                      <span className="text-xs font-bold text-blue-600">
                        Đang chọn
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Click ra ngoài để đóng (đơn giản) */}
      {open && (
        <button
          type="button"
          aria-label="close"
          className="fixed inset-0 z-10 cursor-default"
          onClick={() => setOpen(false)}
        />
      )}
    </div>
  );
};

export default ClassSwitcher;
