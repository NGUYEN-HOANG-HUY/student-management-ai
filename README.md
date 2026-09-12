# Student Management AI

Hệ thống quản lý sinh viên tích hợp phân tích kết quả học tập và AI local.

## Công nghệ

- Frontend: React, Vite, Axios, React Router, Recharts
- Backend: Node.js, Express, SQLite
- Authentication: bcryptjs, JWT
- AI: Ollama chạy local, mặc định `gemma:2b`

## Yêu cầu môi trường

- Windows + VS Code
- Node.js 20 trở lên
- npm
- Ollama (không bắt buộc để chạy rule-based fallback)

## Cài đặt Ollama local (Windows)

1. Tải và cài Ollama từ <https://ollama.com/download/windows>.
2. Mở PowerShell và kiểm tra:

```powershell
ollama --version
```

3. Tải model nhẹ mặc định:

```powershell
ollama pull gemma:2b
```

4. Chạy Ollama trên localhost (giữ terminal này mở):

```powershell
ollama serve
```

Ollama mặc định lắng nghe tại `http://127.0.0.1:11434`. Backend chỉ gọi địa chỉ local này,
không sử dụng OpenAI, Gemini, API trả phí hoặc cloud AI. Có thể kiểm tra model đã tải bằng:

```powershell
ollama list
```

## Cài đặt

```powershell
cd D:\DoAnQuanLySinhVienAI\student-management-ai\backend
npm install

cd ..\frontend
npm install
```

Tạo file `backend/.env` từ `backend/.env.example` nếu cần đổi cấu hình:

```env
PORT=5000
FRONTEND_URL=http://localhost:5173,http://localhost:5174
JWT_SECRET=replace-with-a-random-secret-at-least-32-characters
JWT_EXPIRES_IN=8h
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
OLLAMA_URL=http://127.0.0.1:11434
OLLAMA_MODEL=gemma:2b
AI_TIMEOUT_MS=15000
AI_RETRIES=2
```

## Chạy ứng dụng

Mở ba terminal.

Terminal 1, backend:

```powershell
cd D:\DoAnQuanLySinhVienAI\student-management-ai\backend
npm run dev
```

Terminal 2, frontend:

```powershell
cd D:\DoAnQuanLySinhVienAI\student-management-ai\frontend
npm run dev
```

Terminal 3, tùy chọn nếu dùng Ollama:

```powershell
ollama serve
```

Nếu chưa có model:

```powershell
ollama pull gemma:2b
```

Mở frontend tại <http://localhost:5173>.

## Tài khoản demo

```text
Username: admin
Password: admin123
```

Password được hash bằng bcrypt trước khi lưu vào SQLite. Tài khoản seed có thể đổi bằng `ADMIN_USERNAME` và `ADMIN_PASSWORD`.

Tài khoản sinh viên seed dùng mã sinh viên làm username và mật khẩu mặc định:

```text
Username: SV001, SV002 hoặc SV003
Password: student123
```

Sinh viên chỉ được xem hồ sơ, điểm và phân tích AI của chính mình.

Tài khoản giảng viên demo:

```text
Username: GV001 hoặc GV002
Password: student123
```

Giảng viên chỉ xem được các lớp được phân công, sinh viên thuộc các lớp đó,
được nhập/sửa điểm và xem thống kê/AI trong phạm vi lớp phụ trách. Chỉ admin
được quản lý tài khoản, sinh viên, môn học và học kỳ.

## API chính

Public:

```text
GET  /api/health
POST /api/auth/login
```

Các API còn lại yêu cầu header:

```text
Authorization: Bearer <JWT_TOKEN>
```

