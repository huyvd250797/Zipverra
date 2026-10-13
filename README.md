# Zipverra v1.8.0 — Smart Push & Workflow 3.0

**Next.js 16 · React 19 · Vercel-targeted · Installable mobile PWA**  
**Slogan:** Push to GitHub. From Your Phone.

Zipverra nhận ZIP do ChatGPT xuất, đọc và đối chiếu file với một repository GitHub, dùng **tên ZIP bỏ `.zip` làm commit message**, cho chọn branch (mặc định `main`), xem preview Merge/Sync, commit rồi xác minh thay đổi trên GitHub. App chạy trên Vercel; không cần chạy Node server lâu dài hoặc Python để giải nén.

## 1. Điểm mới v1.8.0 — Smart Push & Workflow 3.0

**Phiên bản cơ sở: v1.7.0.** Không có chức năng Vercel Deployment Tracking, không cần Vercel API Token hay biến môi trường mới. Vercel chỉ là nơi chạy Zipverra.

Quy trình mobile giữ nguyên: **Repos → Upload ZIP → Phân tích/Review → Xác nhận & Push → Activity**. Tab Repos mặc định, sau khi chọn repo tự chuyển Upload. GitHub App Access vẫn trong Settings.

### Smart repositories

- Tìm kiếm repository, ưu tiên **ghim yêu thích** (favorite) và repository gần đây. Ghim được lưu cục bộ trên thiết bị, không chứa token.
- Đổi repository sẽ xóa ZIP/preview cũ để tránh push sang nhầm repo; branch mặc định `main`.

### Smart ZIP analyzer

- Giải nén ở Web Worker từ v1.7.0; hiển thị framework phát hiện từ manifest (`Next.js`, `Vite`, `React`, `Node.js`, `Python`, `Flutter`, v.v.) và số file binary.
- Cảnh báo thay đổi lockfile, `package.json`, `next.config`, workflows và dự kiến xóa file bằng Sync; mô tả những file hoặc thư mục build/cache đã bỏ qua.
- Đường dẫn nguy hiểm (`.env.local`, credentials, private keys, symlink, path traversal) tiếp tục bị **chặn bởi ZIP parser hiện tại**; analyzer là kiểm tra bổ trợ, không thay thế audit bảo mật.

### Review & selective staging

- Bộ lọc Thêm / Sửa / Xóa, tìm theo tên file, checkbox chọn/bỏ từng file, chọn/bỏ toàn bộ; danh sách hiển thị 100 mục mỗi lần để tránh render hàng nghìn hàng trên iPhone.
- Bỏ chọn nghĩa là **không tạo thay đổi cho path đó**, kể cả khi mode Sync đang dự định xóa file trên GitHub.
- `Xác nhận & Push` chỉ cho phép khi còn file được chọn. Mọi thay đổi lựa chọn đều đặt lại checkbox đồng ý; xóa trong Sync cần xác nhận riêng.
- Chỉ kiểm tra quyền Workflows: write cho file `.github/workflows` **đang được chọn**. HEAD vẫn được kiểm tra lại trong backend trước commit.
- **Text diff** cho file UTF-8 nhỏ (tối đa 64 KiB mỗi bản, 320 dòng/phía); backend đọc blob từ đúng SHA ở HEAD đã phân tích, xác minh repo + installation; không chấp nhận SHA tùy ý từ trình duyệt. Không hỗ trợ nhị phân hoặc file quá lớn, không làm thay đổi file trên GitHub.

### Live Push Activity

- Tự chuyển Activity ngay lúc nhấn Push; hiển thị số file/batch và lượng dữ liệu đã upload, tốc độ/ETA **ước tính**. Batch 12 file, tối đa 2 request song song.
- Fingerprint/checkpoint dùng **chỉ các file được chọn**, ngăn tái dùng blob của danh sách thay đổi khác. Giữ xác minh HEAD/commit SHA, trạng thái unconfirmed, nút Verify Push, retry an toàn từ v1.7.0.
- Không có background upload nếu đóng PWA. Không tự retry commit có kết quả chưa xác nhận.

## 1. Điểm mới v1.7.0

