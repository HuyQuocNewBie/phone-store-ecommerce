const express = require('express');
const router = express.Router();
const manufacturerController = require('../../controllers/admin/manufacturerController');

// GET /api/v1/admin/manufacturers
router.get('/', manufacturerController.getAllManufacturers);

// GET /api/v1/admin/manufacturers/:id
router.get('/:id', manufacturerController.getManufacturerById);

// POST /api/v1/admin/manufacturers
router.post('/', manufacturerController.createManufacturer);

// PUT /api/v1/admin/manufacturers/:id
router.put('/:id', manufacturerController.updateManufacturer);

// DELETE /api/v1/admin/manufacturers/:id
router.delete('/:id', manufacturerController.deleteManufacturer);

module.exports = router;
