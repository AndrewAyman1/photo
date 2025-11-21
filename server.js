const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// إنشاء مجلد التحميلات إذا لم يكن موجوداً
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

// إعداد multer لتخزين الملفات
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        // إضافة الطابع الزمني لاسم الملف لتجنب التكرار
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        // الحفاظ على امتداد الملف الأصلي
        const fileExt = path.extname(file.originalname);
        cb(null, uniqueSuffix + fileExt);
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: function (req, file, cb) {
        // قبول الصور وملفات PDF فقط
        if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('يسمح برفع الصور وملفات PDF فقط!'), false);
        }
    },
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB كحد أقصى
    }
});

// خدمة الملفات الثابتة
app.use(express.static(__dirname));
app.use('/uploads', express.static(uploadsDir));

// المسار الرئيسي
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// رفع الملفات
app.post('/upload', upload.array('files', 10), (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'لم يتم رفع أي ملفات' });
        }
        
        res.json({ 
            message: 'تم رفع الملفات بنجاح',
            uploaded: req.files.length,
            files: req.files.map(file => file.filename)
        });
    } catch (error) {
        console.error('Error uploading files:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء رفع الملفات' });
    }
});

// الحصول على قائمة الملفات المرفوعة
app.get('/files', (req, res) => {
    try {
        fs.readdir(uploadsDir, (err, files) => {
            if (err) {
                console.error('Error reading uploads directory:', err);
                return res.status(500).json({ error: 'حدث خطأ أثناء قراءة الملفات' });
            }
            
            // تصفية الملفات لعرض الصور وملفات PDF فقط
            const allowedFiles = files.map(file => {
                const ext = path.extname(file).toLowerCase();
                if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].includes(ext)) {
                    return { name: file, type: 'image' };
                } else if (ext === '.pdf') {
                    return { name: file, type: 'pdf' };
                }
                return null;
            }).filter(file => file !== null);
            
            res.json(allowedFiles);
        });
    } catch (error) {
        console.error('Error getting files:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء جلب الملفات' });
    }
});

// تشغيل الخادم
app.listen(PORT, () => {
    console.log(`الخادم يعمل على المنفذ ${PORT}`);
    console.log(`افتح http://localhost:${PORT} في المتصفح`);
});

module.exports = app;