import pool from '../db.js';

// Get all credit accounts with their linked categories
export const getAllCreditAccounts = async (req, res) => {
  try {
    const query = `
      SELECT 
        ca.id,
        ca.name,
        ca.balance,
        ca.description,
        ca.created_at,
        ca.updated_at,
        COALESCE(
          JSON_AGG(
            DISTINCT cca.category_name
          ) FILTER (WHERE cca.category_name IS NOT NULL),
          '[]'::json
        ) as linked_categories
      FROM credit_accounts ca
      LEFT JOIN category_credit_accounts cca ON ca.id = cca.credit_account_id
      GROUP BY ca.id, ca.name, ca.balance, ca.description, ca.created_at, ca.updated_at
      ORDER BY ca.name;
    `;
    
    const { rows } = await pool.query(query);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching credit accounts:', error);
    res.status(500).json({ error: 'Failed to fetch credit accounts' });
  }
};

// Create new credit account
export const createCreditAccount = async (req, res) => {
  try {
    const { name, description, initialBalance = 0 } = req.body;
    
    if (!name?.trim()) {
      return res.status(400).json({ error: 'Account name is required' });
    }
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Create credit account
      const accountResult = await client.query(
        `INSERT INTO credit_accounts (name, balance, description) 
         VALUES ($1, $2, $3) RETURNING *`,
        [name.trim(), initialBalance, description?.trim() || null]
      );
      
      const account = accountResult.rows[0];
      
      // Add initial balance transaction if not zero
      if (initialBalance !== 0) {
        await client.query(
          `INSERT INTO credit_transactions (credit_account_id, amount, transaction_type, description)
           VALUES ($1, $2, 'initial_balance', 'Initial account balance')`,
          [account.id, initialBalance]
        );
      }
      
      await client.query('COMMIT');
      res.status(201).json(account);
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Error creating credit account:', error);
    
    if (error.code === '23505') { // Unique constraint violation
      res.status(409).json({ error: 'Credit account name already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create credit account' });
    }
  }
};

