import express from 'express';
import {
  getOrdersByDate,
  getOrdersBetweenDates,
  updateOrder,
  getPaymentMethods,
  deleteOrder
} from "../controllers/ordersController.js";

const router = express.Router();


router.get("/day-report", getOrdersByDate);
router.get("/range-report", getOrdersBetweenDates);
router.put("/update", updateOrder);
router.get('/payment-methods', getPaymentMethods);
router.delete('/:orderId', deleteOrder);

export default router;