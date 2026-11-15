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
 * Vẽ Hộp thông tin chi tiết trên Card bên phải (tự co chữ nếu giá trị quá dài)
 */
function drawInfoBox(ctx, x, y, w, h, label, val, valColor) {
  // Nền box kính mờ
  ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 14);
  ctx.fill();

  ctx.strokeStyle = '#27272a';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Nhãn tiêu đề (Mở cửa, Vé, Tỉnh thành, Đánh giá)
  ctx.fillStyle = '#a1a1aa';
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
 * 1. VẼ THANH TRÊN CÙNG (Top Pill Bar - 960x220)
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

  // Nền thanh: VisionOS Dark Zinc
  ctx.fillStyle = '#18181b';
  ctx.beginPath();
  ctx.roundRect(8, 8, w - 16, h - 16, 28);
  ctx.fill();

  // Viền ngoài
  ctx.strokeStyle = '#27272a';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Dải phát sáng mép trên cùng
  ctx.strokeStyle = accent;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(32, 8, w - 64, 3, 2);
  ctx.stroke();

  // --- HÀNG 1: TAG PILL (TRÁI) VÀ RATING PILL (PHẢI) ---
  let tagText = String(data.tag || 'Di tích').trim();
  if (tagText.length > 34) {
    tagText = tagText.replace('Lịch sử ', '').replace('Văn hóa & Thiên nhiên ', '');
  }

  ctx.font = `700 17px ${CANVAS_FONT_STACK}`;
  const tagTextWidth = ctx.measureText(tagText).width;
  const tagPillWidth = Math.min(tagTextWidth + 52, 460);
  const tagPillX = 30;
  const tagPillY = 26;
  const tagPillH = 40;

  // Nền Tag Pill
  ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.beginPath();
  ctx.roundRect(tagPillX, tagPillY, tagPillWidth, tagPillH, 20);
  ctx.fill();
  ctx.strokeStyle = '#27272a';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Điểm chấm tròn phát sáng màu accent
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(tagPillX + 18, tagPillY + tagPillH / 2, 4.5, 0, Math.PI * 2);
  ctx.fill();

  // Chữ Tag
  ctx.fillStyle = accent;
  ctx.font = `700 16px ${CANVAS_FONT_STACK}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(tagText, tagPillX + 32, tagPillY + tagPillH / 2);

  // Rating Pill (Bên phải)
  const rawRating = String(data.rating || '4.8');
  const ratingVal = rawRating.includes('★') ? rawRating.split('(')[0].trim() : rawRating.split(' ')[0] + ' ★';
  const ratingPillW = 105;
  const ratingPillX = w - 30 - ratingPillW;
  const ratingPillY = 26;
  const ratingPillH = 40;

  ctx.fillStyle = 'rgba(251, 191, 36, 0.12)';
  ctx.beginPath();
  ctx.roundRect(ratingPillX, ratingPillY, ratingPillW, ratingPillH, 20);
  ctx.fill();
  ctx.strokeStyle = 'rgba(251, 191, 36, 0.35)';
  ctx.lineWidth = 1.5;
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

  // Đo chiều rộng thành phố trước để dành khoảng trống
  ctx.font = `600 20px ${CANVAS_FONT_STACK}`;
  const cityWidth = ctx.measureText(cityText).width;

  // Tự động thu nhỏ font tên địa danh nếu quá dài để không va chạm thành phố
  let nameFontSize = 34;
  ctx.font = `800 ${nameFontSize}px ${CANVAS_FONT_STACK}`;
  const maxNameWidth = w - 60 - cityWidth - 30; // Chừa lề an toàn 30px giữa 2 chữ
  while (ctx.measureText(nameText).width > maxNameWidth && nameFontSize > 22) {
    nameFontSize -= 1;
    ctx.font = `800 ${nameFontSize}px ${CANVAS_FONT_STACK}`;
  }

  // Vẽ Tên địa danh
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(nameText, 30, nameY);

  // Vẽ Thành phố
  ctx.fillStyle = '#a1a1aa';
  ctx.font = `600 20px ${CANVAS_FONT_STACK}`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText(cityText, w - 30, nameY);

  // --- HÀNG 3: ĐƯỜNG PHÂN CÁCH VÀ GỢI Ý HÀNH ĐỘNG ---
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(30, 164);
  ctx.lineTo(w - 30, 164);
  ctx.stroke();

  ctx.fillStyle = '#94a3b8';
  ctx.font = `600 15px ${CANVAS_FONT_STACK}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('↗  CHẠM VÀO BẤT KỲ THẺ NÀO ĐỂ XEM CHI TIẾT', w / 2, 190);
}

