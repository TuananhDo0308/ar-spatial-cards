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

const FALLBACK_TARGET_IMAGES = {
  0: 'assets/card-hoian.png',
  1: 'assets/card-dinhdoclap.jpg',
  2: 'assets/card-benthanh.jpg',
  3: 'assets/card-hanoi.jpg',
  4: 'assets/card-halong.jpg'
};

// ============================================================================
// 1. NÂNG CẤP CAMERA STREAM LÊN 720p HD (BÍ QUYẾT BÁM DÍNH SẮC NÉT NHƯ STORIES AR)
// ============================================================================
// Mặc định MindAR chỉ yêu cầu camera thông thường (thường bị trình duyệt ép về 640x480).
// Nâng lên 720p HD (1280x720) giúp độ phân giải điểm ảnh tăng gấp 3 lần,
// thuật toán nhận diện điểm đặc trưng (keypoints) với độ chính xác sub-pixel,
// loại bỏ hoàn toàn hiện tượng trượt gốc (homography slip).
if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
  const _origGUM = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  navigator.mediaDevices.getUserMedia = function (constraints) {
    if (constraints && constraints.video) {
      if (typeof constraints.video === 'object') {
        constraints.video.width = { ideal: 1280, min: 640 };
        constraints.video.height = { ideal: 720, min: 480 };
      }
    }
    return _origGUM(constraints);
  };
}

// ============================================================================
// 2. HỆ THỐNG ANCHOR LOCK VỮNG CHẮC 60 FPS (DYNAMIC HYSTERESIS ANCHOR LOCK)
// ============================================================================
// Khắc phục triệt để hiện tượng thẻ bị "trôi lết / bồng bềnh" khi ngắm vào ảnh:
// - Khi người dùng giữ máy tương đối yên: KHÓA CỨNG MA TRẬN 100% (Đóng đinh vào ảnh).
// - Khi người dùng lia máy: Mở khóa và bắt dính tức thì với tốc độ cao (Zero-lag).

const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
const isAuthorMode = urlParams ? urlParams.get('mode') === 'author' : false;

