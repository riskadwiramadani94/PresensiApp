const faceapi = require('../../node_modules/@vladmandic/face-api/dist/face-api.node-wasm.js');
const { Canvas, Image, ImageData, loadImage } = require('canvas');
const { getConnection } = require('../config/database');
const path = require('path');
const fs = require('fs');

faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

let modelsLoaded = false;

const loadModels = async () => {
  if (modelsLoaded) return true;
  try {
    await faceapi.tf.ready();
    const modelsPath = path.join(__dirname, '../../models');
    await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelsPath);
    await faceapi.nets.faceLandmark68Net.loadFromDisk(modelsPath);
    await faceapi.nets.faceRecognitionNet.loadFromDisk(modelsPath);
    modelsLoaded = true;
    console.log('✅ Face API models loaded');
    return true;
  } catch (err) {
    console.error('❌ Failed to load Face API models:', err.message);
    return false;
  }
};

loadModels();

// Validasi wajah: bersih, tidak ada aksesoris, hanya 1 wajah
const validateFace = async (imagePath) => {
  const img = await loadImage(imagePath);

  // Deteksi semua wajah
  const allDetections = await faceapi.detectAllFaces(img).withFaceLandmarks();

  if (allDetections.length === 0) {
    return { valid: false, message: 'Wajah tidak terdeteksi' };
  }

  if (allDetections.length > 1) {
    return { valid: false, message: 'Hanya 1 wajah yang diizinkan' };
  }

  const detection = allDetections[0];
  const landmarks = detection.landmarks;
  const positions = landmarks.positions;

  // Cek ukuran wajah (terlalu jauh)
  const box = detection.detection.box;
  const imgWidth = img.width;
  const faceRatio = box.width / imgWidth;
  if (faceRatio < 0.15) {
    return { valid: false, message: 'Dekatkan wajah ke kamera' };
  }

  // Cek kemiringan wajah (landmark mata kiri & kanan)
  const leftEye = landmarks.getLeftEye();
  const rightEye = landmarks.getRightEye();
  const leftEyeCenter = {
    x: leftEye.reduce((s, p) => s + p.x, 0) / leftEye.length,
    y: leftEye.reduce((s, p) => s + p.y, 0) / leftEye.length,
  };
  const rightEyeCenter = {
    x: rightEye.reduce((s, p) => s + p.x, 0) / rightEye.length,
    y: rightEye.reduce((s, p) => s + p.y, 0) / rightEye.length,
  };

  // Cek kemiringan kepala (dy tidak boleh terlalu besar)
  const eyeDy = Math.abs(rightEyeCenter.y - leftEyeCenter.y);
  const eyeDx = Math.abs(rightEyeCenter.x - leftEyeCenter.x);
  const tiltAngle = Math.atan2(eyeDy, eyeDx) * (180 / Math.PI);
  if (tiltAngle > 20) {
    return { valid: false, message: 'Luruskan posisi kepala' };
  }

  // Cek masker: landmark mulut harus terdeteksi normal
  const mouth = landmarks.getMouth();
  const mouthTop = mouth[3]; // titik atas mulut
  const mouthBottom = mouth[9]; // titik bawah mulut
  const mouthOpenness = Math.abs(mouthBottom.y - mouthTop.y);
  const nose = landmarks.getNose();
  const noseBottom = nose[nose.length - 1];

  // Jarak hidung ke mulut harus wajar
  const noseToMouth = Math.abs(noseBottom.y - mouthTop.y);
  if (noseToMouth < 2) {
    return { valid: false, message: 'Lepas masker' };
  }

  // Cek kacamata: area mata harus cukup terbuka
  const leftEyeHeight = Math.max(...leftEye.map(p => p.y)) - Math.min(...leftEye.map(p => p.y));
  const rightEyeHeight = Math.max(...rightEye.map(p => p.y)) - Math.min(...rightEye.map(p => p.y));
  const avgEyeHeight = (leftEyeHeight + rightEyeHeight) / 2;

  if (avgEyeHeight < 2) {
    return { valid: false, message: 'Lepas kacamata atau buka mata lebih lebar' };
  }

  return { valid: true, message: 'OK' };
};

const getDescriptor = async (imagePath) => {
  const img = await loadImage(imagePath);
  const detection = await faceapi
    .detectSingleFace(img)
    .withFaceLandmarks()
    .withFaceDescriptor();
  return detection ? Array.from(detection.descriptor) : null;
};

