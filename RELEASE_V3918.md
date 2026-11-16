# Zipverra Pro v3.9.18 — Durable Server Push

## Mục tiêu
Khi iPhone tắt màn hình/chuyển ứng dụng, server vẫn tiếp tục **Commit → Verify → Pull Request** sau khi đã nhận toàn bộ Git blobs từ trình duyệt. Tránh dựa vào Background Sync/Service Worker trên iOS (không đáng tin cậy).

## Luồng sau nâng cấp
1. Người dùng đăng nhập GitHub, chọn repository, ZIP, Review, xác nhận Critical/Project Mismatch/Sync và nhấn Push như cũ.
2. **Foreground staging:** tải từng Git blob lên GitHub, quét bảo mật server và nhận SHA + attestation cho từng file. **Giữ PWA mở cho đến khi Activity hiện “Server đã nhận job Push”.** Không tự tiếp tục truyền file sau khi iOS đình chỉ.
3. Server xác thực lại chứng nhận, tạo **durable Vercel Workflow** theo idempotency token gắn với user, repository, HEAD và manifest; trả về run ID + HMAC receipt gắn tài khoản. Không lưu GitHub token/ZIP bytes vào localStorage. Phiên GitHub truyền cho Workflow đã mã hóa AES-256-GCM với SESSION_SECRET.
4. **Background execution:** Workflow step kiểm tra quyền GitHub và HEAD, tạo đúng một commit, xác minh remote, rồi tạo/tìm PR khi được yêu cầu. Nếu có lỗi mạng hoặc commit không rõ kết quả: chỉ xác minh GitHub, không tự tạo lại commit khác.
5. **Resume:** khi mở lại trên cùng trình duyệt, ứng dụng đọc receipt đã lưu theo tài khoản, gọi server status mỗi 5 giây khi mở app; kết quả success/unknown được phục hồi và Recovery Center vẫn cho xác minh read-only.

## Hạn chế thực tế
- **Không thể rời ứng dụng ngay sau khi bấm Push khi file còn đang upload.** Tải file từ iPhone cần hoàn thành trước; iOS có thể dừng JavaScript khi app rời foreground. Để upload được trong background thực sự cần một kho nguồn đã được chuyển dữ liệu lên server trước khi rời app hoặc native iOS background transfer, không thuộc phạm vi phát hành này.
- Sau khi server nhận job, không cảnh báo `beforeunload` kiểu bản nháp ZIP cũ khi đóng PWA; vẫn giữ biên nhận job và không cập nhật Service Worker khi có job chưa kết thúc.
- Không gửi native push notification khi job xong; người dùng mở lại Activity để xem.
- File > 3 MB vẫn yêu cầu Private Vercel Blob theo phiên bản trước.
- Run IDs chỉ có trên thiết bị đã khởi tạo job; đồng bộ lịch sử job nhiều thiết bị cần database riêng.
- Workflow có thể phát sinh chi phí tùy mức dùng dịch vụ Vercel.

## Vercel deployment
- `npm install` để cài thêm `workflow` v5.4+ (được khai báo trong package.json).
- `next.config.mjs` dùng `withWorkflow` để tự tạo các route nội bộ. Vercel Workflow World hoạt động bằng OIDC, không cần tạo kho Blob riêng cho job. Bật Fluid Compute.
- Giữ `SESSION_SECRET`/GitHub App env vars như cũ; **không đổi SESSION_SECRET trong lúc có job**.
- Deploy lên Vercel Preview và test với repository thử nghiệm trước khi cập nhật Production.

## Không thay đổi
- Giới hạn ZIP, quét file/CRC, Project Guard, Critical/Sync explicit consent, quyền GitHub, Repo Ranking, GitHub Commit idempotency, Recovery, 4 tab PC/Mobile.
- Không chỉnh sửa repository GitHub thật hoặc Vercel deployment qua bản ZIP này.

## Nghiệm thu còn cần thực hiện
- `next build` trên Vercel (môi trường tạo ZIP thiếu Next.js/Workflow SDK dependencies).
- E2E GitHub: direct Push/PR/branch protection/timeout; khóa iPhone sau **“Server đã nhận job Push”** rồi mở lại xem kết quả; thử mất mạng trước/sau khi nhận job và luồng đổi tài khoản.
