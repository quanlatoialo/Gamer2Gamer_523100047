'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { formatEUR, formatDateTime, getStatusBadge } from '@/lib/utils';
import {
  WalletIcon,
  ShieldIcon,
  ClockIcon,
  ChevronRightIcon,
  TagIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
} from '@/components/Icons';

export default function MerchantDashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isMerchant = user && (user.roles?.includes('seller') || user.roles?.includes('booster'));

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login?redirect=/seller');
      return;
    }
    if (!isMerchant) {
      setLoading(false);
      return;
    }

    loadDashboard();
  }, [user, authLoading, isMerchant]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/merchant/dashboard');
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to load merchant data');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || (loading && !data && isMerchant)) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-gray-400">
        <div className="inline-block w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p>Đang tải bảng điều khiển người bán...</p>
      </div>
    );
  }

  // Non-merchant applicant / customer view
  if (!isMerchant) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-purple-900/30 border border-purple-800/50 text-purple-400 flex items-center justify-center mx-auto mb-6">
          <ShieldIcon className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-extrabold text-white mb-3">Yêu Cầu Quyền Người Bán</h1>
        <p className="text-gray-400 mb-8 max-w-lg mx-auto">
          Tài khoản hiện tại của bạn là Người Mua. Để đăng bài bán, xử lý đơn hàng và nhận tiền giải ngân ký quỹ, hãy đăng ký trở thành Người Bán hoặc Cày Thuê Rank được cấp phép.
        </p>
        <div className="flex justify-center gap-4">
          <Link
            href="/become-seller"
            className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold transition shadow-lg shadow-purple-900/30"
          >
            Đăng Ký Người Bán / Cày Thuê
          </Link>
          <Link
            href="/dashboard"
            className="px-6 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold transition"
          >
            Bảng Điều Khiển Mua Hàng
          </Link>
        </div>
      </div>
    );
  }

  const offers = data?.offers || {};
  const orders = data?.orders || {};
  const wallet = data?.wallet || { available: 0, held: 0, currency: 'EUR' };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-800/80 pb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Cổng Quản Lý Người Bán</h1>
            <span className="text-xs uppercase font-mono px-2 py-0.5 rounded bg-purple-900/60 border border-purple-700/50 text-purple-300 font-bold">
              {user.roles?.includes('booster') ? 'Cày Thuê Rank Xác Minh' : 'Người Bán Xác Minh'}
            </span>
          </div>
          <p className="text-sm text-gray-400">
            Giám sát đơn bán mới, tiến độ bàn giao, quản lý bài đăng và theo dõi doanh thu ký quỹ sổ cái kép.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/seller/offers/new"
            className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium text-sm transition shadow-lg shadow-purple-900/30 flex items-center gap-2"
          >
            <TagIcon className="w-4 h-4" />
            Tạo Bài Đăng Mới
          </Link>
          <Link
            href="/seller/orders"
            className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 font-medium text-sm transition border border-gray-700/70"
          >
            Đơn Bán Của Tôi
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={loadDashboard} className="underline text-xs ml-4">Thử lại</button>
        </div>
      )}

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="p-6 rounded-2xl bg-[#111722]/80 border border-gray-800/80 relative overflow-hidden">
          <div className="flex items-center justify-between text-gray-400 text-xs font-mono uppercase tracking-wider mb-2">
            <span>Số Dư Khả Dụng</span>
            <WalletIcon className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">
            {formatEUR(wallet.available)}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Tiền đã được giải ngân về ví từ các đơn hoàn tất thành công.
          </p>
          <div className="mt-4 pt-4 border-t border-gray-800/60 flex items-center justify-between">
            <Link href="/wallet" className="text-xs font-medium text-purple-400 hover:text-purple-300 flex items-center gap-1">
              Chi Tiết Ví Tiền <ChevronRightIcon className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-[#111722]/80 border border-purple-900/40 relative overflow-hidden">
          <div className="flex items-center justify-between text-purple-300 text-xs font-mono uppercase tracking-wider mb-2">
            <span>Đang Tạm Giữ Ký Quỹ</span>
            <ShieldIcon className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-3xl font-extrabold text-purple-300">
            {formatEUR(wallet.held)}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Đang được giữ an toàn trong két ký quỹ chờ khách kiểm tra & xác nhận.
          </p>
          <div className="mt-4 pt-4 border-t border-gray-800/60 flex items-center justify-between">
            <Link href="/seller/earnings" className="text-xs font-medium text-purple-400 hover:text-purple-300 flex items-center gap-1">
              Thống Kê Doanh Thu <ChevronRightIcon className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-[#111722]/80 border border-gray-800/80 relative overflow-hidden">
          <div className="flex items-center justify-between text-gray-400 text-xs font-mono uppercase tracking-wider mb-2">
            <span>Bài Đăng Đang Mở Bán</span>
            <TagIcon className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">
            {offers.active || 0}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {offers.paused || 0} tạm dừng, {offers.expired || 0} hết hạn, {offers.sold_out || 0} hết hàng.
          </p>
          <div className="mt-4 pt-4 border-t border-gray-800/60 flex items-center justify-between">
            <Link href="/seller/offers" className="text-xs font-medium text-purple-400 hover:text-purple-300 flex items-center gap-1">
              Quản Lý Danh Sách Bài <ChevronRightIcon className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Sales Action Pipeline Status */}
      <div className="p-6 rounded-2xl bg-[#111722]/80 border border-gray-800/80 space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <ClockIcon className="w-4 h-4 text-purple-400" />
          Tiến Trình Đơn Bán Trực Tiếp
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3 rounded-xl bg-gray-900/60 border border-gray-800 text-center">
            <div className="text-xs text-gray-400 font-mono">Đã Ký Quỹ (Mới)</div>
            <div className="text-xl font-bold text-blue-400 mt-1">{orders.funded || 0}</div>
          </div>
          <div className="p-3 rounded-xl bg-gray-900/60 border border-gray-800 text-center">
            <div className="text-xs text-gray-400 font-mono">Đang Thực Hiện</div>
            <div className="text-xl font-bold text-indigo-400 mt-1">{orders.in_progress || 0}</div>
          </div>
          <div className="p-3 rounded-xl bg-gray-900/60 border border-gray-800 text-center">
            <div className="text-xs text-gray-400 font-mono">Chờ Khách Duyệt</div>
            <div className="text-xl font-bold text-amber-400 mt-1">{orders.awaiting_customer_confirmation || 0}</div>
          </div>
          <div className="p-3 rounded-xl bg-gray-900/60 border border-gray-800 text-center">
            <div className="text-xs text-gray-400 font-mono">Hoàn Tất</div>
            <div className="text-xl font-bold text-emerald-400 mt-1">{orders.completed || 0}</div>
          </div>
          <div className="p-3 rounded-xl bg-gray-900/60 border border-gray-800 text-center">
            <div className="text-xs text-gray-400 font-mono">Khiếu Nại</div>
            <div className="text-xl font-bold text-rose-400 mt-1">{orders.disputed || 0}</div>
          </div>
          <div className="p-3 rounded-xl bg-gray-900/60 border border-gray-800 text-center">
            <div className="text-xs text-gray-400 font-mono">Đã Hủy</div>
            <div className="text-xl font-bold text-gray-400 mt-1">{orders.cancelled || 0}</div>
          </div>
        </div>
      </div>

      {/* Recent Sales Orders Table */}
      <div className="p-6 rounded-2xl bg-[#111722]/80 border border-gray-800/80 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white">Đơn Bán Hàng Gần Đây</h2>
          <Link
            href="/seller/orders"
            className="text-xs text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1"
          >
            Xem Tất Cả Đơn Bán <ChevronRightIcon className="w-3.5 h-3.5" />
          </Link>
        </div>

        {(!data?.recentOrders || data.recentOrders.length === 0) ? (
          <div className="text-center py-10 text-gray-500 text-sm">
            Chưa có đơn bán nào. Hãy đăng các sản phẩm có nhu cầu cao để đón lượt mua đầu tiên!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="text-xs uppercase bg-gray-900/70 text-gray-400 font-mono border-b border-gray-800">
                <tr>
                  <th className="py-3 px-4">Mã Đơn #</th>
                  <th className="py-3 px-4">Tên Sản Phẩm</th>
                  <th className="py-3 px-4">Người Mua</th>
                  <th className="py-3 px-4">Số Tiền</th>
                  <th className="py-3 px-4">Trạng Thái</th>
                  <th className="py-3 px-4">Thời Gian</th>
                  <th className="py-3 px-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {data.recentOrders.map((ord) => {
                  const badge = getStatusBadge(ord.status);
                  return (
                    <tr key={ord.id} className="hover:bg-gray-800/30 transition">
                      <td className="py-3 px-4 font-mono text-purple-400 font-medium">
                        {ord.orderNumber}
                      </td>
                      <td className="py-3 px-4 font-medium text-white max-w-xs truncate">
                        {ord.title}
                      </td>
                      <td className="py-3 px-4 text-gray-300">
                        {ord.buyer || 'Khách vãng lai'}
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-white">
                        {formatEUR(ord.total)}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded text-xs font-semibold ${badge.bg} ${badge.color}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-400 whitespace-nowrap">
                        {formatDateTime(ord.createdAt)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/orders/${ord.id}`}
                          className="px-3 py-1 rounded bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 text-xs font-medium transition"
                        >
                          Mở Phòng Giao Dịch
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
