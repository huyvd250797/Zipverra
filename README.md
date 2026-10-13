# Zipverra v1.3.2 — GitHub Push Reliability Fix

## Bản sửa lỗi GitHub 404 khi Commit & Push

- **Preflight**: trước khi upload blob, kiểm tra GitHub repository có tồn tại và tài khoản có quyền `push` (nếu API trả về thông tin permissions), không archived/disabled.
- **OAuth workflow**: đăng nhập mới yêu cầu `repo workflow` (để tạo/sửa `.github/workflows/*.yml` và `.yaml`). Scope bổ sung có quyền nhạy cảm: GitHub Actions workflow có thể chạy với quyền của repository; chỉ cấp khi tin tưởng app.
- **Kiểm tra workflow**: nếu ZIP có thay đổi workflow mà phiên đăng nhập thiếu scope `workflow`, thông báo rõ ràng và yêu cầu đăng xuất/đăng nhập lại trước khi upload.
- **Chẩn đoán theo bước**: lỗi GitHub API nay cho biết `READ_BRANCH`, `UPLOAD_BLOB`, `CREATE_TREE`, `CREATE_COMMIT`, `UPDATE_BRANCH` và HTTP status; giữ nguyên status gốc khi PATCH branch thất bại thay vì gộp thành lỗi 409.
- **Không tự retry commit**: nếu chưa rõ trạng thái branch, phải xác minh commit trên GitHub trước.
- Không thay đổi luồng ZIP → repo → main → commit = tên ZIP → preview → push, hoặc splash PWA / zoom lock.

**Bắt buộc sau deploy:** Đăng xuất tài khoản GitHub trong Zipverra và đăng nhập lại để token mới có scope `workflow`. Nếu GitHub không đưa ra màn hình xin quyền mới, vào https://github.com/settings/applications → Authorized OAuth Apps → chọn ứng dụng Zipverra và thu hồi quyền, sau đó đăng nhập lại; thao tác thu hồi ảnh hưởng tất cả phiên Zipverra dùng cùng OAuth app.

**Chưa thể khẳng định nguyên nhân 404 trong ảnh:** v1.3.1 không hiển thị endpoint gây lỗi. Nếu v1.3.2 vẫn báo lỗi, chụp phần thông báo mới có tên bước để chẩn đoán đúng. Quyền trên organization và branch protections có thể tiếp tục chặn push.

---

# Zipverra v1.3.2 — GitHub Authentication · Vercel Ready

Zipverra cho phép upload ZIP từ ChatGPT (hoặc Files trên iPhone), chọn repository / branch, xem danh sách thay đổi, tự đặt commit message theo **tên ZIP không có `.zip`** rồi push trực tiếp qua GitHub API. Next.js 16 App Router + React 19, không yêu cầu database hoặc server chạy liên tục.

> **Đổi mới từ v1.2.0:** Thay việc nhập GitHub Personal Access Token bằng **Sign in with GitHub (OAuth App)**. Cần tạo một GitHub OAuth App và cấu hình bốn environment variables trên Vercel **trước khi đăng nhập được**. Không có chuyện chỉ push code lên Vercel mà nút đăng nhập tự hoạt động khi chưa cấu hình OAuth.

## Điểm mới v1.3.2 — Mobile PWA Experience

- Hero tiếng Anh: **Push to GitHub. From Your Phone.**; tagline splash: **Push to GitHub from Mobile**.
- Khóa pinch-to-zoom trong giao diện mobile/PWA bằng viewport và chặn iOS native gesture; vẫn cho phép cuộn bình thường. Input trên iPhone sử dụng cỡ chữ ít nhất 16px để tránh tự động zoom khi focus. Một số tùy chọn trợ năng hoặc cài đặt của trình duyệt có thể ghi đè quy tắc zoom.
- Splash/loading thương hiệu Zipverra hiển thị ngay khi mở, có spinner, đợi kiểm tra phiên GitHub và thời gian tối thiểu 650ms; tự thoát sau tối đa 5,5 giây nếu mạng không phản hồi. Đây là **splash bên trong ứng dụng**; màn hình launch của hệ điều hành trước khi website tải có thể do iOS/Android quyết định.
- Bổ sung icon PNG 192/512px và apple-touch-icon PNG 180px để thêm vào Home Screen. Không cache dữ liệu GitHub/OAuth bằng service worker để tránh lưu thông tin nhạy cảm.
- Cài đặt iPhone: Mở **Safari → Share → Add to Home Screen**. Mở Zipverra từ icon vừa thêm để dùng chế độ standalone.

## 1. Đưa source Zipverra lên GitHub và Vercel

