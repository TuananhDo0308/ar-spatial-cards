/**
 * ============================================================================
 * ar-app.js - Bộ Điều Khiển Chính WebAR Không Gian (MindAR + A-Frame)
 * ============================================================================
 * Chức năng:
 * - Khởi tạo dữ liệu từ SQLite API hoặc offline fallback
 * - Quản lý vòng đời Camera AR an toàn (chống xung đột trên iOS Safari)
 * - Lắng nghe sự kiện theo dõi đa mục tiêu (quét tối đa 2 ảnh cùng lúc)
 * - Tự động co giãn giao diện 3D responsive theo màn hình điện thoại
 * - Tối ưu hoá triệt để: Chống rò rỉ bộ nhớ, chống giật modal, bám dính siêu mượt 60 FPS
 */

// Bảng ảnh fallback chính xác cho từng target
const FALLBACK_TARGET_IMAGES = {
  0: 'assets/target-0.png',
  1: 'assets/target-1.png',
  2: 'assets/card-benthanh.jpg',
  3: 'assets/card-hanoi.jpg',
  4: 'assets/gallery-danang.jpg',
  5: 'assets/gallery-halong.jpg',
  6: 'assets/card-hue.jpg',
  7: 'assets/card-trangan.jpg',
  8: 'assets/card-notredame.jpg',
  9: 'assets/card-phuquoc.jpg'
};

