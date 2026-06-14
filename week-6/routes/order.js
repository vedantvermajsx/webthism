const express = require('express');
const router = express.Router();
const {
    createOrder,
    getMyOrders,
    getOrderById,
    confirmPayment,
    updateOrderStatus,
    cancelOrder,
    getAllOrders
} = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/auth');
const { validate, orderSchema } = require('../middleware/validation');

router.use(protect);

router.post('/', validate(orderSchema), createOrder);
router.get('/', getMyOrders);
router.get('/admin/all', authorize('admin'), getAllOrders);
router.get('/:id', getOrderById);
router.put('/:id/pay', confirmPayment);
router.put('/:id/status', authorize('admin'), updateOrderStatus);
router.put('/:id/cancel', cancelOrder);

module.exports = router;