// GET /api/face/status?user_id=xxx
const getFaceStatus = async (req, res) => {
  try {
    const { user_id } = req.query;
    if (!user_id) return res.json({ success: false, message: 'user_id diperlukan' });

    const db = await getConnection();
    const [rows] = await db.execute(
      'SELECT face_setup_at FROM users WHERE id_user = ?',
      [user_id]
    );

    if (!rows.length) return res.json({ success: false, message: 'User tidak ditemukan' });

    return res.json({
      success: true,
      face_registered: rows[0].face_setup_at !== null,
      face_setup_at: rows[0].face_setup_at
    });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

// POST /api/face/enroll
const enrollFace = async (req, res) => {
  const fotoFile = req.file;
  try {
    const { user_id } = req.body;
    if (!user_id || !fotoFile) {
      return res.json({ success: false, message: 'user_id dan foto wajah diperlukan' });
    }

    const ready = await loadModels();
    if (!ready) return res.json({ success: false, message: 'Model belum siap, coba lagi' });

    // Validasi wajah bersih
    const validation = await validateFace(fotoFile.path);
    if (!validation.valid) {
      fs.unlinkSync(fotoFile.path);
      return res.json({ success: false, message: validation.message });
    }

    const descriptor = await getDescriptor(fotoFile.path);
    fs.unlinkSync(fotoFile.path);

    if (!descriptor) {
      return res.json({ success: false, message: 'Gagal memproses wajah, coba lagi' });
    }

    const db = await getConnection();
    await db.execute(
      'UPDATE users SET face_embedding = ?, face_setup_at = NOW() WHERE id_user = ?',
      [JSON.stringify(descriptor), user_id]
    );

    return res.json({ success: true, message: 'Wajah berhasil didaftarkan' });
  } catch (error) {
    if (fotoFile?.path && fs.existsSync(fotoFile.path)) fs.unlinkSync(fotoFile.path);
    console.error('Enroll face error:', error);
    return res.json({ success: false, message: 'Gagal mendaftarkan wajah: ' + error.message });
  }
};

// POST /api/face/verify
const verifyFace = async (req, res) => {
  const fotoFile = req.file;
  try {
    const { user_id } = req.body;
    if (!user_id || !fotoFile) {
      return res.json({ success: false, message: 'user_id dan foto wajah diperlukan' });
    }

    const ready = await loadModels();
    if (!ready) return res.json({ success: false, message: 'Model belum siap' });

    const db = await getConnection();
    const [rows] = await db.execute(
      'SELECT face_embedding FROM users WHERE id_user = ?',
      [user_id]
    );

    if (!rows.length || !rows[0].face_embedding) {
      if (fotoFile?.path && fs.existsSync(fotoFile.path)) fs.unlinkSync(fotoFile.path);
      return res.json({ success: false, face_not_registered: true, message: 'Wajah belum terdaftar' });
    }

    // Validasi wajah bersih dulu
    const validation = await validateFace(fotoFile.path);
    if (!validation.valid) {
      fs.unlinkSync(fotoFile.path);
      return res.json({ success: false, match: false, message: validation.message });
    }

    const savedDescriptor = new Float32Array(JSON.parse(rows[0].face_embedding));
    const currentDescriptor = await getDescriptor(fotoFile.path);
    fs.unlinkSync(fotoFile.path);

    if (!currentDescriptor) {
      return res.json({ success: false, match: false, message: 'Wajah tidak terdeteksi' });
    }

    const distance = faceapi.euclideanDistance(savedDescriptor, new Float32Array(currentDescriptor));
    const confidence = Math.max(0, Math.round((1 - distance) * 100));
    const isMatch = distance < 0.4;

    return res.json({
      success: true,
      match: isMatch,
      confidence,
      distance: parseFloat(distance.toFixed(4))
    });
  } catch (error) {
    if (fotoFile?.path && fs.existsSync(fotoFile.path)) fs.unlinkSync(fotoFile.path);
    console.error('Verify face error:', error);
    return res.json({ success: false, message: 'Gagal verifikasi wajah: ' + error.message });
  }
};

// POST /api/face/validate - cek wajah bersih tanpa enroll
const validateFaceOnly = async (req, res) => {
  const fotoFile = req.file;
  try {
    const ready = await loadModels();
    if (!ready) return res.json({ valid: false, message: 'Model belum siap' });

    const validation = await validateFace(fotoFile.path);
    fs.unlinkSync(fotoFile.path);
    return res.json(validation);
  } catch (error) {
    if (fotoFile?.path && fs.existsSync(fotoFile.path)) fs.unlinkSync(fotoFile.path);
    return res.json({ valid: false, message: 'Gagal memvalidasi wajah' });
  }
};

module.exports = { enrollFace, verifyFace, getFaceStatus, validateFaceOnly };
