# Zipverra v1.8.0 — Vercel Deployment Tracking (Next Release)

## Mục tiêu

Đóng vòng phát hành source ngay trên điện thoại: **Upload ZIP → GitHub commit/verify → theo dõi build/deployment → mở ứng dụng production**. Push GitHub thành công không tự đồng nghĩa deploy thành công.

## Các module dự kiến

1. **Vercel Connect:** cấu hình kết nối dự án Vercel tương ứng với GitHub repository theo cơ chế cấp quyền rõ ràng (OAuth / token mã hóa server-side). Không commit token vào source.
2. **Deployment mapping:** mapping `owner/repo + branch` ↔ Vercel project, hỗ trợ nhiều repository/organization và lựa chọn Production/Preview.
3. **Live deployment status:** Ready / Building / Error / Canceled; lấy status bằng API hoặc webhooks có signature, xử lý polling/rate limits.
4. **Commit → Deployment link:** liên kết SHA GitHub do Zipverra vừa push đến deployment tương ứng, hiển thị URL, mốc thời gian và trạng thái.
5. **Build diagnostics:** tóm tắt lỗi build, liên kết trực tiếp logs/deployment; không nhúng/công khai môi trường hay secret.
6. **Mobile Activity Integration:** Activity thêm giai đoạn **Deploy**, lịch sử nguồn và nút mở trang production trên iPhone.
7. **Safe controls:** xem lịch sử deploy, cân nhắc redeploy/rollback deployment với xác nhận riêng; không tự ghi đè GitHub branch.
8. **Notifications (optional):** PWA push notification hoặc in-app notification khi Vercel deploy xong/hỏng; chỉ triển khai nếu yêu cầu và hạ tầng phù hợp.

## Chú ý thiết kế

- Giữ GitHub App và History & Safe Rollback hiện tại; Vercel Deploy rollback khác với Git rollback.
- Không đưa token Vercel lên browser JS, không gửi Vercel API request trực tiếp bằng token ở client.
- Tách state Git push thành công với Vercel build Ready/Error; Vercel có thể deploy nhiều lần cho cùng commit.
- Khả năng lấy logs và metadata tùy quyền Vercel workspace; phải có thông báo khi không đủ quyền.

## Definition of Done

- E2E trên GitHub repo sandbox kết nối Vercel project sandbox, mapping đúng SHA.
- Hiển thị thành công + lỗi build rõ ràng; retry/polling không gây rate-limit quá mức.
- Unit/integration tests, production build, iPhone PWA UI/safe area đã kiểm tra thực tế.

**After v1.8.0:** Zipverra v1.9.0 — Repository Workspace.
