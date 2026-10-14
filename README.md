# Zipverra Pro v2.1.0 — Professional UI Design System

**Next.js 16 · React 19 · GitHub App · Mobile-first PWA · Vercel-targeted**  
**Tagline:** Push to GitHub. From Your Phone.

> Source baseline: Zipverra Pro v2.0.0, supplied by the user. This v2.1.0 is a **presentation and accessibility release**, not a rewrite of GitHub APIs. **No Vercel Deployment Tracking** is included.

## What's new in v2.1.0 — Professional UI Design System

- Shared `app/styles/pro-design-system.css` provides dark/light semantic tokens for backgrounds, text, borders, accent, spacing, radii, focus ring, shadows and motion. Loaded from `app/layout.jsx` after legacy styles to minimize regressions.
- New presentation-only reusable components in `app/components/ProfessionalUI.jsx`: accessible mobile screen heading, current repo summary, online/GitHub status chip, five-step workflow navigation and empty review state. **No GitHub API calls or source data persistence** in these components.
- Reworked topbar, panels, buttons, inputs, upload/drop zone, review summaries, activity timeline and bottom navigation with restrained colors and consistent sizing. Retains the **five existing mobile tabs**.
- Repositories display an actionable selected-repo card and clear **Upload ZIP** action. Upload highlights the chosen repo and the current step. Activity uses a real progressbar with `aria-valuenow`, never fabricated server progress.
- Global `:focus-visible` styling, accessible labels, minimum touch target sizing and `prefers-reduced-motion` protection. Existing iPhone safe-area treatment retained.
- Security-critical APIs (blob attestations, commit, PR creation/merge, Quick Edit, History, Safe Rollback) remain unchanged.
- Validation: 162/162 Node unit tests passed; 81 JS/JSX/MJS modules parsed; 147 relative imports resolved; CSS parser passed. npm install/build blocked by npm registry DNS `EAI_AGAIN`; **production build and real-browser interaction not verified** on this host. Verify using Vercel CI and iPhone.

### Primary workflow

**Repos → Upload ZIP → Analyze & Security Review → Confirm Direct Push or Pull Request → Activity / Verify SHA**.

### Deployment

- Push contents of `Zipverra-v2.1.0/` to the **root** of the existing GitHub repository, branch `main`. Do not place the source in a subdirectory.
- Preserve existing five Vercel Production env vars: `APP_URL`, `GITHUB_APP_CLIENT_ID`, `GITHUB_APP_CLIENT_SECRET`, `GITHUB_APP_SLUG`, `SESSION_SECRET`.
- No database, new GitHub App permissions or external Vercel tokens are required beyond v2.0.0's existing permissions.
- Run `npm ci` (where a lockfile is available) or `npm install`, `npm test` and `npm run build` in a networked CI environment. Test layouts at 320, 375, 390, 430, 768 and 1280 px, dark/light, and iPhone safe area.

---

## What was new in v2.0.0 (retained)

Zipverra Pro extends the existing five tabs, **Repos · Upload · Activity · History · Settings**, without adding a sixth tab or changing the default ZIP-to-GitHub flow.

1. **Pro Repository Dashboard (Repos, expandable section below repo selector):** shows total authorized writable repositories, pinned repos, saved profiles, and the latest commit SHA/message for up to five authorized favorite/recent repositories after pressing **Refresh status**. It queries the **GitHub App user session on the server** and rejects all uninstalled/unauthorized repo names. Offline, the most recent non-secret metadata cached on the device can still be viewed, but cannot be refreshed.
2. **Push Profiles (Settings):** save each repository's preferred branch, Merge/Sync mode and Direct Push/PR strategy. Profiles are **not applied automatically**; choose a repository, open Settings, and select **Apply**. This clears any old ZIP/review to prevent pushing with a stale preview.
3. **Local Activity (Activity):** records confirmed ZIP pushes, opened PRs, merges, verified rollbacks, and Quick Edit saves, plus push failures/ambiguous results. It supports filtering and clearing records. This is **device-local metadata**, not a GitHub audit log and not push notifications while the PWA is closed.
4. **Multi-repo workspace:** dashboard and profiles reduce switching overhead. GitHub App permissions remain the source of truth; source content and auth tokens are not stored in profile/activity data.
5. **UI polish:** responsive dark/light surfaces, compact badges and cards that respect mobile safe areas; splash and zoom settings remain.