- **GitHub App web authentication** thay cho OAuth App scopes rộng `repo workflow`. Đăng nhập bằng nút **Continue with GitHub** và OAuth authorization code + state chống CSRF.
- **Select repositories:** app được cài và cấp phép trên tài khoản GitHub hoặc Organization, tùy chọn **Only select repositories**; UI chỉ liệt kê repository có quyền `push`, đã được GitHub App cấp `Contents: write`.
- **GitHub App permission preflight:** kiểm tra installation, chủ repo, quyền ghi của người dùng, Contents: write và Workflows: write (nếu ZIP có `.github/workflows/*.yml` hoặc `.yaml`); kiểm tra lại tại bước Commit.
- **Expiring user access token:** mặc định 8 giờ, refresh token do GitHub cung cấp. Server làm mới khi sắp hết hạn và xoay vòng session cookie HttpOnly AES-256-GCM. Session web tối đa 7 ngày.
- **Manage GitHub App:** đường dẫn cài đặt/cấp thêm repository cùng nút Refresh danh sách repo. Hỗ trợ Organization nếu admin phê duyệt.
- **Không cần GitHub App private key:** Vì Zipverra **chỉ thực hiện yêu cầu theo tương tác người dùng**, API dùng user-to-server access token, bị giới hạn bởi **cả quyền người dùng và quyền đã cấp cho App**. Không dùng installation access token để push thay người dùng (đề phòng nâng quyền trái ý).
- Giữ 5 tab `Repos · Upload · Activity · History · Settings`, PWA safe area, splash, zoom lock, Light/Dark, diff preview, Merge/Sync, upload binary, SHA verification, retry có kiểm soát, journal và Verify Push.


### Repo-first workflow & Mobile UX 3.0 — v1.7.0

Quy trình trên điện thoại được **thiết kế lại theo thứ tự bắt buộc**:

1. **Repos (màn hình mặc định)** → đăng nhập GitHub nếu cần, tìm/chọn repository, nhập branch (mặc định `main`). Chọn repo sẽ tự chuyển sang Upload.
2. **Upload ZIP** → chỉ cho chọn file khi repo đã được cấp quyền. Thay repo sẽ **xóa ZIP cũ**, đưa mode về Merge và hủy preview để không push nhầm source sang repo mới.
3. **Phân tích & kiểm tra** → giải nén ở Web Worker, bảo vệ đường dẫn, hash Git Blob SHA-1, kiểm tra quyền GitHub, đọc HEAD và tạo preview thêm/sửa/xóa. Chưa thực hiện commit.
4. **Xác nhận & Push** → tick xác nhận; Sync xóa file cần tick riêng. Commit message mặc định là tên ZIP không có `.zip`.
5. **Activity** → **tự động mở ngay khi nhấn Push**, hiển thị Validate → Upload → Commit → Verify, tiến độ batch, lỗi và nút Xác minh push nếu kết quả chưa rõ.

Tab **Repos** chỉ chứa repo, branch, tìm kiếm và repo gần đây (đã lọc theo quyền hiện tại). **GitHub Account & App Access** (Install / Manage, Refresh, Logout) chuyển sang **Settings** nhằm giảm rối.

**Đã xóa** đoạn mô tả dài mà người dùng yêu cầu bỏ khỏi giao diện. Hero vẫn giữ slogan `Push to GitHub. From Your Phone.`.

### Advanced ZIP & Large Source — v1.7.0

- **Web Worker:** JSZip giải nén, bảo vệ ZIP traversal, phát hiện file nguy hiểm và tính Git SHA-1 ngoài luồng giao diện; `Uint8Array` được transfer về main thread, giảm copy bộ nhớ. Nếu trình duyệt không hỗ trợ Worker, tải module parser theo nhu cầu và chạy fallback trên UI thread.
- **ZIP lớn hơn:** tối đa **80 MiB file ZIP**, **160 MiB dữ liệu giải nén**, **2.500 file source (tối đa 10.000 phần tử trong ZIP tính cả file bỏ qua)**, **2.500 file thay đổi mỗi commit**, tối đa 12.000 file được đọc ở repository đích. Cần thiết bị đủ RAM; ZIP 80 MiB không bảo đảm mọi iPhone đều giải nén được.
- **Giới hạn file đơn:** **2,5 MB/file** (định dạng nhị phân lẫn text). Các yêu cầu gửi Base64 qua Vercel dưới ngưỡng body 4,5 MB; chưa hỗ trợ split một file lớn thành nhiều phần để tạo **một Git blob** vì GitHub Git Data REST API không có giao diện multipart blob. File lớn hơn cần Git/Git LFS hoặc cơ chế object-storage/worker riêng trong tương lai.
- **Batch upload:** nhóm tối đa 12 file, 2 upload blob đồng thời. Chỉ gửi **file thay đổi**, không gửi nguyên ZIP lên server; không tự retry commit/branch mutation.
- **Resume trước commit:** mỗi blob được xác minh SHA và checkpoint ở `localStorage` trên thiết bị (metadata tên file/SHA, không phải nội dung ZIP/token). Khi mất mạng, mở lại PWA → **chọn lại cùng repo/branch và file ZIP** → phân tích lại → Push; file đã upload với SHA phù hợp sẽ được bỏ qua. Checkpoint chỉ hợp lệ trong 24 giờ và ràng buộc bởi fingerprint SHA-256 của repo, HEAD, mode, path và blob SHA.
- **Trạng thái commit không chắc chắn:** ưu tiên nút **Xác minh push** ở Activity; không tự tạo commit thứ hai. Recovery Journal cũ dùng `sessionStorage` vẫn hoạt động.
- **Thận trọng:** Không có tiến trình background khi đóng PWA. Resume là **tiếp tục theo file** sau khi người dùng mở lại/chọn lại ZIP, không phải tiếp tục từng byte bên trong một file đang upload.


