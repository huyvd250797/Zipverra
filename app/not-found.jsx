export default function NotFound() {
  return <main className="pro-fatal-screen">
    <div className="pro-fatal-panel">
      <span className="pro-fatal-symbol" aria-hidden="true">404</span>
      <h1>Không tìm thấy trang</h1>
      <p>Đường dẫn không tồn tại. Bạn có thể quay về Zipverra để chọn repository và tiếp tục thao tác.</p>
      <div className="pro-fatal-actions"><a href="/">Về Zipverra</a></div>
    </div>
  </main>;
}
