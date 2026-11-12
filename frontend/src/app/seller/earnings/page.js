'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { formatEUR, formatDateTime } from '@/lib/utils';
import {
  WalletIcon,
  ShieldIcon,
  ClockIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  RefreshIcon,
  AlertTriangleIcon,
} from '@/components/Icons';

export default function MerchantEarningsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isMerchant = user && (user.roles?.includes('seller') || user.roles?.includes('booster'));

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login?redirect=/seller/earnings');
      return;
    }
    if (!isMerchant) {
      router.push('/become-seller');
      return;
    }
    loadEarnings();
  }, [user, authLoading, isMerchant]);

  const loadEarnings = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/merchant/earnings');
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to load earnings breakdown');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || (loading && !data)) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-gray-500">
        <div className="inline-block w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p>Loading financial records...</p>
      </div>
    );
  }

  const totals = data?.totals || { gross: 0, fees: 0, net: 0, orders: 0 };
  const wallet = data?.wallet || { available: 0, held: 0 };
  const pending = data?.pending || [];
  const released = data?.released || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-gray-400 mb-1">
            <Link href="/seller" className="hover:text-purple-400">Người Bán</Link>
            <ChevronRightIcon className="w-3.5 h-3.5" />
            <span className="text-white">Doanh Thu & Ký Quỹ</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <ShieldIcon className="w-7 h-7 text-purple-400" />
            Báo Cáo Doanh Thu & Số Dư Ký Quỹ
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Đối soát sổ cái kế toán kép minh bạch cho mọi giao dịch giải ngân và ký quỹ.
          </p>
        </div>

        <button
          onClick={loadEarnings}
          className="p-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition border border-gray-700 self-start sm:self-auto"
          title="Làm mới"
        >
          <RefreshIcon className="w-4 h-4" />
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-6 rounded-2xl bg-[#111722]/80 border border-gray-800/80">
          <div className="text-xs font-mono uppercase text-gray-400 mb-1">Tổng Thực Nhận (Net)</div>
          <div className="text-2xl font-black text-emerald-400 font-mono">
            {formatEUR(totals.net)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Từ {totals.orders} đơn bán hoàn tất thành công
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-[#111722]/80 border border-gray-800/80">
          <div className="text-xs font-mono uppercase text-gray-400 mb-1">Phí Nền Tảng Đã Trừ</div>
          <div className="text-2xl font-black text-gray-300 font-mono">
            {formatEUR(totals.fees)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Tổng giá trị đơn (Gross): {formatEUR(totals.gross)}
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-[#111722]/80 border border-purple-900/50">
          <div className="text-xs font-mono uppercase text-purple-300 mb-1">Đang Tạm Giữ Ký Quỹ</div>
          <div className="text-2xl font-black text-purple-300 font-mono">
            {formatEUR(wallet.held)}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {pending.length} đơn đang chờ giải ngân
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-[#111722]/80 border border-gray-800/80">
          <div className="text-xs font-mono uppercase text-gray-400 mb-1">Khả Dụng Trong Ví</div>
          <div className="text-2xl font-black text-white font-mono">
            {formatEUR(wallet.available)}
          </div>
          <div className="mt-2">
            <Link href="/wallet" className="text-xs text-purple-400 hover:text-purple-300 font-medium">
              Xem Ví Tiền & Lịch Sử Sổ Cái →
            </Link>
          </div>
        </div>
      </div>

      {/* Pending Escrow Orders Table */}
      <div className="p-6 rounded-2xl bg-[#111722]/80 border border-gray-800/80 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <ClockIcon className="w-5 h-5 text-purple-400" />
              Khoản Chờ Giải Ngân Từ Ký Quỹ
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Tiền sẽ được tự động cộng vào số dư ví khả dụng ngay khi người mua bấm xác nhận hoàn tất.
            </p>
          </div>
        </div>

        {pending.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            Hiện không có khoản tiền nào đang tạm giữ ký quỹ.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="text-xs uppercase bg-gray-900/70 text-gray-400 font-mono border-b border-gray-800">
                <tr>
                  <th className="py-3 px-4">Mã Đơn #</th>
                  <th className="py-3 px-4">Tên Sản Phẩm</th>
                  <th className="py-3 px-4">Giá Trị Ký Quỹ</th>
                  <th className="py-3 px-4">Phí Sàn</th>
                  <th className="py-3 px-4">Thực Nhận</th>
                  <th className="py-3 px-4">Trạng Thái Đơn</th>
                  <th className="py-3 px-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {pending.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-800/30 transition">
                    <td className="py-3 px-4 font-mono text-purple-400 font-semibold">
                      {p.order?.orderNumber || 'ĐƠN'}
                    </td>
                    <td className="py-3 px-4 text-white font-medium max-w-xs truncate">
                      {p.order?.title || 'Đơn hàng trò chơi'}
                    </td>
                    <td className="py-3 px-4 font-mono text-gray-200">
                      {formatEUR(p.amount)}
                    </td>
                    <td className="py-3 px-4 font-mono text-gray-400 text-xs">
                      {formatEUR(p.fee)}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                      {formatEUR(p.net)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-xs px-2 py-0.5 rounded font-mono uppercase bg-amber-950/80 text-amber-300 border border-amber-800/40">
                        {p.order?.status || 'Tạm giữ'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {p.order?.id && (
                        <Link
                          href={`/orders/${p.order.id}`}
                          className="px-3 py-1 rounded bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 text-xs font-medium transition"
                        >
                          Phòng Giao Dịch
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Historical Released Settlements Table */}
      <div className="p-6 rounded-2xl bg-[#111722]/80 border border-gray-800/80 space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <CheckCircleIcon className="w-5 h-5 text-emerald-400" />
          Lịch Sử Giải Ngân Gần Đây
        </h2>

        {released.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            Chưa có khoản giải ngân hoàn tất nào.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="text-xs uppercase bg-gray-900/70 text-gray-400 font-mono border-b border-gray-800">
                <tr>
                  <th className="py-3 px-4">Ngày Giờ</th>
                  <th className="py-3 px-4">Mã Đơn #</th>
                  <th className="py-3 px-4">Nội Dung / Diễn Giải</th>
                  <th className="py-3 px-4 text-right">Số Tiền Cộng Vào Ví</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {released.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-800/30 transition">
                    <td className="py-3 px-4 text-xs text-gray-400 whitespace-nowrap">
                      {formatDateTime(r.createdAt)}
                    </td>
                    <td className="py-3 px-4 font-mono text-purple-400 font-medium">
                      {r.order ? (
                        <Link href={`/orders/${r.order.id}`} className="hover:underline">
                          {r.order.orderNumber}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-300 text-xs">
                      {r.memo || 'Giải ngân tiền ký quỹ'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                      +{formatEUR(r.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