```text
GET    /api/students
POST   /api/students
PUT    /api/students/:id
DELETE /api/students/:id

GET    /api/subjects
POST   /api/subjects
PUT    /api/subjects/:id
DELETE /api/subjects/:id

GET    /api/scores/student/:studentId
POST   /api/scores
PUT    /api/scores/:id
DELETE /api/scores/:id

GET  /api/analytics/student/:studentId
GET  /api/analytics/dashboard
GET  /api/classes
POST /api/ai/analyze/:studentId
POST /api/ai/recommend/:studentId
POST /api/ai/analyze-class/:classId

GET  /api/auth/me
GET  /api/admin/dashboard
GET  /api/admin/users
GET  /api/teacher/dashboard
GET  /api/teacher/students
POST /api/teacher/scores
PUT  /api/teacher/scores/:id
GET  /api/student/dashboard
GET  /api/student/profile
GET  /api/student/grades
GET  /api/student/ai-analysis
```

`/api/ai/analyze-class/:classId` dành cho admin và giảng viên. Giảng viên chỉ
được phân tích các lớp mình phụ trách; sinh viên không có quyền truy cập.

## Database

SQLite được tạo tự động tại `database/database.sqlite`. Chỉ sử dụng backend
trong thư mục `backend` và frontend trong thư mục `frontend`; `backend/server`
và `client` là cấu trúc thử nghiệm cũ, không chạy song song.

Schema nằm tại `backend/database/schema.sql`. Khi backend khởi động, hệ thống tự tạo bảng và seed dữ liệu mẫu gồm:

- 2 khoa và 3 lớp.
- 20 sinh viên.
- 10 môn học, có môn tiên quyết.
- 3 học kỳ.
- 400 lượt đăng ký môn và 400 bản ghi điểm.
- 1 tài khoản admin và 20 tài khoản sinh viên.

Có thể chạy lại seed an toàn, không tạo bản ghi trùng:

```powershell
cd backend
npm run db:init
```

## AI và fallback

Backend chỉ gửi dữ liệu analytics cần thiết cho Ollama. AI response được parse và validate theo JSON schema. Nếu Ollama tắt, model thiếu, timeout hoặc trả JSON sai, hệ thống tự dùng rule-based recommendation và không làm ứng dụng crash.

Phân tích lớp cũng có fallback tương tự, trả về GPA lớp, tỷ lệ đạt/trượt, môn
khó, sinh viên có nguy cơ và khuyến nghị hỗ trợ giảng dạy. Dashboard admin và
giảng viên có thể chọn lớp rồi bấm `Phân tích bằng AI`.

Các ngưỡng rule-based chính:

- GPA dưới 2.0: `HIGH`
- GPA từ 2.0 đến dưới 2.5: `MEDIUM`
- Môn dưới 5.0: yếu
- Môn từ 5.0 đến dưới 6.5: cần theo dõi
- Môn từ 8.0: điểm mạnh

## Kiểm tra

Frontend:

```powershell
cd frontend
npm run lint
npm run build
```

Backend syntax:

```powershell
cd backend
node --check server.js
node --check app.js
```

Health check:

```powershell
Invoke-RestMethod http://localhost:5000/api/health
```

## Test API AI local

Đăng nhập để lấy JWT:

```powershell
$login = Invoke-RestMethod `
  -Method Post `
  -Uri http://localhost:5000/api/auth/login `
  -ContentType 'application/json' `
  -Body '{"username":"admin","password":"admin123"}'
$token = $login.data.token
```

Phân tích sinh viên `1` bằng Ollama hoặc rule-based fallback:

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri http://localhost:5000/api/ai/analyze/1 `
  -Headers @{ Authorization = "Bearer $token" }
```

Lấy khuyến nghị:

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri http://localhost:5000/api/ai/recommend/1 `
  -Headers @{ Authorization = "Bearer $token" }
