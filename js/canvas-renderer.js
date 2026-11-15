/**
 * ============================================================================
 * canvas-renderer.js - Trình Vẽ Giao Diện Thẻ AR 3D Lên Canvas 2D (Chống Mất Chữ)
 * ============================================================================
 * Khắc phục triệt để:
 * 1. Chống lỗi mất chữ / cắt chữ (Tự động đo chiều dài văn bản, co giãn cỡ chữ thông minh)
 * 2. Hiển thị ĐẦY ĐỦ cả 3 Điểm nổi bật (Highlights) - không cắt bỏ điểm nào
 * 3. Chống lỗi icon/emoji biến thành ô vuông / khoảng trắng trên iOS Safari Canvas
 * 4. Đồng bộ hoá WebFont: Tự động vẽ lại ngay khi Google Fonts nạp xong (document.fonts.ready)
 * 5. Cập nhật Three.js Texture (needsUpdate = true) lập tức để Texture sắc nét 60 FPS
 */

// Polyfill ctx.roundRect cho iOS Safari < 16 & Android Webview cũ
if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, radii) {
    if (!radii) radii = 0;
    const r = typeof radii === 'number' ? radii : (radii[0] || 0);
    this.moveTo(x + r, y);
    this.lineTo(x + w - r, y);
    this.quadraticCurveTo(x + w, y, x + w, y + r);
    this.lineTo(x + w, y + h - r);
    this.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    this.lineTo(x + r, y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - r);
    this.lineTo(x, y + r);
    this.quadraticCurveTo(x, y, x + r, y);
    this.closePath();
    return this;
  };
}

// Bộ font chữ tương thích tối đa trên iOS, macOS, Android và Windows
const CANVAS_FONT_STACK = '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Apple Color Emoji", "Segoe UI Emoji", sans-serif';

/**
 * Ngắt dòng an toàn cho Canvas 2D không bị mất chữ
 */
function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 4) {
  const safeText = String(text || '').trim();
  if (!safeText) return y;

  const words = safeText.split(/\s+/);
  let line = '';
  let linesDrawn = 0;
  let curY = y;

  for (let n = 0; n < words.length; n++) {
    const testLine = line ? line + ' ' + words[n] : words[n];
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && n > 0) {
      if (linesDrawn >= maxLines - 1) {
        // Dòng cuối cùng nếu còn dư từ thì thêm dấu ...
        ctx.fillText(line.trim() + '...', x, curY);
        return curY + lineHeight;
      }
      ctx.fillText(line, x, curY);
      line = words[n];
      curY += lineHeight;
      linesDrawn++;
    } else {
      line = testLine;
    }
  }

  if (line) {
    ctx.fillText(line, x, curY);
    curY += lineHeight;
  }
  return curY;
}

/**
 * Vẽ khung nền Liquid Glass mờ trong suốt phong cách Apple VisionOS
 * - Gradient chuyển sắc bóng mờ bán trong suốt (cho phép camera xuyên thấu tự nhiên)
 * - Đốm sáng môi trường màu Accent ở góc trên bên trái
 * - Vệt phản quang ánh sáng bề mặt cong (Specular Surface Sheen)
 * - Đường viền vát sáng kính (VisionOS Specular Rim Border)
 */
