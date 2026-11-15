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
   * Mỗi ảnh được đặt trong **Khung Nhận Diện Quang Học AR (Optical Registration Frame)**:
     * Viền đen kép tương phản cao giúp camera điện thoại phân biệt rõ ràng ảnh và nền màn hình.
     * 4 góc L-Bracket quang học `┏ ┓ ┗ ┛` tăng cường điểm đặc trưng góc (corner keypoints) giúp MindAR khóa mục tiêu nhanh gấp đôi.
     * Tỉ lệ ảnh giữ chuẩn 100% (không méo hình).
   * 2 chế độ hiển thị: **Trình chiếu đơn (Focus Presentation Mode)** với phím tắt `←`, `→`, `F`, `Space` và **Lưới 10 Thẻ Tổng Quan (Grid Mode)**.

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