### History & Safe Rollback — v1.6.0

- **History:** mở tab **History** ở thanh điều hướng mobile; repo/branch đang chọn từ Repos được dùng lại. Nhấn **Refresh History** để lấy 20 commit/trang từ GitHub (tối đa 25 trang). Nhấn từng commit để xem SHA, tác giả, ngày, commit message; nhấn biểu tượng ↗ để mở GitHub.
- **Compare Versions:** chọn 2 commit trong lịch sử, nhấn **So sánh thay đổi**. Zipverra so sánh **toàn bộ Git tree**, phân loại file thêm/sửa/xóa; chỉ hiển thị file-level diff (không hiển thị line-by-line patch).
- **Rollback:** chọn commit cũ trong lịch sử, nhấn **Preview rollback**, kiểm tra danh sách file + số file bị xóa/sửa/thêm, tick xác nhận rồi nhập chính xác `ROLLBACK`.
- **Cách khôi phục:** backend tạo **một commit mới** với *tree của commit đích* và *parent là HEAD tại thời điểm preview*. Sau đó update ref với `force:false`. Lịch sử Git cũ không bị xóa hay reset; rollback này khôi phục **toàn bộ snapshot** của commit đích, không chỉ đảo một commit đơn lẻ.
- **Trạng thái không rõ:** lưu metadata (owner/repo/branch/HEAD trước đó/target SHA) trong `sessionStorage` trước mutation. Nếu mất mạng hoặc đóng PWA giữa chừng, quay lại tab History và bấm **Xác minh rollback**, tuyệt đối không rollback lần nữa cho đến khi kiểm tra xong.
- **Giới hạn an toàn:** commit đích phải là tổ tiên của branch hiện tại; HEAD không được đổi sau preview; proof HMAC trong 10 phút; chặn thay đổi `.env`/khóa riêng, symlink/submodule, rollback vượt 2.500 file, Git tree bị cắt ngắn; kiểm tra Contents/Workflows write ngay trước tạo commit. Branch protection/ruleset vẫn có thể chặn thao tác, Zipverra không bypass.
- **Không yêu cầu database hay biến môi trường mới**. Dùng `SESSION_SECRET` hiện có để ký preview rollback, không trả GitHub token xuống client.
- **Chú ý:** Rollback có thể vô hiệu hóa các thay đổi vừa deploy, vì vậy nên xem kỹ `package.json`, CI workflow, database migration và mọi file bị xóa trước khi xác nhận. Không hỗ trợ tự tạo Pull Request khi branch được bảo vệ trong v1.6.0.

## 2. Đưa source lên GitHub và Vercel

1. Giải nén bản ZIP; upload **các file bên trong `Zipverra-v1.8.0/`** vào **gốc repository** của Zipverra (chứa ngay `package.json`, `app/`, `lib/`, `public/`). Không upload nguyên file ZIP lên GitHub với kỳ vọng Vercel tự giải nén.
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

Không cần `DATABASE_URL`, `GITHUB_APP_PRIVATE_KEY` hoặc `GITHUB_APP_ID`. Các biến `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` cũ **không được sử dụng** trong v1.7.0; có thể xóa sau khi đảm bảo migration thành công. Tuyệt đối không đưa `.env.local` chứa secret vào GitHub.

## 5. Quy trình Push từ iPhone

1. Trong **Repos**, đăng nhập GitHub App nếu cần; chọn repo đã cài quyền, `main` mặc định. Chọn xong → tự mở **Upload**.
2. Trong **Upload**, chọn ZIP từ Files → chọn `Merge` hoặc `Sync` → nhấn **Phân tích ZIP và xem thay đổi**.
3. Chờ Web Worker giải nén, preflight và tải HEAD → kiểm tra số file thêm/sửa/xóa → tick **Tôi đồng ý** (và tick xác nhận xóa riêng nếu Sync).
4. Nhấn **Commit & Push** → Zipverra tự chuyển sang **Activity**, theo dõi trạng thái và tiến độ batch.
5. Sau thành công, GitHub commit URL xuất hiện. Nếu mất mạng/timeout tại commit, chỉ nhấn **Xác minh push**, không retry commit mù quáng.
6. Nếu lỗi xảy ra **trước commit**, chọn lại **cùng repo + ZIP** và phân tích lại; checkpoint 24 giờ giúp bỏ qua blob SHA đã upload, miễn là HEAD chưa đổi.