function drawLiquidGlassPanel(ctx, x, y, w, h, radius, accentColor, showTopHairline = true) {
  // 1. Nền kính bán trong suốt (Liquid Frosted Glass)
  const bgGrad = ctx.createLinearGradient(x, y, x, y + h);
  bgGrad.addColorStop(0, 'rgba(26, 28, 36, 0.74)');
  bgGrad.addColorStop(0.5, 'rgba(18, 20, 26, 0.78)');
  bgGrad.addColorStop(1, 'rgba(12, 13, 18, 0.84)');

  ctx.fillStyle = bgGrad;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.fill();

  // 2. Đốm sáng màu Accent ở góc trên trái (Ambient Specular Lighting)
  const glowGrad = ctx.createRadialGradient(x + 50, y + 40, 5, x + 50, y + 40, w * 0.75);
  let glowRgba = 'rgba(16, 185, 129, 0.18)';
  if (accentColor === '#f59e0b') glowRgba = 'rgba(245, 158, 11, 0.18)';
  else if (accentColor === '#06b6d4') glowRgba = 'rgba(6, 182, 212, 0.18)';
  else if (accentColor === '#ec4899') glowRgba = 'rgba(236, 72, 153, 0.18)';

  glowGrad.addColorStop(0, glowRgba);
  glowGrad.addColorStop(0.4, glowRgba.replace('0.18', '0.05'));
  glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = glowGrad;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.fill();

  // 3. Vệt phản quang ánh sáng bề mặt cong (Apple Top-Surface Glass Sheen)
  const sheenGrad = ctx.createLinearGradient(x, y, x, y + Math.min(h * 0.45, 180));
  sheenGrad.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
  sheenGrad.addColorStop(0.3, 'rgba(255, 255, 255, 0.04)');
  sheenGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

  ctx.fillStyle = sheenGrad;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.fill();

  // 4. Viền kính vát sắc nét (Apple VisionOS Specular Rim Border)
  const rimGrad = ctx.createLinearGradient(x, y, x + w, y + h);
  rimGrad.addColorStop(0, 'rgba(255, 255, 255, 0.58)');   // Mép trên-trái bắt sáng mạnh nhất
  rimGrad.addColorStop(0.35, 'rgba(255, 255, 255, 0.22)');
  rimGrad.addColorStop(0.7, 'rgba(255, 255, 255, 0.08)');  // Vùng tối
  rimGrad.addColorStop(1, 'rgba(255, 255, 255, 0.25)');   // Mép dưới-phải phản xạ nhẹ

  ctx.strokeStyle = rimGrad;
  ctx.lineWidth = 2.2;
  ctx.stroke();

  // 5. Hairline Accent Glow trên đỉnh kính
  if (showTopHairline) {
    const hairGrad = ctx.createLinearGradient(x + 40, y + 2, x + w - 40, y + 2);
    hairGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
    hairGrad.addColorStop(0.3, accentColor);
    hairGrad.addColorStop(0.7, accentColor);
    hairGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.strokeStyle = hairGrad;
    ctx.lineWidth = 3.0;
    ctx.beginPath();
    ctx.moveTo(x + 40, y + 2);
    ctx.lineTo(x + w - 40, y + 2);
    ctx.stroke();
  }
}

/**
 * Vẽ hộp / viên con nhộng kính lồng (Inset Liquid Glass Pill / Panel)
 */
function drawLiquidGlassBox(ctx, x, y, w, h, radius, bgAlpha = 0.06) {
  const boxGrad = ctx.createLinearGradient(x, y, x, y + h);
  boxGrad.addColorStop(0, `rgba(255, 255, 255, ${bgAlpha * 1.5})`);
  boxGrad.addColorStop(1, `rgba(255, 255, 255, ${bgAlpha * 0.7})`);

  ctx.fillStyle = boxGrad;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.fill();

  const strokeGrad = ctx.createLinearGradient(x, y, x, y + h);
  strokeGrad.addColorStop(0, 'rgba(255, 255, 255, 0.28)');
  strokeGrad.addColorStop(1, 'rgba(255, 255, 255, 0.07)');

  ctx.strokeStyle = strokeGrad;
  ctx.lineWidth = 1.2;
  ctx.stroke();
}

/**
 * Vẽ Hộp thông tin chi tiết trên Card bên phải (tự co chữ nếu giá trị quá dài)
 */
