const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// استخدم /tmp في Vercel للملفات المؤقتة
const uploadsDir = '/tmp/uploads';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// تخزين الأجهزة المتصلة والأكواد
const connectedDevices = new Map();
const deviceFiles = new Map();

// إنشاء رمز مكون من 6 أرقام
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// تنظيف الأكواد المنتهية
setInterval(() => {
  const now = Date.now();
  for (const [code, device] of connectedDevices.entries()) {
    if (now - device.createdAt > 10 * 60 * 1000) { // 10 دقائق
      connectedDevices.delete(code);
      deviceFiles.delete(code);
    }
  }
}, 60000);

// إعداد multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const code = req.body.deviceCode;
    const deviceUploadDir = path.join(uploadsDir, code);
    if (!fs.existsSync(deviceUploadDir)) {
      fs.mkdirSync(deviceUploadDir, { recursive: true });
    }
    cb(null, deviceUploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExt = path.extname(file.originalname);
    cb(null, uniqueSuffix + fileExt);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('يسمح برفع الصور وملفات PDF فقط!'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1000
  }
});

// middleware
app.use(express.static(__dirname));
app.use('/uploads', express.static(uploadsDir));
app.use(express.json());

// المسارات
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// إنشاء رمز جديد
app.post('/api/generate-code', (req, res) => {
  const code = generateCode();
  connectedDevices.set(code, {
    createdAt: Date.now(),
    devices: []
  });
  deviceFiles.set(code, []);
  
  res.json({ code: code });
});

// الانضمام برمز
app.post('/api/join', (req, res) => {
  const { code } = req.body;
  
  if (!connectedDevices.has(code)) {
    return res.status(400).json({ error: 'الرمز غير صحيح' });
  }
  
  const deviceInfo = {
    id: Math.random().toString(36).substr(2, 9),
    joinedAt: Date.now()
  };
  
  connectedDevices.get(code).devices.push(deviceInfo);
  
  res.json({ 
    success: true,
    message: 'تم الربط بنجاح'
  });
});

// رفع الملفات
app.post('/upload', upload.array('files', 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'لم يتم رفع أي ملفات' });
    }
    
    const code = req.body.deviceCode;
    if (!code || !connectedDevices.has(code)) {
      return res.status(400).json({ error: 'الرمز غير صحيح' });
    }
    
    const files = req.files.map(file => ({
      name: file.filename,
      originalName: file.originalname,
      type: file.mimetype.startsWith('image/') ? 'image' : 'pdf',
      uploadedAt: new Date().toISOString()
    }));
    
    // حفظ الملفات للرمز
    deviceFiles.set(code, [...(deviceFiles.get(code) || []), ...files]);
    
    res.json({ 
      message: 'تم رفع الملفات بنجاح',
      uploaded: req.files.length,
      files: files
    });
  } catch (error) {
    console.error('Error uploading files:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء رفع الملفات' });
  }
});

// الحصول على الملفات
app.get('/api/files', (req, res) => {
  const { code } = req.query;
  
  if (!code || !connectedDevices.has(code)) {
    return res.status(400).json({ error: 'الرمز غير صحيح' });
  }
  
  const files = deviceFiles.get(code) || [];
  res.json(files);
});

// الحصول على معلومات الجهاز
app.get('/api/device-info', (req, res) => {
  const { code } = req.query;
  
  if (!code || !connectedDevices.has(code)) {
    return res.status(400).json({ error: 'الرمز غير صحيح' });
  }
  
  const device = connectedDevices.get(code);
  res.json({
    code: code,
    deviceCount: device.devices.length,
    createdAt: device.createdAt
  });
});

app.listen(PORT, () => {
  console.log(`الخادم يعمل على المنفذ ${PORT}`);
});

module.exports = app;
