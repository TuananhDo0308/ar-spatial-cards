#!/usr/bin/env python3
"""
Server WebAR + Backend API + Database SQLite
- Phục vụ ứng dụng WebAR tĩnh (HTML, CSS, JS, Assets)
- Cung cấp REST API (/api/locations, /api/locations/:id) kết nối Database SQLite
- Hỗ trợ HTTPS (bắt buộc cho Camera trên trình duyệt di động)
"""

import http.server
import ssl
import socket
import os
import sys
import json
import urllib.parse
import subprocess
import db

PORT_HTTPS = 8443
PORT_HTTP = 8080

def get_local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('8.8.8.8', 1))
        ip = s.getsockname()[0]
    except Exception:
        ip = '127.0.0.1'
    finally:
        s.close()
    return ip

def generate_ssl_certs():
    cert_file = "cert.pem"
    key_file = "key.pem"
    if not (os.path.exists(cert_file) and os.path.exists(key_file)):
        print("🔐 Đang tạo chứng chỉ SSL tự ký (Self-signed certificate) cho HTTPS...")
        cmd = [
            "openssl", "req", "-x509", "-newkey", "rsa:2048",
            "-keyout", key_file, "-out", cert_file,
            "-days", "365", "-nodes",
            "-subj", "/CN=localhost"
        ]
        try:
            subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            print("✅ Đã tạo cert.pem và key.pem thành công!\n")
        except Exception as e:
            print("⚠️ Không thể tự tạo chứng chỉ SSL qua openssl:", e)
            return False
    return True

class ARAppRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Thêm CORS headers và chống cache trên trình duyệt di động
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200, "ok")
        self.end_headers()

    def do_HEAD(self):
        parsed_path = urllib.parse.urlparse(self.path)
        path = parsed_path.path
        if path in ("/dashboard", "/dashboard/", "/admin", "/admin/", "/gallery", "/gallery/"):
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.end_headers()
            return
        super().do_HEAD()

    def do_GET(self):
        # Xử lý REST API endpoints
        parsed_path = urllib.parse.urlparse(self.path)
        path = parsed_path.path

        if path == "/api/locations" or path == "/api/locations/":
            # Lấy toàn bộ danh sách địa điểm từ Database
            data = db.get_all_locations()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))
            return

        elif path.startswith("/api/locations/"):
            # Lấy 1 địa điểm theo target_index (khi quét trúng ảnh đó)
            try:
                target_idx = int(path.split("/")[-1])
                location = db.get_location_by_index(target_idx)
                if location:
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json; charset=utf-8')
                    self.end_headers()
                    self.wfile.write(json.dumps(location, ensure_ascii=False).encode('utf-8'))
                else:
                    self.send_response(404)
                    self.send_header('Content-Type', 'application/json; charset=utf-8')
                    self.end_headers()
                    self.wfile.write(json.dumps({"error": "Không tìm thấy địa điểm trong DB"}, ensure_ascii=False).encode('utf-8'))
            except ValueError:
                self.send_response(400)
                self.end_headers()
            return

        elif path in ("/dashboard", "/dashboard/", "/admin", "/admin/"):
            admin_file = os.path.join(os.path.dirname(__file__), "admin.html")
            if os.path.exists(admin_file):
                self.send_response(200)
                self.send_header('Content-Type', 'text/html; charset=utf-8')
                self.end_headers()
                with open(admin_file, "rb") as f:
                    self.wfile.write(f.read())
                return

        elif path in ("/gallery", "/gallery/"):
            gallery_file = os.path.join(os.path.dirname(__file__), "gallery.html")
            if os.path.exists(gallery_file):
                self.send_response(200)
                self.send_header('Content-Type', 'text/html; charset=utf-8')
                self.end_headers()
                with open(gallery_file, "rb") as f:
                    self.wfile.write(f.read())
                return

        # Mặc định: Phục vụ tệp tĩnh (HTML, CSS, JS, Image, Mind file...)
        super().do_GET()

    def do_POST(self):
        parsed_path = urllib.parse.urlparse(self.path)
        path = parsed_path.path

        if path == "/api/save-compiled-mind":
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            mind_path = os.path.join(os.path.dirname(__file__), "assets", "targets.mind")
            with open(mind_path, "wb") as f:
                f.write(body)
            print(f"✅ Đã lưu assets/targets.mind thành công! Kích thước: {len(body) / 1024 / 1024:.2f} MB")
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps({"status": "saved", "size": len(body)}).encode('utf-8'))
            return

        if path == "/api/locations" or path == "/api/locations/":
            # Thêm hoặc cập nhật địa điểm vào Database
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')
            try:
                data = json.loads(body)
                saved = db.upsert_location(data)
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "success", "data": saved}, ensure_ascii=False).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}, ensure_ascii=False).encode('utf-8'))
            return

        super().do_POST()

    def do_DELETE(self):
        parsed_path = urllib.parse.urlparse(self.path)
        path = parsed_path.path

        if path.startswith("/api/locations/"):
            try:
                target_idx = int(path.split("/")[-1])
                db.delete_location(target_idx)
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "deleted", "target_index": target_idx}).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.end_headers()
            return

        self.send_response(404)
        self.end_headers()

