import sqlite3
import json
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "database.sqlite")

CARDS_SEED = [
    (
        0, 0, "Dinh Độc Lập", "Di tích Lịch sử Quốc gia Đặc biệt", "TP. Hồ Chí Minh",
        "#10b981", "4.8 ★ (35.2K đánh giá)", "08:00 - 16:30 hàng ngày", "65.000 VNĐ / người lớn",
        "Chứng nhân lịch sử thiêng liêng gắn liền với mốc son thống nhất đất nước ngày 30/4/1975, mang kiến trúc hiện đại hài hòa triết lý phương Đông.",
        "Dinh Độc Lập (còn gọi là Dinh Thống Nhất) tọa lạc tại trung tâm Quận 1, TP.HCM, được thiết kế bởi kiến trúc sư tài hoa Ngô Viết Thụ. Công trình kết hợp hài hòa giữa triết lý kiến trúc phương Đông (chữ Cát, Khẩu, Trung, Chủ) và kiến trúc hiện đại phương Tây trên khuôn viên rợp bóng cây cổ thụ rộng 12 hecta, là chứng nhân cho ngày non sông thống nhất 30/4/1975.",
        json.dumps(["Chứng nhân lịch sử ngày toàn thắng 30/4/1975", "Kiến trúc phong thủy phương Đông độc đáo của KTS Ngô Viết Thụ", "Hệ thống phòng khánh tiết nguy nga và hầm tác chiến ngầm kiên cố"], ensure_ascii=False),
        "", "Dinh Độc Lập, Nam Kỳ Khởi Nghĩa, Phường Bến Thành, Quận 1, TP Hồ Chí Minh", "assets/target-0.png"
    ),
    (
        1, 1, "Phố Cổ Hội An", "Di sản Văn hóa Thế giới UNESCO", "Quảng Nam",
        "#f59e0b", "4.9 ★ (48.6K đánh giá)", "Mở cửa tự do cả ngày", "120.000 VNĐ / vé tham quan",
        "Đô thị cổ thương cảng thế kỷ 16-17 với những mái ngói rêu phong và đèn lồng rực rỡ bên sông Hoài.",
        "Phố Cổ Hội An từng là thương cảng quốc tế sầm uất bậc nhất châu Á thế kỷ 16-17, nơi giao thoa văn hóa Việt Nam, Nhật Bản, Trung Hoa và châu Âu. Nơi đây quyến rũ du khách bởi những dãy nhà cổ sơn vàng đặc trưng rợp hoa giấy, Chùa Cầu cổ kính và những đêm hội thả hoa đăng lung linh huyền ảo.",
        json.dumps(["Chùa Cầu Nhật Bản cổ kính hơn 400 năm tuổi", "Dãy nhà cổ tường vàng hoa giấy nguyên bản", "Đêm hội thả hoa đăng và đèn lồng lung linh ven sông Hoài"], ensure_ascii=False),
        "", "Phố cổ Hội An, Quảng Nam", "assets/target-1.png"
    ),
    (
        2, 2, "Chợ Bến Thành", "Biểu tượng Sài Gòn", "TP. Hồ Chí Minh",
        "#f59e0b", "4.7 ★ (42.1K đánh giá)", "06:00 - 18:00 (Chợ đêm đến 22:00)", "Miễn phí vé vào cổng",
        "Chợ Bến Thành với tháp đồng hồ cửa Nam hơn 100 năm tuổi, chứng nhân lịch sử cho sự phát triển sôi động và hào sảng của đô thị phương Nam.",
        "Chợ Bến Thành được khởi công xây dựng từ năm 1912 và hoàn thành vào năm 1914, là một trong những biểu tượng kiến trúc và văn hóa đặc trưng nhất của TP. Hồ Chí Minh. Nổi bật với tháp đồng hồ bốn mặt tại cửa Nam nhìn ra quảng trường Quách Thị Trang, ngôi chợ là trung tâm giao thương sầm uất với hàng ngàn sạp hàng thủ công mỹ nghệ, lụa là thổ cẩm, và thiên đường ẩm thực Nam Bộ trứ danh.",
        json.dumps(["Tháp đồng hồ cửa Nam hơn 100 năm tuổi cổ kính", "Khu ẩm thực chợ truyền thống đậm đà phong vị Nam Bộ", "Chợ đêm Bến Thành sôi động lung linh ánh đèn sau hoàng hôn"], ensure_ascii=False),
        "", "Chợ Bến Thành, Lê Lợi, Phường Bến Thành, Quận 1, TP Hồ Chí Minh", "assets/card-benthanh.jpg"
    ),
    (
        3, 3, "Hồ Hoàn Kiếm & Tháp Rùa", "Trái tim Thủ đô Ngàn năm", "Hà Nội",
        "#06b6d4", "4.9 ★ (62.3K đánh giá)", "Mở cửa tự do cả ngày", "Miễn phí tham quan",
        "Trái tim văn hóa nghìn năm văn hiến gắn liền truyền thuyết vua Lê Lợi trả gươm báu cho Rùa Thần.",
        "Hồ Hoàn Kiếm (Hồ Gươm) là biểu tượng lịch sử, văn hóa ngàn năm của thủ đô Hà Nội. Nổi bật giữa làn nước xanh lục thủy là Tháp Rùa cổ kính, cầu Thê Húc đỏ son dẫn vào Đền Ngọc Sơn uy nghiêm và Tháp Bút khắc chữ 'Tả Thanh Thiên'. Không gian hồ là nơi hội tụ tinh hoa nếp sống thanh lịch của người Tràng An.",
        json.dumps(["Tháp Rùa cổ kính giữa làn nước biếc xanh ngọc", "Cầu Thê Húc đỏ son uốn cong dẫn vào Đền Ngọc Sơn", "Phố đi bộ Hồ Gươm sôi động vào những ngày cuối tuần"], ensure_ascii=False),
        "", "Hồ Hoàn Kiếm, Hàng Trống, Hoàn Kiếm, Hà Nội", "assets/card-hanoi.jpg"
    ),
    (
        4, 4, "Cầu Vàng Bà Nà Hills", "Kỳ quan Kiến trúc Hiện đại", "Đà Nẵng",
        "#f59e0b", "4.8 ★ (54.1K đánh giá)", "08:00 - 18:00 hàng ngày", "Theo vé tham quan Bà Nà Hills",
        "Kiến trúc đôi bàn tay khổng lồ phủ rêu phong nâng đỡ dải lụa vàng giữa mây trời đỉnh núi Chúa.",
        "Tọa lạc ở độ cao hơn 1.400 mét so với mực nước biển trên đỉnh Bà Nà, Cầu Vàng là kiệt tác kiến trúc được truyền thông quốc tế ca ngợi là một trong những cây cầu đi bộ ngoạn mục nhất thế giới. Cây cầu dài gần 150m như một dải lụa vàng óng ả vắt qua đôi bàn tay phủ rêu phong của thần núi giữa biển mây bồng bềnh.",
        json.dumps(["Kiến trúc đôi bàn tay khổng lồ vươn giữa mây trời", "Tầm nhìn ôm trọn phong cảnh núi rừng hùng vĩ của Đà Nẵng", "Biểu tượng check-in du lịch nổi danh toàn cầu"], ensure_ascii=False),
        "", "Cầu Vàng, Bà Nà Hills, Hòa Vang, Đà Nẵng", "assets/gallery-danang.jpg"
    ),
    (
        5, 5, "Vịnh Hạ Long", "Di sản Thiên nhiên Thế giới", "Quảng Ninh",
        "#10b981", "4.9 ★ (78.9K đánh giá)", "Mở cửa các tuyến tàu du lịch cả ngày", "290.000 VNĐ / vé tham quan vịnh",
        "Kỳ quan thiên nhiên thế giới UNESCO với hàng ngàn đảo đá vôi tráng lệ nhô lên từ làn nước ngọc bích.",
        "Vịnh Hạ Long sở hữu gần 2.000 hòn đảo đá vôi lớn nhỏ kiến tạo qua hàng triệu năm phong hóa. Du khách đến đây được trải nghiệm du thuyền len lỏi qua những hang động thạch nhũ huyền ảo như Hang Sửng Sốt, Động Thiên Cung, chiêm ngưỡng làng chài nổi và ngắm hoàng hôn rực rỡ buông xuống mặt biển bao la.",
        json.dumps(["Hàng ngàn hòn đảo đá vôi kỳ vĩ muôn hình vạn trạng", "Hệ thống hang động thạch nhũ lung linh huyền bí", "Trải nghiệm du thuyền ngắm hoàng hôn vịnh biển tráng lệ"], ensure_ascii=False),
        "", "Vịnh Hạ Long, Thành phố Hạ Long, Quảng Ninh", "assets/gallery-halong.jpg"
    ),
    (
        6, 6, "Đại Nội Kinh Thành Huế", "Quần thể Di tích Cố đô UNESCO", "Thừa Thiên Huế",
        "#f59e0b", "4.8 ★ (39.5K đánh giá)", "07:30 - 17:30 hàng ngày", "200.000 VNĐ / người lớn",
        "Trung tâm quyền lực của triều đại phong kiến cuối cùng tại Việt Nam với hệ thống cung điện, thành quách nguy nga.",
        "Đại Nội Huế bao gồm Hoàng Thành và Tử Cấm Thành, được xây dựng dưới triều vua Gia Long từ năm 1804. Quần thể là đỉnh cao của nghệ thuật kiến trúc cung đình triều Nguyễn với cổng Ngọ Môn sừng sững, Điện Thái Hòa dát vàng lộng lẫy và Thái Miếu thâm nghiêm bên dòng sông Hương êm đềm.",
        json.dumps(["Cổng Ngọ Môn và Điện Thái Hòa kiến trúc hoàng gia đỉnh cao", "Di sản Nhã nhạc Cung đình Huế trứ danh", "Không gian cổ kính trầm mặc đượm vẻ hoài niệm Cố đô"], ensure_ascii=False),
        "", "Đại Nội Huế, Phú Hậu, Thành phố Huế, Thừa Thiên Huế", "assets/card-hue.jpg"
    ),
    (
        7, 7, "Đảo Ngọc Phú Quốc", "Thiên đường Nghỉ dưỡng Biển Đảo", "Kiên Giang",
        "#06b6d4", "4.8 ★ (67.4K đánh giá)", "Mở cửa tự do quanh năm", "Tự do trải nghiệm",
        "Hòn đảo lớn nhất Việt Nam với những bãi cát trắng mịn màng, làn nước pha lê và hoàng hôn lộng lẫy bậc nhất.",
        "Phú Quốc được mệnh danh là Đảo Ngọc nhờ cảnh sắc thiên nhiên hoang sơ tuyệt mỹ: từ Bãi Sao với bãi cát trắng như kem, Bãi Dài hoang sơ đến làng chài Hàm Ninh mộc mạc. Nơi đây là điểm đến nghỉ dưỡng cao cấp với những khu bảo tồn san hô rực rỡ và thiên đường ẩm thực hải sản phong phú.",
        json.dumps(["Bãi cát trắng mịn nước xanh pha lê ngắm hoàng hôn", "Lặn ngắm rạn san hô tự nhiên rực rỡ sắc màu", "Thiên đường hải sản tươi sống và chợ đêm sôi động"], ensure_ascii=False),
        "", "Đảo Phú Quốc, Kiên Giang", "assets/card-phuquoc.jpg"
    ),
    (
        8, 8, "Ẩm Thực & Nhịp Sống Đêm", "Nhịp sống Đô thị Phương Nam", "TP. Hồ Chí Minh",
        "#06b6d4", "4.9 ★ (51.8K đánh giá)", "Hoạt động 24/7 cả ngày lẫn đêm", "Tự do trải nghiệm",
        "Nơi hội tụ tinh hoa ẩm thực khắp mọi miền đất nước, từ ly cà phê sữa đá vỉa hè đến những khu phố đêm không ngủ.",
        "Sài Gòn là đô thị không bao giờ ngủ, nơi văn hóa ẩm thực từ Bắc, Trung, Nam và quốc tế hội tụ tạo nên bản sắc độc nhất vô nhị. Từ trải nghiệm ngồi bệt thưởng thức ly cà phê sữa đá ngắm hoàng hôn, chén hủ tiếu gõ thơm lừng trong ngõ hẻm, đến bầu không khí rộn rã tại phố đi bộ Nguyễn Huệ hay phố đêm Bùi Viện, tất cả khắc họa nên một thành phố hào sảng, phóng khoáng và tràn đầy năng lượng sống.",
        json.dumps(["Văn hóa cà phê bệt và cà phê vợt đặc trưng người Sài Gòn", "Thiên đường ẩm thực đường phố: cơm tấm, hủ tiếu, bánh mì", "Những tuyến phố đêm sôi động, náo nhiệt không bao giờ ngủ"], ensure_ascii=False),
        "", "Phố đi bộ Nguyễn Huệ, Bến Nghé, Quận 1, TP Hồ Chí Minh", "assets/card-saigon-life.jpg"
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
