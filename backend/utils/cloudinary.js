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
  single: (fieldname) => {
    const multerSingle = upload.single(fieldname);

    return (req, res, next) => {
      multerSingle(req, res, async (err) => {
        if (err) {
          return next(err);
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
          return next(uploadError);
        }
      });
    };
  }
};

module.exports = {
  cloudinary,
  uploadCloudinary
};
