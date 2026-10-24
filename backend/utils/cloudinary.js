const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const dotenv = require('dotenv');

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Use memory storage for buffer upload to Cloudinary
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // Limit 10MB
});

/**
 * Middleware upload ảnh đơn trực tiếp lên Cloudinary
 * Gán req.file.path = secure_url từ Cloudinary nếu upload thành công
 */
const uploadCloudinary = {
  single: (fieldname = 'Anh') => {
    const multerSingle = upload.single(fieldname);

    return (req, res, next) => {
      multerSingle(req, res, async (err) => {
        if (err) {
          if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_UNEXPECTED_FILE') {
              return res.status(400).json({
                success: false,
                message: `Lỗi upload: Tên trường file không hợp lệ (nhận '${err.field}', yêu cầu key '${fieldname}'). Vui lòng kiểm tra lại FormData key.`
              });
            }
            if (err.code === 'LIMIT_FILE_SIZE') {
              return res.status(400).json({
                success: false,
                message: 'Lỗi upload: Kích thước file vượt quá giới hạn cho phép (10MB).'
              });
            }
            return res.status(400).json({
              success: false,
              message: `Lỗi upload file (Multer): ${err.message}`
            });
          }
          return res.status(400).json({
            success: false,
            message: `Lỗi tải file: ${err.message}`
          });
        }

        if (!req.file) {
          return next();
        }

        try {
          const uploadStream = () => {
            return new Promise((resolve, reject) => {
              const stream = cloudinary.uploader.upload_stream(
                {
                  folder: 'products',
                  resource_type: 'auto'
                },
                (error, result) => {
                  if (error) return reject(error);
                  resolve(result);
                }
              );
              stream.end(req.file.buffer);
            });
          };

          const result = await uploadStream();
          req.file.path = result.secure_url;
          req.file.cloudinaryId = result.public_id;
          next();
        } catch (uploadError) {
          return res.status(500).json({
            success: false,
            message: `Lỗi upload lên Cloudinary: ${uploadError.message}`
          });
        }
      });
    };
  },

  array: (fieldname = 'Anh', maxCount = 5) => {
    const multerArray = upload.array(fieldname, maxCount);

    return (req, res, next) => {
      multerArray(req, res, async (err) => {
        if (err) {
          if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_UNEXPECTED_FILE') {
              return res.status(400).json({
                success: false,
                message: `Lỗi upload: Tên trường file không hợp lệ (nhận '${err.field}', yêu cầu key '${fieldname}'). Vui lòng kiểm tra lại FormData key.`
              });
            }
            if (err.code === 'LIMIT_FILE_SIZE') {
              return res.status(400).json({
                success: false,
                message: 'Lỗi upload: Kích thước file vượt quá giới hạn cho phép (10MB).'
              });
            }
            return res.status(400).json({
              success: false,
              message: `Lỗi upload file (Multer): ${err.message}`
            });
          }
          return res.status(400).json({
            success: false,
            message: `Lỗi tải file: ${err.message}`
          });
        }

        if (!req.files || req.files.length === 0) {
          return next();
        }

        try {
          const uploadStream = (fileBuffer) => {
            return new Promise((resolve, reject) => {
              const stream = cloudinary.uploader.upload_stream(
                {
                  folder: 'products',
                  resource_type: 'auto'
                },
                (error, result) => {
                  if (error) return reject(error);
                  resolve(result);
                }
              );
              stream.end(fileBuffer);
            });
          };

          await Promise.all(
            req.files.map(async (file) => {
              const result = await uploadStream(file.buffer);
              file.path = result.secure_url;
              file.cloudinaryId = result.public_id;
              return result.secure_url;
            })
          );

          if (req.files.length > 0) {
            req.file = req.files[0];
          }

          next();
        } catch (uploadError) {
          return res.status(500).json({
            success: false,
            message: `Lỗi upload lên Cloudinary: ${uploadError.message}`
          });
        }
      });
    };
  }
};

module.exports = {
  cloudinary,
  uploadCloudinary,
  upload
};
