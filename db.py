import sqlite3
import json
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "database.sqlite")

CARDS_SEED = [
    (
        0, # card_id
        0, # target_index (TP. Hồ Chí Minh / Dinh Độc Lập)
        "Chợ Bến Thành",
        "Biểu tượng Sài Gòn",
        "TP. Hồ Chí Minh",
        "#f59e0b", # Amber
        "4.7 ★ (42.1K đánh giá)",
        "06:00 - 18:00 (Chợ đêm đến 22:00)",
        "Miễn phí vé vào cổng",
        "Chợ Bến Thành với tháp đồng hồ cửa Nam hơn 100 năm tuổi, chứng nhân lịch sử cho sự phát triển sôi động và hào sảng của đô thị phương Nam.",
        "Chợ Bến Thành được khởi công xây dựng từ năm 1912 và hoàn thành vào năm 1914, là một trong những biểu tượng kiến trúc và văn hóa đặc trưng nhất của TP. Hồ Chí Minh. Nổi bật với tháp đồng hồ bốn mặt tại cửa Nam nhìn ra quảng trường Quách Thị Trang, ngôi chợ là chứng nhân lịch sử qua hơn một thế kỷ thăng trầm. Nơi đây là trung tâm giao thương sầm uất với hàng ngàn sạp hàng thủ công mỹ nghệ, lụa là thổ cẩm, và thiên đường ẩm thực Nam Bộ trứ danh.",
        json.dumps([
            "Tháp đồng hồ cửa Nam hơn 100 năm tuổi - Biểu tượng đô thị Sài Gòn",
            "Khu ẩm thực chợ truyền thống đậm đà phong vị Nam Bộ",
            "Chợ đêm Bến Thành sôi động lung linh ánh đèn sau hoàng hôn"
        ], ensure_ascii=False),
        "",
        "Chợ Bến Thành, Lê Lợi, Phường Bến Thành, Quận 1, TP Hồ Chí Minh",
        "assets/card-benthanh.jpg"
    ),
    (
        1, # card_id
        0, # target_index (TP. Hồ Chí Minh / Dinh Độc Lập)
        "Dinh Độc Lập",
        "Dấu mốc Thống nhất",
        "TP. Hồ Chí Minh",
        "#10b981", # Emerald
        "4.8 ★ (35.2K đánh giá)",
        "08:00 - 16:30 hàng ngày",
        "65.000 VNĐ / người lớn",
        "Dinh Độc Lập – Di tích Quốc gia Đặc biệt gắn liền với sự kiện lịch sử ngày 30/4/1975, mang kiến trúc hiện đại hài hòa triết lý phương Đông.",
        "Dinh Độc Lập (còn gọi là Dinh Thống Nhất) tọa lạc tại trung tâm Quận 1, TP.HCM, được thiết kế bởi kiến trúc sư tài hoa Ngô Viết Thụ. Công trình kết hợp hài hòa giữa triết lý kiến trúc phương Đông (chữ Cát, Khẩu, Trung, Chủ) và kiến trúc hiện đại phương Tây trên khuôn viên rợp bóng cây cổ thụ rộng 12 hecta, là chứng nhân cho ngày non sông thống nhất 30/4/1975.",
        json.dumps([
            "Chứng nhân lịch sử ngày toàn thắng 30/4/1975",
            "Kiến trúc phong thủy độc đáo kết hợp Đông - Tây của KTS Ngô Viết Thụ",
            "Hệ thống phòng khánh tiết nguy nga và hầm tác chiến ngầm kiên cố"
        ], ensure_ascii=False),
        "",
        "Dinh Độc Lập, Nam Kỳ Khởi Nghĩa, Phường Bến Thành, Quận 1, TP Hồ Chí Minh",
        "assets/target-0.png"
    ),
    (
        2, # card_id
        0, # target_index (TP. Hồ Chí Minh / Dinh Độc Lập)
        "Ẩm Thực & Nhịp Sống Đêm",
        "Nhịp sống Giao thoa",
        "TP. Hồ Chí Minh",
        "#06b6d4", # Cyan
        "4.9 ★ (51.8K đánh giá)",
        "Hoạt động 24/7 cả ngày lẫn đêm",
        "Tự do khám phá",
        "Nơi hội tụ tinh hoa ẩm thực khắp mọi miền đất nước, từ ly cà phê sữa đá vỉa hè đến những khu phố đêm không ngủ.",
        "Sài Gòn là đô thị không bao giờ ngủ, nơi văn hóa ẩm thực từ Bắc, Trung, Nam và quốc tế hội tụ tạo nên bản sắc độc nhất vô nhị. Từ trải nghiệm ngồi bệt thưởng thức ly cà phê sữa đá ngắm hoàng hôn, chén hủ tiếu gõ thơm lừng trong ngõ hẻm, đến bầu không khí rộn rã tại phố đi bộ Nguyễn Huệ hay phố đêm Bùi Viện, tất cả khắc họa nên một thành phố hào sảng, phóng khoáng và tràn đầy năng lượng sống.",
        json.dumps([
            "Văn hóa cà phê bệt và cà phê vợt đặc trưng người Sài Gòn",
            "Thiên đường ẩm thực đường phố: cơm tấm, hủ tiếu, bánh mì",
            "Những tuyến phố đêm sôi động, náo nhiệt không bao giờ ngủ"
        ], ensure_ascii=False),
        "",
        "Phố đi bộ Nguyễn Huệ, Bến Nghé, Quận 1, TP Hồ Chí Minh",
        "assets/card-saigon-life.jpg"
    ),
    (
        3, # card_id
        1, # target_index (Phố Cổ Hội An)
        "Phố Cổ Hội An",
        "Di sản Thế giới UNESCO",
        "Quảng Nam",
        "#f59e0b", # Amber
        "4.9 ★ (48.6K đánh giá)",
        "Mở cửa tự do cả ngày",
        "120.000 VNĐ / vé tham quan",
        "Đô thị cổ thương cảng thế kỷ 16-17 với những mái ngói rêu phong và đèn lồng rực rỡ bên sông Hoài.",
        "Phố Cổ Hội An từng là thương cảng quốc tế sầm uất bậc nhất châu Á thế kỷ 16-17, nơi giao thoa văn hóa Việt Nam, Nhật Bản, Trung Hoa và châu Âu. Nơi đây quyến rũ du khách bởi những dãy nhà cổ sơn vàng đặc trưng rợp hoa giấy, Chùa Cầu cổ kính và những đêm hội thả hoa đăng lung linh huyền ảo.",
        json.dumps([
            "Chùa Cầu Nhật Bản cổ kính hơn 400 năm tuổi",
            "Dãy nhà cổ tường vàng hoa giấy nguyên bản",
            "Đêm hội thả hoa đăng và đèn lồng lung linh ven sông Hoài"
        ], ensure_ascii=False),
        "",
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
    if force_reseed:
        cursor.execute("DROP TABLE IF EXISTS locations")
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS locations (
        id INTEGER PRIMARY KEY,
        target_index INTEGER DEFAULT 0,
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
    
    if count != len(CARDS_SEED) or force_reseed:
        cursor.execute("DELETE FROM locations")
        cursor.executemany("""
        INSERT INTO locations (
            id, target_index, name, tag, city, badge_color, rating,
            hours, ticket, short_desc, full_desc, highlights,
            audio_text, map_query, image_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, CARDS_SEED)
        conn.commit()
    conn.close()

def get_all_locations():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM locations ORDER BY id ASC")
    rows = cursor.fetchall()
    result = {}
    for r in rows:
        item = dict(r)
        try:
            item["highlights"] = json.loads(item["highlights"] or "[]")
        except:
            item["highlights"] = []
        result[str(item["id"])] = item
    conn.close()
    return result

def get_location_by_index(card_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM locations WHERE id = ?", (card_id,))
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

def get_cards_by_target(target_index):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM locations WHERE target_index = ? ORDER BY id ASC", (target_index,))
    rows = cursor.fetchall()
    conn.close()
    result = []
    for r in rows:
        item = dict(r)
        try:
            item["highlights"] = json.loads(item["highlights"] or "[]")
        except:
            item["highlights"] = []
        result.append(item)
    return result

def upsert_location(data):
    conn = get_connection()
    cursor = conn.cursor()
    
    highlights = data.get("highlights", [])
    if isinstance(highlights, list):
        highlights = json.dumps(highlights, ensure_ascii=False)
        
    card_id = int(data.get("id", data.get("target_index", 0)))
    cursor.execute("""
    INSERT INTO locations (
        id, target_index, name, tag, city, badge_color, rating,
        hours, ticket, short_desc, full_desc, highlights,
        audio_text, map_query, image_url
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
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
        card_id,
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
    return get_location_by_index(card_id)

if __name__ == "__main__":
    init_db(force_reseed=True)
    print("Database reseeded successfully! Locations count:", len(get_all_locations()))
