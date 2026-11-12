'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import {
  ShieldIcon,
  CheckCircleIcon,
  ClockIcon,
  AlertTriangleIcon,
  GamepadIcon,
} from '@/components/Icons';

export default function BecomeSellerPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState('seller');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login?redirect=/become-seller');
      return;
    }
    loadApplications();
  }, [user, authLoading]);

  const loadApplications = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/seller-applications/mine');
      setApplications(res.items || []);
    } catch (err) {
      setError(err.message || 'Failed to load application history');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (message.trim().length < 20) {
      setError('Please provide a message of at least 20 characters detailing your experience');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      setSuccess('');
      await api.post('/seller-applications', {
        requestedRole: role,
        message: message.trim(),
      });
      setSuccess(`Your application for ${role} has been submitted for admin review!`);
      setMessage('');
      await loadApplications();
    } catch (err) {
      setError(err.message || 'Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-gray-500">
        <div className="inline-block w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p>Đang kiểm tra hồ sơ ứng tuyển...</p>
      </div>
    );
  }

  const isSeller = user?.roles?.includes('seller');
  const isBooster = user?.roles?.includes('booster');
  const pendingApp = applications.find((a) => a.status === 'pending');

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Title */}
      <div className="text-center space-y-3">
        <div className="w-16 h-16 rounded-2xl bg-purple-900/30 border border-purple-800/50 text-purple-400 flex items-center justify-center mx-auto shadow-lg shadow-purple-900/20">
          <ShieldIcon className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          Gia Nhập Đội Ngũ Bán Hàng & Cày Thuê
        </h1>
        <p className="text-gray-400 max-w-xl mx-auto text-sm">
          Kiếm thu nhập từ kỹ năng game đỉnh cao. Đăng ký trở thành Người Bán để đăng bán tài khoản, vật phẩm hoặc Cày Thuê Rank để cung cấp dịch vụ kéo rank chuyên nghiệp.
        </p>
      </div>

      {/* Role Badges If Already Qualified */}
      {(isSeller || isBooster) && (
        <div className="p-6 rounded-2xl bg-emerald-950/30 border border-emerald-800/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <CheckCircleIcon className="w-6 h-6 text-emerald-400 flex-shrink-0" />
            <div>
              <div className="text-white font-bold text-sm">
                Bạn đã được cấp quyền đối tác:
              </div>
              <div className="flex gap-2 mt-1">
                {user.roles?.map((r) => (
                  <span key={r} className="text-xs uppercase font-mono px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-300 font-semibold border border-emerald-700/50">
                    {r === 'seller' ? 'Người bán' : r === 'booster' ? 'Cày thuê' : r === 'admin' ? 'Quản trị viên' : r}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <Link
            href="/seller"
            className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition"
          >
            Vào Cổng Quản Lý Bán Hàng →
          </Link>
        </div>
      )}

      {/* Pending Application Notice */}
      {pendingApp && (
        <div className="p-6 rounded-2xl bg-blue-950/30 border border-blue-800/50 space-y-3">
          <div className="flex items-center gap-3">
            <ClockIcon className="w-6 h-6 text-blue-400 flex-shrink-0" />
            <div>
              <div className="text-white font-bold text-sm">
                Hồ Sơ Đang Chờ Phê Duyệt: <span className="uppercase font-mono text-blue-300">{pendingApp.requestedRole === 'seller' ? 'Người bán' : 'Cày thuê'}</span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Nộp lúc {formatDateTime(pendingApp.createdAt)}. Ban quản trị thường phê duyệt hồ sơ trong vòng 24 giờ làm việc.
              </p>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-gray-900/60 border border-gray-800 text-xs text-gray-300 italic">
            "{pendingApp.message}"
          </div>
        </div>
      )}

      {/* Submission Form (Only if no pending application) */}
      {!pendingApp && (
        <div className="p-8 rounded-2xl bg-[#111722]/80 border border-gray-800/80 space-y-6">
          <h2 className="text-lg font-bold text-white border-b border-gray-800/60 pb-3">
            Nộp Hồ Sơ Ứng Tuyển Mới
          </h2>

          {error && (
            <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-sm">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-mono uppercase text-gray-400 mb-2">
                Vai Trò Bạn Muốn Đăng Ký *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label
                  className={`p-4 rounded-xl border cursor-pointer transition flex flex-col gap-1 ${
                    role === 'seller'
                      ? 'bg-purple-950/30 border-purple-600 text-white'
                      : 'bg-gray-900/50 border-gray-800 text-gray-400 hover:border-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-white">Người Bán (Seller)</span>
                    <input
                      type="radio"
                      name="role"
                      value="seller"
                      checked={role === 'seller'}
                      onChange={() => setRole('seller')}
                      className="text-purple-600 focus:ring-purple-500"
                    />
                  </div>
                  <span className="text-xs text-gray-400">
                    Đăng bán tài khoản game, vật phẩm, tiền tệ ảo và trang phục.
                  </span>
                </label>

                <label
                  className={`p-4 rounded-xl border cursor-pointer transition flex flex-col gap-1 ${
                    role === 'booster'
                      ? 'bg-purple-950/30 border-purple-600 text-white'
                      : 'bg-gray-900/50 border-gray-800 text-gray-400 hover:border-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-white">Cày Thuê Rank (Booster)</span>
                    <input
                      type="radio"
                      name="role"
                      value="booster"
                      checked={role === 'booster'}
                      onChange={() => setRole('booster')}
                      className="text-purple-600 focus:ring-purple-500"
                    />
                  </div>
                  <span className="text-xs text-gray-400">
                    Nhận cày kéo rank, leo bậc xếp hạng, đánh duo cùng khách và hướng dẫn.
                  </span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-gray-400 mb-2">
                Giới Thiệu Kinh Nghiệm & Cam Kết Chất Lượng * (tối thiểu 20 ký tự)
              </label>
              <textarea
                rows={5}
                minLength={20}
                maxLength={1000}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Giới thiệu kinh nghiệm chơi game, thứ hạng cao nhất, nguồn tài khoản sạch, thời gian hoạt động trực tuyến mỗi ngày..."
                className="w-full bg-gray-900 border border-gray-800 rounded-xl p-4 text-white text-sm focus:outline-none focus:border-purple-500 resize-y"
                required
              />
              <p className="text-[11px] text-gray-500 mt-1 font-mono">
                {message.length} / 1000 ký tự
              </p>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto px-8 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold transition shadow-lg shadow-purple-900/30 disabled:opacity-50"
            >
              {submitting ? 'Đang Nộp Hồ Sơ...' : 'Nộp Hồ Sơ Ứng Tuyển'}
            </button>
          </form>
        </div>
      )}

      {/* Historical Applications */}
      {applications.length > 0 && (
        <div className="p-6 rounded-2xl bg-[#111722]/80 border border-gray-800/80 space-y-4">
          <h2 className="text-base font-bold text-white">Lịch Sử Nộp Hồ Sơ</h2>
          <div className="space-y-3">
            {applications.map((app) => (
              <div
                key={app.id}
                className="p-4 rounded-xl bg-gray-900/60 border border-gray-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono uppercase font-bold text-purple-300">
                      {app.requestedRole === 'seller' ? 'Người bán' : 'Cày thuê'}
                    </span>
                    <span
                      className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded font-semibold ${
                        app.status === 'approved'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                          : app.status === 'rejected'
                          ? 'bg-red-950 text-red-300 border border-red-800/60'
                          : 'bg-blue-950 text-blue-300 border border-blue-800/60'
                      }`}
                    >
                      {app.status === 'approved' ? 'Đã duyệt' : app.status === 'rejected' ? 'Từ chối' : 'Chờ duyệt'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatDateTime(app.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    "{app.message}"
                  </p>
                  {app.reviewNote && (
                    <p className="text-xs text-amber-300 mt-1">
                      <strong>Ghi chú từ quản trị viên:</strong> {app.reviewNote}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
