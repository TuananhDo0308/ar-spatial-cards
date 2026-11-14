# Ứng Dụng WebAR Quét Bảng 2 Ảnh Cố Định (Dinh Độc Lập & Hội An) 📍📸

Ứng dụng WebAR tối ưu chạy trực tiếp trên trình duyệt điện thoại (iOS Safari, Android Chrome) hoặc máy tính, thiết kế theo ngôn ngữ **Minimalism Shadcn Dark UI**, nhận diện 2 bức ảnh cố định (**Dinh Độc Lập** và **Phố Cổ Hội An**) và hỗ trợ **cố định (Lock) toạ độ AR vĩnh viễn** sau khi quét xong.

---

## 🌟 Tính Năng Tối Ưu Mới

1. **Khóa Cố Định Toạ Độ AR (Persistent AR Anchor):**
   - Khi quét trúng ảnh lần đầu, toạ độ không gian và thẻ thông tin AR 3D sẽ **tự động cố định (Lock)** tại vị trí đó.
   - Khi lia camera ra xa hoặc quay lại, hệ thống **không cần render lại từ đầu**, thẻ AR không bị chớp giật hay mất dấu.
2. **2 Địa Điểm Thực Tế Sắc Nét:**
   - **Target #0:** Dinh Độc Lập (TP. Hồ Chí Minh).
   - **Target #1:** Phố Cổ Hội An (Quảng Nam).
3. **Bảng Mẫu Khoảng Cách Xa ([`board_sample.html`](board_sample.html)):**
   - 2 bức ảnh được thiết kế cách xa nhau rộng rãi (có nút chuyển xem từng ảnh phóng to) giúp bạn dễ dàng đưa camera quét từng hình mà không bị nhận diện nhầm.
4. **Giao Diện Minimalist Chuẩn Shadcn UI:**
   - Gam màu Zinc Dark thời thượng (`#09090b` / `#18181b` / `#27272a`).
   - Đường nét tinh giản, typography sắc sảo, nút bấm và badge bo góc hiện đại.
5. **Cơ Sở Dữ Liệu SQLite + REST API:**
   - Lưu trữ toàn bộ mô tả, bài thuyết minh giọng nói tiếng Việt và liên kết Google Maps trong `database.sqlite`.

---

## 🚀 Hướng Dẫn Thử Nghiệm

### Bước 1: Khởi động Server
```bash
cd /Users/tuananhdo/Downloads/ARapp
python3 server.py
```

### Bước 2: Mở Bảng Ảnh Mẫu Trên Máy Tính
Mở trình duyệt vào:
```
https://localhost:8443/board_sample.html
```
*(2 bức ảnh Dinh Độc Lập và Phố Cổ Hội An được bố trí cách xa nhau rộng rãi).*

### Bước 3: Quét Bằng Điện Thoại
* Mở trình duyệt điện thoại vào địa chỉ IP nội bộ (ví dụ: `https://192.168.1.X:8443/index.html`).
* Hướng camera vào từng bức ảnh: Thẻ AR 3D sẽ xuất hiện và **khóa toạ độ cố định ngay tại đó**. Lia máy đi chỗ khác rồi đưa lại vẫn nhớ nguyên vị trí mà không bị load lại!

---

## 📁 Cấu Trúc Dự Án

```
ARapp/
├── index.html            # Ứng dụng WebAR chính (A-Frame + MindAR)
├── admin.html            # Giao diện quản lý Database CMS (thêm/sửa/xoá địa điểm)
├── board_sample.html     # Chiếc bảng mẫu giả lập hiển thị ảnh để test
├── compiler.html         # Công cụ web tự biên dịch ảnh thành targets.mind
├── server.py             # Server WebAR + REST API HTTPS + SQLite
├── db.py                 # Module quản lý Database SQLite
├── database.sqlite       # Tệp cơ sở dữ liệu lưu trữ ảnh & mô tả
├── assets/
│   ├── targets.mind      # File dữ liệu điểm đặc trưng AR đã biên dịch sẵn
│   ├── target-0.png      # Ảnh mẫu 0 (Hồ Hoàn Kiếm)
│   └── target-1.png      # Ảnh mẫu 1 (Cầu Vàng Bà Nà)
└── data/
    └── locations.js      # Dữ liệu dự phòng offline (fallback)
```

---

## 🗄️ Hệ Thống Database & REST API

Ứng dụng sử dụng **SQLite (`database.sqlite`)** lưu trữ thông tin ảnh và mô tả:

* **Endpoint API:**
  * `GET /api/locations`: Lấy toàn bộ danh sách địa điểm.
  * `GET /api/locations/{target_index}`: Khi camera detect được ảnh nào, tự động gọi API này để lấy đúng bản ghi và in thông tin ra màn hình.
  * `POST /api/locations`: Thêm/Cập nhật địa điểm.
  * `DELETE /api/locations/{target_index}`: Xóa địa điểm khỏi Database.
