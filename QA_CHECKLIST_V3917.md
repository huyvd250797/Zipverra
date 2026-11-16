# QA Checklist v3.9.17

- [ ] Trên Vercel Preview: `npm install`, `npm test`, `npm run build`.
- [ ] Chọn ZIP có file 0 byte, file giữ 0 byte trong Review và sau Push.
- [ ] ZIP 1.154 thành phần MeYeuBe gốc: phân tích thành công; không báo metadata error.
- [ ] ZIP 2 wrapper: xác định đúng root trước Push, Project Mismatch còn kích hoạt bình thường.
- [ ] ZIP sai CRC, sai khai báo size, zip bomb, path traversal, duplicate-case: từ chối + thông báo có tên file.
- [ ] Desktop 900, 1366, 1920: upload gọn, không dư khoảng trắng giữa chọn repo và tùy chọn.
- [ ] Desktop kéo ZIP từ Explorer/Finder vào upload-panel, ZIP sai định dạng và chọn 2 file đều báo lỗi.
- [ ] Desktop Activity: chỉ một thanh tiến trình bên trong Live Activity, có owner/repo và branch.
- [ ] Mobile: kiểm tra chọn ZIP, Review, Push, navigation và confirmation sheet không thay đổi.
- [ ] Security/PR/Sync gates: thử Push an toàn đến Preview repository thử nghiệm.
- [ ] Large file >3 MB: chỉ dùng với Private Blob đã cấu hình; không bypass giới hạn.
