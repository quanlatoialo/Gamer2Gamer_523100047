# Gamer 2 Gamer – Đồ án kỳ HAQ

Website demo trung gian giao dịch giữa Seller, Booster và Customer, có giữ tiền trung gian (escrow) và sổ cái kép.
Sản phẩm chỉ phục vụ học tập: dữ liệu giả, tiền mô phỏng (EUR demo), không xử lý tiền thật.

## Yêu cầu

- Node.js 20 trở lên
- MongoDB chạy dạng **replica set** (bắt buộc để dùng transaction). Mặc định backend kết nối
  `mongodb://127.0.0.1:27018/gamer2gamer?replicaSet=rs0`.

## Cài đặt

```bash
# Backend
cd backend
npm install
copy ..\.env.example .env      # macOS/Linux: cp ../.env.example .env, rồi điền giá trị

# Frontend
cd ../frontend
npm install
```

## Chạy dự án

```bash
# Terminal 1 – backend
cd backend
npm run seed     # nạp dữ liệu demo (backend cũng tự seed khi database trống)
npm run dev      # API chạy ở http://localhost:4000

# Terminal 2 – frontend
cd frontend
npm run dev      # giao diện chạy ở http://localhost:3000
```

| Thành phần | Cổng |
|---|---|
| Frontend (Next.js) | 3000 |
| Backend (Express API) | 4000 |

## Kiểm thử

```bash
cd backend
npm test         # 24 ca kiểm thử backend (tự tạo MongoDB tạm, không cần database thật)

cd ../frontend
npm test         # 15 ca kiểm thử frontend
```

Thực nghiệm so sánh trước/sau cải tiến (mục 3.3 của báo cáo):

```bash
cd backend
npx jest tests/improvement.test.js --runInBand --forceExit --setupFilesAfterEnv=./tests/setup.js
```

## Tài khoản demo

Mật khẩu chung: `Password@123`

| Email | Vai trò |
|---|---|
| admin@gamer2gamer.com | Admin |
| seller@gamer2gamer.com | Seller |
| booster@gamer2gamer.com | Booster |
| customer@gamer2gamer.com | Customer |
| applicant@gamer2gamer.com | Customer (đang chờ duyệt quyền bán) |
