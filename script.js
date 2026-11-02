let scene, camera, renderer;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let prevTime = performance.now();
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();

let gameActive = false;
let timeLeft = 60;
let timerInterval;
let hasKey = false;
let keyObject, doorObject;
let playerName = "";

// Tombol Mulai Game dari HTML
function startGame() {
    const input = document.getElementById("player-name").value.trim();
    if (!input) {
        alert("Masukkan nama penjelajah terlebih dahulu!");
        return;
    }
    playerName = input;
    document.getElementById("hud-name").innerText = `Pemain: ${playerName}`;
    
    document.getElementById("menu-screen").style.display = "none";
    document.getElementById("game-ui").style.display = "block";

    init3D();
    gameActive = true;
    startTimer();
}

function startTimer() {
    timeLeft = 60;
    document.getElementById("hud-timer").innerText = `⏱️ Waktu: ${timeLeft}s`;
    
    timerInterval = setInterval(() => {
        if (!gameActive) return;
        timeLeft--;
        document.getElementById("hud-timer").innerText = `⏱️ Waktu: ${timeLeft}s`;
        
        if (timeLeft <= 0) {
            endGame(false, "Waktu habis! Kegelapan telah menelanmu...");
        }
    }, 1000);
}

// Inisialisasi Dunia 3D Three.js
function init3D() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050505);
    scene.fog = new THREE.FogExp2(0x050505, 0.08);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.6, 5);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    // Cahaya Redup Horor & Senter Pemain (Spotlight)
    const ambientLight = new THREE.AmbientLight(0x111111);
    scene.add(ambientLight);

    const flashlight = new THREE.SpotLight(0xfffaed, 3, 20, Math.PI / 6, 0.5, 1);
    flashlight.position.set(0, 0, 0);
    flashlight.target = camera;
    camera.add(flashlight);
    scene.add(camera);

    // Lantai Labirin
    const floorGeo = new THREE.PlaneGeometry(50, 50);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Langit-langit Gelap
    const ceiling = new THREE.Mesh(floorGeo, floorMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = 4;
    scene.add(ceiling);

    // Membuat Dinding Labirin Sederhana
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x2d3436, roughness: 0.8 });
    const wallGeo = new THREE.BoxGeometry(4, 4, 0.5);

    function createWall(x, z, rotY = 0) {
        const wall = new THREE.Mesh(wallGeo, wallMat);
        wall.position.set(x, 2, z);
        wall.rotation.y = rotY;
        scene.add(wall);
    }

    // Batas Luar Labirin
    createWall(0, -10, 0);
    createWall(-10, 0, Math.PI / 2);
    createWall(10, 0, Math.PI / 2);
    createWall(0, 10, 0);

    // Dinding Sekat Dalam
    createWall(-5, -5, 0);
    createWall(5, 2, Math.PI / 2);

    // Kunci Emas yang Harus Dicari
    const keyGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const keyMat = new THREE.MeshStandardMaterial({ color: 0xf1c40f, emissive: 0xd4ac0d, roughness: 0.2 });
    keyObject = new THREE.Mesh(keyGeo, keyMat);
    keyObject.position.set(-8, 1, -8);
    scene.add(keyObject);

    // Pintu Keluar
    const doorGeo = new THREE.BoxGeometry(2, 3, 0.2);
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x8e44ad });
    doorObject = new THREE.Mesh(doorGeo, doorMat);
    doorObject.position.set(8, 1.5, 9.8);
    scene.add(doorObject);

    // Event Listener untuk Keyboard & Mouse Kontrol
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    document.addEventListener('click', () => {
        document.body.requestPointerLock();
    });
    document.addEventListener('mousemove', onMouseMove);

    animate();
}

// Kontrol Gerakan W, A, S, D
function onKeyDown(event) {
    switch (event.code) {
        case 'KeyW': moveForward = true; break;
        case 'KeyA': moveLeft = true; break;
        case 'KeyS': moveBackward = true; break;
        case 'KeyD': moveRight = true; break;
    }
}

function onKeyUp(event) {
    switch (event.code) {
        case 'KeyW': moveForward = false; break;
        case 'KeyA': moveLeft = false; break;
        case 'KeyS': moveBackward = false; break;
        case 'KeyD': moveRight = false; break;
    }
}

// Kontrol Arah Pandangan Mouse (FPS View)
let euler = new THREE.Euler(0, 0, 0, 'YXZ');
function onMouseMove(event) {
    if (document.pointerLockElement !== document.body) return;

    const movementX = event.movementX || event.mozMovementX || 0;
    const movementY = event.movementY || event.mozMovementY || 0;

    euler.y -= movementX * 0.002;
    euler.x -= movementY * 0.002;
    euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, euler.x));

    camera.quaternion.setFromEuler(euler);
}

// Loop Utama Game (Render & Deteksi Tabrakan)
function animate() {
    if (!gameActive) return;
    requestAnimationFrame(animate);

    const time = performance.now();
    const delta = (time - prevTime) / 1000;

    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;

    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize();

    if (moveForward || moveBackward) velocity.z -= direction.z * 40.0 * delta;
    if (moveLeft || moveRight) velocity.x -= direction.x * 40.0 * delta;

    camera.translateX(-velocity.x * delta);
    camera.translateZ(-velocity.z * delta);

    // Batas Area Labirin agar pemain tidak tembus dinding luar
    camera.position.x = Math.max(-9.5, Math.min(9.5, camera.position.x));
    camera.position.z = Math.max(-9.5, Math.min(9.5, camera.position.z));

    // Animasi putar kunci kecil
    if (keyObject) {
        keyObject.rotation.y += 0.02;

        // Deteksi Pengambilan Kunci (Jarak dekat dengan pemain)
        if (camera.position.distanceTo(keyObject.position) < 1.5) {
            scene.remove(keyObject);
            keyObject = null;
            hasKey = true;
            document.getElementById("hud-key").innerText = "🔑 Kunci: 1 / 1 (Cari Pintu Ungu!)";
            document.getElementById("hud-key").style.color = "#2ed573";
        }
    }

    // Deteksi Mencapai Pintu Keluar
    if (camera.position.distanceTo(doorObject.position) < 1.5) {
        if (hasKey) {
            endGame(true, `Selamat ${playerName}! Kamu berhasil kabur dari koridor horor.`);
        } else {
            // Memberi tahu pemain jika belum ada kunci
            document.getElementById("hud-key").innerText = "⚠️ AMBIL KUNCI EMAS DULU!";
        }
    }

    prevTime = time;
    renderer.render(scene, camera);
}

function endGame(isWin, message) {
    gameActive = false;
    clearInterval(timerInterval);
    document.exitPointerLock();

    document.getElementById("game-ui").style.display = "none";
    document.getElementById("end-screen").style.display = "flex";

    const titleEl = document.getElementById("end-title");
    const msgEl = document.getElementById("end-message");

    if (isWin) {
        titleEl.innerText = "🎉 BERHASIL KABUR!";
        titleEl.style.color = "#2ed573";
    } else {
        titleEl.innerText = "💀 GAME OVER";
        titleEl.style.color = "#ff4757";
    }
    msgEl.innerText = message;
}

function restartGame() {
    document.getElementById("end-screen").style.display = "none";
    document.getElementById("menu-screen").style.display = "flex";
    if (renderer && renderer.domElement) {
        renderer.domElement.remove();
    }
}