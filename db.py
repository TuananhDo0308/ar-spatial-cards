import sqlite3
import json
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "database.sqlite")

LOCATIONS_2_SEED = [
    (
        0,
        "Dinh Độc Lập",
        "Di tích Lịch sử Quốc gia Đặc biệt",
        "TP. Hồ Chí Minh",
        "#10b981", # Emerald
        "4.8 ★ (35.2K đánh giá)",
        "08:00 - 16:30 hàng ngày",
        "65.000 VNĐ / người lớn",
        "Chứng nhân lịch sử thiêng liêng gắn liền với mốc son thống nhất đất nước ngày 30/4/1975.",
        "Dinh Độc Lập (còn gọi là Dinh Thống Nhất) tọa lạc tại trung tâm Quận 1, TP.HCM, được thiết kế bởi kiến trúc sư tài hoa Ngô Viết Thụ. Công trình kết hợp hài hòa giữa triết lý kiến trúc phương Đông (chữ Cát, Khẩu, Trung, Chủ) và kiến trúc hiện đại phương Tây trên khuôn viên rợp bóng cây cổ thụ rộng 12 hecta.",
        json.dumps([
            "Biểu tượng lịch sử ngày toàn thắng 30/4/1975",
            "Kiến trúc phong thủy phương Đông của KTS Ngô Viết Thụ",
            "Hệ thống phòng khánh tiết, phòng họp và hầm chỉ huy ngầm kiên cố"
        ], ensure_ascii=False),
        "Chào mừng bạn đến với Dinh Độc Lập, di tích lịch sử quốc gia đặc biệt và chứng nhân hào hùng cho ngày hòa bình thống nhất non sông Việt Nam.",
        "Dinh Độc Lập, Nam Kỳ Khởi Nghĩa, Phường Bến Thành, Quận 1, TP Hồ Chí Minh",
        "assets/target-0.png"
    ),
    (
        1,
        "Phố Cổ Hội An",
        "Di sản Văn hóa Thế giới UNESCO",
        "Quảng Nam",
        "#f59e0b", # Amber
        "4.9 ★ (48.6K đánh giá)",
        "Mở cửa tự do cả ngày",
        "120.000 VNĐ / vé tham quan di tích",
        "Đô thị cổ thương cảng thế kỷ 16-17 với những mái ngói rêu phong và đèn lồng rực rỡ bên sông Hoài.",
        "Phố Cổ Hội An từng là thương cảng quốc tế sầm uất bậc nhất châu Á thế kỷ 16-17, nơi giao thoa văn hóa Việt Nam, Nhật Bản, Trung Hoa và châu Âu. Nơi đây quyến rũ du khách bởi những dãy nhà cổ sơn vàng đặc trưng rợp hoa giấy, Chùa Cầu cổ kính và những đêm hội thả hoa đăng lung linh huyền ảo.",
        json.dumps([
            "Chùa Cầu Nhật Bản cổ kính hơn 400 năm tuổi",
            "Dãy nhà cổ tường vàng hoa giấy nguyên bản",
            "Đêm hội thả hoa đăng và đèn lồng lung linh ven sông Hoài"
        ], ensure_ascii=False),
        "Bạn đang khám phá Phố Cổ Hội An, di sản văn hóa thế giới bình yên với những nếp nhà cổ kính và ánh đèn lồng thơ mộng bên dòng sông Hoài.",
        "Phố cổ Hội An, Quảng Nam",
        "assets/target-1.png"
    )
]

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db(force_reseed=False):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS locations (
        target_index INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        tag TEXT DEFAULT 'Địa điểm',
        city TEXT DEFAULT '',
        badge_color TEXT DEFAULT '#10b981',
        rating TEXT DEFAULT '4.9 ★',
        hours TEXT DEFAULT 'Mở cửa cả ngày',
        ticket TEXT DEFAULT 'Miễn phí',
        short_desc TEXT,
        full_desc TEXT,
        highlights TEXT DEFAULT '[]',
        audio_text TEXT,
        map_query TEXT,
        image_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    cursor.execute("SELECT COUNT(*) FROM locations")
    count = cursor.fetchone()[0]
    
    if count != 2 or force_reseed:
        cursor.execute("DELETE FROM locations")
        cursor.executemany("""
        INSERT INTO locations (
            target_index, name, tag, city, badge_color, rating,
            hours, ticket, short_desc, full_desc, highlights,
            audio_text, map_query, image_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, LOCATIONS_2_SEED)
        conn.commit()
    conn.close()

def get_all_locations():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM locations ORDER BY target_index ASC")
    rows = cursor.fetchall()
    result = {}
    for r in rows:
        item = dict(r)
        try:
            item["highlights"] = json.loads(item["highlights"] or "[]")
        except:
            item["highlights"] = []
        result[str(item["target_index"])] = item
    conn.close()
    return result

def get_location_by_index(target_index):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM locations WHERE target_index = ?", (target_index,))
    row = cursor.fetchone()
    conn.close()
    if row:
        item = dict(row)
        try:
            item["highlights"] = json.loads(item["highlights"] or "[]")
        except:
            item["highlights"] = []
        return item
    return None

def upsert_location(data):
    conn = get_connection()
    cursor = conn.cursor()
    
    highlights = data.get("highlights", [])
    if isinstance(highlights, list):
        highlights = json.dumps(highlights, ensure_ascii=False)
        
    cursor.execute("""
    INSERT INTO locations (
        target_index, name, tag, city, badge_color, rating,
        hours, ticket, short_desc, full_desc, highlights,
        audio_text, map_query, image_url
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(target_index) DO UPDATE SET
        name=excluded.name,
        tag=excluded.tag,
        city=excluded.city,
        badge_color=excluded.badge_color,
        rating=excluded.rating,
        hours=excluded.hours,
        ticket=excluded.ticket,
        short_desc=excluded.short_desc,
        full_desc=excluded.full_desc,
        highlights=excluded.highlights,
        audio_text=excluded.audio_text,
        map_query=excluded.map_query,
        image_url=excluded.image_url
    """, (
        int(data.get("target_index", 0)),
        data.get("name", "Chưa đặt tên"),
        data.get("tag", "Địa điểm"),
        data.get("city", ""),
        data.get("badge_color", "#10b981"),
        data.get("rating", "4.9 ★"),
        data.get("hours", "Mở cửa cả ngày"),
        data.get("ticket", "Miễn phí"),
        data.get("short_desc", ""),
        data.get("full_desc", ""),
        highlights,
        data.get("audio_text", ""),
        data.get("map_query", ""),
        data.get("image_url", "")
    ))
    conn.commit()
    conn.close()
    return get_location_by_index(data.get("target_index"))

def delete_location(target_index):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM locations WHERE target_index = ?", (target_index,))
    conn.commit()
    conn.close()
    return True