### Primary workflow (unchanged)

**Repos → Upload ZIP → Review/Security Scan → Confirm Direct Push or Pull Request → Activity (SHA verified)**.

- **Direct Push** remains default. Pull Request remains optional and never auto-merges.
- Repository Explorer/Quick Edit, History/Safe Rollback, GitHub App Authentication and Secret Scan from v1.12.0 remain included.
- Zipverra Pro is a **product name**, not a paid subscription system. No billing/account tier feature is implemented.

### GitHub App / Vercel setup

The following Production environment variables are still required: `APP_URL`, `GITHUB_APP_CLIENT_ID`, `GITHUB_APP_CLIENT_SECRET`, `GITHUB_APP_SLUG`, `SESSION_SECRET`. **No additional Vercel environment variables, database or external tokens are required.**

- GitHub App **Contents: Read and write**, **Metadata: Read-only**; **Pull requests: Read and write** to use PR workflows; **Workflows: Read and write** if ZIP modifies GitHub Actions.
- Upload the **contents of `Zipverra-v2.1.0/`** into the repository root; do not upload the ZIP as a source file. Import the GitHub repository on Vercel, or let the existing Vercel project deploy the new commit.
- Run `npm install`, `npm test` and `npm run build` in CI. Production build and live GitHub operations must be verified before critical use.
- On iPhone use Safari → Share → Add to Home Screen. Continue to respect iOS safe areas and accessibility zoom controls.

### Data, security and constraints

- **Dashboard:** at most five GitHub-authorized repositories per refresh. Only latest commit metadata is read; **no Vercel API**. A read failure is shown independently for that repository.
- **Push Profiles:** up to 30 entries, device-scoped per GitHub login. Only repo/branch/mode/strategy and update timestamp are persisted. Applying a profile does not create a GitHub commit.
- **Local Activity:** up to 50 metadata-only entries, also separated per GitHub login. Clearing the list does not delete GitHub history.
- Existing ZIP upload limits, Web Worker behavior and checkpoint/security attestation rules from v1.12.0 still apply.
- Offline mode supports **viewing a previously cached dashboard**, not pushing files or automatically retrying commits in the background.
- GitHub credentials stay in encrypted HttpOnly sessions. Local storage must never include GitHub/Vercel tokens or source code.
- Secret detection is heuristic; no guarantees for undiscovered secrets or unscanned binary files.

### Smoke tests after Vercel deployment

1. Confirm footer and Settings show **v2.1.0** / Pro branding and account login works.
2. Repos → Refresh status; confirm SHA/message against GitHub and no unauthorized repo is returned.
3. Save a Push Profile, select a different repo, return and **Apply**. Verify chosen branch/strategy and that old ZIP preview is cleared.
4. Push a test ZIP, verify SHA, check Activity local record; create a PR (not auto-merged) and check PR record.
5. Quick Edit one text file, verify SHA on GitHub, and optionally test Safe Rollback on a disposable repository.
6. Switch GitHub accounts / log out: ensure Pro metadata from the previous account is not displayed.
7. On iPhone, test 320–430 px viewport, notches, bottom navigation, offline cached dashboard and light/dark modes.

---

## Previous features & architecture (retained from v1.12.0)


**Next.js 16 · React 19 · Vercel-targeted · Installable mobile PWA**  
**Slogan:** Push to GitHub. From Your Phone.

Zipverra nhận ZIP do ChatGPT xuất, đọc và đối chiếu file với một repository GitHub, dùng **tên ZIP bỏ `.zip` làm commit message**, cho chọn branch (mặc định `main`), xem preview Merge/Sync, commit rồi xác minh thay đổi trên GitHub. App chạy trên Vercel; không cần chạy Node server lâu dài hoặc Python để giải nén.


## Security & Smart Source Validation v1.12.0

### Phạm vi và cơ chế

