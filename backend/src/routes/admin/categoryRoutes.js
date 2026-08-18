const express = require('express');
const router = express.Router();
const categoryController = require('../../controllers/admin/categoryController');

// GET /api/v1/admin/categories
router.get('/', categoryController.getAllCategories);

// GET /api/v1/admin/categories/:id
router.get('/:id', categoryController.getCategoryById);

// POST /api/v1/admin/categories
router.post('/', categoryController.createCategory);

// PUT /api/v1/admin/categories/:id
router.put('/:id', categoryController.updateCategory);

// DELETE /api/v1/admin/categories/:id
router.delete('/:id', categoryController.deleteCategory);

module.exports = router;