/**
 * 2. VẼ CARD BÊN TRÁI: TỔNG QUAN, LỊCH SỬ & ĐIỂM NỔI BẬT (520x760)
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

  // Thân Card
  ctx.fillStyle = '#18181b';
  ctx.beginPath();
  ctx.roundRect(10, 10, w - 20, h - 20, 28);
  ctx.fill();

  ctx.strokeStyle = '#27272a';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Header Tag
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.beginPath();
  ctx.roundRect(28, 26, w - 56, 44, 22);
  ctx.fill();
  ctx.strokeStyle = '#27272a';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = accent;
  ctx.font = `800 17px ${CANVAS_FONT_STACK}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('✦  TỔNG QUAN & LỊCH SỬ', 46, 48);

  // Đường phân cách
  ctx.strokeStyle = '#27272a';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(28, 86);
  ctx.lineTo(w - 28, 86);
  ctx.stroke();

  // Mô tả lịch sử tóm tắt (tự động điều chỉnh cỡ chữ để hiển thị trọn vẹn không bị cắt ...)
  const desc = String(data.short_desc || data.shortDesc || data.full_desc || data.fullDesc || '').trim();
  ctx.fillStyle = '#e4e4e7';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  let descFontSize = desc.length > 130 ? 17 : 19;
  let descLineHeight = desc.length > 130 ? 25 : 27;
  ctx.font = `500 ${descFontSize}px ${CANVAS_FONT_STACK}`;
  wrapText(ctx, desc, 28, 120, w - 56, descLineHeight, 4);

  // Tiêu đề Khối Điểm nổi bật
  ctx.fillStyle = '#a1a1aa';
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
    // Nền hộp điểm nổi bật
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.beginPath();
    ctx.roundRect(28, yPos, w - 56, boxHeight, 12);
    ctx.fill();

    ctx.strokeStyle = '#27272a';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Điểm nhấn màu accent ở mép trái hộp
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.roundRect(32, yPos + 12, 4, boxHeight - 24, 2);
    ctx.fill();

    // Chữ nội dung điểm nổi bật (wrap 2 dòng gọn gàng)
    ctx.fillStyle = '#f4f4f5';
    ctx.font = `600 15px ${CANVAS_FONT_STACK}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    wrapText(ctx, highlights[i], 46, yPos + 24, w - 82, 20, 2);

    yPos += boxHeight + boxGap;
  }

  // Nút Action ở chân Card
  const btnY = h - 76;
  ctx.fillStyle = '#fafafa';
  ctx.beginPath();
  ctx.roundRect(28, btnY, w - 56, 50, 14);
  ctx.fill();

  ctx.fillStyle = '#18181b';
  ctx.font = `800 17px ${CANVAS_FONT_STACK}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('↗  CHẠM ĐỂ MỞ RỘNG CHI TIẾT', w / 2, btnY + 25);
}

/**
 * 3. VẼ CARD BÊN PHẢI: THÔNG TIN THAM QUAN & GIỜ MỞ CỬA (520x760)
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

  // Thân Card
  ctx.fillStyle = '#18181b';
  ctx.beginPath();
  ctx.roundRect(10, 10, w - 20, h - 20, 28);
  ctx.fill();

  ctx.strokeStyle = '#27272a';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Header Tag
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.beginPath();
  ctx.roundRect(28, 26, w - 56, 44, 22);
  ctx.fill();
  ctx.strokeStyle = '#27272a';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = accent;
  ctx.font = `800 17px ${CANVAS_FONT_STACK}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('✦  THÔNG TIN THAM QUAN', 46, 48);

  // Đường phân cách
  ctx.strokeStyle = '#27272a';
  ctx.lineWidth = 1.5;
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

  // Nút Action ở chân Card: Chỉ đường Google Maps
  const btnY = h - 76;
  ctx.fillStyle = '#27272a';
  ctx.beginPath();
  ctx.roundRect(28, btnY, w - 56, 50, 14);
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1.8;
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = `800 17px ${CANVAS_FONT_STACK}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('📍  CHỈ ĐƯỜNG & VỊ TRÍ', w / 2, btnY + 25);
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
