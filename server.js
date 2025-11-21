const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// استخدم /tmp في Vercel
const uploadsDir = '/tmp/uploads';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// middleware
app.use(express.static(__dirname));
app.use('/uploads', express.static(uploadsDir));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// المسارات
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// رفع الملفات بدون multer
app.post('/upload', (req, res) => {
  try {
    // هذا مثال مبسط - في الواقع تحتاج لمعالجة الملفات بشكل صحيح
    res.json({ 
      message: 'تم رفع الملفات بنجاح (وضع تجريبي)',
      uploaded: 0,
      files: []
    });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ أثناء رفع الملفات' });
  }
});

app.get('/files', (req, res) => {
  try {
    fs.readdir(uploadsDir, (err, files) => {
      if (err) {
        return res.json([]);
      }
      res.json(files.map(file => ({ name: file, type: 'file' })));
    });
  } catch (error) {
    res.json([]);
  }
});

app.listen(PORT, () => {
  console.log(`الخادم يعمل على المنفذ ${PORT}`);
});

module.exports = app;
