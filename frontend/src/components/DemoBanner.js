'use client';
import { ShieldIcon } from './Icons';

export default function DemoBanner() {
  return (
    <div className="relative z-50 bg-gradient-to-r from-[#0d121f] via-[#161226] to-[#0d121f] border-b border-amber-500/20 text-xs py-2 px-4 shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 text-[11px] sm:text-xs">
        <div className="flex items-center gap-2 text-gray-300">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-semibold text-amber-300 flex items-center gap-1">
            <ShieldIcon className="w-3.5 h-3.5 text-amber-400 inline" />
            ESCROW VAULT 2.0:
          </span>
          <span className="text-gray-300 hidden sm:inline">
            Sàn giao dịch game P2P thử nghiệm — Cơ chế ký quỹ trung gian & Sổ cái kế toán kép.
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0 font-mono text-[11px] text-gray-400">
          <span className="text-emerald-400 flex items-center gap-1 font-medium">
            <span>● Giao dịch ký quỹ hai chiều</span>
          </span>
        </div>
      </div>
    </div>
  );
}
