'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/api';
import OfferCard from '@/components/OfferCard';
import {
  ShieldIcon,
  GamepadIcon,
  SearchIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  LockIcon,
  ClockIcon,
} from '@/components/Icons';

export default function HomePage() {
  const router = useRouter();
  const [games, setGames] = useState([]);
  const [latestOffers, setLatestOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [heroSearch, setHeroSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    async function loadData() {
      try {
        const [gamesRes, offersRes] = await Promise.all([
          apiRequest('/api/games'),
          apiRequest('/api/offers?limit=8'),
        ]);
        setGames(gamesRes.items || []);
        setLatestOffers(offersRes.items || []);
      } catch (err) {
        console.error('Failed to load homepage data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (heroSearch.trim()) {
      router.push(`/offers?q=${encodeURIComponent(heroSearch.trim())}`);
    }
  };

  const filteredOffers = activeTab === 'all'
    ? latestOffers
    : latestOffers.filter(o => o.type === activeTab);

  return (
    <div className="space-y-20 pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-24 border-b border-white/[0.06]">
        {/* Ambient Aurora Glows */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[450px] bg-gradient-to-tr from-purple-600/20 via-indigo-500/15 to-cyan-400/10 blur-[130px] rounded-full pointer-events-none" />
        <div className="absolute top-1/3 left-10 w-72 h-72 bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute top-1/4 right-10 w-80 h-80 bg-purple-600/15 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          {/* Luxury Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-purple-950/80 via-[#16122c] to-indigo-950/80 border border-purple-500/40 text-purple-200 text-xs font-semibold tracking-wider mb-8 shadow-lg shadow-purple-950/40">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <ShieldIcon className="w-3.5 h-3.5 text-purple-400" />
            <span>SÀN GIAO DỊCH KÝ QUỸ • CƠ CHẾ XÁC NHẬN HAI CHIỀU</span>
          </div>

          {/* Main Title */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight leading-[1.1] max-w-5xl mx-auto font-heading">
            Giao Dịch Tài Khoản & Vật Phẩm Game{' '}
            <span className="purple-cyan-gradient-text block mt-2">
              Đẳng Cấp, Sang Trọng & Tuyệt Đối An Toàn
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed font-light">
            Sàn thương mại điện tử chuyên nghiệp dành cho game thủ sành điệu. Bảo mật tuyệt đối với két bàn giao số <span className="text-purple-300 font-medium">Handover Vault™</span> và sổ cái kép tự động.
          </p>

          {/* Quick Search Bar */}
          <form onSubmit={handleSearch} className="mt-10 max-w-3xl mx-auto">
            <div className="relative p-1.5 rounded-2xl bg-gradient-to-r from-purple-500/20 via-white/10 to-cyan-500/20 border border-white/15 shadow-2xl backdrop-blur-xl">
              <div className="relative flex items-center bg-[#090d16]/90 rounded-xl overflow-hidden">
                <SearchIcon className="absolute left-4.5 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={heroSearch}
                  onChange={(e) => setHeroSearch(e.target.value)}
                  placeholder="Tìm kiếm: Valorant VIP, WoW Gold, Genshin Impact, Rank Thách Đấu..."
                  className="w-full bg-transparent border-0 pl-12 pr-36 py-4 text-sm sm:text-base text-white placeholder-gray-500 focus:outline-none focus:ring-0"
                />
                <button
                  type="submit"
                  className="absolute right-2 px-6 py-3 rounded-lg glow-btn-purple text-white font-bold text-xs sm:text-sm tracking-wide transition-all uppercase"
                >
                  Tìm Kiếm
                </button>
              </div>
            </div>

            {/* Trending Tags */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-gray-400">
              <span className="font-mono text-[11px] text-gray-500 uppercase">Xu hướng:</span>
              {['Valorant Immortal', 'WoW Gold Dragonflight', 'League of Legends Master', 'FC 25 Coins'].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    setHeroSearch(tag);
                    router.push(`/offers?q=${encodeURIComponent(tag)}`);
                  }}
                  className="px-2.5 py-1 rounded-md bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] hover:border-purple-500/40 text-gray-300 hover:text-white transition-all text-[11px]"
                >
                  {tag}
                </button>
              ))}
            </div>
          </form>

          {/* Luxury Metric / Trust Ticker Bar */}
          <div className="mt-14 pt-10 border-t border-white/[0.06] grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            <div className="text-center p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
              <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono">2 Chiều</div>
              <div className="text-xs text-gray-400 mt-1 flex items-center justify-center gap-1">
                <ShieldIcon className="w-3.5 h-3.5 text-emerald-400" />
                <span>Xác nhận ký quỹ</span>
              </div>
            </div>
            <div className="text-center p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
              <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono">&lt; 15 Phút</div>
              <div className="text-xs text-gray-400 mt-1 flex items-center justify-center gap-1">
                <ClockIcon className="w-3.5 h-3.5 text-cyan-400" />
                <span>Bàn giao tức thì</span>
              </div>
            </div>
            <div className="text-center p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
              <div className="text-2xl sm:text-3xl font-extrabold text-purple-300 font-mono">2.5M+ €</div>
              <div className="text-xs text-gray-400 mt-1 flex items-center justify-center gap-1">
                <span>💎 Tổng luân chuyển</span>
              </div>
            </div>
            <div className="text-center p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
              <div className="text-2xl sm:text-3xl font-extrabold text-amber-300 font-mono">4.98 / 5.0</div>
              <div className="text-xs text-gray-400 mt-1 flex items-center justify-center gap-1">
                <span>⭐ 50K+ Đánh giá 5 sao</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Games Showcase */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-purple-400">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
              Bộ Sưu Tập Tựa Game
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white font-heading mt-1">
              Các Trò Chơi Nổi Bật Được Ưa Chuộng Nhất
            </h2>
            <p className="text-xs sm:text-sm text-gray-400 mt-1">
              Khám phá tài khoản và dịch vụ VIP cho các siêu phẩm eSports & MMORPG hàng đầu
            </p>
          </div>
          <Link
            href="/games"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-semibold text-purple-300 hover:text-white transition-all shadow-sm"
          >
            <span>Xem tất cả trò chơi</span>
            <ArrowRightIcon className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-5">
          {games.map((game) => (
            <Link
              key={game.id}
              href={`/offers?game=${encodeURIComponent(game.slug)}`}
              className="group relative rounded-2xl bg-gradient-to-b from-[#111728]/90 to-[#0b101c]/90 border border-white/[0.08] hover:border-purple-500/50 p-5 transition-all duration-300 flex flex-col items-center text-center shadow-lg hover:shadow-purple-900/20 hover:-translate-y-1 overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-600/10 rounded-full blur-2xl group-hover:bg-purple-600/25 transition-all"></div>
              
              <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-900/50 via-indigo-900/40 to-[#0d1322] border border-purple-500/30 flex items-center justify-center text-purple-300 mb-4 group-hover:scale-110 group-hover:border-purple-400/60 transition-all shadow-md shadow-purple-950/40">
                <GamepadIcon className="w-8 h-8 group-hover:text-cyan-300 transition-colors" />
              </div>

              <h3 className="font-bold text-sm sm:text-base text-white group-hover:text-purple-300 transition-colors truncate w-full font-heading">
                {game.name}
              </h3>
              
              <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.06] text-[11px] font-mono text-gray-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>{game.activeOffers} tin rao mở</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Latest Offers from Database */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-cyan-400">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
              Sản Phẩm Đang Mở
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white font-heading mt-1">
              Tin Rao Mới Nhất
            </h2>
            <p className="text-xs sm:text-sm text-gray-400 mt-1">
              Giao dịch qua quỹ trung gian escrow, kiểm tra hàng trước khi xác nhận giải ngân
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'all'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-900/50'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Tất Cả
            </button>
            <button
              onClick={() => setActiveTab('account')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'account'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-900/50'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Tài Khoản
            </button>
            <button
              onClick={() => setActiveTab('item')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'item'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-900/50'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Vật Phẩm
            </button>
            <button
              onClick={() => setActiveTab('boosting')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'boosting'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-900/50'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Cày Rank
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <div key={n} className="bg-[#0e1424] border border-white/[0.06] rounded-2xl h-72 animate-pulse" />
            ))}
          </div>
        ) : filteredOffers.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredOffers.map((offer) => (
              <OfferCard key={offer.id} offer={offer} />
            ))}
          </div>
        ) : (
          <div className="bg-[#0c1220]/80 border border-white/[0.08] rounded-2xl p-16 text-center text-gray-400 shadow-xl">
            <ShieldIcon className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-base text-gray-300 font-semibold">Chưa có tin rao nào thuộc danh mục này.</p>
            <p className="text-xs text-gray-500 mt-1">Hãy đăng tin mới hoặc quay lại xem các danh mục khác.</p>
          </div>
        )}

        <div className="mt-10 text-center">
          <Link
            href="/offers"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-sm font-semibold text-white transition-all shadow-md hover:scale-105"
          >
            <span>Khám Phá Toàn Bộ Chợ Giao Dịch</span>
            <ArrowRightIcon className="w-4 h-4 text-purple-400" />
          </Link>
        </div>
      </section>

      {/* Escrow Mechanism: The 4 Golden Steps */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#101729] via-[#0c111f] to-[#070a12] border border-white/10 p-8 sm:p-14 shadow-2xl">
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-600/10 blur-[130px] rounded-full pointer-events-none" />

          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">
              CÔNG NGHỆ BẢO CHỨNG ĐỘC QUYỀN
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white font-heading tracking-tight mt-2">
              Két Ký Quỹ Handover Vault™ Hoạt Động Thế Nào?
            </h2>
            <p className="text-sm sm:text-base text-gray-300 mt-3 font-light leading-relaxed">
              Hỗ trợ giao dịch an toàn: tiền được giữ tại tài khoản trung gian, thông tin tài khoản được lưu trữ tập trung và chỉ giải ngân khi có xác nhận từ hai bên.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative z-10">
            {/* Step 1 */}
            <div className="group rounded-2xl bg-[#080d18]/90 border border-white/[0.08] hover:border-purple-500/40 p-6 flex flex-col justify-between transition-all hover:-translate-y-1 shadow-lg">
              <div>
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center font-bold text-purple-300 text-base mb-4 font-mono group-hover:scale-110 transition-transform">
                  01
                </div>
                <h3 className="font-bold text-base text-white mb-2 font-heading">Khóa Tiền Ký Quỹ</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Người mua chọn sản phẩm, tiền thanh toán được trừ từ số dư ví và khóa trong Quỹ Trung Gian. Người bán chưa thể rút tiền.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono text-purple-400">
                <span>Trạng thái:</span>
                <span className="font-bold">Đã Giữ Tiền</span>
              </div>
            </div>

            {/* Step 2 */}
            <div className="group rounded-2xl bg-[#080d18]/90 border border-white/[0.08] hover:border-blue-500/40 p-6 flex flex-col justify-between transition-all hover:-translate-y-1 shadow-lg">
              <div>
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center font-bold text-blue-300 text-base mb-4 font-mono group-hover:scale-110 transition-transform">
                  02
                </div>
                <h3 className="font-bold text-base text-white mb-2 font-heading">Bàn Giao Két Bảo Mật</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Người bán đưa thông tin đăng nhập vào Handover Vault hoặc kết nối cày rank trong phòng kín riêng biệt có hệ thống ghi lại nhật ký.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono text-blue-400">
                <span>Trạng thái:</span>
                <span className="font-bold">Đang Giao Hàng</span>
              </div>
            </div>

            {/* Step 3 */}
            <div className="group rounded-2xl bg-[#080d18]/90 border border-white/[0.08] hover:border-cyan-500/40 p-6 flex flex-col justify-between transition-all hover:-translate-y-1 shadow-lg">
              <div>
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center font-bold text-cyan-300 text-base mb-4 font-mono group-hover:scale-110 transition-transform">
                  03
                </div>
                <h3 className="font-bold text-base text-white mb-2 font-heading">Kiểm Tra Sản Phẩm</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Người mua nhận thông tin, đăng nhập kiểm tra đúng thông số mô tả. Nếu có sai sót, người mua được quyền bấm Khiếu nại lập tức.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono text-cyan-400">
                <span>Trạng thái:</span>
                <span className="font-bold">Đợi Khách Duyệt</span>
              </div>
            </div>

            {/* Step 4 */}
            <div className="group rounded-2xl bg-[#080d18]/90 border border-white/[0.08] hover:border-emerald-500/40 p-6 flex flex-col justify-between transition-all hover:-translate-y-1 shadow-lg">
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center font-bold text-emerald-300 text-base mb-4 font-mono group-hover:scale-110 transition-transform">
                  04
                </div>
                <h3 className="font-bold text-base text-white mb-2 font-heading">Đồng Thuận & Giải Ngân</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Chỉ khi người mua xác nhận hài lòng, hệ thống mới ghi nợ sổ cái kép và giải phóng tiền về ví người bán. Hoàn tất giao dịch!
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono text-emerald-400">
                <span>Trạng thái:</span>
                <span className="font-bold">Hoàn Tất & An Toàn</span>
              </div>
            </div>
          </div>

          {/* Bottom Security Assurance */}
          <div className="mt-12 pt-8 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400">
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>Đội ngũ Trọng tài viên túc trực giải quyết tranh chấp trong vòng 2 giờ làm việc.</span>
            </div>
            <Link
              href="/how-it-works"
              className="inline-flex items-center gap-1.5 font-bold text-purple-400 hover:text-purple-300 transition-colors"
            >
              <span>Đọc Điều Khoản & Quy Chế Ký Quỹ</span>
              <ArrowRightIcon className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Become a Seller VIP Call To Action */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#17122e] via-[#101428] to-[#0c1824] border border-purple-500/30 p-8 sm:p-12 shadow-2xl flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="max-w-2xl text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold tracking-wider mb-3">
              <span>⭐ CHƯƠNG TRÌNH ĐỐI TÁC THƯƠNG GIA VIP</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-white font-heading">
              Gia Nhập Mạng Lưới Thương Gia & Booster Chuyên Nghiệp
            </h2>
            <p className="text-xs sm:text-sm text-gray-300 mt-2 font-light leading-relaxed">
              Mở rộng kinh doanh không lo quỵt tiền. Tiếp cận hàng nghìn khách hàng uy tín, nhận thanh toán tức thì sau khi hoàn tất đơn hàng với mức phí sàn cạnh tranh nhất thị trường.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto shrink-0">
            <Link
              href="/become-seller"
              className="px-6 py-3.5 rounded-xl glow-btn-gold text-white font-bold text-sm tracking-wide text-center transition-all shadow-xl shadow-amber-950/40 uppercase"
            >
              Đăng Ký Trở Thành Người Bán
            </Link>
            <Link
              href="/how-it-works"
              className="px-6 py-3.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/15 text-white font-bold text-sm tracking-wide text-center transition-all"
            >
              Tìm Hiểu Chính Sách
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