```

Khi Ollama tắt, hai endpoint vẫn trả HTTP 200 với `data.analysis.source` là
`RULE_BASED` và khuyến nghị được tính từ GPA, điểm từng môn và xu hướng học kỳ.

## Kịch bản demo đồ án

### Chuẩn bị trước khi trình diễn

Mở ba terminal:

```powershell
# Terminal 1
cd D:\DoAnQuanLySinhVienAI\student-management-ai\backend
npm run dev
```

```powershell
# Terminal 2
cd D:\DoAnQuanLySinhVienAI\student-management-ai\frontend
npm run dev
```

```powershell
# Terminal 3, tùy chọn để trình diễn Ollama
ollama serve
```

Kiểm tra nhanh:

```powershell
Invoke-RestMethod http://localhost:5000/api/health
```

Mở:

```text
http://localhost:5173
```

### Kịch bản trình diễn 5-7 phút

1. Đăng nhập admin bằng `admin / admin123`.
2. Mở Dashboard và giới thiệu:
   - 20 sinh viên.
   - 10 môn học.
   - GPA trung bình.
   - Sinh viên có nguy cơ.
   - Biểu đồ GPA và phân bố điểm.
3. Mở danh sách Sinh viên, tìm `SV001`.
4. Mở chi tiết `Nguyễn Minh Anh`:
   - GPA.
   - Bảng điểm.
   - Môn yếu và môn mạnh.
   - Mức nguy cơ.
5. Trình diễn phần AI:
   - Nhận xét tổng quan.
   - Môn ưu tiên.
   - Khuyến nghị theo điểm thật.
   - Lộ trình 4 tuần.
   - Nếu Ollama chậm hoặc tắt, chỉ rõ nhãn `RULE_BASED`.
6. Mở Môn học để trình diễn CRUD môn học.
7. Mở Nhập điểm để trình diễn công thức:
   - Quá trình 7.
   - Giữa kỳ 8.
   - Cuối kỳ 9.
   - Tổng kết `8.3`.
   - Điểm chữ `B+`.
   - Hệ 4 `3.5`.
8. Đăng xuất và đăng nhập sinh viên bằng `SV001 / student123`.
9. Giới thiệu sinh viên chỉ xem được hồ sơ, điểm và phân tích của chính mình.

### Kịch bản trình diễn fallback

Nếu muốn chứng minh hệ thống không phụ thuộc cloud AI:

1. Dừng Ollama hoặc không mở `ollama serve`.
2. Đăng nhập admin.
3. Mở chi tiết sinh viên.
4. AI vẫn trả khuyến nghị bằng rule-based.
5. Giải thích: backend đã tính GPA, môn yếu, môn mạnh, xu hướng và risk level trước; Ollama chỉ suy luận phần diễn giải.

### Dữ liệu demo cần nhớ

```text
Admin:   admin / admin123
Student: SV001 / student123
Student: SV002 / student123
Student: SV003 / student123
```

## Cau truc thu muc chinh

Chi su dung hai thu muc chinh khi chay ung dung:

```text
student-management-ai/
├── backend/
│   ├── controllers/       # Xu ly request va response
│   ├── database/          # SQLite, schema va seed
│   ├── middleware/        # JWT va phan quyen
│   ├── routes/            # REST API routes
│   ├── services/          # Analytics, AI va recommendation
│   ├── app.js
│   └── server.js
├── frontend/
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── services/
│       └── App.jsx
└── README.md
```

`backend/server/` va `client/` la cau truc thu nghiem cu. Khong khoi dong
hai cau truc nay dong thoi voi `backend/` va `frontend/`.

## Cau hinh moi truong

Tao `backend/.env` tu `backend/.env.example`. Khong commit file `.env`.

| Bien | Bat buoc | Mo ta |
| --- | --- | --- |
| `PORT` | Khong | Cong backend, mac dinh `5000` |
| `JWT_SECRET` | Co | Chuoi bi mat dung ky JWT |
| `JWT_EXPIRES_IN` | Khong | Thoi han token, mac dinh `8h` |
| `FRONTEND_URL` | Khong | Origin frontend duoc phep qua CORS |
| `OLLAMA_URL` | Khong | Mac dinh `http://127.0.0.1:11434` |
| `OLLAMA_MODEL` | Khong | Mac dinh `gemma:2b` |

