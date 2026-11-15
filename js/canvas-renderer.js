/**
 * ============================================================================
 * canvas-renderer.js - Trình Vẽ Giao Diện Thẻ AR 3D Lên Canvas 2D
 * ============================================================================
 * Chức năng:
 * - Vẽ Texture độ phân giải cao cho Cụm Thẻ AR 3D (Thanh trên + 2 Thẻ hai bên)
 * - Tự động ngắt dòng văn bản tiếng Việt an toàn (wrapText)
 * - Cập nhật Three.js Texture (needsUpdate = true) để chống lỗi màn hình đen/trắng
 */

// Polyfill ctx.roundRect cho các trình duyệt cũ hơn (iOS Safari < 16, Chrome cũ)
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

/**
 * Tự động ngắt dòng chữ an toàn trên Canvas 2D
 */
function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 3) {
  const safeText = String(text || '').trim();
  if (!safeText) return;

  const words = safeText.split(/\s+/);
  let line = '';
  let linesDrawn = 0;

  for (let n = 0; n < words.length; n++) {
    const testLine = line ? line + ' ' + words[n] : words[n];
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && n > 0) {
      if (linesDrawn === maxLines - 1) {
        ctx.fillText(line.trim() + '...', x, y);
        return;
      }
      ctx.fillText(line, x, y);
      line = words[n];
      y += lineHeight;
      linesDrawn++;
    } else {
      line = testLine;
    }
  }

  if (line) {
    ctx.fillText(line, x, y);
  }
}

/**
 * Vẽ hộp thông tin chi tiết trên Card bên phải
 */
function drawInfoBox(ctx, x, y, w, h, label, val, valColor) {
  ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 14);
  ctx.fill();

  ctx.strokeStyle = '#27272a';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#a1a1aa';
  ctx.font = 'bold 14px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(label, x + 16, y + 28);

  ctx.fillStyle = valColor || '#ffffff';
  ctx.font = 'bold 20px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(String(val || ''), x + 16, y + 62);
}

