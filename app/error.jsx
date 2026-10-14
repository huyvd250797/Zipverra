'use client';

/** Page-level error boundary: never echo untrusted API or runtime details. */
export default function ErrorBoundary({ reset }) {
  return <main className="pro-fatal-screen" role="alert">
    <div className="pro-fatal-panel">
      <span className="pro-fatal-symbol" aria-hidden="true">!</span>
      <h1>Không thể hiển thị màn hình này</h1>
      <p>Đã xảy ra lỗi giao diện. Nếu vừa Push hoặc thực hiện Pull Request, hãy kiểm tra trạng thái trên GitHub trước khi thử lại.</p>
      <div className="pro-fatal-actions">
        <button type="button" onClick={() => reset()}>Thử tải lại màn hình</button>
        <a href="/">Mở Zipverra</a>
      </div>
      <small>Zipverra không tự lặp lại commit, merge hoặc rollback sau lỗi.</small>
    </div>
  </main>;
}
