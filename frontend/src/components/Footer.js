'use strict';
import Link from 'next/link';
import { ShieldIcon, GamepadIcon } from './Icons';

export default function Footer() {
  return (
    <footer className="relative bg-[#05070c] border-t border-white/[0.08] text-gray-400 text-sm mt-auto overflow-hidden">
      {/* Background ambient light */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-purple-900/10 blur-[140px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand & Escrow Explanation */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 via-indigo-600 to-cyan-500 p-[1.5px] shadow-lg">
                <div className="w-full h-full rounded-xl bg-[#0d131f] flex items-center justify-center text-white">
                  <GamepadIcon className="w-4 h-4 text-purple-400" />
                </div>
              </div>
              <span className="font-extrabold text-xl text-white tracking-tight font-heading">
                GAMER<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">2</span>GAMER
              </span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed font-light">
              Sàn thương mại điện tử giao dịch tài khoản, vật phẩm & dịch vụ cày thuê rank hàng đầu với cơ chế bảo chứng ký quỹ 2 chiều và két bàn giao Handover Vault™ mã hóa.
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] text-[11px] text-gray-300 font-mono">
              <ShieldIcon className="w-3.5 h-3.5 text-emerald-400" />
              <span>Sổ Cái Kế Toán Kép An Toàn</span>
            </div>
          </div>

          {/* Marketplace Navigation */}
          <div>
            <h4 className="text-white font-bold text-xs uppercase tracking-widest mb-4 font-mono text-purple-400">
              Thị Trường Game
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link href="/games" className="text-gray-400 hover:text-white transition-colors">
                  Khám Phá Các Tựa Game
                </Link>
              </li>
              <li>
                <Link href="/offers?type=account" className="text-gray-400 hover:text-white transition-colors">
                  Tài Khoản Game VIP
                </Link>
              </li>
              <li>
                <Link href="/offers?type=item" className="text-gray-400 hover:text-white transition-colors">
                  Vật Phẩm & Vàng Trong Game
                </Link>
              </li>
              <li>
                <Link href="/offers?type=boosting" className="text-gray-400 hover:text-white transition-colors">
                  Dịch Vụ Cày Thuê Rank Pro
                </Link>
              </li>
              <li>
                <Link href="/become-seller" className="text-amber-400 hover:text-amber-300 transition-colors font-medium">
                  ⭐ Trở Thành Người Bán Uy Tín
                </Link>
              </li>
            </ul>
          </div>

          {/* How It Works & Support */}
          <div>
            <h4 className="text-white font-bold text-xs uppercase tracking-widest mb-4 font-mono text-cyan-400">
              An Toàn & Ký Quỹ
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link href="/how-it-works" className="text-gray-400 hover:text-white transition-colors">
                  Quy Trình Ký Quỹ Escrow
                </Link>
              </li>
              <li>
                <Link href="/how-it-works#disputes" className="text-gray-400 hover:text-white transition-colors">
                  Trọng Tài & Xử Lý Tranh Chấp
                </Link>
              </li>
              <li>
                <Link href="/how-it-works#handover" className="text-gray-400 hover:text-white transition-colors">
                  Két Bàn Giao Handover Vault™
                </Link>
              </li>
              <li>
                <Link href="/wallet" className="text-gray-400 hover:text-white transition-colors">
                  Ví Tiền & Nạp Thử Nghiệm
                </Link>
              </li>
            </ul>
          </div>

          {/* Academic / Project Disclaimer */}
          <div>
            <h4 className="text-white font-bold text-xs uppercase tracking-widest mb-4 font-mono text-emerald-400">
              Đồ Án Kỳ HAQ
            </h4>
            <p className="text-xs text-gray-400 leading-relaxed mb-3 font-light">
              Hệ thống được phát triển phục vụ đồ án kỳ chuyên ngành CNTT. Toàn bộ chính sách thanh toán và số dư tiền tệ đều được mô phỏng phục vụ nghiên cứu và học tập.
            </p>
            <div className="text-[11px] text-amber-300 bg-amber-950/40 border border-amber-500/30 px-3 py-1.5 rounded-xl inline-flex items-center gap-1.5 font-medium">
              <span>● Môi trường Sandbox thử nghiệm</span>
            </div>
          </div>
        </div>

        <div className="border-t border-white/[0.06] mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500 font-mono">
          <p>© {new Date().getFullYear()} GAMER 2 GAMER ESCROW. Bản quyền đồ án HAQ.</p>
          <div className="flex items-center gap-3 text-gray-400">
            <span>Tiền tệ: EUR (€)</span>
            <span>•</span>
            <span className="text-purple-400">Next.js 16 App Router & Tailwind CSS</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