1. Giải nén `Zipverra_v1.3.2_GitHub_Push_404_Diagnostics_Fix_Vercel_Ready.zip`.
2. Tạo repository GitHub, ví dụ `zipverra`. Upload **nội dung bên trong thư mục `Zipverra-v1.3.2/`** vào gốc repository; phải thấy `package.json`, `app/`, `lib/`, `public/` ngay ở root. Không upload chỉ file ZIP.
3. Vào https://vercel.com/new → Import Git Repository → chọn repository Zipverra → Framework **Next.js** → Root Directory `./` → Deploy.
4. Sau lần deploy đầu, sao chép **đường dẫn production ổn định** từ Vercel, ví dụ `https://zipverra-example.vercel.app`. Chưa thể đăng nhập GitHub ở bước này.

> Nếu chuyển sang custom domain, cần cập nhật GitHub OAuth callback URL và APP_URL tương ứng. Một OAuth App chỉ được cấu hình một callback URL chính; dùng một domain production ổn định để đăng nhập, không dùng URL deployment preview thay đổi liên tục.

## 2. Tạo GitHub OAuth App

1. Đăng nhập GitHub, mở https://github.com/settings/developers → **OAuth Apps** → **New OAuth App**.
2. **Application name:** `Zipverra` (nếu GitHub yêu cầu tên khác có thể chọn `Zipverra Personal`).
3. **Homepage URL:** `https://zipverra-example.vercel.app` (thay bằng domain production vừa lấy).
4. **Authorization callback URL:** `https://zipverra-example.vercel.app/api/auth/callback` (**bắt buộc khớp APP_URL**).
5. Nhấn **Register application** và sao chép **Client ID**.
6. Nhấn **Generate a new client secret**; sao chép và lưu trong nơi an toàn, không gửi vào chat, không commit lên GitHub.

### Quyền đăng nhập

Zipverra đang dùng **GitHub OAuth App** với `scope=repo workflow` để đọc/ghi repositories, bao gồm private repositories. Đây là **scope tương đối rộng**, GitHub OAuth App không cung cấp giới hạn theo từng repository giống GitHub App/fine-grained PAT. Chỉ đăng nhập trên domain của chính bạn và không công khai OAuth secret. Với nhiều người dùng, tổ chức hoặc nhu cầu giới hạn tới từng repo, nên chuyển sang GitHub App permissions (nâng cấp sau).

## 3. Thiết lập Environment Variables trên Vercel

Vercel → **Project → Settings → Environment Variables**. Thêm 4 biến sau vào **Production** (có thể chọn All Environments nếu URL dùng chung; không khuyến cáo preview OAuth cùng production):

| Tên biến | Ví dụ / ý nghĩa |
| --- | --- |
| `APP_URL` | `https://zipverra-example.vercel.app` — **URL production**, không có dấu `/` cuối |
| `GITHUB_CLIENT_ID` | Client ID từ GitHub OAuth App |
| `GITHUB_CLIENT_SECRET` | Secret từ GitHub OAuth App; không lộ ra trình duyệt |
| `SESSION_SECRET` | Ít nhất 32 ký tự ngẫu nhiên, **nên dùng 64 ký tự hex** |

Tạo `SESSION_SECRET` an toàn bằng `openssl rand -hex 32`, hoặc `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Trên iPhone có thể dùng trình quản lý mật khẩu hỗ trợ tạo chuỗi ngẫu nhiên dài. **Không yêu cầu ChatGPT tạo hoặc lưu secret thực tế.**

Sau khi Save variables, vào Vercel **Deployments** và **Redeploy** bản Production (cấu hình mới sẽ có hiệu lực ở deployment mới). Mở domain trong `APP_URL` và nhấn **Continue with GitHub**.

### Dùng local (tùy chọn)

Tạo file `.env.local` từ `.env.example`; đặt `APP_URL=http://localhost:3000`, và thêm OAuth App callback `http://localhost:3000/api/auth/callback`. Chạy:

```bash
npm install
npm run dev
```

OAuth App production có callback khác local; bạn có thể tạo OAuth App riêng cho local. Với mục tiêu chỉ dùng Vercel/iPhone không cần chạy localhost.

## 4. Quy trình dùng Zipverra

