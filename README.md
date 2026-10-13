# Zipverra v1.5.1 — GitHub App Authentication

**Next.js 16 · React 19 · Vercel-targeted · Installable mobile PWA**  
**Slogan:** Push to GitHub. From Your Phone.

Zipverra nhận ZIP do ChatGPT xuất, đọc và đối chiếu file với một repository GitHub, dùng **tên ZIP bỏ `.zip` làm commit message**, cho chọn branch (mặc định `main`), xem preview Merge/Sync, commit rồi xác minh thay đổi trên GitHub. App chạy trên Vercel; không cần chạy Node server lâu dài hoặc Python để giải nén.

## 1. Điểm mới v1.5.1

- **GitHub App web authentication** thay cho OAuth App scopes rộng `repo workflow`. Đăng nhập bằng nút **Continue with GitHub** và OAuth authorization code + state chống CSRF.
- **Select repositories:** app được cài và cấp phép trên tài khoản GitHub hoặc Organization, tùy chọn **Only select repositories**; UI chỉ liệt kê repository có quyền `push`, đã được GitHub App cấp `Contents: write`.
- **GitHub App permission preflight:** kiểm tra installation, chủ repo, quyền ghi của người dùng, Contents: write và Workflows: write (nếu ZIP có `.github/workflows/*.yml` hoặc `.yaml`); kiểm tra lại tại bước Commit.
- **Expiring user access token:** mặc định 8 giờ, refresh token do GitHub cung cấp. Server làm mới khi sắp hết hạn và xoay vòng session cookie HttpOnly AES-256-GCM. Session web tối đa 7 ngày.
- **Manage GitHub App:** đường dẫn cài đặt/cấp thêm repository cùng nút Refresh danh sách repo. Hỗ trợ Organization nếu admin phê duyệt.
- **Không cần GitHub App private key:** Vì Zipverra **chỉ thực hiện yêu cầu theo tương tác người dùng**, API dùng user-to-server access token, bị giới hạn bởi **cả quyền người dùng và quyền đã cấp cho App**. Không dùng installation access token để push thay người dùng (đề phòng nâng quyền trái ý).
- Giữ nguyên 4 tab `Home · Repos · Activity · Settings`, PWA safe area, splash, zoom lock, Light/Dark, diff preview, Merge/Sync, upload binary, SHA verification, retry có kiểm soát, journal và Verify Push.

## 2. Đưa source lên GitHub và Vercel

1. Giải nén bản ZIP; upload **các file bên trong `Zipverra-v1.5.1/`** vào **gốc repository** của Zipverra (chứa ngay `package.json`, `app/`, `lib/`, `public/`). Không upload nguyên file ZIP lên GitHub với kỳ vọng Vercel tự giải nén.
2. Vercel → **Add New Project** → import repository → Next.js / Root Directory `./`.
3. Trước khi triển khai hoạt động đăng nhập, tạo GitHub App theo Mục 3 và cấu hình environment variables Mục 4.
4. Deploy → Vercel Logs phải chạy `npm run build` thành công. Các phiên bản trước không thể sử dụng lại Client ID/Secret OAuth App cũ.
5. Truy cập URL production trên iPhone; Safari → Share → Add to Home Screen để cài PWA.

> `APP_URL` phải là URL domain production ổn định, ví dụ `https://zipverra.example.com` hoặc `https://zipverra.vercel.app`. Nếu dùng alias/custom domain, callback GitHub App phải khớp **chính xác**. Vercel preview URLs khác domain production sẽ không xác thực được nếu vẫn dùng cùng APP_URL.

## 3. Tạo GitHub App (bắt buộc)

