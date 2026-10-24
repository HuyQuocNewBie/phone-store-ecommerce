const multer = require('multer');

const errorHandler = (err, req, res, next) => {
  // Bắt lỗi Multer (ví dụ: LIMIT_UNEXPECTED_FILE, LIMIT_FILE_SIZE, ...)
  if (err instanceof multer.MulterError) {
    let message = `Lỗi upload file: ${err.message}`;
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      message = `Lỗi upload file (Unexpected field): Trường file '${err.field || 'không xác định'}' không đúng với cấu hình Multer. Vui lòng kiểm tra lại key của FormData (yêu cầu 'Anh').`;
    } else if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'Lỗi upload file: Kích thước file vượt quá giới hạn cho phép (10MB).';
    }
    return res.status(400).json({
      success: false,
      message,
      errorCode: err.code
    });
  }

  const statusCode = err.statusCode || (res.statusCode && res.statusCode !== 200 ? res.statusCode : 500);

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
};

module.exports = errorHandler;
