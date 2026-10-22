# Zipverra Pro v3.9.13 — Desktop Focused Upload & Verified Repo Ranking

## Nguồn nâng cấp
Nâng cấp trực tiếp từ **v3.9.9 Upload Hub & Source ZIP** do người dùng cung cấp. Không đưa các thay đổi animation trượt tab từ v3.9.10–v3.9.12 đã rollback trở lại.

## Desktop (từ 761px)
- Ban đầu chỉ hiện một màn Upload ZIP căn giữa workspace. Không còn panel Review trống chiếm nửa màn hình.
- Repository/Branch vẫn chọn bằng thanh ngữ cảnh hiện có; Tải ZIP và Repo thường dùng vẫn nằm trong Upload.
- Sau khi ZIP phân tích thành công, ẩn Upload và hiển thị Review & Push toàn chiều rộng khả dụng.
- Thanh Review có tên ZIP, số thay đổi và nút **Đổi ZIP**. Upload component và file input vẫn được mount trong DOM để chọn ZIP khác mà không mất kết nối.
- Danh sách file, đánh giá rủi ro, Security Scan và Diff giữ nguyên. Hàng xác nhận và Push tách khỏi vùng cuộn Review, giữ đầy đủ điều kiện khóa/mở cũ.
- Màn hình thấp vẫn có vùng nội dung cuộn riêng; không giấu cảnh báo để ép zero-scroll.

## Mobile
Không đổi breakpoint, cấu trúc tabbar, Bottom Sheet, Upload/Review layout hoặc animation mobile của bản v3.9.9. Sắp xếp Repo thường dùng thay đổi theo quy tắc mới trên cả PC và mobile.

## Repo thường dùng
- Chỉ chọn repo, đổi branch, áp dụng profile, phân tích ZIP, hoặc Push lỗi **không được** cập nhật thứ tự.
- Chỉ sau khi GitHub trả kết quả **Commit được xác minh** (Direct Push hoặc PR branch) mới đưa repo lên đầu.
- Đối với kết quả xác minh lặp lại cùng SHA trong Activity, không tăng lượt / đẩy lại thứ tự.
- Bộ chọn vẫn lọc qua danh sách repo có quyền GitHub; lịch sử chỉ chứa metadata theo tài khoản trên thiết bị.
- Nếu người dùng chủ động ghim/bỏ ghim, danh sách có thể thay đổi do thao tác ghim này (không phải do chọn repo).

## Không thay đổi
31/31 file API server, bảo mật và cảnh báo nhầm dự án, Sync Delete, Review consent, Direct Push, PR & Merge, Recovery, ZIP Standard 120 MiB / Extended 200 MiB.

## Kiểm thử / giới hạn
- Automated tests: xem kết quả lần chạy `npm test` của bản phát hành.
- Kiểm tra desktop CSS bằng Chromium với HTML mẫu tại 900, 1366 và 1920px, cả hai trạng thái Upload/Review. Đây **không phải** E2E của ứng dụng Next.js.
- Cần chạy `npm install`, `npm test`, `npm run build` trên Vercel Preview/CI và kiểm thử GitHub thực tế trước khi đưa vào Production. Trong môi trường đóng gói, Next.js dependencies không được cài đặt (`npm install --offline` trả ENOTCACHED).
