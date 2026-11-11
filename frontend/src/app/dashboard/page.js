'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { formatEUR, formatDate, STATUS_MAP } from '@/lib/utils';
import {
  WalletIcon,
  ShieldIcon,
  ClockIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  ArrowRightIcon,
  BellIcon,
} from '@/components/Icons';

export default function CustomerDashboardPage() {
  const router = useRouter();
  const { user, wallet, refreshWallet, refreshUnread } = useAuth();

  const [dashboard, setDashboard] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/login?redirect=/dashboard');
      return;
    }

    async function loadData() {
      try {
        const [dashRes, notifRes] = await Promise.all([
          apiRequest('/api/dashboard'),
          apiRequest('/api/notifications'),
        ]);
        setDashboard(dashRes);
        setNotifications(notifRes.items || []);
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user, router]);

  const markAllRead = async () => {
    try {
      await apiRequest('/api/notifications/read-all', { method: 'POST' });
      const notifRes = await apiRequest('/api/notifications');
      setNotifications(notifRes.items || []);
      await refreshUnread();
    } catch (err) {
      console.error(err);
    }
  };

  if (!user || loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center text-gray-400">
        <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm">Đang tải bảng điều khiển...</p>
      </div>
    );
  }

  const { stats, recentOrders } = dashboard || { stats: {}, recentOrders: [] };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Chào mừng trở lại, {user.displayName}
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Tổng quan đơn hàng đang giao dịch, số dư ký quỹ và thông báo hệ thống
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/wallet"
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-md shadow-purple-950/40 transition-all flex items-center gap-2"
          >
            <WalletIcon className="w-4 h-4" />
            <span>Quản Lý Ví Tiền</span>
          </Link>
          <Link
            href="/offers"
            className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 font-semibold text-xs transition-colors"
          >
            Khám Phá Thị Trường
          </Link>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Wallet Balance Card */}
        <div className="bg-[#111722] border border-gray-800 rounded-2xl p-6 space-y-3 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-gray-400 font-medium">Số Dư Khả Dụng</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <WalletIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-white">
            {formatEUR(wallet?.available || 0)}
          </div>
          <div className="pt-2 border-t border-gray-800/80 flex items-center justify-between text-xs">
            <span className="text-gray-400">Đang Giữ Ký Quỹ:</span>
            <span className="font-semibold text-purple-400 font-mono">
              {formatEUR(wallet?.held || 0)}
            </span>
          </div>
        </div>

        {/* Open Orders */}
        <div className="bg-[#111722] border border-gray-800 rounded-2xl p-6 space-y-3 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-gray-400 font-medium">Đơn Mua Đang Giao Dịch</span>
            <div className="w-8 h-8 rounded-lg bg-purple-950/80 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <ClockIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-white">
            {stats.openOrders || 0}
          </div>
          <div className="pt-2 border-t border-gray-800/80 flex items-center justify-between text-xs">
            <span className="text-gray-400">Chờ bạn xác nhận:</span>
            <span className="font-semibold text-amber-400 font-mono">
              {stats.awaitingConfirmation || 0}
            </span>
          </div>
        </div>

        {/* Completed Orders */}
        <div className="bg-[#111722] border border-gray-800 rounded-2xl p-6 space-y-3 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-gray-400 font-medium">Đơn Mua Đã Hoàn Tất</span>
            <div className="w-8 h-8 rounded-lg bg-blue-950/80 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <CheckCircleIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-white">
            {stats.completedOrders || 0}
          </div>
          <div className="pt-2 border-t border-gray-800/80 flex items-center justify-between text-xs">
            <span className="text-gray-400">Cơ chế:</span>
            <span className="font-semibold text-emerald-400 text-[11px]">Ký quỹ hai chiều</span>
          </div>
        </div>
      </div>

      {/* Recent Purchases & Notifications Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Recent Orders */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white tracking-tight">Đơn Mua Gần Đây</h2>
            <Link
              href="/orders"
              className="text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1"
            >
              <span>Xem tất cả đơn mua</span>
              <ArrowRightIcon className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="bg-[#111722] border border-gray-800 rounded-2xl overflow-hidden shadow-lg">
            {recentOrders.length > 0 ? (
              <div className="divide-y divide-gray-800">
                {recentOrders.map((ord) => {
                  const st = STATUS_MAP[ord.status] || { label: ord.status, bg: 'bg-gray-800', text: 'text-gray-300' };
                  return (
                    <Link
                      key={ord.id}
                      href={`/orders/${ord.id}`}
                      className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-[#161f2e] transition-colors block"
                    >
                      <div className="space-y-1 truncate">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-gray-300">
                            {ord.orderNumber}
                          </span>
                          <span
                            className={`text-[10px] font-mono uppercase font-semibold px-2 py-0.5 rounded border ${st.bg} ${st.text} ${st.border}`}
                          >
                            {st.label}
                          </span>
                        </div>
                        <h4 className="font-semibold text-sm text-white truncate max-w-md">
                          {ord.title}
                        </h4>
                        <span className="text-[11px] text-gray-400 block font-mono">
                          {formatDate(ord.createdAt)}
                        </span>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-extrabold text-sm text-white">
                          {formatEUR(ord.total)}
                        </div>
                        <span className="text-[11px] text-purple-400 font-semibold block mt-1 hover:underline">
                          Xem Đơn Hàng →
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="p-12 text-center text-gray-400 space-y-3">
                <p className="text-sm">Bạn chưa thực hiện đơn mua nào.</p>
                <Link
                  href="/offers"
                  className="inline-block px-4 py-2 rounded-lg bg-purple-600 text-white text-xs font-semibold"
                >
                  Khám Phá Tin Rao
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Notifications Feed */}
        <div className="space-y-4" id="notifications">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BellIcon className="w-4 h-4 text-purple-400" />
              <h2 className="text-lg font-bold text-white tracking-tight">Thông Báo</h2>
            </div>
            {notifications.some((n) => !n.readAt) && (
              <button
                onClick={markAllRead}
                className="text-[11px] text-purple-400 hover:text-purple-300 font-medium"
              >
                Đánh dấu đã đọc tất cả
              </button>
            )}
          </div>

          <div className="bg-[#111722] border border-gray-800 rounded-2xl p-4 space-y-2.5 max-h-[460px] overflow-y-auto">
            {notifications.length > 0 ? (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-3 rounded-xl border text-xs transition-colors ${
                    !n.readAt
                      ? 'bg-purple-950/30 border-purple-500/30 text-gray-200'
                      : 'bg-gray-900/40 border-gray-800/80 text-gray-400'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-white text-xs">{n.title}</span>
                    <span className="text-[10px] text-gray-400 font-mono shrink-0">
                      {formatDate(n.createdAt)}
                    </span>
                  </div>
                  {n.body && <p className="mt-1 leading-relaxed text-gray-300">{n.body}</p>}
                  {n.link && (
                    <Link
                      href={n.link}
                      className="mt-2 inline-block text-purple-400 hover:text-purple-300 text-[11px] font-semibold"
                    >
                      Xem chi tiết →
                    </Link>
                  )}
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-gray-400 text-xs">
                Hiện không có thông báo nào.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