document.addEventListener('DOMContentLoaded', async () => {
  // Trạng thái ứng dụng
  let dbLocations = {};
  const activeTargets = new Set();
  const targetVisibleState = new Array(10).fill(false);
  let currentDetectedTarget = null;
  let activeCardIdx = 0;
  let isModalOpening = false;
  let isModalOpen = false;
  let arSystemStarted = false;
  let lastTriggerTime = 0;

  // DOM Elements
  const sceneEl = document.querySelector('a-scene');
  const statusDot = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');
  const reticle = document.getElementById('reticle');
  const cameraToast = document.getElementById('camera-toast');

  // Modal Elements
  const fullscreenModal = document.getElementById('fullscreen-modal');
  const fullscreenCard = document.getElementById('fullscreen-card');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const modalImg = document.getElementById('modal-img');
  const modalTitle = document.getElementById('modal-title');
  const modalBadge = document.getElementById('modal-badge');
  const modalRating = document.getElementById('modal-rating');
  const modalCity = document.getElementById('modal-city');
  const modalDesc = document.getElementById('modal-desc');
  const modalHighlights = document.getElementById('modal-highlights');
  const modalHours = document.getElementById('modal-hours');
  const modalTicket = document.getElementById('modal-ticket');
  const btnModalMap = document.getElementById('btn-modal-map');

  // ==========================================================================
  // 1. NẠP DỮ LIỆU ĐỊA DANH & RENDER TEXTURE CANVAS
  // ==========================================================================
  async function initDatabase() {
    try {
      const res = await fetch('/api/locations');
      if (res.ok) {
        dbLocations = await res.json();
      }
    } catch (e) {
      console.warn('Đang sử dụng dữ liệu fallback offline LOCATIONS_DATA');
    }

    if (!dbLocations || Object.keys(dbLocations).length === 0) {
      if (typeof LOCATIONS_DATA !== 'undefined') {
        dbLocations = LOCATIONS_DATA;
      }
    }

    // Vẽ toàn bộ 30 canvas (10 địa danh x 3 thẻ) đúng 1 lần duy nhất
    if (window.ARCanvasRenderer) {
      window.ARCanvasRenderer.renderAllLocationCanvases(dbLocations);
    }
  }

  await initDatabase();

  // Đảm bảo sau khi A-Frame load scene xong, Texture sẽ được Three.js nạp vào GPU đúng 1 lần
  if (sceneEl) {
    if (sceneEl.hasLoaded) {
      if (window.ARCanvasRenderer) window.ARCanvasRenderer.refreshAllTextures();
    } else {
      sceneEl.addEventListener('loaded', () => {
        if (window.ARCanvasRenderer) window.ARCanvasRenderer.refreshAllTextures();
      });
    }
  }

  // ==========================================================================
  // 2. KHỞI CHẠY CAMERA AR AN TOÀN (CHỐNG LỖI PERMISSION / DOUBLE START)
  // ==========================================================================
  function startARDirectly() {
    if (arSystemStarted || !sceneEl) return;
    const arSystem = sceneEl.systems && sceneEl.systems['mindar-image-system'];
    if (arSystem) {
      try {
        arSystem.start();
        arSystemStarted = true;
        statusText.textContent = 'Hướng camera vào ảnh trên bảng';
        if (cameraToast) cameraToast.style.display = 'none';
      } catch (err) {
        console.warn('Cần cử chỉ chạm của người dùng để mở camera:', err);
        if (cameraToast) cameraToast.style.display = 'flex';
      }
    }
  }

  // Tự động start khi scene đã load hoặc chờ event loaded
  if (sceneEl.hasLoaded) {
    startARDirectly();
  } else {
    sceneEl.addEventListener('loaded', startARDirectly);
  }

  // Fallback mở camera bằng cử chỉ chạm màn hình đầu tiên (iOS Safari)
  window.addEventListener(
    'touchstart',
    function handleFirstUserTouch() {
      if (!arSystemStarted) {
        startARDirectly();
      }
      window.removeEventListener('touchstart', handleFirstUserTouch);
    },
    { passive: true }
  );

  if (cameraToast) {
    cameraToast.addEventListener('click', () => {
      startARDirectly();
      cameraToast.style.display = 'none';
    });
  }

  // ==========================================================================
  // 3. RESPONSIVE SCALE CỤM THẺ AR 3D THEO MÀN HÌNH
  // ==========================================================================
  function getResponsiveScale() {
    const isPortrait = window.innerHeight > window.innerWidth;
    const isSmallScreen = window.innerWidth < 520;
    if (isPortrait && isSmallScreen) {
      return 0.82;
    } else if (isPortrait) {
      return 0.90;
    }
    return 1.0;
  }

  window.addEventListener('resize', () => {
    const targetScale = getResponsiveScale();
    activeTargets.forEach((targetIdx) => {
      const group = document.getElementById(`spatial-group-${targetIdx}`);
      if (group && targetVisibleState[targetIdx]) {
        group.setAttribute('scale', `${targetScale} ${targetScale} ${targetScale}`);
      }
    });
  });

  // ==========================================================================
  // 4. LẮNG NGHE SỰ KIỆN QUÉT ẢNH TARGET (TỐI ƯU HOÁ: CHỐNG MEMORY LEAK)
  // ==========================================================================
  function setupTracking(targetIdx) {
    const el = document.getElementById(`target-entity-${targetIdx}`);
    const group = document.getElementById(`spatial-group-${targetIdx}`);
    if (!el || !group) return;

    el.addEventListener('targetFound', () => {
      // Chặn spam sự kiện nếu thẻ đang hiển thị rồi
      if (targetVisibleState[targetIdx]) return;
      targetVisibleState[targetIdx] = true;

      activeTargets.add(targetIdx);
      currentDetectedTarget = targetIdx;
      statusDot.classList.add('active');
      reticle.classList.add('hidden');

      const loc = dbLocations[targetIdx] || dbLocations[String(targetIdx)];
      const locName = loc ? loc.name : `Địa điểm #${targetIdx + 1}`;

      if (activeTargets.size === 1) {
        statusText.textContent = `Đã nhận diện: ${locName}`;
      } else {
        statusText.textContent = `Đang quét: ${activeTargets.size} địa danh`;
      }

      // Hiện thẻ tức thì, không tạo animation object gây lag bộ nhớ
      const targetScale = getResponsiveScale();
      group.setAttribute('scale', `${targetScale} ${targetScale} ${targetScale}`);
      group.setAttribute('visible', 'true');
    });

    el.addEventListener('targetLost', () => {
      // Chặn spam sự kiện nếu thẻ đang ẩn rồi
      if (!targetVisibleState[targetIdx]) return;
      targetVisibleState[targetIdx] = false;

      activeTargets.delete(targetIdx);
      group.setAttribute('scale', '0 0 0');
      group.setAttribute('visible', 'false');

      if (activeTargets.size === 0) {
        statusDot.classList.remove('active');
        statusText.textContent = 'Hướng camera vào ảnh trên bảng';
        reticle.classList.remove('hidden');
      } else {
        statusText.textContent = `Đang quét: ${activeTargets.size} địa danh`;
      }
    });
  }

  // Khởi tạo tracking cho toàn bộ 10 targets
  for (let i = 0; i < 10; i++) {
    setupTracking(i);
  }

  // ==========================================================================
  // 5. HIỆU ỨNG PHÓNG TO MODAL CHI TIẾT (MƯỢT MÀ 60 FPS, KHÔNG GIẬT LAG)
  // ==========================================================================
  window.openFullView = function (targetIdx) {
    if (isModalOpening || isModalOpen) return;
    isModalOpening = true;
    isModalOpen = true;
    activeCardIdx = targetIdx;

    // Phản hồi rung nhẹ nhàng
    if (navigator.vibrate) {
      try {
        navigator.vibrate(18);
      } catch (e) {}
    }

    const data =
      dbLocations[targetIdx] ||
      dbLocations[String(targetIdx)] ||
      (typeof LOCATIONS_DATA !== 'undefined' ? LOCATIONS_DATA[targetIdx] : null);

    if (!data) {
      isModalOpening = false;
      isModalOpen = false;
      return;
    }

    // Điền dữ liệu vào Modal
    modalImg.src = data.image_url || data.imageUrl || FALLBACK_TARGET_IMAGES[targetIdx] || 'assets/target-0.png';
    modalTitle.textContent = data.name || `Địa điểm #${targetIdx + 1}`;
    modalBadge.textContent = data.tag || 'Di tích';

    const accent = data.badgeColor || data.badge_color || '#10b981';
    let badgeClass = 'badge-emerald';
    if (accent === '#f59e0b') badgeClass = 'badge-amber';
    else if (accent === '#06b6d4') badgeClass = 'badge-cyan';
    modalBadge.className = `badge-pill ${badgeClass}`;

    const rawRating = String(data.rating || '4.8');
    modalRating.textContent = rawRating.includes('★') ? rawRating : rawRating + ' ★';
    modalCity.textContent = '📍 ' + (data.city || 'Việt Nam');
    modalDesc.textContent =
      data.full_desc || data.fullDesc || data.short_desc || data.shortDesc || 'Đang cập nhật mô tả chi tiết...';
    modalHours.textContent = data.hours || '08:00 - 16:30';
    modalTicket.textContent = data.ticket || 'Miễn phí';

    // Highlights
    modalHighlights.innerHTML = '';
    let highlights = data.highlights || [];
    if (typeof highlights === 'string') {
      try {
        highlights = JSON.parse(highlights);
      } catch (e) {
        highlights = [];
      }
    }
    if (Array.isArray(highlights)) {
      highlights.forEach((item) => {
        const div = document.createElement('div');
        div.className = 'highlight-card';
        div.innerHTML = `<span>✦</span><span>${item}</span>`;
        modalHighlights.appendChild(div);
      });
    }

    // Map Query
    const mapQuery = data.map_query || data.mapQuery || data.name;
    btnModalMap.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`;

    // Hiển thị modal với hiệu ứng Scale & Fade mượt mà chuẩn 60 FPS
    fullscreenCard.classList.remove('active');
    fullscreenCard.style.transition = 'none';
    fullscreenCard.style.transform = 'translateY(16px) scale(0.96)';
    fullscreenCard.style.opacity = '0';

    fullscreenModal.classList.add('active');
    fullscreenCard.offsetHeight; // Kích hoạt reflow

    requestAnimationFrame(() => {
      fullscreenCard.style.transition = 'transform 0.32s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.26s ease';
      fullscreenCard.style.transform = 'translateY(0) scale(1)';
      fullscreenCard.style.opacity = '1';
      fullscreenCard.classList.add('active');

      setTimeout(() => {
        isModalOpening = false;
      }, 340);
    });
  };

  // ==========================================================================
  // 6. ĐÓNG MODAL CHI TIẾT
  // ==========================================================================
  function closeFullView() {
    if (!isModalOpen) return;
    isModalOpening = true;

    fullscreenCard.style.transition = 'transform 0.22s cubic-bezier(0.25, 1, 0.35, 1), opacity 0.18s ease';
    fullscreenCard.style.transform = 'translateY(12px) scale(0.96)';
    fullscreenCard.style.opacity = '0';
    fullscreenCard.classList.remove('active');

    setTimeout(() => {
      fullscreenModal.classList.remove('active');
      fullscreenCard.style.transform = 'none';
      isModalOpen = false;
      isModalOpening = false;
    }, 230);
  }

  btnCloseModal.addEventListener('click', closeFullView);
  fullscreenModal.addEventListener('click', (e) => {
    if (e.target === fullscreenModal) closeFullView();
  });

  // Hỗ trợ phím Escape để đóng modal trên PC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isModalOpen) {
      closeFullView();
    }
  });

  // ==========================================================================
  // 7. BẮT CHẠM VÀO THẺ 3D (ĐIỀU PHỐI QUA A-FRAME RAYCASTER DUY NHẤT)
  // ==========================================================================
  function triggerCardOpen(targetIdx) {
    const now = Date.now();
    if (now - lastTriggerTime < 450) return; // Debounce 450ms
    lastTriggerTime = now;
    openFullView(targetIdx);
  }

  for (let i = 0; i < 10; i++) {
    ['bar-top-', 'card-left-', 'card-right-'].forEach((prefix) => {
      const el = document.getElementById(prefix + i);
      if (el) {
        el.addEventListener('click', (e) => {
          if (activeTargets.has(i) && !isModalOpen && !isModalOpening) {
            triggerCardOpen(i);
          }
        });
      }
    });
  }
});