1. Vào website Zipverra và nhấn **Continue with GitHub**; chấp nhận quyền `repo` + `workflow` trên màn hình GitHub.
2. Zipverra hiển thị tài khoản GitHub; danh sách repo có quyền push được tự tải. Có nút **Tải repositories** để làm mới; có thể nhập `Owner/Repository` thủ công.
3. Chọn branch đích — mặc định **`main`** (branch phải tồn tại; app chưa hỗ trợ tạo branch mới).
4. Chọn file ZIP, ví dụ `Finzaro_v1.2.0.zip` → tự động tạo commit message `Finzaro_v1.2.0`.
5. Chọn **Merge** (thêm/sửa, không xóa file cũ) hoặc **Sync** (thêm/sửa/xóa; xem danh sách xóa trước).
6. Nhấn **Phân tích ZIP và xem thay đổi** → kiểm tra preview → tích ô xác nhận → nhấn **Commit & Push**.
7. Nhận link commit SHA sau khi push thành công. Nếu repository đích đã kết nối với Vercel, Vercel tự deploy theo cấu hình branch của dự án đó.

## 5. Bảo mật / xác thực

- **Authorization code OAuth flow**, `state` chống CSRF đăng nhập và **PKCE S256**. Mã OAuth được đổi lấy token trên server; Client Secret chỉ dùng server-side.
- Access token được mã hóa bằng AES-256-GCM trong cookie phiên **HttpOnly**, `Secure` trên Production, `SameSite=Lax`, prefix `__Host-`. Giao diện không nhận token, không lưu trong `localStorage`, không gửi `token` trong JSON API.
- Session tự hết hạn sau 7 ngày. Đăng xuất sẽ xóa cookie của ứng dụng, **không tự thu hồi OAuth authorization trên GitHub**. Có thể thu hồi tại https://github.com/settings/applications.
- POST API GitHub cần có phiên hợp lệ và `Origin` khớp chính xác `APP_URL`. Không dùng proxy tùy ý; không cung cấp access token cho giao diện.
- Ứng dụng từ chối file `.env*` có nguy cơ lộ secret, private keys phổ biến, `.npmrc`, ZIP traversal/absolute paths và symbolic links. `.env.example` được cho phép vì không chứa secret thật.
- Branch update dùng **non-forced fast-forward**, kiểm tra HEAD trước commit; branch protection/organization policy vẫn có thể chặn push.
- Bảo mật cuối cùng vẫn phụ thuộc vào tên miền, Vercel account và bí mật trong Environment Variables. Nếu secret bị lộ, cần rotate Client Secret và SESSION_SECRET.

## 6. Giới hạn của MVP

- ZIP tối đa **20 MiB**, 2.5 MB mỗi file (để Base64 + JSON dưới 4.5 MB limit của Vercel Function), tổng giải nén 50 MiB, tối đa 1.200 file và tối đa 1.200 file thay đổi mỗi commit.
- Không hỗ trợ Git LFS, submodule mới, thay đổi symbolic links, tạo branch, repo rỗng chưa có commit, xử lý conflict phức tạp, PR workflow.
- ZIP nên gồm source chứ không gồm `node_modules`/`.git`/`.next`; thư mục wrapper ở cấp cao nhất được loại bỏ nếu phát hiện chắc chắn.
- Repos có >6.000 file hoặc bị GitHub đánh dấu tree `truncated` sẽ không có preview an toàn.
- ZIP merge/sync chạy trong browser; khi refresh trang phải upload lại.
- OAuth App `scope=repo workflow` không bị giới hạn theo một repository. Tùy yêu cầu quản lý tổ chức, GitHub có thể yêu cầu admin phê duyệt OAuth App.
- Không nên sử dụng domain Preview của Vercel khác với `APP_URL`; cả URL callback và Origin check dùng domain production cố định.

## 7. Kiểm thử

```bash
npm test       # Unit tests: GitHub commit + operations + OAuth session / Origin
npm run build  # Next.js production build
```

Đóng gói này đã chạy 31/31 unit tests, kiểm tra cú pháp JS/JSX và xác minh metadata. **Chưa chạy được `npm run build` trong môi trường đóng gói vì registry.npmjs.org không truy cập được để cài dependencies.** Vercel sẽ tự cài dependencies và build sau khi import repo; cần kiểm tra Deployment Logs trước khi coi là production-ready đã xác minh.

## Cấu trúc

```text
Zipverra-v1.3.2/
├── app/
│   ├── api/auth/           # login, callback, session, logout
│   ├── api/github/         # repos, snapshot, blob, commit
│   ├── globals.css
│   ├── layout.jsx
│   ├── components/            # SplashScreen + MobileViewportGuard
│   ├── manifest.js
│   └── page.jsx
├── lib/
│   ├── auth/session.js     # AES-256-GCM, cookies, CSRF origin
│   ├── archive.js
│   ├── github.js
│   ├── http.js
│   ├── operations.js
│   └── paths.js
├── public/                 # icon.svg, icon-192.png, icon-512.png, apple-touch-icon.png
├── tests/
├── .env.example
├── .github/workflows/ci.yml
├── package.json
├── next.config.mjs
└── vercel.json
```