/**
 * 1. VẼ THANH NHỎ NẰM NGANG BÊN TRÊN (Top Pill Bar - 960x220)
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

  // Thân thanh: Nền Dark Zinc sang trọng
  ctx.fillStyle = '#18181b';
  ctx.beginPath();
  ctx.roundRect(8, 8, w - 16, h - 16, 28);
  ctx.fill();

  // Viền thanh
  ctx.strokeStyle = '#27272a';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Dải màu phát sáng ở mép trên
  ctx.strokeStyle = accent;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(32, 8, w - 64, 3, 2);
  ctx.stroke();

  // --- HÀNG 1: TAG PILL (TRÁI) VÀ RATING PILL (PHẢI) ---
  let tagText = String(data.tag || 'Di tích').trim();
  if (tagText.length > 32) {
    tagText = tagText.replace('Lịch sử ', '').replace('Văn hóa & Thiên nhiên ', '');
  }

  ctx.font = 'bold 18px "Plus Jakarta Sans", sans-serif';
  const tagTextWidth = ctx.measureText(tagText).width;
  const tagPillWidth = Math.min(tagTextWidth + 56, 440);
  const tagPillX = 30;
  const tagPillY = 28;
  const tagPillH = 42;

  // Nền Tag Pill
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.beginPath();
  ctx.roundRect(tagPillX, tagPillY, tagPillWidth, tagPillH, 21);
  ctx.fill();
  ctx.strokeStyle = '#27272a';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Chấm phát sáng bên trong Tag Pill
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(tagPillX + 20, tagPillY + tagPillH / 2, 4.5, 0, Math.PI * 2);
  ctx.fill();

  // Chữ Tag
  ctx.fillStyle = accent;
  ctx.font = 'bold 18px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(tagText, tagPillX + 34, tagPillY + tagPillH / 2);

  // Rating Pill (Bên phải)
  const rawRating = String(data.rating || '4.8');
  const ratingVal = rawRating.includes('★') ? rawRating.split('(')[0].trim() : rawRating.split(' ')[0] + ' ★';
  const ratingPillW = 110;
  const ratingPillX = w - 30 - ratingPillW;
  const ratingPillY = 28;
  const ratingPillH = 42;

  ctx.fillStyle = 'rgba(251, 191, 36, 0.12)';
  ctx.beginPath();
  ctx.roundRect(ratingPillX, ratingPillY, ratingPillW, ratingPillH, 21);
  ctx.fill();
  ctx.strokeStyle = 'rgba(251, 191, 36, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 19px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(ratingVal, ratingPillX + ratingPillW / 2, ratingPillY + ratingPillH / 2);

  // --- HÀNG 2: TÊN ĐỊA DANH (TRÁI) VÀ THÀNH PHỐ (PHẢI) ---
  const nameY = 120;
  const nameText = String(data.name || '');
  ctx.font = '800 36px "Plus Jakarta Sans", sans-serif';
  if (ctx.measureText(nameText).width > w - 360) {
    ctx.font = '800 30px "Plus Jakarta Sans", sans-serif';
  }
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(nameText, 30, nameY);

  ctx.fillStyle = '#a1a1aa';
  ctx.font = '600 21px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText('📍 ' + (data.city || 'Việt Nam'), w - 30, nameY);

  // --- HÀNG 3: ĐƯỜNG PHÂN CÁCH VÀ GỢI Ý HÀNH ĐỘNG ---
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(30, 166);
  ctx.lineTo(w - 30, 166);
  ctx.stroke();

  ctx.fillStyle = '#71717a';
  ctx.font = '600 15px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('⤢  CHẠM VÀO BẤT KỲ THẺ NÀO ĐỂ XEM CHI TIẾT', w / 2, 192);
}

/**
 * 2. VẼ CARD DETAIL BÊN TRÁI: TỔNG QUAN, LỊCH SỬ & ĐIỂM NỔI BẬT (520x760)
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
  ctx.lineWidth = 3.5;
  ctx.stroke();

  // Header Tag
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.beginPath();
  ctx.roundRect(28, 28, w - 56, 46, 23);
  ctx.fill();
  ctx.strokeStyle = '#27272a';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = accent;
  ctx.font = 'bold 18px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('🏛️  TỔNG QUAN & LỊCH SỬ', 46, 51);

  // Đường phân cách
  ctx.strokeStyle = '#27272a';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(28, 96);
  ctx.lineTo(w - 28, 96);
  ctx.stroke();

  // Mô tả lịch sử tóm tắt (Wrap 3-4 dòng)
  ctx.fillStyle = '#d4d4d8';
  ctx.font = '500 21px "Plus Jakarta Sans", sans-serif';
  ctx.textBaseline = 'alphabetic';
  const desc = data.short_desc || data.shortDesc || data.full_desc || data.fullDesc || '';
  wrapText(ctx, desc, 28, 136, w - 56, 32, 4);

  // Tiêu đề Điểm nổi bật
  ctx.fillStyle = '#a1a1aa';
  ctx.font = 'bold 16px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('✦ ĐẶC ĐIỂM NỔI BẬT', 28, 305);

  // 2 Khối điểm nổi bật
  let highlights = data.highlights || [];
  if (typeof highlights === 'string') {
    try {
      highlights = JSON.parse(highlights);
    } catch (e) {
      highlights = [];
    }
  }

  let yPos = 345;
  for (let i = 0; i < Math.min(2, highlights.length); i++) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.beginPath();
    ctx.roundRect(28, yPos - 22, w - 56, 78, 14);
    ctx.fill();
    ctx.strokeStyle = '#27272a';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#f4f4f5';
    ctx.font = '500 18px "Plus Jakarta Sans", sans-serif';
    wrapText(ctx, '• ' + highlights[i], 42, yPos + 6, w - 84, 26, 2);
    yPos += 96;
  }

  // Nút Action ở chân Card
  ctx.fillStyle = '#fafafa';
  ctx.beginPath();
  ctx.roundRect(28, h - 80, w - 56, 52, 14);
  ctx.fill();

  ctx.fillStyle = '#18181b';
  ctx.font = 'bold 19px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('⤢  CHẠM ĐỂ MỞ RỘNG', w / 2, h - 54);
}

/**
 * 3. VẼ CARD DETAIL BÊN PHẢI: THÔNG TIN THAM QUAN & GIỜ MỞ CỬA (520x760)
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
  ctx.lineWidth = 3.5;
  ctx.stroke();

  // Header Tag
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.beginPath();
  ctx.roundRect(28, 28, w - 56, 46, 23);
  ctx.fill();
  ctx.strokeStyle = '#27272a';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = accent;
  ctx.font = 'bold 18px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('ℹ️  THÔNG TIN THAM QUAN', 46, 51);

  // Đường phân cách
  ctx.strokeStyle = '#27272a';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(28, 96);
  ctx.lineTo(w - 28, 96);
  ctx.stroke();

  // 4 Box thông tin chi tiết
  drawInfoBox(ctx, 28, 120, w - 56, 88, '⏰ GIỜ MỞ CỬA', data.hours || 'Mở cửa cả ngày', '#ffffff');
  drawInfoBox(ctx, 28, 226, w - 56, 88, '🎟️ GIÁ VÉ THAM QUAN', data.ticket || 'Miễn phí', '#34d399');
  drawInfoBox(ctx, 28, 332, w - 56, 88, '📍 VỊ TRÍ / TỈNH THÀNH', data.city || 'Việt Nam', '#ffffff');
  drawInfoBox(ctx, 28, 438, w - 56, 88, '⭐️ ĐÁNH GIÁ DU KHÁCH', data.rating || '4.8 ★', '#fbbf24');

  // Nút Action ở chân Card: Chỉ đường Google Maps
  ctx.fillStyle = '#27272a';
  ctx.beginPath();
  ctx.roundRect(28, h - 80, w - 56, 52, 14);
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 19px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🗺️  CHỈ ĐƯỜNG & CHI TIẾT', w / 2, h - 54);
}

/**
 * 4. CẬP NHẬT TEXTURE CHO THREE.JS (Tránh lỗi màn hình Texture không cập nhật)
 */
function refreshMeshTexture(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;

  const mesh = el.getObject3D('mesh');
  if (mesh && mesh.material && mesh.material.map) {
    mesh.material.map.needsUpdate = true;
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
 * Cập nhật texture cho toàn bộ 10 targets
 */
function refreshAllTextures() {
  for (let i = 0; i < 10; i++) {
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
 * Vẽ texture cho toàn bộ danh sách địa điểm
 */
function renderAllLocationCanvases(locationsMap) {
  for (let i = 0; i < 10; i++) {
    const loc = locationsMap[i] || locationsMap[String(i)] || (typeof LOCATIONS_DATA !== 'undefined' ? LOCATIONS_DATA[i] : null);
    if (loc) {
      renderTargetCanvases(i, loc);
    }
  }
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