1. GitHub → [Settings / Developer Settings / GitHub Apps](https://github.com/settings/apps) → **New GitHub App**.
2. **GitHub App name:** chọn tên còn trống, ví dụ `zipverra-personal`; app URL: `https://YOUR_ZIPVERRA_DOMAIN`.
3. **Callback URL:** `https://YOUR_ZIPVERRA_DOMAIN/api/auth/callback`. Đây là URL cho nút Continue with GitHub.
4. **Request user authorization (OAuth) during installation:** **tắt**. Zipverra đã có nút login riêng với `state` chống CSRF. Nếu bật chế độ tự bắt đầu OAuth trong khi cài App, GitHub có thể redirect vào callback không có state của phiên hiện tại và Zipverra sẽ từ chối.
5. **Expire user authorization tokens:** bật (GitHub mặc định bật). Zipverra yêu cầu refresh token và token có hạn, không nhận token không hết hạn.
6. **Repository permissions:** `Contents` → **Read and write**, `Metadata` → **Read-only** (mặc định); `Workflows` → **Read and write** để có thể cập nhật `.github/workflows/*.yml/.yaml` (nếu không cần cập nhật workflows có thể bỏ quyền này). Không cần quyền `Administration`, `Actions` hoặc `Organization` để push source cơ bản.
7. **Where can this GitHub App be installed:** chọn Only on this account cho sử dụng cá nhân, hoặc Any account cho organization/đa người dùng tùy nhu cầu. Admin tổ chức có thể phải phê duyệt.
8. Save → lấy **Client ID** (thường có dạng `Iv23xxxxx` (hoặc kiểu cũ `Iv1.xxxxx`)) và tạo **Client secret** tại GitHub App settings. Lấy **slug** từ đường dẫn `https://github.com/apps/SLUG` (ví dụ `zipverra-personal`). App ID và private key **không** được dùng trong kiến trúc user-to-server của phiên bản này.
9. Trên Zipverra: **Continue with GitHub** để đăng nhập, sau đó **Install / Manage GitHub App** → chọn account/organization → **Only select repositories** → chọn repo muốn push. Về Zipverra nhấn **Refresh** để tải danh sách repo. Có thể cài App trước rồi login cũng được.
10. Nếu nâng quyền Workflows cho App đã cài: GitHub có thể yêu cầu chủ installation chấp nhận lại quyền mới. Làm mới trang sau khi chấp thuận.

**Giải thích quyền:** GitHub App user token không dùng OAuth `repo workflow` scopes. Token này chỉ cho phép thao tác trên phần giao nhau giữa repository/quyền của tài khoản và repository/quyền được cấp cho GitHub App. Đây là token phát hành cho thao tác nhân danh người dùng, không phải installation token.

## 4. Cấu hình môi trường Vercel

Vercel → Project → Settings → Environment Variables → Add (Production), rồi **Redeploy**:

| Biến | Giá trị |
|---|---|
| `APP_URL` | `https://YOUR_ZIPVERRA_DOMAIN` (không có path, không có dấu `/` ở cuối) |
| `GITHUB_APP_CLIENT_ID` | GitHub App Client ID (`Iv23...` or `Iv1...`), **không phải** App ID |
| `GITHUB_APP_CLIENT_SECRET` | GitHub App Client Secret (chỉ server biết) |
| `GITHUB_APP_SLUG` | Slug trong `github.com/apps/SLUG` |
| `SESSION_SECRET` | Chuỗi ngẫu nhiên tối thiểu 32 ký tự, khuyến cáo 64 ký tự hex, ví dụ `openssl rand -hex 32` |

Không cần `DATABASE_URL`, `GITHUB_APP_PRIVATE_KEY` hoặc `GITHUB_APP_ID`. Các biến `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` cũ **không được sử dụng** trong v1.5.1; có thể xóa sau khi đảm bảo migration thành công. Tuyệt đối không đưa `.env.local` chứa secret vào GitHub.

## 5. Quy trình Push từ iPhone

1. Đăng nhập GitHub App → cấp quyền repository trong Install/Manage → nhấn Refresh.
2. Chọn repo, branch mặc định `main` (có thể nhập branch khác có sẵn).
3. Chọn file ZIP trong Files; commit message tự lấy từ tên ZIP.
4. Chọn `Merge` (không xóa file vắng mặt trong ZIP) hoặc `Sync` (có thể xóa file, cần xác nhận riêng).
5. Phân tích ZIP; so sánh file thêm/sửa/xóa; đồng ý thay đổi.
6. Commit & Push; màn hình Activity theo dõi `Validate → Upload → Commit → Verify`.
7. Nếu kết quả không rõ sau lỗi mạng, dùng **Xác minh push**; **không tự retry Commit**. Link commit chỉ hiển thị khi GitHub đã xác minh.

## 6. Security và giới hạn

- Session lưu token truy cập + refresh token trong cookie `HttpOnly`, `SameSite=Lax`, `Secure` trên HTTPS, nội dung AES-256-GCM. Mã cookie v1.4.0 không hợp lệ trên v1.5.1, nên người dùng phải đăng nhập lại **một lần**.
- GitHub App user access tokens có hạn 8 giờ; refresh token được xoay vòng server-side khi gần hết hạn. Refresh đồng thời trong **cùng một Function isolate** được hợp nhất. **Giới hạn MVP:** nếu nhiều Vercel instances cùng refresh một cookie cũ đúng lúc, vẫn có thể xảy ra tranh chấp refresh token; khi đó đăng nhập lại. Giải pháp lâu dài: phiên tập trung/atomic refresh trong database/KV.
- Session trong cookie 7 ngày (ngắn hơn refresh token GitHub). Đăng xuất xóa cookie của Zipverra; không thu hồi ngay token ở phía GitHub. Người dùng có thể thu hồi quyền ứng dụng từ GitHub Settings → Applications.
- Mutation API yêu cầu origin chính xác với `APP_URL`, `Content-Type: application/json`; frontend không đọc hoặc truyền token GitHub. Tránh cài Zipverra trên domain không đáng tin.
- Không thể vượt qua GitHub branch protection, ruleset, yêu cầu status checks hoặc organization policy; các repo đó phải dùng PR (tính năng tương lai).
- ZIP tối đa 20 MB; tối đa 2,5 MB/file; tối đa 1.200 file; không hỗ trợ tạo branch mới, Git LFS, symlink Git hoặc submodule phức tạp. Xử lý ZIP trực tiếp trong trình duyệt để hạn chế giới hạn request 4,5 MB của Vercel Functions.
- Không ghi token ra logs, không lưu source ZIP trên server. PWA recovery journal giữ **metadata commit** cục bộ trong sessionStorage, không lưu access token.

## 7. Migration từ v1.4.0

1. **Đảm bảo có cách rollback**: lưu commit/ZIP v1.4.0. Chưa xóa GitHub OAuth App cũ ngay.
2. Tạo GitHub App mới, thiết lập callback, permission, client secret, slug; cấu hình 5 biến env mới.
3. Deploy v1.5.1; mọi người dùng sẽ phải đăng nhập lại vì session mới không chấp nhận cookie OAuth cũ.
4. Install GitHub App trên đúng repository và organization; login/Refresh; push thử vào **repo/branch thử nghiệm**, xác minh commit.
5. Khi mọi thao tác đã ổn định, mới xóa biến env OAuth cũ và cân nhắc thu hồi OAuth App cũ.

## 8. Kiểm thử

```bash
npm install
npm test
npm run build
```

GitHub Actions `ci.yml` cũng chạy test và build mỗi commit/pull request. `tests/` chứa session encryption, GitHub App OAuth URL, refresh rotation, kiểm tra installation và permission, commit verification, retry, mobile UI, PWA. Một số kiểm thử cần cấp quyền và repository thật **không thể thay thế bằng unit tests**; chạy checklist trong `QA_NOTES.md` sau deploy.

## 9. Tài liệu bổ sung

- `CHANGELOG.md` — lịch sử thay đổi
- `QA_NOTES.md` — checklist triển khai và bảo mật
- `ROADMAP_NEXT.md` — v1.6.0 History & Safe Rollback
- [GitHub Docs: Generating a user access token](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-user-access-token-for-a-github-app)
- [GitHub Docs: Refreshing user access tokens](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/refreshing-user-access-tokens)
- [GitHub Docs: Installation repositories accessible to user](https://docs.github.com/en/rest/apps/installations)


## v1.5.1 — Sửa lỗi nhầm GitHub App Client ID là cấu hình không hợp lệ

GitHub App Client ID có thể có dạng mới `Iv23...` **không có dấu chấm**. v1.5.0 kiểm tra quá chặt nên từ chối giá trị hợp lệ. v1.5.1 hỗ trợ cả định dạng mới và cũ.

Nếu sau khi deploy vẫn báo chưa cấu hình, đọc chính xác tên biến trong lỗi:
- `GITHUB_APP_CLIENT_ID`: xem **GitHub App → General → About → Client ID** (không phải App ID).
- `GITHUB_APP_CLIENT_SECRET`: xem **GitHub App → Credentials → Client secrets → Generate a new client secret**.
- `GITHUB_APP_SLUG`: lấy phần sau `/apps/` ở **Public page**.
- `APP_URL`: URL HTTPS production, phải khớp domain đang mở và callback `/api/auth/callback`.
- Cả 4 biến phải áp dụng **Production**, sau đó tạo deployment mới/Redeploy.

Không gửi secret qua tin nhắn, ảnh chụp hoặc commit source lên GitHub.