- **ZIP Push / Pull Request:** File ZIP được giải nén bằng Web Worker và kiểm tra nội dung các file source. Màn hình Review lọc các phát hiện theo **những file đang được chọn**. File bỏ chọn sẽ không được upload/commit; trong Sync, file bỏ chọn không biến thành lệnh xóa.
- **Critical:** Phát hiện định dạng credential có độ tin cậy cao (GitHub token, AWS access key, Stripe live secret, OpenAI project key, GitLab token, Google API key, Slack token, PEM private key) hoặc tên file credential nguy hiểm. Chặn Push và PR. **Server kiểm tra lại trước khi upload lên GitHub**, kể cả khi người dùng bỏ qua giao diện bằng API call.
- **Warning:** Gán trực tiếp mật khẩu/API secret có dấu hiệu đáng ngờ, thay đổi package/lockfile/workflow/Vercel config, xóa cấu hình; cần người dùng xem xét và đánh dấu xác nhận trước Push.
- **Information:** File binary không được scan nội dung. Ứng dụng chỉ phát hiện rủi ro bằng các quy tắc cố định, **không bảo đảm source hoàn toàn an toàn**.
- **Security report:** Chỉ hiển thị path, số dòng, mã loại rủi ro và cách xử lý; không hiển thị giá trị credential hay đoạn code chứa secret.
- **Backend GitHub blob:** `/api/github/blob` giải mã, kiểm tra và chỉ upload file nếu không có Critical. Server trả về chứng nhận HMAC ràng buộc với user ID, repo, path và Git blob SHA; thời hạn **1 giờ**.
- **Backend commit:** `/api/github/commit` bắt buộc có chứng nhận còn hạn cho **mọi file thêm/sửa**. Client không được tự tạo SHA hoặc bỏ qua scan. File xóa không cần chứng nhận nội dung.
- **Upload resume:** Checkpoint chỉ dùng lại blob kèm chứng nhận quét **còn hạn và phù hợp manifest**. Các checkpoint SHA-only của phiên bản cũ sẽ phải upload lại. Không lưu credential thô trong checkpoint.
- **Quick Edit:** `/workspace/preview` và `/workspace/save` đều quét server-side; Critical bị chặn. Warning hiển thị trong Review. Preview vẫn có chữ ký 5 phút và kiểm tra HEAD/SHA như bản cũ.
- **ZIP safety:** Giữ kiểm tra ZIP traversal, symlink, file trùng, số entry, kích thước khai báo và kích thước giải nén từ v1.11.0; không tăng giới hạn để tránh ZIP bomb.

### Giới hạn và an toàn triển khai

- Detection dựa trên pattern và heuristic, có thể bỏ sót secret không thuộc mẫu, chuỗi bị mã hóa, binary hay dữ liệu rất khó nhận diện. Một số cảnh báo Warning có thể là ví dụ hoặc placeholder. **Không thay thế security scanner chuyên dụng, code review hay GitHub Secret Scanning.**
- Các file **đã tồn tại và không thay đổi** không được quét lại. Rollback tới commit lịch sử và merge PR tạo từ bên ngoài Zipverra **không được bảo đảm** đã qua lớp quét mới. Repo production nên bật thêm GitHub secret scanning/push protection nếu khả dụng.
- Việc tạo Git blob đã bị từ chối Critical không có nghĩa credentials chưa từng bị lộ ở nơi khác. Nếu secret thật từng bị chia sẻ, hãy revoke/rotate tại nhà cung cấp.
- Nếu upload mất quá 1 giờ hoặc người dùng đăng nhập sang tài khoản khác, chứng nhận quét có thể hết hạn: mở lại ZIP, phân tích và push lại; không tắt scanner.
- Không cần biến môi trường mới; vẫn cần `SESSION_SECRET` đủ mạnh đã cấu hình ở v1.11.0.
- Test thực tế với ZIP có secret giả trước khi sử dụng production; **không bao giờ đưa secret thật vào file test**.

### Checklist kiểm tra trên Vercel

1. `npm install && npm test && npm run build` (CI GitHub Actions được giữ nguyên).
2. Kiểm thử ZIP bình thường: Direct Push và PR đều thành công sau khi xác minh SHA.
3. ZIP chứa token giả đúng pattern: Review báo Critical và nút Push bị khóa; gọi trực tiếp API blob cũng trả `SECURITY_CRITICAL_BLOCKED` trước khi gửi GitHub.
4. Bỏ chọn file Critical rồi kiểm tra: chỉ file còn được chọn được push. Kiểm tra chế độ Sync giữ nguyên file bỏ chọn.
5. Test Quick Edit với token giả: preview hoặc save bị chặn. Test warning trong source không bị chặn nhưng được hiển thị.
6. Kiểm tra History, Safe Rollback, PWA safe area, branch protection và yêu cầu PR vẫn hoạt động.

