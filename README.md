# Ứng Dụng WebAR 1 Ảnh Hiện 3 Thẻ AR Không Gian (TP. Hồ Chí Minh) 📍📸

Ứng dụng WebAR chạy trực tiếp trên trình duyệt web điện thoại (iOS Safari, Android Chrome, Máy tính), thiết kế theo phong cách **Minimalism Shadcn Dark UI**, nhận diện ảnh mục tiêu và hiển thị đồng thời **3 thẻ thông tin AR 3D nổi trong không gian** cùng hiệu ứng **Morphing phóng to từ góc thẻ 3D** mượt mà.

---

## 🌟 Tính Năng Nổi Bật

1. **1 Ảnh Quét ➜ Hiện Đồng Thời 3 Thẻ AR 3D:**
   * **Thẻ 1 (Trái - Amber):** “Biểu tượng Sài Gòn” – Chợ Bến Thành hơn 100 năm tuổi.
   * **Thẻ 2 (Giữa - Emerald):** “Dấu mốc Thống nhất” – Dinh Độc Lập ngày 30/4/1975.
   * **Thẻ 3 (Phải - Cyan):** “Nhịp sống Giao thoa” – Ẩm thực đường phố, cà phê bệt và phố đêm không ngủ.
2. **Chạm Vào Thẻ AR Trên Màn Hình Để Phóng To (Shared-Element Morphing):**
   * Tính toán toạ độ 2D của thẻ 3D trong không gian thực tế để tạo hiệu ứng phóng to mượt mà ra toàn màn hình.
3. **Cố Định AR Vững Chắc:**
   * Thẻ AR được neo trực tiếp trên mặt phẳng ảnh thực tế, không bị xoay theo camera khi xoay điện thoại.
4. **Giao Diện Minimalist Shadcn Dark:**
   * Tone màu Zinc Dark (`#09090b`, `#18181b`, `#27272a`), Plus Jakarta Sans font, typography sắc nét.
5. **Sẵn Sàng Deploy Trên Vercel & GitHub:**
   * Cấu hình sẵn `vercel.json` và Serverless Function `api/locations.js`.

---

## 🚀 Hướng Dẫn Deploy Lên Vercel

### Cách 1: Tự động qua GitHub
1. Push mã nguồn lên GitHub repository.
2. Truy cập [vercel.com](https://vercel.com) ➔ Chọn **Add New Project**.
3. Import repository từ GitHub ➔ Bấm **Deploy**.
4. Vercel tự động build và cấp chứng chỉ HTTPS chính thức (rất thuận tiện mở Camera trên mọi điện thoại mà không bị cảnh báo SSL).

### Cách 2: Chạy Local
```bash
python3 server.py
# Mở https://localhost:8443 trên máy tính
# Mở https://<IP_máy_tính>:8443 trên điện thoại
```
