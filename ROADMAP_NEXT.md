# Zipverra v1.7.0 — Advanced ZIP & Large Source (Next Release)

## Mục tiêu

Hỗ trợ source ZIP lớn hơn giới hạn MVP mà vẫn push ổn định trên iPhone và Vercel. Ưu tiên độ tin cậy, bảo mật ZIP và khả năng phục hồi upload hơn việc tăng dung lượng đơn thuần.

## Phạm vi đề xuất

1. **Web Worker archive processing:** giải nén, tính hash và so sánh file trong Worker để UI không bị treo; streaming/chunking để hạn chế bộ nhớ trên iPhone.
2. **Larger ZIP support:** phân tầng xử lý ZIP; trước khi tăng giới hạn cần kiểm soát ZIP bomb, tổng kích thước giải nén, tỉ lệ nén bất thường và tổng số file.
3. **Chunked upload strategy:** chia file thành lô phù hợp giới hạn body Vercel Functions 4.5MB; thiết kế cho file >2.5MB bằng storage/worker path, không giả định GitHub blob REST API có chunk upload.
4. **Resume uploads:** manifest có checksum, checkpoint giữa phiên, xác thực SHA phía GitHub; không auto-replay commit/branch writes.
5. **Smart asset handling:** file ảnh, icon, font, binary; Git LFS chỉ khi có quy trình riêng vì GitHub REST blob không tự upload LFS content.
6. **UX large source:** tiến trình upload theo file/batch, đánh dấu phần có thể tiếp tục, bộ lọc file lỗi, cảnh báo dung lượng/mạng di động.
7. **Quality:** unit + integration tests ZIP lớn, network interruption, throttling 429, branch contention và PWA background/foreground.

## Architecture decision cần chốt

- Giữ Next.js 16 + React 19, GitHub App user token và Vercel.
- Với upload thực sự lớn: cân nhắc Vercel Blob/S3 + queue/worker nền, thay vì chạy một Function lâu hoặc vượt request body.
- Không tự đồng bộ/xóa file nằm ngoài phạm vi ZIP nếu không có xác nhận rõ ràng.
- Nếu thêm cloud storage hoặc queue sẽ phát sinh biến môi trường và chi phí dịch vụ; document rõ trước khi triển khai.

## Definition of Done

- Full Next.js production build thành công; test E2E với private sandbox repo và source đủ lớn.
- Push thành công được xác minh bằng commit SHA, idempotent khi retry; không force-push.
- ZIP traversal, bomb, oversize, file-count limit và secrets đều bị từ chối an toàn.
- Giữ History & Safe Rollback v1.6.0 không hồi quy.

**After v1.7.0:** Zipverra v1.8.0 — Vercel Deployment Tracking.