(function initStabilization() {
  if (typeof AFRAME === 'undefined' || isAuthorMode) {
    if (isAuthorMode) {
      console.log('📌 [AR Tracking]: Đang chạy chế độ NGUYÊN BẢN TÁC GIẢ (Author Raw Mode - MindAR defaults)');
    }
    return;
  }

  const targetComp = AFRAME.components['mindar-image-target'];
  if (!targetComp || !targetComp.Component) {
    console.warn('⚠️ [AR Stabilizer]: Không tìm thấy component mindar-image-target để áp dụng khử rung.');
    return;
  }

  const originalInit = targetComp.Component.prototype.init;
  const originalUpdateWorldMatrix = targetComp.Component.prototype.updateWorldMatrix;

  targetComp.Component.prototype.init = function () {
    originalInit.call(this);

    // Vector và Quaternion lưu trữ mục tiêu từ MindAR (15-25 FPS)
    this.targetPos = new AFRAME.THREE.Vector3();
    this.targetQuat = new AFRAME.THREE.Quaternion();
    this.targetScale = new AFRAME.THREE.Vector3(1, 1, 1);

    // Vector và Quaternion mượt mà hiển thị trên màn hình (60-120 FPS)
    this.currentPos = new AFRAME.THREE.Vector3();
    this.currentQuat = new AFRAME.THREE.Quaternion();
    this.currentScale = new AFRAME.THREE.Vector3(1, 1, 1);

    this.tempMat = new AFRAME.THREE.Matrix4();
    this.hasInitialPose = false;
    this.isTrackingVisible = false;
    this.isAnchorLocked = false;

    // Đăng ký component này vào chu kỳ render 60 FPS của A-Frame
    if (this.el && this.el.sceneEl && this.el.sceneEl.addBehavior) {
      this.el.sceneEl.addBehavior(this);
    }
  };

  targetComp.Component.prototype.updateWorldMatrix = function (worldMatrix) {
    this.el.emit('targetUpdate');
    if (!this.el.object3D.visible && worldMatrix !== null) {
      this.el.emit('targetFound');
    } else if (this.el.object3D.visible && worldMatrix === null) {
      this.el.emit('targetLost');
    }

    if (worldMatrix === null) {
      this.isTrackingVisible = false;
      this.hasInitialPose = false;
      this.isAnchorLocked = false;
      this.el.object3D.visible = false;
      this.el.object3D.matrix = this.invisibleMatrix;
      this.el.object3D.matrixWorldNeedsUpdate = true;
      return;
    }

    this.isTrackingVisible = true;
    this.el.object3D.visible = true;

    // Tính toán ma trận mục tiêu
    this.tempMat.elements = worldMatrix;
    this.tempMat.multiply(this.postMatrix);
    this.tempMat.decompose(this.targetPos, this.targetQuat, this.targetScale);

    // Snap tức thì ở khung hình đầu tiên để không có độ trễ xuất hiện
    if (!this.hasInitialPose) {
      this.currentPos.copy(this.targetPos);
      this.currentQuat.copy(this.targetQuat);
      this.currentScale.copy(this.targetScale);
      this.hasInitialPose = true;
      this.isAnchorLocked = true; // Khóa cứng ngay từ đầu
      this.el.object3D.matrix.compose(this.currentPos, this.currentQuat, this.currentScale);
      this.el.object3D.matrixWorldNeedsUpdate = true;
    }
  };

  targetComp.Component.prototype.tick = function (time, timeDelta) {
    if (!this.isTrackingVisible || !this.hasInitialPose) return;

    // Giới hạn delta time giữa 1ms và 100ms
    const dt = Math.min(Math.max((timeDelta || 16.6) / 1000, 0.001), 0.1);

    // 1. Tính độ lệch vị trí (khoảng cách Euclid)
    const posDist = this.currentPos.distanceTo(this.targetPos);

    // 2. Tính độ lệch góc xoay Quaternion (rad)
    const dot = Math.abs(this.currentQuat.dot(this.targetQuat));
    const clampedDot = Math.min(Math.max(dot, -1.0), 1.0);
    const angleDiff = 2 * Math.acos(clampedDot);

    // 3. ROCK-SOLID HYSTERESIS ANCHOR LOCK (Khóa Chặt Đứng Yên 100% Như Stories AR / 8th Wall)
    // Ngưỡng khóa (Lock): Dao động rung tay tự nhiên < 3.2mm và < 0.55 độ (~0.0096 rad)
    // Ngưỡng mở khóa (Breakout): Người dùng thực sự lia máy > 5.5mm hoặc > 0.90 độ (~0.015 rad)
    const LOCK_POS_THRESH = 0.0032;   // 3.2mm
    const LOCK_ROT_THRESH = 0.0096;   // ~0.55 độ
    const UNLOCK_POS_THRESH = 0.0055; // 5.5mm
    const UNLOCK_ROT_THRESH = 0.015;  // ~0.90 độ

    if (this.isAnchorLocked) {
      // Khi đã khóa cứng: Chỉ mở khóa khi người dùng THỰC SỰ lia máy đi góc khác
      if (posDist > UNLOCK_POS_THRESH || angleDiff > UNLOCK_ROT_THRESH) {
        this.isAnchorLocked = false;
      }
    } else {
      // Khi đang lia máy: Ngay khi máy dừng lại ở vị trí tương đối ổn định -> KHÓA CHẶT NGAY
      if (posDist < LOCK_POS_THRESH && angleDiff < LOCK_ROT_THRESH) {
        this.isAnchorLocked = true;
      }
    }

    if (this.isAnchorLocked) {
      // ĐÃ KHÓA CHẶT: 100% ROCK-SOLID!
      // Không nhúc nhích dù chỉ 1 pixel, thẻ bám dính chắc nịch như đóng đinh vào bức ảnh thật!
      return;
    }

    // Khi người dùng đang lia máy thật sự: Bắt dính tức thì (Zero-Lag Snappy Catch-up)
    // Tốc độ cao giúp thẻ bám sát theo camera trong 2-3 frame mà không bị trôi lết phía sau
    const speedPos = Math.min(36.0 + posDist * 40.0, 55.0);
    const speedRot = Math.min(34.0 + angleDiff * 35.0, 50.0);
    const posFactor = 1.0 - Math.exp(-speedPos * dt);
    const rotFactor = 1.0 - Math.exp(-speedRot * dt);

    this.currentPos.lerp(this.targetPos, posFactor);
    this.currentQuat.slerp(this.targetQuat, rotFactor);
    this.currentScale.lerp(this.targetScale, posFactor);

    // Cập nhật lại ma trận 3D của Target Entity ở tần số 60 FPS
    this.el.object3D.matrix.compose(this.currentPos, this.currentQuat, this.currentScale);
    this.el.object3D.matrixWorldNeedsUpdate = true;
  };

  console.log('✨ [AR Stabilizer]: Đã kích hoạt 720p HD Camera & Rock-Solid Anchor Lock');
})();

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

  // Tự động vẽ lại toàn bộ Texture Canvas ngay khi Google Fonts nạp xong 100%
  if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      if (window.ARCanvasRenderer && dbLocations) {
        window.ARCanvasRenderer.renderAllLocationCanvases(dbLocations);
        window.ARCanvasRenderer.refreshAllTextures();
      }
    }).catch(() => {});
  }

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
      if (isAuthorMode) {
        // Áp dụng thông số nguyên bản của tác giả MindAR (hiukim)
        arSystem.filterMinCF = null; // Tác giả mặc định: DEFAULT_FILTER_CUTOFF = 0.001
        arSystem.filterBeta = null;   // Tác giả mặc định: DEFAULT_FILTER_BETA = 1000
        arSystem.warmupTolerance = null; // Tác giả mặc định: 5
        arSystem.missTolerance = null;   // Tác giả mặc định: 5
      }
      try {
        arSystem.start();
        arSystemStarted = true;
        if (statusText) {
          statusText.textContent = isAuthorMode
            ? 'Hướng camera vào ảnh (Chế độ gốc MindAR)'
            : 'Hướng camera vào ảnh trên bảng';
        }
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
  // 4. LẮNG NGHE SỰ KIỆN QUÉT ẢNH TARGET (HỖ TRỢ CẢ 8TH WALL VÀ MINDAR)
  // ==========================================================================
  // Khởi tạo 8th Wall Image Targets nếu phát hiện thư viện XR8
  const init8thWall = () => {
    if (typeof XR8 !== 'undefined' && XR8.XrController) {
      fetch('./image-targets/all-targets.json')
        .then((res) => res.json())
        .then((targets) => {
          XR8.XrController.configure({
            imageTargetData: targets,
          });
          console.log('✨ [8th Wall SLAM Engine]: Đã cấu hình thành công 10 Image Targets!');
        })
        .catch((err) => {
          console.warn('Lỗi khi nạp all-targets.json cho 8th Wall:', err);
        });
    }
  };

  if (typeof window !== 'undefined') {
    if (window.XR8) {
      init8thWall();
    } else {
      window.addEventListener('xrloaded', init8thWall);
    }
  }

  function setupTracking(targetIdx) {
    const el = document.getElementById(`target-entity-${targetIdx}`);
    const group = document.getElementById(`spatial-group-${targetIdx}`);
    if (!el || !group) return;

    // Ảnh ngang: 1 (Dinh Độc Lập), 2 (Chợ Bến Thành), 3 (Hồ Hoàn Kiếm), 4 (Vịnh Hạ Long)
    // Ảnh vuông: 0 (Phố Cổ Hội An)
    const isLandscape = [1, 2, 3, 4].includes(targetIdx);
    const is8thWall = typeof XR8 !== 'undefined' || !!document.querySelector('[xrweb]');

    // Khởi tạo góc xoay ban đầu chuẩn xác cho từng loại thẻ
    if (is8thWall && isLandscape) {
      group.setAttribute('rotation', '0 0 -90');
    } else {
      group.setAttribute('rotation', '0 0 0');
    }

    const onFound = () => {
      // Chặn spam sự kiện nếu thẻ đang hiển thị rồi
      if (targetVisibleState[targetIdx]) return;
      targetVisibleState[targetIdx] = true;

      // Đảm bảo bù góc xoay 100% khi 8th Wall nhận diện ảnh ngang (khắc phục lỗi sai chiều)
      if (is8thWall && isLandscape) {
        group.setAttribute('rotation', '0 0 -90');
      } else {
        group.setAttribute('rotation', '0 0 0');
      }

      // Tự động phát video overlay khi thẻ được nhận diện
      const vid = document.getElementById(`video-${targetIdx}`);
      if (vid) {
        vid.currentTime = 0;
        const playPromise = vid.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {});
        }
      }

      activeTargets.add(targetIdx);
      currentDetectedTarget = targetIdx;
      if (statusDot) statusDot.classList.add('active');
      if (reticle) reticle.classList.add('hidden');

      const loc = dbLocations[targetIdx] || dbLocations[String(targetIdx)];
      const locName = loc ? loc.name : `Địa điểm #${targetIdx + 1}`;

      if (statusText) {
        if (activeTargets.size === 1) {
          statusText.textContent = `Đã nhận diện: ${locName}`;
        } else {
          statusText.textContent = `Đang quét: ${activeTargets.size} địa danh`;
        }
      }

      // Hiện thẻ tức thì, không tạo animation object gây lag bộ nhớ
      const targetScale = getResponsiveScale();
      group.setAttribute('scale', `${targetScale} ${targetScale} ${targetScale}`);
      group.setAttribute('visible', 'true');
    };

    const onLost = () => {
      // Chặn spam sự kiện nếu thẻ đang ẩn rồi
      if (!targetVisibleState[targetIdx]) return;
      targetVisibleState[targetIdx] = false;

      // Tạm dừng video khi mất dấu thẻ để tiết kiệm pin & CPU
      const vid = document.getElementById(`video-${targetIdx}`);
      if (vid) {
        vid.pause();
      }

      activeTargets.delete(targetIdx);
      group.setAttribute('scale', '0 0 0');
      group.setAttribute('visible', 'false');

      if (activeTargets.size === 0) {
        if (statusDot) statusDot.classList.remove('active');
        if (statusText) {
          statusText.textContent = isAuthorMode
            ? 'Hướng camera vào ảnh (Chế độ gốc MindAR)'
            : 'Hướng camera vào ảnh trên bảng';
        }
        if (reticle) reticle.classList.remove('hidden');
      } else {
        if (statusText) {
          statusText.textContent = `Đang quét: ${activeTargets.size} địa danh`;
        }
      }
    };

    // Hỗ trợ cả sự kiện chuẩn của MindAR (targetFound/Lost) và 8th Wall (xrextrasfound/lost)
    el.addEventListener('targetFound', onFound);
    el.addEventListener('xrextrasfound', onFound);
    el.addEventListener('targetLost', onLost);
    el.addEventListener('xrextraslost', onLost);
  }

  // Khởi tạo tracking cho toàn bộ 5 targets
  for (let i = 0; i < 5; i++) {
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

    try {
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
    } catch (err) {
      console.error('Lỗi khi mở modal chi tiết:', err);
      isModalOpening = false;
      isModalOpen = false;
    }
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
  // 7. TƯƠNG TÁC CHẠM CẢM ỨNG (TOUCH / CLICK) VÀO CỤM THẺ AR 3D & NÚT EXTEND
  // ==========================================================================
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const candidateMeshes = [];

  function triggerCardOpen(targetIdx) {
    const now = Date.now();
    if (now - lastTriggerTime < 450) return; // Debounce 450ms chống kích hoạt kép
    lastTriggerTime = now;
    openFullView(targetIdx);
  }

  function handleScreenTouch(clientX, clientY) {
    if (isModalOpen || isModalOpening) return;
    if (!sceneEl) return;
    const camera = sceneEl.camera;
    if (!camera) return;

    // Chuẩn hoá toạ độ chạm màn hình sang NDC [-1, 1] chính xác theo khung Canvas
    const canvas = sceneEl.canvas;
    let x = clientX;
    let y = clientY;
    let width = window.innerWidth;
    let height = window.innerHeight;

    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      x = clientX - rect.left;
      y = clientY - rect.top;
      width = rect.width;
      height = rect.height;
    }

    pointer.x = (x / width) * 2 - 1;
    pointer.y = -(y / height) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);

    // Gom các Mesh của các target đang được hiển thị
    candidateMeshes.length = 0;
    for (let idx = 0; idx < 5; idx++) {
      const group = document.getElementById(`spatial-group-${idx}`);
      if (!group) continue;

      // Kiểm tra target đang hoạt động hoặc đang hiển thị trên màn hình
      const isVisible = targetVisibleState[idx] || activeTargets.has(idx) || group.getAttribute('visible') === 'true';
      if (isVisible) {
        ['bar-top-', 'card-left-', 'card-right-', 'target-frame-', 'target-video-'].forEach((prefix) => {
          const el = document.getElementById(prefix + idx);
          if (el && el.object3D) {
            el.object3D.traverse((child) => {
              if (child.isMesh) {
                child.userData.cardIdx = idx;
                candidateMeshes.push(child);
              }
            });
          }
        });
      }
    }

    // Nếu vì lý do nào đó targetVisibleState chưa kịp cập nhật, fallback kiểm tra toàn bộ 5 targets
    if (candidateMeshes.length === 0) {
      for (let idx = 0; idx < 5; idx++) {
        ['bar-top-', 'card-left-', 'card-right-', 'target-frame-', 'target-video-'].forEach((prefix) => {
          const el = document.getElementById(prefix + idx);
          if (el && el.object3D) {
            el.object3D.traverse((child) => {
              if (child.isMesh) {
                child.userData.cardIdx = idx;
                candidateMeshes.push(child);
              }
            });
          }
        });
      }
    }

    if (candidateMeshes.length === 0) return;

    const intersects = raycaster.intersectObjects(candidateMeshes, true);
    if (intersects.length > 0) {
      const hit = intersects[0].object.userData;
      if (hit && hit.cardIdx !== undefined) {
        triggerCardOpen(hit.cardIdx);
      }
    }
  }

  // Theo dõi toạ độ bắt đầu chạm để phân biệt Tap và Drag (vuốt)
  let touchStartX = 0;
  let touchStartY = 0;
  let touchStartTime = 0;

  window.addEventListener(
    'touchstart',
    (e) => {
      if (e.touches && e.touches.length > 0) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchStartTime = Date.now();
      }
    },
    { passive: true }
  );

  // Bắt touchend trên điện thoại (đảm bảo bấm nút Extend / mở rộng siêu nhạy)
  window.addEventListener(
    'touchend',
    (e) => {
      if (isModalOpen || isModalOpening) return;
      if (
        e.target &&
        (e.target.closest('.top-bar') || e.target.closest('.fullscreen-modal') || e.target.closest('#camera-toast'))
      ) {
        return;
      }
      if (!e.changedTouches || e.changedTouches.length === 0) return;
      const t = e.changedTouches[0];
      const deltaX = Math.abs(t.clientX - touchStartX);
      const deltaY = Math.abs(t.clientY - touchStartY);
      const touchDuration = Date.now() - touchStartTime;

      // Ngưỡng phát hiện Tap: ngón tay di chuyển < 25px và thời gian giữ < 600ms
      if (deltaX < 25 && deltaY < 25 && touchDuration < 600) {
        handleScreenTouch(t.clientX, t.clientY);
      }
    },
    { passive: true }
  );

  // Bắt chuột click trên máy tính (Pointerup)
  window.addEventListener('pointerup', (e) => {
    if (e.pointerType === 'touch') return; // Đã xử lý qua touchend
    if (isModalOpen || isModalOpening) return;
    if (
      e.target &&
      (e.target.closest('.top-bar') || e.target.closest('.fullscreen-modal') || e.target.closest('#camera-toast'))
    ) {
      return;
    }
    handleScreenTouch(e.clientX, e.clientY);
  });

  // Giữ sự kiện click A-Frame làm lớp bảo hiểm thứ 2
  for (let i = 0; i < 10; i++) {
    ['bar-top-', 'card-left-', 'card-right-', 'target-frame-'].forEach((prefix) => {
      const el = document.getElementById(prefix + i);
      if (el) {
        el.addEventListener('click', () => {
          if (!isModalOpen && !isModalOpening) {
            triggerCardOpen(i);
          }
        });
      }
    });
  }
});