---

## Các chức năng v1.11.0 tiếp tục được giữ nguyên

- **Direct Push vẫn mặc định**. Trong Upload, chọn Pull Request nếu muốn tạo branch riêng và mở PR trước khi merge vào `main`.
- Repos có bảng **Branch & Pull Requests** thu gọn, xem branch/PR và merge có xác nhận `MERGE`.
- **Activity** hiển thị riêng `branch pushed`, `PR opened`, `PR pending` và hỗ trợ khôi phục PR khi mạng gián đoạn.
- **Bắt buộc cấp thêm Pull requests: Read and write** trên GitHub App và phê duyệt lại quyền installation để dùng tính năng PR.
- v1.12.0 không thay đổi cơ chế xác thực hoặc quyền GitHub App của các chức năng này.

---

### Thông tin lịch sử v1.9.0 (đã được v1.12.0 mở rộng)

## 1. Điểm mới v1.9.0 — Repository Explorer & Quick Edit

**Source nâng cấp từ v1.8.0 Smart Push & Workflow 3.0**, không tích hợp Vercel Deployment Tracking. Giữ nguyên 5 tab mobile **Repos · Upload · Activity · History · Settings**, GitHub App Authentication, ZIP upload/Sync/Review, Push Recovery và History/Safe Rollback.

### Thao tác nhanh trên điện thoại

1. Vào **Repos**, đăng nhập GitHub App và chọn repo + branch (mặc định `main`).
2. Chạm **Repository Explorer · Quick Edit** ngay dưới lựa chọn repository. Không thêm tab thứ 6.
3. Duyệt thư mục bằng breadcrumb, lọc tên trong thư mục hoặc **Tìm toàn repo** (tối đa 60 kết quả/truy vấn).
4. Chạm file UTF-8 nhỏ để mở **read-only Code Viewer** có syntax highlighting cơ bản. Có thể **File history** và mở file trực tiếp trên GitHub.
5. Chạm **Edit file**, thay đổi source, nhập commit message (mặc định `Quick edit: <path>`), nhấn **Review Changes**.
6. Xem diff text, tick xác nhận và nhấn **Commit & Save File**. Xem commit SHA/link GitHub nếu thành công.
7. Nếu GitHub trả lỗi hoặc mạng gián đoạn trong lúc ghi, kiểm tra file/History trên GitHub trước khi thử lại. Zipverra không tự lặp yêu cầu PUT.

### Giới hạn và bảo vệ dữ liệu Quick Edit

- **Chỉ cập nhật một file text UTF-8 hiện có**, tối đa 64 KiB; không tạo mới, xóa file, sửa file nhị phân, symlink/submodule hoặc credentials `.env.local`, `.pem`, v.v. trong Workspace.
- Backend chỉ đọc file trong branch do người dùng chọn sau khi xác minh GitHub App installation và quyền `Contents: write`; workflow YAML cần `Workflows: write`.
- Preview có chữ ký HMAC `SESSION_SECRET`, gắn GitHub user ID, repo, branch, file path, `HEAD`, file SHA và digest nội dung mới; **hết hạn sau 5 phút**.
- Khi commit, kiểm tra lại HEAD và SHA file. GitHub Contents API yêu cầu SHA file cũ, giúp tránh ghi đè bản sửa của người khác; không force-push, không vượt qua branch ruleset.
- Lưu file rỗng yêu cầu xác nhận riêng. Khi rời file có nội dung chưa commit, app hỏi xác nhận trước khi bỏ bản nháp. **Draft không được lưu vào localStorage**.
- Code Viewer chỉ hiện tối đa 900 dòng đầu để giới hạn DOM; editor cho phép sửa toàn bộ file trong giới hạn 64 KiB. Diff tối đa 320 dòng mỗi phía; khi vượt ngưỡng, giao diện cảnh báo thay vì hiện diff không đầy đủ như một diff hoàn chỉnh.
- Chỉ trả token/credential trong cookie `HttpOnly` mã hóa; không đưa GitHub token tới JavaScript client. Nếu Save timeout và kết quả chưa rõ, app chỉ đọc lại GitHub để xác minh nội dung mới trước khi cho phép tiếp tục.
- **Trong v1.9.0**, Quick Edit chưa hỗ trợ tạo branch/PR. **v1.11.0 đã bổ sung Pull Request cho ZIP Push** và cho phép chọn branch có sẵn trước khi Quick Edit; PR riêng cho Quick Edit vẫn là tính năng dự kiến.

