/**
 * ============================================================================
 * ar-app.js - Bộ Điều Khiển Chính WebAR Không Gian (MindAR + A-Frame)
 * ============================================================================
 * Chức năng:
 * - Khởi tạo dữ liệu từ SQLite API hoặc offline fallback
 * - Quản lý vòng đời Camera AR an toàn (chống xung đột trên iOS Safari)
 * - Lắng nghe sự kiện theo dõi đa mục tiêu (quét đồng thời cả 10 ảnh target)
 * - Tự động co giãn giao diện 3D responsive theo màn hình điện thoại
 * - Tính toán toạ độ 2D từ không gian 3D để phóng to Shared-Element Modal (VisionOS)
 * - Xử lý cảm ứng trực tiếp trên màn hình, chống duplicate click/touch
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
  let currentDetectedTarget = null;
  let activeCardIdx = 0;
  let activeSourceElementId = null;
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

    // Vẽ toàn bộ 30 canvas (10 địa danh x 3 thẻ)
    if (window.ARCanvasRenderer) {
      window.ARCanvasRenderer.renderAllLocationCanvases(dbLocations);
    }
  }

  await initDatabase();

  // Đảm bảo sau khi A-Frame load scene xong, Texture sẽ được Three.js refresh ngay
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

  function animateCardScale(entityId, toScale, duration = 450) {
    const el = document.getElementById(entityId);
    if (!el) return;

    el.removeAttribute('animation__boot');
    el.setAttribute('animation__boot', {
      property: 'scale',
      to: `${toScale} ${toScale} ${toScale}`,
      dur: duration,
      easing: toScale > 0 ? 'easeOutBack' : 'easeInQuad'
    });
  }

  window.addEventListener('resize', () => {
    const targetScale = getResponsiveScale();
    activeTargets.forEach((targetIdx) => {
      const group = document.getElementById(`spatial-group-${targetIdx}`);
      if (group) {
        group.setAttribute('scale', `${targetScale} ${targetScale} ${targetScale}`);
      }
    });
  });

  // ==========================================================================
  // 4. LẮNG NGHE SỰ KIỆN QUÉT ẢNH TARGET (QUÉT ĐỒNG THỜI CẢ 10 THẺ)
  // ==========================================================================
  function setupTracking(targetIdx) {
    const el = document.getElementById(`target-entity-${targetIdx}`);
    if (!el) return;

    el.addEventListener('targetFound', () => {
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

      const targetScale = getResponsiveScale();
      animateCardScale(`spatial-group-${targetIdx}`, targetScale, 480);

      // Đảm bảo texture luôn sắc nét khi vừa phát hiện
      if (window.ARCanvasRenderer) {
        window.ARCanvasRenderer.refreshTargetTextures(targetIdx);
      }
    });

    el.addEventListener('targetLost', () => {
      activeTargets.delete(targetIdx);
      animateCardScale(`spatial-group-${targetIdx}`, 0, 220);

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
  // 5. TÍNH TOÁN TOẠ ĐỘ 2D TRÊN MÀN HÌNH ĐIỆN THOẠI CỦA THẺ 3D
  // ==========================================================================
  function get3DCardScreenRect(targetIdx, sourceElementId) {
    const defaultRect = {
      x: window.innerWidth / 2 - 140,
      y: window.innerHeight / 2 - 80,
      width: 280,
      height: 160
    };

    let cardEl = null;
    if (sourceElementId) {
      cardEl = document.getElementById(sourceElementId);
    }
    if (!cardEl) {
      cardEl = document.getElementById(`bar-top-${targetIdx}`) || document.getElementById(`card-left-${targetIdx}`);
    }

    const camera = sceneEl.camera;
    if (!cardEl || !camera || !cardEl.object3D) return defaultRect;

    const pos = new THREE.Vector3();
    cardEl.object3D.getWorldPosition(pos);

    // Kiểm tra nếu thẻ nằm phía sau camera
    pos.project(camera);
    if (pos.z > 1 || isNaN(pos.x) || isNaN(pos.y)) {
      return defaultRect;
    }

    const screenX = (pos.x * 0.5 + 0.5) * window.innerWidth;
    const screenY = (-(pos.y * 0.5) + 0.5) * window.innerHeight;

    const camPos = new THREE.Vector3();
    camera.getWorldPosition(camPos);
    const cardPos = new THREE.Vector3();
    cardEl.object3D.getWorldPosition(cardPos);
    const dist = Math.max(0.2, camPos.distanceTo(cardPos));

    const fov = camera.fov || 60;
    const visibleHeightAtDist = 2 * Math.tan((fov * Math.PI) / 360) * dist;
    const pixelPerMeter = window.innerHeight / visibleHeightAtDist;

    const isTopBar = sourceElementId && sourceElementId.startsWith('bar-top-');
    const planeW = isTopBar ? 0.96 : 0.44;
    const planeH = isTopBar ? 0.22 : 0.64;

    const width = Math.min(window.innerWidth * 0.88, Math.max(120, planeW * pixelPerMeter));
    const height = Math.min(window.innerHeight * 0.60, Math.max(60, planeH * pixelPerMeter));

    return {
      x: screenX - width / 2,
      y: screenY - height / 2,
      width: width,
      height: height
    };
  }

  // ==========================================================================
  // 6. PHÓNG TO MORPHING SPRING TỪ ĐÚNG VỊ TRÍ THẺ 3D (VISIONOS CURVE)
  // ==========================================================================
  window.openFullView = function (targetIdx, sourceElementId) {
    if (isModalOpening || isModalOpen) return;
    isModalOpening = true;
    isModalOpen = true;
    activeCardIdx = targetIdx;
    activeSourceElementId = sourceElementId;

    // Phản hồi rung haptic nhẹ nhàng
    if (navigator.vibrate) {
      try {
        navigator.vibrate([18, 25]);
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

    // 1. Điền thông tin vào Modal
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

    // 2. Lấy toạ độ xuất phát chính xác của thẻ 3D trên màn hình điện thoại
    const startRect = get3DCardScreenRect(targetIdx, sourceElementId);

    const finalWidth = Math.min(window.innerWidth - 32, 480);
    const finalHeight = Math.min(window.innerHeight * 0.88, 720);
    const finalLeft = (window.innerWidth - finalWidth) / 2;
    const finalTop = (window.innerHeight - finalHeight) / 2;

    const scaleX = Math.max(0.18, startRect.width / finalWidth);
    const scaleY = Math.max(0.18, startRect.height / finalHeight);
    const deltaX = startRect.x + startRect.width / 2 - (finalLeft + finalWidth / 2);
    const deltaY = startRect.y + startRect.height / 2 - (finalTop + finalHeight / 2);

    // Đặt thẻ ở vị trí xuất phát ban đầu
    fullscreenCard.classList.remove('active');
    fullscreenCard.style.transition = 'none';
    fullscreenCard.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0) scale(${scaleX}, ${scaleY})`;
    fullscreenCard.style.opacity = '0.35';
    fullscreenCard.style.borderRadius = '30px';

    fullscreenModal.classList.add('active');
    fullscreenModal.style.backgroundColor = 'rgba(9, 9, 11, 0)';
    fullscreenModal.style.backdropFilter = 'blur(0px)';

    fullscreenCard.offsetHeight; // Kích hoạt reflow

    // 3. Kích hoạt hiệu ứng Spring mở rộng
    requestAnimationFrame(() => {
      fullscreenCard.style.transition =
        'transform 0.46s cubic-bezier(0.2, 0.9, 0.25, 1), opacity 0.32s ease, border-radius 0.4s ease';
      fullscreenCard.style.transform = 'translate3d(0, 0, 0) scale(1, 1)';
      fullscreenCard.style.opacity = '1';
      fullscreenCard.style.borderRadius = '24px';
      fullscreenCard.classList.add('active');

      fullscreenModal.style.backgroundColor = 'rgba(9, 9, 11, 0.90)';
      fullscreenModal.style.backdropFilter = 'blur(22px)';

      setTimeout(() => {
        isModalOpening = false;
      }, 460);
    });
  };

  // ==========================================================================
  // 7. ĐÓNG MODAL CHI TIẾT
  // ==========================================================================
  function closeFullView() {
    if (!fullscreenModal.classList.contains('active')) return;

    const endRect = get3DCardScreenRect(activeCardIdx, activeSourceElementId);

    const finalWidth = Math.min(window.innerWidth - 32, 480);
    const finalHeight = Math.min(window.innerHeight * 0.88, 720);
    const finalLeft = (window.innerWidth - finalWidth) / 2;
    const finalTop = (window.innerHeight - finalHeight) / 2;

    const scaleX = Math.max(0.18, endRect.width / finalWidth);
    const scaleY = Math.max(0.18, endRect.height / finalHeight);
    const deltaX = endRect.x + endRect.width / 2 - (finalLeft + finalWidth / 2);
    const deltaY = endRect.y + endRect.height / 2 - (finalTop + finalHeight / 2);

    fullscreenCard.classList.remove('active');
    fullscreenCard.style.transition =
      'transform 0.38s cubic-bezier(0.25, 1, 0.35, 1), opacity 0.28s ease, border-radius 0.32s ease';
    fullscreenCard.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0) scale(${scaleX}, ${scaleY})`;
    fullscreenCard.style.opacity = '0';
    fullscreenCard.style.borderRadius = '30px';

    fullscreenModal.style.backgroundColor = 'rgba(9, 9, 11, 0)';
    fullscreenModal.style.backdropFilter = 'blur(0px)';

    setTimeout(() => {
      fullscreenModal.classList.remove('active');
      fullscreenCard.style.transform = 'none';
      isModalOpen = false;
      isModalOpening = false;
    }, 380);
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
  // 8. TƯƠNG TÁC CHẠM CẢM ỨNG & CLICK VÀO CỤM THẺ AR 3D (CHỐNG DUPLICATE)
  // ==========================================================================
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  function triggerCardOpen(targetIdx, elementId) {
    const now = Date.now();
    if (now - lastTriggerTime < 500) return; // Debounce 500ms
    lastTriggerTime = now;
    openFullView(targetIdx, elementId);
  }

  function handleScreenTouch(clientX, clientY) {
    if (isModalOpen || isModalOpening) return;
    if (!sceneEl || !sceneEl.camera) return;

    pointer.x = (clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(pointer, sceneEl.camera);

    // CHỈ gom các Mesh của những Target ĐANG ĐƯỢC THEO DÕI (activeTargets)
    const activeMeshes = [];
    activeTargets.forEach((idx) => {
      ['bar-top-', 'card-left-', 'card-right-'].forEach((prefix) => {
        const el = document.getElementById(prefix + idx);
        if (el && el.object3D) {
          el.object3D.traverse((child) => {
            if (child.isMesh) {
              child.userData.cardIdx = idx;
              child.userData.elementId = el.id;
              activeMeshes.push(child);
            }
          });
        }
      });
    });

    if (activeMeshes.length === 0) return;

    const intersects = raycaster.intersectObjects(activeMeshes, true);
    if (intersects.length > 0) {
      const hit = intersects[0].object.userData;
      if (hit && hit.cardIdx !== undefined) {
        triggerCardOpen(hit.cardIdx, hit.elementId);
      }
    }
  }

  // Bắt touchend trên điện thoại cảm ứng (tránh chạm nhầm vào thanh HUD)
  window.addEventListener(
    'touchend',
    (e) => {
      if (isModalOpen) return;
      if (e.target && (e.target.closest('.top-bar') || e.target.closest('.fullscreen-modal') || e.target.closest('#camera-toast'))) {
        return;
      }
      if (e.changedTouches && e.changedTouches.length > 0) {
        const t = e.changedTouches[0];
        handleScreenTouch(t.clientX, t.clientY);
      }
    },
    { passive: true }
  );

  // Bắt chuột click trên máy tính
  window.addEventListener('pointerup', (e) => {
    if (e.pointerType === 'touch') return; // Đã xử lý qua touchend
    if (isModalOpen) return;
    if (e.target && (e.target.closest('.top-bar') || e.target.closest('.fullscreen-modal') || e.target.closest('#camera-toast'))) {
      return;
    }
    handleScreenTouch(e.clientX, e.clientY);
  });

  // Bắt click trực tiếp qua A-Frame raycaster
  for (let i = 0; i < 10; i++) {
    ['bar-top-', 'card-left-', 'card-right-'].forEach((prefix) => {
      const el = document.getElementById(prefix + i);
      if (el) {
        el.addEventListener('click', (e) => {
          if (activeTargets.has(i)) {
            triggerCardOpen(i, el.id);
          }
        });
      }
    });
  }
});