Neu `JWT_SECRET` thieu, backend khong nen duoc chay trong moi truong demo.
Hay tao secret ngau nhien dai it nhat 32 ky tu.

## Authentication va phan quyen

Dang nhap:

```powershell
$login = Invoke-RestMethod `
  -Method Post `
  -Uri http://localhost:5000/api/auth/login `
  -ContentType 'application/json' `
  -Body '{"username":"SV001","password":"student123"}'

$token = $login.data.token
$login.data.user
```

Gui token cho cac API bao ve:

```powershell
$headers = @{ Authorization = "Bearer $token" }
Invoke-RestMethod `
  -Method Get `
  -Uri http://localhost:5000/api/auth/me `
  -Headers $headers
```

Quyen theo role:

| Role | Pham vi |
| --- | --- |
| `admin` | Quan ly toan he thong, dashboard, users va du lieu hoc tap |
| `teacher` | Xem sinh vien lop phu trach, xem/nhap/sua diem |
| `student` | Chi xem profile, diem va AI analysis cua chinh minh |

Student ID cua student duoc lay tu JWT va database. Frontend khong duoc tu
truyen `studentId` de xem du lieu cua sinh vien khac.

## Student Dashboard va AI Analysis

Luong chinh:

```text
Login
  -> localStorage (JWT)
  -> GET /api/student/dashboard
  -> GET /api/student/ai-analysis
  -> hien thi GPA, xu huong, risk, diem manh/yeu,
     recommendation, priority subjects va study plan
```

API AI cua student:

```powershell
Invoke-RestMethod `
  -Method Get `
  -Uri http://localhost:5000/api/student/ai-analysis `
  -Headers $headers
```

Response nam trong `data` va gom cac nhom:

```text
data.student
data.academic
data.strengths
data.weakSubjects
data.prioritySubjects
data.risk
data.aiAnalysis
```

`data.academic.gpa` la GPA he 4 cua database hien tai. Neu Ollama khong
phan hoi, `data.aiAnalysis.source` se la `RULE_BASED`; ung dung van tra
khuyen nghi va khong bi crash.

## Kiem tra phan quyen nhanh

Student khong duoc truy cap admin hoac teacher:

```powershell
Invoke-RestMethod `
  -Method Get `
  -Uri http://localhost:5000/api/admin/dashboard `
  -Headers $headers
```

Ket qua mong doi la HTTP `403`. Token thieu hoac sai tra ve HTTP `401`.

## Xu ly loi thuong gap

### Frontend khong ket noi backend

1. Kiem tra backend:

   ```powershell
   Invoke-RestMethod http://localhost:5000/api/health
   ```

2. Kiem tra frontend dang mo tai `http://localhost:5173`, khong phai
   frontend cu tai port `5174`.
3. Kiem tra `FRONTEND_URL` trong `backend/.env`.
4. Mo DevTools > Network va xac nhan request den `/api/...` co status `200`,
   `401` hoac `403`, khong phai `ERR_CONNECTION_REFUSED`.

### AI local khong hoat dong

Day khong phai loi bat buoc. Kiem tra:

```powershell
ollama list
Invoke-RestMethod http://127.0.0.1:11434/api/tags
```

Neu Ollama chua chay, dung:

```powershell
ollama serve
```

Neu khong co model:

```powershell
ollama pull gemma:2b
```

He thong se tu dong dung rule-based fallback trong luc Ollama khong kha
dung.

### Database khong dung du lieu demo

Khong xoa file SQLite de sua loi. Kiem tra truoc:

```powershell
cd backend
npm run db:check
```

Seed duoc thiet ke idempotent, co the chay lai:

```powershell
npm run db:init
```

## Lenh kiem tra truoc khi nop/demo

```powershell
cd backend
node --check server.js
node --check app.js
npm run db:check

cd ..\frontend
npm run lint
npm run build
```