### Backend/API Workspace

`POST /api/github/workspace/list`, `/search`, `/file`, `/history`, `/preview`, `/save` — các API đều thông qua phiên GitHub App server-side, Origin check và các kiểm tra path/HEAD/permission. Không cần thêm environment variables hoặc database.

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


## Zipverra v1.11.0 — Branch & Pull Request Manager

> **Source baseline:** v1.9.0. This direct version jump does **not** claim to include the planned v1.10.0 Security & Smart Source Validation features.

### Two ways to publish source ZIP

1. **Direct Push (default):** Repos → choose repo & branch (`main`) → Upload → ZIP → Review → Confirm & Push → Activity. Existing behavior is preserved.
2. **Pull Request (optional):** Same workflow, but in **Upload → Cách cập nhật source**, select **Pull Request** before Analyze. Zipverra calculates a unique `zipverra/<zip-name>-<8-hex>` branch and displays it in Review. After confirmation:
   - Verify the base HEAD has not changed since Review.
   - Ensure GitHub App has `Contents: write` and `Pull requests: write` permissions.
   - Create branch at the reviewed base commit, **without force**.
   - Upload only the selected changes and commit to the new branch.
   - Verify the branch commit SHA on GitHub; create PR into the chosen target branch.
   - Show PR link in **Activity**. **This does NOT merge the PR automatically.**

### Branch & PR Manager

Repos → Select repository → expand **Branch & Pull Requests**. Select existing branches, load open PRs and open them on GitHub. If merging inside Zipverra, read the PR, verify CI/review first, select Merge and type **MERGE**. Server checks expected PR HEAD SHA, current GitHub mergeable state, installation permissions, and GitHub enforces branch protection, required reviews and CI. Merge is never forced.

### IMPORTANT: new GitHub App repository permission

For PR features, open GitHub App Settings → **Permissions & events** → **Repository permissions** → **Pull requests: Read and write**, then save and **approve the new permission in Install/Manage GitHub App** for each installation. Keep Contents: Read and write; Workflows: Read and write for ZIP changes touching `.github/workflows/*.yml`/`.yaml`. Refresh repositories after reapproval. Direct Push does not require the new Pull requests permission.

**No new Vercel environment variables.** Existing `APP_URL`, `GITHUB_APP_CLIENT_ID`, `GITHUB_APP_CLIENT_SECRET`, `GITHUB_APP_SLUG`, `SESSION_SECRET` are retained. This version does **not** integrate Vercel Deployment Tracking or any Vercel API token.

### Recovery and conflict handling

- Existing branch names are never overwritten during PR creation.
- A changed target branch HEAD before creating the release branch rejects the workflow with HTTP 409. Re-analyze to get a new branch name.
- If commit was pushed but PR creation failed or timed out, **Activity → Kiểm tra / Tạo PR** recovers using the verified SHA and looks for an existing PR first. It does not re-upload ZIP or create another commit.
- If push commit is ambiguous, **Activity → Xác minh push** must run before attempting another commit or PR.
- An existing closed/merged PR is not silently reused as an open one. Use GitHub to review its state.
- Branch protection cannot be bypassed. If Direct Push is rejected, first verify the previous attempt, then switch to Pull Request and review ZIP again.
- After review, merging a PR changes the target branch and could trigger a deployment configured elsewhere. Zipverra itself does not track Vercel deployments.

### Constraints / release QA

- Quick Edit remains single-file direct commit as in v1.9.0; the PR workflow applies to **ZIP Push**. Branch manager allows selecting a different branch for Quick Edit.
- No v1.10.0 deep secrets scanning has been implemented. Continue checking ZIP for secrets before publishing.
- GitHub Git API and Vercel production build are not validated by unit tests alone. Run `npm install`, `npm test`, `npm run build` and a live disposable-repo PR/merge smoke test before relying on production.
