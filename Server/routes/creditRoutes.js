import express from 'express';
import {
  getAllCreditAccounts,
  createCreditAccount,
  adjustCredit,
  linkCategoryToCredit,
  unlinkCategoryFromCredit,
  getCreditTransactions,
  getAvailableCategories,
  getAllLinkedCategories
} from '../controllers/creditController.js';

const router = express.Router();

/**
 * @route GET /
 * @desc Get all credit accounts with linked categories
 * @access Private
 */
router.get('/', getAllCreditAccounts);

/**
 * @route POST /
 * @desc Create new credit account
 * @access Private
 */
router.post('/', createCreditAccount);

/**
 * @route POST /:accountId/adjust
 * @desc Manually adjust credit balance (add/subtract)
 * @access Private
 */
router.post('/:accountId/adjust', adjustCredit);

/**
 * @route POST /link-category
 * @desc Link category to credit account
 * @access Private
 */
router.post('/link-category', linkCategoryToCredit);

/**
 * @route DELETE /unlink-category
 * @desc Unlink category from credit account
 * @access Private
 */
router.delete('/unlink-category', unlinkCategoryFromCredit);

/**
 * @route GET /:accountId/transactions
 * @desc Get credit transactions for specific account with pagination
 * @access Private
 */
router.get('/:accountId/transactions', getCreditTransactions);

/**
 * @route GET /categories/available
 * @desc Get all categories that can be linked to credit accounts
 * @access Private
 */
router.get('/categories/available', getAvailableCategories);

/**
 * @route GET /categories/linked
 * @desc Get all currently linked categories
 * @access Private
 */
router.get('/categories/linked', getAllLinkedCategories);

export default router;