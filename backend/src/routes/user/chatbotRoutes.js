const express = require('express');
const router = express.Router();
const chatbotController = require('../../controllers/user/chatbotController');

// POST /api/v1/chatbot/message - Gửi tin nhắn trò chuyện với Gemini AI (Function Calling)
router.post('/message', chatbotController.sendMessage);

module.exports = router;