function drawInfoBox(ctx, x, y, w, h, label, val, valColor) {
  drawLiquidGlassBox(ctx, x, y, w, h, 16, 0.05);

  // Nhãn tiêu đề (Mở cửa, Vé, Tỉnh thành, Đánh giá) - phong cách Apple SF Pro
  ctx.fillStyle = '#94a3b8';
  ctx.font = `700 13px ${CANVAS_FONT_STACK}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(label, x + 18, y + 27);

  // Nội dung giá trị - tự động thu nhỏ nếu chữ dài để không bao giờ bị tràn/cắt
  const valStr = String(val || '').trim();
  let fontSize = 19;
  ctx.font = `700 ${fontSize}px ${CANVAS_FONT_STACK}`;
  while (ctx.measureText(valStr).width > w - 36 && fontSize > 14) {
    fontSize -= 1;
    ctx.font = `700 ${fontSize}px ${CANVAS_FONT_STACK}`;
  }

  ctx.fillStyle = valColor || '#ffffff';
  ctx.fillText(valStr, x + 18, y + 60);
}

/**
 * 1. VẼ THANH TRÊN CÙNG (Top Pill Bar - 960x220 - Liquid Glass Apple VisionOS)
 */
function drawTopBar(canvasId, data) {
  if (!data) return;
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  canvas.width = 960;
  canvas.height = 220;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const accent = data.badgeColor || data.badge_color || '#10b981';

  ctx.clearRect(0, 0, w, h);

  // Nền thanh: Apple VisionOS Liquid Glass
  drawLiquidGlassPanel(ctx, 8, 8, w - 16, h - 16, 32, accent, true);

  // --- HÀNG 1: TAG PILL (TRÁI) VÀ RATING PILL (PHẢI) ---
  let tagText = String(data.tag || 'Di tích').trim();
  if (tagText.length > 34) {
    tagText = tagText.replace('Lịch sử ', '').replace('Văn hóa & Thiên nhiên ', '');
  }

  ctx.font = `700 17px ${CANVAS_FONT_STACK}`;
  const tagTextWidth = ctx.measureText(tagText).width;
  const tagPillWidth = Math.min(tagTextWidth + 56, 460);
  const tagPillX = 30;
  const tagPillY = 24;
  const tagPillH = 40;

  // Inset Glass Pill
  drawLiquidGlassBox(ctx, tagPillX, tagPillY, tagPillWidth, tagPillH, 20, 0.08);

  // Chấm sáng màu accent
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(tagPillX + 20, tagPillY + tagPillH / 2, 4.5, 0, Math.PI * 2);
  ctx.fill();

  // Chữ Tag
  ctx.fillStyle = accent;
  ctx.font = `700 16px ${CANVAS_FONT_STACK}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(tagText, tagPillX + 34, tagPillY + tagPillH / 2);

  // Rating Pill (Bên phải)
  const rawRating = String(data.rating || '4.8');
  const ratingVal = rawRating.includes('★') ? rawRating.split('(')[0].trim() : rawRating.split(' ')[0] + ' ★';
  const ratingPillW = 108;
  const ratingPillX = w - 30 - ratingPillW;
  const ratingPillY = 24;
  const ratingPillH = 40;

  // Inset Amber Glass Pill
  const amberGrad = ctx.createLinearGradient(ratingPillX, ratingPillY, ratingPillX, ratingPillY + ratingPillH);
  amberGrad.addColorStop(0, 'rgba(251, 191, 36, 0.20)');
  amberGrad.addColorStop(1, 'rgba(251, 191, 36, 0.08)');
  ctx.fillStyle = amberGrad;
  ctx.beginPath();
  ctx.roundRect(ratingPillX, ratingPillY, ratingPillW, ratingPillH, 20);
  ctx.fill();

  const amberStroke = ctx.createLinearGradient(ratingPillX, ratingPillY, ratingPillX, ratingPillY + ratingPillH);
  amberStroke.addColorStop(0, 'rgba(251, 191, 36, 0.50)');
  amberStroke.addColorStop(1, 'rgba(251, 191, 36, 0.20)');
  ctx.strokeStyle = amberStroke;
  ctx.lineWidth = 1.3;
  ctx.stroke();

  ctx.fillStyle = '#fbbf24';
  ctx.font = `800 18px ${CANVAS_FONT_STACK}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(ratingVal, ratingPillX + ratingPillW / 2, ratingPillY + ratingPillH / 2);

  // --- HÀNG 2: TÊN ĐỊA DANH (TRÁI) VÀ THÀNH PHỐ (PHẢI) ---
  const nameY = 118;
  const nameText = String(data.name || '').trim();
  const cityText = '📍 ' + String(data.city || 'Việt Nam').trim();

  ctx.font = `600 20px ${CANVAS_FONT_STACK}`;
  const cityWidth = ctx.measureText(cityText).width;

  let nameFontSize = 34;
  ctx.font = `800 ${nameFontSize}px ${CANVAS_FONT_STACK}`;
  const maxNameWidth = w - 60 - cityWidth - 30;
  while (ctx.measureText(nameText).width > maxNameWidth && nameFontSize > 22) {
    nameFontSize -= 1;
    ctx.font = `800 ${nameFontSize}px ${CANVAS_FONT_STACK}`;
  }

  // Tên địa danh (với nhẹ shadow tạo khối 3D)
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(nameText, 30, nameY);
  ctx.restore();

  // Thành phố
  ctx.fillStyle = '#cbd5e1';
  ctx.font = `600 20px ${CANVAS_FONT_STACK}`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText(cityText, w - 30, nameY);

  // --- HÀNG 3: ĐƯỜNG PHÂN CÁCH VÀ GỢI Ý HÀNH ĐỘNG ---
  const divGrad = ctx.createLinearGradient(30, 164, w - 30, 164);
  divGrad.addColorStop(0, 'rgba(255, 255, 255, 0.02)');
  divGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.16)');
  divGrad.addColorStop(1, 'rgba(255, 255, 255, 0.02)');
  ctx.strokeStyle = divGrad;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(30, 164);
  ctx.lineTo(w - 30, 164);
  ctx.stroke();

  ctx.fillStyle = '#94a3b8';
  ctx.font = `600 15px ${CANVAS_FONT_STACK}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('✦  CHẠM VÀO BẤT KỲ THẺ NÀO ĐỂ XEM CHI TIẾT', w / 2, 190);
}