**Settings:** GitHub Account & App Access, quản lý installation/quyền repo, đăng xuất và đổi Dark/Light.

## 6. Security và giới hạn

- Session lưu token truy cập + refresh token trong cookie `HttpOnly`, `SameSite=Lax`, `Secure` trên HTTPS, nội dung AES-256-GCM. Mã cookie v1.4.0 không hợp lệ trên v1.7.0, nên người dùng phải đăng nhập lại **một lần**.
- GitHub App user access tokens có hạn 8 giờ; refresh token được xoay vòng server-side khi gần hết hạn. Refresh đồng thời trong **cùng một Function isolate** được hợp nhất. **Giới hạn MVP:** nếu nhiều Vercel instances cùng refresh một cookie cũ đúng lúc, vẫn có thể xảy ra tranh chấp refresh token; khi đó đăng nhập lại. Giải pháp lâu dài: phiên tập trung/atomic refresh trong database/KV.
- Session trong cookie 7 ngày (ngắn hơn refresh token GitHub). Đăng xuất xóa cookie của Zipverra; không thu hồi ngay token ở phía GitHub. Người dùng có thể thu hồi quyền ứng dụng từ GitHub Settings → Applications.
- Mutation API yêu cầu origin chính xác với `APP_URL`, `Content-Type: application/json`; frontend không đọc hoặc truyền token GitHub. Tránh cài Zipverra trên domain không đáng tin.
- Không thể vượt qua GitHub branch protection, ruleset, yêu cầu status checks hoặc organization policy; các repo đó phải dùng PR (tính năng tương lai).
- ZIP tối đa 80 MiB; giải nén tối đa 160 MiB; tối đa 2,5 MB/file; tối đa 2.500 file; không hỗ trợ tạo branch mới, Git LFS, symlink Git hoặc submodule phức tạp. Xử lý ZIP trực tiếp trong trình duyệt để hạn chế giới hạn request 4,5 MB của Vercel Functions.
- Không ghi token ra logs, không lưu source ZIP trên server. PWA recovery journal giữ **metadata commit** cục bộ trong sessionStorage, không lưu access token.

## 7. Migration từ v1.4.0

1. **Đảm bảo có cách rollback**: lưu commit/ZIP v1.4.0. Chưa xóa GitHub OAuth App cũ ngay.
2. Tạo GitHub App mới, thiết lập callback, permission, client secret, slug; cấu hình 5 biến env mới.
3. Deploy v1.7.0; mọi người dùng sẽ phải đăng nhập lại vì session mới không chấp nhận cookie OAuth cũ.
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
- `ROADMAP_NEXT.md` — v1.7.0 Advanced ZIP & Large Source
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


## v1.6.0 — History, compare & rollback endpoints

| API Route (POST, authenticated) | Nhiệm vụ |
|---|---|
| `/api/github/history` | List commit theo branch, 20/trang |
| `/api/github/compare` | So sánh hai tree theo commit SHA |
| `/api/github/rollback/preview` | Tạo diff + signed 10-minute preview |
| `/api/github/rollback/execute` | HEAD guard → create commit → non-force update → verify |
| `/api/github/rollback/verify` | Chỉ đọc/đối chiếu SHA khi kết quả chưa rõ |

Tất cả API sử dụng GitHub App user token trong cookie HttpOnly, xác nhận Origin/JSON và trả `Cache-Control: no-store`. Không chấp nhận token GitHub trực tiếp từ trình duyệt.


## 9. Kiểm thử đặc thù v1.7.0

- Unit tests cho manifest fingerprint, giới hạn ZIP, batch concurrency/resume, bỏ qua blob theo SHA, lỗi mạng, SHA sai và vòng đời Web Worker.
- Kiểm tra repo-first UX và việc chuyển GitHub App Access sang Settings; kiểm thử Repos/Upload/Activity/History/Settings trên thiết bị thực khi triển khai.
- Trước khi dùng ZIP lớn với source quan trọng, thử ở repository sandbox với ZIP lớn nhưng **mỗi file <= 2,5 MB**, kiểm tra Vercel Runtime Logs, GitHub commit SHA và memory Safari/PWA.
- `npm run build` phải được kiểm tra qua Vercel hoặc GitHub Actions. Môi trường đóng gói có thể không truy cập được npm registry; không coi source là đã production-verified khi chưa chạy build/E2E thật.

**Next:** Zipverra v1.8.0 — Vercel Deployment Tracking.
