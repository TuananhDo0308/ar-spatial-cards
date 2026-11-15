# Ứng Dụng WebAR Không Gian 10 Địa Danh Việt Nam (Shadcn Clean) 🇻🇳📸

Hệ thống WebAR không gian 3D chạy trực tiếp trên trình duyệt web điện thoại và máy tính, thiết kế chuẩn **Shadcn Clean Dark Zinc**, tối ưu hóa 60 FPS bám dính mục tiêu.

---

## 🏛️ Kiến Trúc 3 Giao Diện (3 UIs Clean)

Hệ thống được chuẩn hóa thành đúng 3 giao diện chuyên biệt, loại bỏ tất cả các tính năng dư thừa:

1. **UI 1: Camera WebAR Scanner (`index.html`)**
   * Mở camera AR toàn màn hình, **hoàn toàn không có nút bấm điều hướng vướng víu**.
   * Chỉ có một status capsule tinh tế hiển thị trạng thái phát hiện ảnh mục tiêu.
   * Khi camera bắt trúng ảnh, **Khung định vị quang học 3D (AR Target Frame)** cùng 4 góc L-bracket khóa chặt vào bức ảnh thật.
   * 3 thẻ không gian nổi bao gồm: Thanh tiêu đề trên, thẻ điểm nổi bật bên trái (kèm nút `⤢ CHẠM ĐỂ MỞ RỘNG`), và thẻ thông tin tham quan bên phải.
   * Chạm vào thẻ hoặc bức ảnh sẽ mở Modal chi tiết địa danh kèm chỉ đường Google Maps.

2. **UI 2: Thư Viện Ảnh Quét AR Trên Desktop (`gallery.html`)**
   * Dành riêng để mở trên máy tính (Desktop/Laptop) để người dùng lấy điện thoại giơ vào quét.
   * **Hiển thị ảnh kích thước lớn Full Viewport**, tối đa hóa diện tích quét.
   * **Cuộn qua lại tự nhiên (Swipe / Scroll)**: hỗ trợ chuột cuộn (wheel), bàn rê chuột (trackpad), cảm ứng (touch swipe), và phím mũi tên `←`, `→`.
   * **Dải Preview List ảnh bên dưới chân màn hình**: hiển thị trực quan cả 10 thumbnail kèm mã `#0` - `#9`, click chuyển ảnh tức thì và tự động cuộn đồng bộ.
   * **Hoàn toàn không có nút bấm nào vướng víu** (Zero buttons clean design).
   * Mỗi ảnh đều có **Khung Nhận Diện Quang Học AR** kèm 4 góc L-Bracket `┏ ┓ ┗ ┛` tăng tương phản giúp camera bắt mục tiêu cực nhanh.

3. **UI 3: Quản Trị Cơ Sở Dữ Liệu CMS (`admin.html`)**
   * Quản lý dữ liệu 10 địa danh lưu trữ trong SQLite (`database.sqlite`).
   * Bảng dữ liệu chuẩn Shadcn Data Table với thumbnail, badge danh mục, rating, giờ mở cửa, giá vé.
   * Form chỉnh sửa Dialog mượt mà: cập nhật mô tả AR 3D, mô tả chi tiết, màu sắc badge, tọa độ Google Maps.
   * Hỗ trợ xuất file JSON backup.

---

## 🚀 Khởi Chạy Nhanh

### Chạy Local (Máy tính & Điện thoại cùng Wi-Fi)
```bash
python3 server.py
# Mở https://localhost:8443/gallery.html trên máy tính
# Mở https://<IP_MÁY_TÍNH>:8443/index.html trên điện thoại để quét
```

### Chạy chế độ HTTP (Test nhanh trên máy tính)
```bash
python3 server.py --http
# Truy cập http://localhost:8080/index.html
```

---

## 🎯 Cơ Chế Khử Rung & Ổn Định Bám Thẻ (Anti-Jitter Stabilization)

### Nguyên Nhân Gốc Rễ Gây Rung Trong WebAR Cầm Tay
1. **Bất đồng bộ FPS:** Engine thị giác máy tính (MindAR WASM) chạy ở tốc độ 15–25 FPS, trong khi màn hình điện thoại render ở 60–120 FPS. Nếu cập nhật ma trận trực tiếp, đối tượng 3D sẽ bị "giật từng nấc" (stepping stutter).
2. **Cánh tay đòn khuếch đại (Lever Arm Effect):** Thẻ thông tin nằm cách tâm ảnh 75cm ($X = \pm 0.75\text{ m}$). Bất kỳ rung lắc góc cực nhỏ nào ($0.3^\circ - 0.5^\circ$) từ bàn tay cũng bị khuếch đại thành độ rung 5–8mm trên màn hình.
3. **OneEuroFilter bị bypass ở chế độ gốc:** Tham số mặc định của thư viện gốc (`filterBeta: 1000`) khiến vi chấn bàn tay làm bùng phát tần số cắt, vô hiệu hóa bộ lọc thông thấp.

### Kiến Trúc Khử Rung 2 Tầng (Dual-Stage Stabilization)
* **Tầng 1 (MindAR Engine):** `filterMinCF: 0.0001; filterBeta: 0.001; maxTrack: 2; missTolerance: 10; warmupTolerance: 4;` loại bỏ xung nhiễu tần số cao của camera sensor.
* **Tầng 2 (A-Frame 60 FPS Render Loop):** Thuật toán **Damped LERP + SLERP + Deadzone vi sai**:
  * **Deadzone Bàn Tay:** Nếu độ dịch chuyển $< 1.5\text{ mm}$ và góc xoay $< 0.35^\circ$ (nhiễu vi sai do cầm máy), hệ số damping lập tức khóa chặt vị trí, **thẻ đứng im 100% không rung một pixel**.
  * **Adaptive Catch-Up:** Khi lia máy thật sự, thẻ lướt theo êm ái tự nhiên theo đường cong quán tính chuẩn VisionOS.

### So Sánh 2 Chế Độ Trực Tiếp
* **Chế độ Siêu Ổn Định (Mặc định):** Truy cập `https://<ip>:8443/index.html` — Kích hoạt toàn bộ bộ lọc 2 tầng, thẻ bám dính chắc chắn.
* **Chế độ Gốc Tác Giả (MindAR Raw):** Truy cập `https://<ip>:8443/index.html?mode=author` — Chạy đúng 100% tham số gốc và ma trận thô của tác giả Hiukim để người dùng đối chiếu sự khác biệt.
