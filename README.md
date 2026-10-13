# Zipverra v1.4.0 — Mobile UX/UI 2.0

**Mobile PWA · Next.js 16 · GitHub OAuth · Vercel deployment target**

## Điểm mới v1.4.0 — Mobile UX/UI 2.0

- **Bottom navigation thực sự hoạt động:** `Home · Repos · Activity · Settings` trên màn hình ≤760px; các vùng giao diện được hiển thị theo tab, không unmount state của ZIP/GitHub. Desktop vẫn hiển thị các panel theo grid.
- **Home:** upload ZIP từ Files/ChatGPT, repo đích hiện tại, commit message theo tên ZIP, chế độ Merge/Sync, preview và Push; tự cuộn đến preview sau phân tích trên màn hình điện thoại.
- **Repositories:** đăng nhập GitHub OAuth, tìm và lọc repository, chọn repo/branch mặc định `main`, danh sách repo gần đây (chỉ lưu tên ở `localStorage`, tối đa 5).
- **Activity:** 4 bước Validate → Upload → Commit → Verify, tiến trình, xác minh push chưa chắc chắn, báo lỗi từng bước. Có status shortcut trên Home và badge phục hồi tại tab Activity.
- **Settings:** Light/Dark theme lưu cục bộ và thông tin phiên bản/quyền OAuth.
- **Diff filtering:** lọc file Tất cả/Thêm/Sửa/Xóa, số file theo trạng thái; lọc chỉ thay đổi cách xem, không thay đổi payload commit.
- **Sync confirmation:** nếu chế độ Sync có xóa file, cần chấp nhận **riêng** việc xóa bên cạnh xác nhận push thông thường.
- **PWA polish:** safe area Dynamic Island/Home Indicator, thanh nav dưới, không tràn ngang màn hình 320–430 px, skeleton khi lấy repo, reduced-motion.
- **Giữ nguyên tính an toàn của v1.3.4:** GitHub OAuth, không lưu token ở phía client, merge/sync, GitHub commit verification, journal/sessionStorage, retry an toàn, không tự retry commit khi trạng thái chưa rõ.

### Cách dùng trên điện thoại

1. Tab **Repos** → đăng nhập/kiểm tra tài khoản → chọn repo, nhánh `main` (hoặc nhập thủ công).
2. Bấm **Tiếp tục tải ZIP** để về **Home** → chọn ZIP → Merge/Sync → **Phân tích ZIP**.
3. Xem các file thay đổi, lọc theo loại, xác nhận thay đổi (và riêng việc xóa file nếu Sync có xóa) → **Commit & Push**.
4. Tab **Activity** để xem tiến trình; với trạng thái push chưa rõ, chọn **Xác minh push trên GitHub** thay vì push lần hai.
5. Tab **Settings** chọn giao diện Light/Dark.

**Giới hạn:** `Activity` trong v1.4.0 hiển thị quá trình push hiện tại, chưa phải lịch sử commit dài hạn. Repo gần đây lưu *tên repo* trong trình duyệt trên thiết bị, không gồm source hay OAuth token. Không có database mới.

## Phiên bản kế tiếp: v1.5.0 — GitHub App Authentication

Thay OAuth App có scope `repo workflow` bằng **GitHub App**, chỉ cấp quyền với repository được chọn; triển khai installation flow, token ngắn hạn trên server, repository permissions phù hợp cho Contents/Workflows và migration an toàn từ phiên OAuth. Xem `ROADMAP_NEXT.md`.

---

## 1. Đưa source Zipverra lên GitHub và Vercel

1. Giải nén `Zipverra_v1.4.0_Mobile_UX_UI_2.0_Vercel_Ready.zip`.
2. Tạo repository GitHub, ví dụ `zipverra`. Upload **nội dung bên trong thư mục `Zipverra-v1.4.0/`** vào gốc repository; phải thấy `package.json`, `app/`, `lib/`, `public/` ngay ở root. Không upload chỉ file ZIP.
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
npm run build  # Next.js production build (cần dependencies/npm access)
```

Bản nâng cấp đã chạy **52/52 unit tests đạt**, kiểm tra cú pháp JSX và bố cục mẫu bằng Chromium tại 320, 375, 390, 430, 768 và 1280 px. Chi tiết kiểm chứng trong `QA_NOTES.md`. **Chưa chạy được `npm run build` trong môi trường đóng gói vì registry.npmjs.org không truy cập được để cài dependencies.** Vercel sẽ tự cài dependencies và build sau khi import repo; cần kiểm tra Deployment Logs trước khi coi là production-ready đã xác minh.

## Cấu trúc

```text
Zipverra-v1.4.0/
├── app/
│   ├── api/auth/           # login, callback, session, logout
│   ├── api/github/         # repos, snapshot, blob, commit, verify
│   ├── globals.css
│   ├── layout.jsx
│   ├── components/            # SplashScreen + MobileViewportGuard
│   ├── manifest.js
│   └── page.jsx
├── lib/
│   ├── auth/session.js     # AES-256-GCM, cookies, CSRF origin
│   ├── archive.js
│   ├── github.js
│   ├── verification.js    # đối chiếu HEAD/parent/tree SHA
│   ├── reliability.js     # retry policy và journal validation
│   ├── mobile-ui.js       # tabs, diff filter, recent repo, timeline
│   ├── http.js
│   ├── operations.js
│   └── paths.js
├── public/                 # icon.svg, icon-192.png, icon-512.png, apple-touch-icon.png
├── tests/
├── .env.example
├── CHANGELOG.md
├── QA_NOTES.md
├── ROADMAP_NEXT.md
├── .github/workflows/ci.yml
├── package.json
├── next.config.mjs
└── vercel.json
```
