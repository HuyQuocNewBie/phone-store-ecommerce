const express = require('express');
const router = express.Router();
const userController = require('../../controllers/admin/userController');

// GET /api/v1/admin/users
router.get('/', userController.getAllUsers);

// GET /api/v1/admin/users/:id
router.get('/:id', userController.getUserById);

// PUT /api/v1/admin/users/:id
router.put('/:id', userController.updateUser);

// DELETE /api/v1/admin/users/:id
router.delete('/:id', userController.deleteUser);

module.exports = router;