* **Giao diện Quản trị CMS:** Truy cập `https://localhost:8443/admin.html` để quản lý thêm/sửa/xóa trực quan mà không cần chỉnh sửa code.

---

## 🚀 Hướng Dẫn Chạy & Thử Nghiệm Ngay

### Bước 1: Khởi động Server
Vì camera trên điện thoại bắt buộc phải chạy qua giao thức **HTTPS** (hoặc `localhost`), chạy lệnh sau trong thư mục dự án:

```bash
python3 server.py
```
*(Server sẽ tự sinh chứng chỉ SSL `cert.pem` / `key.pem` và in ra địa chỉ IP để truy cập).*

### Bước 2: Chuẩn bị bảng ảnh để quét
Bạn có 2 cách:
- **Cách 1 (Nhanh nhất - Không cần in):** Mở file `board_sample.html` trên màn hình máy tính hoặc iPad của bạn.
- **Cách 2:** Mở `board_sample.html` và bấm nút **"In bảng ra giấy A4"** để dán lên bảng thực tế.

### Bước 3: Mở WebAR và quét
- **Trên máy tính:** Mở trình duyệt vào `https://localhost:8443/index.html` (chấp nhận cảnh báo SSL nếu có).
- **Trên điện thoại:** Kết nối điện thoại vào **cùng mạng Wi-Fi** với máy tính, mở trình duyệt vào địa chỉ IP hiển thị trên màn hình terminal (ví dụ: `https://192.168.1.X:8443/index.html`).
- Bấm **"Bắt Đầu Quét Camera"**, cấp quyền cho camera, sau đó hướng camera vào các bức ảnh trên bảng!

---

## 🛠️ Hướng Dẫn Tự Đổi Ảnh Của Bạn & Cập Nhật Nội Dung

Khi bạn muốn thay bằng các bức ảnh địa điểm thực tế của riêng bạn:

### 1. Biên dịch bộ ảnh mục tiêu mới:
1. Mở `compiler.html` trên trình duyệt máy tính.
2. Kéo thả các bức ảnh bạn muốn dán trên bảng vào khu vực tải lên theo thứ tự:
   - Ảnh đầu tiên = `targetIndex: 0`
   - Ảnh thứ hai  = `targetIndex: 1`
   - Ảnh thứ ba   = `targetIndex: 2` (nếu có)...
3. Bấm nút **"Bắt Đầu Biên Dịch"**. Trình duyệt sẽ tính toán các điểm nhận diện (Feature Points).
4. Bấm **"Tải targets.mind Về Máy"**, sau đó chép đè file này vào thư mục `assets/targets.mind`.

### 2. Cập nhật thông tin hiển thị theo từng ảnh:
Mở file `data/locations.js` và chỉnh sửa hoặc thêm các thông tin tương ứng với từng `id` (`0`, `1`, `2`...):

```javascript
const LOCATIONS_DATA = {
  0: {
    id: 0,
    name: "Tên địa điểm của ảnh 0",
    tag: "Di tích / Du lịch",
    city: "Tên Thành phố",
    badgeColor: "#10b981",
    rating: "4.9 ★",
    hours: "08:00 - 18:00",
    ticket: "50.000 VNĐ",
    shortDesc: "Mô tả ngắn gọn hiển thị trên thẻ AR nổi...",
    fullDesc: "Mô tả đầy đủ và chi tiết lịch sử...",
    highlights: ["Điểm đặc sắc 1", "Điểm đặc sắc 2"],
    audioText: "Nội dung giọng nói tiếng Việt đọc thuyết minh tự động khi quét trúng...",
    mapQuery: "Địa chỉ để tìm kiếm trên Google Maps"
  },
  // Thêm các địa điểm tiếp theo...
};
```

---

## 💡 Mẹo Để Camera Nhận Diện Bảng Ảnh Nhanh & Nhạy Nhất

- **Chọn ảnh có nhiều chi tiết:** Các bức ảnh chụp phong cảnh, toà nhà kiến trúc, tranh vẽ có nhiều góc cạnh, độ tương phản cao và màu sắc rõ rệt sẽ được nhận diện gần như tức thì.
- **Tránh ảnh đơn điệu:** Không nên chọn logo quá tối giản chỉ có 1-2 nét vẽ, ảnh bầu trời trơn một màu, hoặc hoa văn lưới ca-rô lặp lại.
- **Ánh sáng:** Đảm bảo bảng dán ảnh có ánh sáng đều, tránh ánh đèn phản chiếu gây chói bóng (glare) trực tiếp lên bề mặt ảnh.