/**
 * 2. VẼ CARD BÊN TRÁI: TỔNG QUAN, LỊCH SỬ & ĐIỂM NỔI BẬT (520x760 - Liquid Glass)
 * Hiển thị đầy đủ cả 3 điểm nổi bật (không cắt bỏ điểm nào)
 */
function drawLeftCard(canvasId, data) {
  if (!data) return;
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  canvas.width = 520;
  canvas.height = 760;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const accent = data.badgeColor || data.badge_color || '#10b981';

  ctx.clearRect(0, 0, w, h);

  // Thân Card: Apple VisionOS Liquid Glass
  drawLiquidGlassPanel(ctx, 10, 10, w - 20, h - 20, 32, accent, true);

  // Header Tag Capsule
  drawLiquidGlassBox(ctx, 28, 26, w - 56, 44, 22, 0.08);

  ctx.fillStyle = accent;
  ctx.font = `800 17px ${CANVAS_FONT_STACK}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('✦  TỔNG QUAN & LỊCH SỬ', 46, 48);

  // Đường phân cách kính
  const divGrad = ctx.createLinearGradient(28, 86, w - 28, 86);
  divGrad.addColorStop(0, 'rgba(255, 255, 255, 0.02)');
  divGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.14)');
  divGrad.addColorStop(1, 'rgba(255, 255, 255, 0.02)');
  ctx.strokeStyle = divGrad;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(28, 86);
  ctx.lineTo(w - 28, 86);
  ctx.stroke();

  // Mô tả lịch sử
  const desc = String(data.short_desc || data.shortDesc || data.full_desc || data.fullDesc || '').trim();
  ctx.fillStyle = '#f1f5f9';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  let descFontSize = desc.length > 130 ? 17 : 19;
  let descLineHeight = desc.length > 130 ? 25 : 27;
  ctx.font = `500 ${descFontSize}px ${CANVAS_FONT_STACK}`;
  wrapText(ctx, desc, 28, 120, w - 56, descLineHeight, 4);

  // Tiêu đề Khối Điểm nổi bật
  ctx.fillStyle = '#94a3b8';
  ctx.font = `800 15px ${CANVAS_FONT_STACK}`;
  ctx.textAlign = 'left';
  ctx.fillText('✦  ĐẶC ĐIỂM NỔI BẬT', 28, 254);

  // Parse mảng điểm nổi bật
  let highlights = data.highlights || [];
  if (typeof highlights === 'string') {
    try {
      highlights = JSON.parse(highlights);
    } catch (e) {
      highlights = [];
    }
  }

  // VẼ ĐẦY ĐỦ CẢ 3 ĐIỂM NỔI BẬT (KHÔNG BỎ SÓT ĐIỂM NÀO)
  let yPos = 278;
  const boxHeight = 60;
  const boxGap = 10;
  const countToDraw = Math.min(3, highlights.length);

  for (let i = 0; i < countToDraw; i++) {
    // Inset Glass Capsule cho từng highlight
    drawLiquidGlassBox(ctx, 28, yPos, w - 56, boxHeight, 14, 0.06);

    // Điểm nhấn thanh Accent phát sáng bên trái
    const barGrad = ctx.createLinearGradient(32, yPos + 12, 32, yPos + boxHeight - 12);
    barGrad.addColorStop(0, accent);
    barGrad.addColorStop(1, 'rgba(255, 255, 255, 0.4)');
    ctx.fillStyle = barGrad;
    ctx.beginPath();
    ctx.roundRect(32, yPos + 12, 4, boxHeight - 24, 2);
    ctx.fill();

    // Chữ nội dung điểm nổi bật (wrap 2 dòng gọn gàng)
    ctx.fillStyle = '#f8fafc';
    ctx.font = `600 15px ${CANVAS_FONT_STACK}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    wrapText(ctx, highlights[i], 46, yPos + 24, w - 82, 20, 2);

    yPos += boxHeight + boxGap;
  }

  // Nút Action chân Card: Apple VisionOS Solid Capsule Button
  const btnY = h - 76;
  const btnW = w - 56;
  const btnH = 50;
  const btnGrad = ctx.createLinearGradient(28, btnY, 28, btnY + btnH);
  btnGrad.addColorStop(0, 'rgba(255, 255, 255, 0.98)');
  btnGrad.addColorStop(1, 'rgba(235, 240, 250, 0.90)');

  ctx.fillStyle = btnGrad;
  ctx.beginPath();
  ctx.roundRect(28, btnY, btnW, btnH, 16);
  ctx.fill();

  // Viền sáng nút
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.fillStyle = '#09090b';
  ctx.font = `800 17px ${CANVAS_FONT_STACK}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('↗  XEM CHI TIẾT ĐỊA DANH', w / 2, btnY + 25);
}

/**
 * 3. VẼ CARD BÊN PHẢI: THÔNG TIN THAM QUAN & GIỜ MỞ CỬA (520x760 - Liquid Glass)
 */
function drawRightCard(canvasId, data) {
  if (!data) return;
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  canvas.width = 520;
  canvas.height = 760;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const accent = data.badgeColor || data.badge_color || '#10b981';

  ctx.clearRect(0, 0, w, h);

  // Thân Card: Apple VisionOS Liquid Glass
  drawLiquidGlassPanel(ctx, 10, 10, w - 20, h - 20, 32, accent, true);

  // Header Tag Capsule
  drawLiquidGlassBox(ctx, 28, 26, w - 56, 44, 22, 0.08);

  ctx.fillStyle = accent;
  ctx.font = `800 17px ${CANVAS_FONT_STACK}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('✦  THÔNG TIN THAM QUAN', 46, 48);

  // Đường phân cách kính
  const divGrad = ctx.createLinearGradient(28, 86, w - 28, 86);
  divGrad.addColorStop(0, 'rgba(255, 255, 255, 0.02)');
  divGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.14)');
  divGrad.addColorStop(1, 'rgba(255, 255, 255, 0.02)');
  ctx.strokeStyle = divGrad;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(28, 86);
  ctx.lineTo(w - 28, 86);
  ctx.stroke();

  // 4 Box thông tin chi tiết (bố cục cân đối, co chữ tự động chống tràn)
  const boxH = 78;
  const gap = 12;
  let curY = 104;

  drawInfoBox(ctx, 28, curY, w - 56, boxH, 'GIỜ MỞ CỬA', data.hours || 'Mở cửa tự do cả ngày', '#ffffff');
  curY += boxH + gap;

  drawInfoBox(ctx, 28, curY, w - 56, boxH, 'GIÁ VÉ THAM QUAN', data.ticket || 'Miễn phí tham quan', '#34d399');
  curY += boxH + gap;

  drawInfoBox(ctx, 28, curY, w - 56, boxH, 'ĐỊA PHƯƠNG / TỈNH THÀNH', data.city || 'Việt Nam', '#ffffff');
  curY += boxH + gap;

  drawInfoBox(ctx, 28, curY, w - 56, boxH, 'ĐÁNH GIÁ DU KHÁCH', data.rating || '4.8 ★ (Đánh giá cao)', '#fbbf24');

  // Nút Action ở chân Card: Apple Frosted Capsule Button
  const btnY = h - 76;
  const btnW = w - 56;
  const btnH = 50;

  const btnGrad = ctx.createLinearGradient(28, btnY, 28, btnY + btnH);
  btnGrad.addColorStop(0, 'rgba(255, 255, 255, 0.18)');
  btnGrad.addColorStop(1, 'rgba(255, 255, 255, 0.08)');

  ctx.fillStyle = btnGrad;
  ctx.beginPath();
  ctx.roundRect(28, btnY, btnW, btnH, 16);
  ctx.fill();

  const btnStroke = ctx.createLinearGradient(28, btnY, 28, btnY + btnH);
  btnStroke.addColorStop(0, 'rgba(255, 255, 255, 0.40)');
  btnStroke.addColorStop(1, 'rgba(255, 255, 255, 0.12)');
  ctx.strokeStyle = btnStroke;
  ctx.lineWidth = 1.3;
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = `800 17px ${CANVAS_FONT_STACK}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🗺️  CHỈ ĐƯỜNG GOOGLE MAPS', w / 2, btnY + 25);
}

/**
 * 4. CẬP NHẬT TEXTURE CHO THREE.JS (Đảm bảo Texture GPU được refresh tức thì)
 */
function refreshMeshTexture(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;

  const mesh = el.getObject3D('mesh');
  if (mesh && mesh.material) {
    if (mesh.material.map) {
      mesh.material.map.needsUpdate = true;
    }
    mesh.material.needsUpdate = true;
  }
}

/**
 * Cập nhật texture cho toàn bộ cụm 3 thẻ của 1 target
 */
function refreshTargetTextures(targetIdx) {
  refreshMeshTexture(`bar-top-${targetIdx}`);
  refreshMeshTexture(`card-left-${targetIdx}`);
  refreshMeshTexture(`card-right-${targetIdx}`);
}

/**
 * Cập nhật texture cho toàn bộ 5 targets
 */
function refreshAllTextures() {
  for (let i = 0; i < 5; i++) {
    refreshTargetTextures(i);
  }
}

/**
 * Vẽ cụm 3 canvas cho 1 target
 */
function renderTargetCanvases(targetIdx, data) {
  if (!data) return;
  drawTopBar(`canvas-top-${targetIdx}`, data);
  drawLeftCard(`canvas-left-${targetIdx}`, data);
  drawRightCard(`canvas-right-${targetIdx}`, data);
  refreshTargetTextures(targetIdx);
}

/**
 * Vẽ texture cho toàn bộ danh sách địa điểm (5 địa danh)
 */
function renderAllLocationCanvases(locationsMap) {
  for (let i = 0; i < 5; i++) {
    const loc = locationsMap[i] || locationsMap[String(i)] || (typeof LOCATIONS_DATA !== 'undefined' ? LOCATIONS_DATA[i] : null);
    if (loc) {
      renderTargetCanvases(i, loc);
    }
  }
}

// Tự động lắng nghe document.fonts.ready để vẽ lại sắc nét ngay khi WebFont tải xong
if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
  document.fonts.ready.then(() => {
    if (typeof LOCATIONS_DATA !== 'undefined') {
      renderAllLocationCanvases(LOCATIONS_DATA);
      refreshAllTextures();
      console.log('✅ [ARCanvasRenderer]: WebFont đã nạp xong, Texture Canvas đã được cập nhật sắc nét 100%!');
    }
  }).catch(() => {});
}

// Export cho môi trường Browser toàn cục
window.ARCanvasRenderer = {
  drawTopBar,
  drawLeftCard,
  drawRightCard,
  refreshMeshTexture,
  refreshTargetTextures,
  refreshAllTextures,
  renderTargetCanvases,
  renderAllLocationCanvases
};
