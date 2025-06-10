import express from 'express';
import {
  getOrdersByDate,
  getOrdersBetweenDates,
  updateOrder,
  getPaymentMethods,
  deleteOrder,
  getCategorySalesReport,
  getDetailedCategorySalesReport,
  verifyCategoryPaymentTotals
} from "../controllers/ordersController.js";

const router = express.Router();


router.get("/day-report", getOrdersByDate);
router.get("/range-report", getOrdersBetweenDates);
router.put("/update", updateOrder);
router.get('/payment-methods', getPaymentMethods);
router.delete('/:orderId', deleteOrder);
router.get('/reports/category-sales', getCategorySalesReport);
router.get('/reports/category-sales/detailed', getDetailedCategorySalesReport);
router.get('/reports/category-sales-verification', verifyCategoryPaymentTotals);

export default router;