def run_server(mode="https"):
    # Khởi tạo Database SQLite
    db.init_db()

    local_ip = get_local_ip()

    if mode == "https":
        if not generate_ssl_certs():
            print("Chuyển sang chế độ HTTP thường...")
            mode = "http"

    if mode == "https":
        server_address = ('0.0.0.0', PORT_HTTPS)
        httpd = http.server.HTTPServer(server_address, ARAppRequestHandler)
        context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        context.load_cert_chain(certfile="cert.pem", keyfile="key.pem")
        httpd.socket = context.wrap_socket(httpd.socket, server_side=True)

        print("=" * 65)
        print("🚀 WebAR Fullstack Server (3 UI Clean: Camera - Gallery - CMS)")
        print("=" * 65)
        print(f"💻 Trên máy tính (Mac/PC):")
        print(f"   👉 UI 1 (Camera WebAR):       https://localhost:{PORT_HTTPS}/index.html")
        print(f"   👉 UI 2 (Thư Viện Desktop):   https://localhost:{PORT_HTTPS}/gallery.html")
        print(f"   👉 UI 3 (Quản Trị / Dashboard): https://localhost:{PORT_HTTPS}/dashboard (admin / TuananhDo0308)")
        print(f"   👉 REST API Endpoints:        https://localhost:{PORT_HTTPS}/api/locations")
        print("-" * 65)
        print(f"📱 Trên điện thoại (cùng mạng Wi-Fi để mở camera):")
        print(f"   👉 https://{local_ip}:{PORT_HTTPS}/index.html")
        print("   (Nhớ bấm 'Nâng cao / Advanced' -> 'Tiếp tục truy cập' để cấp quyền Camera)")
        print("=" * 65)
        print("Nhấn Ctrl + C để dừng server.")
    else:
        server_address = ('0.0.0.0', PORT_HTTP)
        httpd = http.server.HTTPServer(server_address, ARAppRequestHandler)
        print("=" * 65)
        print("🚀 WebAR HTTP Server đang chạy (3 UI Clean: Camera - Gallery - CMS)!")
        print("=" * 65)
        print(f"💻 Trên máy tính:")
        print(f"   👉 UI 1 (Camera WebAR):       http://localhost:{PORT_HTTP}/index.html")
        print(f"   👉 UI 2 (Thư Viện Desktop):   http://localhost:{PORT_HTTP}/gallery.html")
        print(f"   👉 UI 3 (Quản Trị / Dashboard): http://localhost:{PORT_HTTP}/dashboard (admin / TuananhDo0308)")
        print("=" * 65)

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Đã dừng server.")

if __name__ == "__main__":
    mode = "https"
    if len(sys.argv) > 1 and sys.argv[1] == "--http":
        mode = "http"
    run_server(mode)