// Manual credit adjustment (add/subtract)
export const adjustCredit = async (req, res) => {
  try {
    const { accountId } = req.params;
    const { amount, description, transactionType = 'manual_adjustment' } = req.body;
    const userId = req.user?.id || 1; // Default to user 1 for now
    
    if (!amount || isNaN(amount)) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Verify account exists
      const accountCheck = await client.query(
        'SELECT id, name, balance FROM credit_accounts WHERE id = $1',
        [accountId]
      );
      
      if (accountCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Credit account not found' });
      }
      
      const account = accountCheck.rows[0];
      
      // Create transaction record (trigger will update balance)
      const transactionResult = await client.query(
        `INSERT INTO credit_transactions 
         (credit_account_id, amount, transaction_type, description, user_id)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [accountId, amount, transactionType, description?.trim() || null, userId]
      );
      
      // Get updated balance
      const updatedAccount = await client.query(
        'SELECT balance FROM credit_accounts WHERE id = $1',
        [accountId]
      );
      
      await client.query('COMMIT');
      
      res.json({
        message: 'Credit adjusted successfully',
        transaction: transactionResult.rows[0],
        previousBalance: account.balance,
        newBalance: updatedAccount.rows[0].balance
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Error adjusting credit:', error);
    res.status(500).json({ error: 'Failed to adjust credit' });
  }
};

// Link category to credit account
export const linkCategoryToCredit = async (req, res) => {
  try {
    const { categoryName, creditAccountId } = req.body;
    
    if (!categoryName?.trim() || !creditAccountId) {
      return res.status(400).json({ error: 'Category name and credit account ID are required' });
    }
    
    // Check if category exists in ticket_types
    const categoryCheck = await pool.query(
      'SELECT DISTINCT category FROM ticket_types WHERE category = $1',
      [categoryName.trim()]
    );
    
    if (categoryCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found in ticket types' });
    }
    
    // Check if credit account exists
    const accountCheck = await pool.query(
      'SELECT id, name FROM credit_accounts WHERE id = $1',
      [creditAccountId]
    );
    
    if (accountCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Credit account not found' });
    }
    
    // Link category to credit account
    const result = await pool.query(
      `INSERT INTO category_credit_accounts (category_name, credit_account_id)
       VALUES ($1, $2) 
       ON CONFLICT (category_name, credit_account_id) DO NOTHING
       RETURNING *`,
      [categoryName.trim(), creditAccountId]
    );
    
    if (result.rows.length === 0) {
      return res.status(409).json({ error: 'Category is already linked to this credit account' });
    }
    
    res.status(201).json({
      message: `Category "${categoryName}" linked to credit account "${accountCheck.rows[0].name}"`,
      link: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error linking category to credit:', error);
    res.status(500).json({ error: 'Failed to link category to credit account' });
  }
};

// Unlink category from credit account
export const unlinkCategoryFromCredit = async (req, res) => {
  try {
    const { categoryName, creditAccountId } = req.body;
    
    if (!categoryName?.trim() || !creditAccountId) {
      return res.status(400).json({ error: 'Category name and credit account ID are required' });
    }
    
    const result = await pool.query(
      `DELETE FROM category_credit_accounts 
       WHERE category_name = $1 AND credit_account_id = $2
       RETURNING *`,
      [categoryName.trim(), creditAccountId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category link not found' });
    }
    
    res.json({
      message: `Category "${categoryName}" unlinked from credit account`,
      unlinked: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error unlinking category from credit:', error);
    res.status(500).json({ error: 'Failed to unlink category from credit account' });
  }
};

// Get credit transactions with pagination
export const getCreditTransactions = async (req, res) => {
  try {
    const { accountId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    
    const offset = (page - 1) * limit;
    
    const query = `
      SELECT 
        ct.*,
        ca.name as account_name,
        o.id as order_number
      FROM credit_transactions ct
      LEFT JOIN credit_accounts ca ON ct.credit_account_id = ca.id
      LEFT JOIN orders o ON ct.order_id = o.id
      WHERE ct.credit_account_id = $1
      ORDER BY ct.created_at DESC 
      LIMIT $2 OFFSET $3
    `;
    
    const { rows } = await pool.query(query, [accountId, limit, offset]);
    
    // Get total count
    const countResult = await pool.query(
      'SELECT COUNT(*) as total FROM credit_transactions WHERE credit_account_id = $1',
      [accountId]
    );
    
    res.json({
      transactions: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].total),
        totalPages: Math.ceil(countResult.rows[0].total / limit)
      }
    });
    
  } catch (error) {
    console.error('Error fetching credit transactions:', error);
    res.status(500).json({ error: 'Failed to fetch credit transactions' });
  }
};

// Get categories that can be linked to credit accounts
export const getAvailableCategories = async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT tt.category
      FROM ticket_types tt
      ORDER BY tt.category
    `;
    
    const { rows } = await pool.query(query);
    res.json(rows.map(row => row.category));
  } catch (error) {
    console.error('Error fetching available categories:', error);
    res.status(500).json({ error: 'Failed to fetch available categories' });
  }
};

// Get all linked categories
export const getAllLinkedCategories = async (req, res) => {
  try {
    const query = `
      SELECT 
        cca.category_name,
        ca.id as credit_account_id,
        ca.name as credit_account_name,
        ca.balance
      FROM category_credit_accounts cca
      JOIN credit_accounts ca ON cca.credit_account_id = ca.id
      ORDER BY cca.category_name
    `;
    
    const { rows } = await pool.query(query);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching linked categories:', error);
    res.status(500).json({ error: 'Failed to fetch linked categories' });
  }
};

// Process credit deduction for ticket sales (helper function for ticket controller)
export const processTicketSaleCredit = async (orderId, tickets, client) => {
  try {
    const creditDeductions = new Map();
    
    // Group tickets by category and calculate total amounts
    for (const ticket of tickets) {
      const category = ticket.category;
      
      // Check if this category is linked to a credit account
      const creditQuery = await client.query(
        `SELECT cca.credit_account_id, ca.name as account_name, ca.balance
         FROM category_credit_accounts cca
         JOIN credit_accounts ca ON cca.credit_account_id = ca.id
         WHERE cca.category_name = $1`,
        [category]
      );
      
      if (creditQuery.rows.length === 0) continue; // No credit account linked
      
      const { credit_account_id, account_name, balance } = creditQuery.rows[0];
      
      // Calculate deduction amount (negative value for deduction)
      const deductionAmount = -(ticket.quantity * ticket.price);
      
      if (creditDeductions.has(credit_account_id)) {
        creditDeductions.set(credit_account_id, {
          ...creditDeductions.get(credit_account_id),
          amount: creditDeductions.get(credit_account_id).amount + deductionAmount,
          totalTickets: creditDeductions.get(credit_account_id).totalTickets + ticket.quantity
        });
      } else {
        creditDeductions.set(credit_account_id, {
          accountId: credit_account_id,
          accountName: account_name,
          amount: deductionAmount,
          categories: [category],
          totalTickets: ticket.quantity,
          currentBalance: parseFloat(balance)
        });
      }
    }
    
    // Process all credit deductions
    const creditTransactions = [];
    let totalCreditUsed = 0;
    
    for (const [accountId, deduction] of creditDeductions) {
      // Create credit transaction (negative amount = deduction)
      const transactionResult = await client.query(
        `INSERT INTO credit_transactions 
         (credit_account_id, amount, transaction_type, description, order_id)
         VALUES ($1, $2, 'ticket_sale', $3, $4) RETURNING *`,
        [
          accountId,
          deduction.amount,
          `${deduction.totalTickets} tickets sold for categories: ${deduction.categories.join(', ')}`,
          orderId
        ]
      );
      
      // Calculate actual credit used (the positive amount for payment record)
      const creditUsedForPayment = Math.abs(deduction.amount);
      totalCreditUsed += creditUsedForPayment;
      
      // Add CREDIT payment to your existing payments table
      await client.query(
        `INSERT INTO payments (order_id, method, amount, reference)
         VALUES ($1, 'CREDIT'::payment_method, $2, $3)`,
        [orderId, creditUsedForPayment, deduction.accountName]
      );
      
      creditTransactions.push({
        ...transactionResult.rows[0],
        accountName: deduction.accountName,
        creditUsed: creditUsedForPayment,
        newBalance: deduction.currentBalance + deduction.amount, // amount is negative
        wentIntoDebt: (deduction.currentBalance + deduction.amount) < 0
      });
    }
    
    return { creditTransactions, totalCreditUsed };
    
  } catch (error) {
    console.error('Error processing ticket sale credit:', error);
    throw error;
  }
};