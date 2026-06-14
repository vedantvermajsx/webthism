const express = require('express');
const router = express.Router();
const {
    getProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct
} = require('../controllers/productController');
const { protect, authorize } = require('../middleware/auth');
const { validate, productSchema } = require('../middleware/validation');

router.get('/', getProducts);
router.get('/:id', getProductById);

router.post('/', protect, authorize('admin'), validate(productSchema), createProduct);
router.put('/:id', protect, authorize('admin'), updateProduct);
router.delete('/:id', protect, authorize('admin'), deleteProduct);

module.exports = router;
