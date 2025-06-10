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
    const { page = 1, limit = 20, startDate, endDate, date } = req.query;
    
    const offset = (page - 1) * limit;
    
    // Build date filter and parameters correctly
    let dateFilter = '';
    let params = [accountId];
    
    if (startDate && endDate) {
      dateFilter = 'AND DATE(ct.created_at) BETWEEN $2 AND $3';
      params.push(startDate, endDate);
    } else if (date) {
      dateFilter = 'AND DATE(ct.created_at) = $2';
      params.push(date);
    }
    
    // Add limit and offset to params
    params.push(limit, offset);
    const limitParam = `$${params.length - 1}`;
    const offsetParam = `$${params.length}`;
    
   // In the getCreditTransactions function, modify the query to cast amount as numeric:

const query = `
  SELECT 
    ct.*,
    CAST(ct.amount AS DECIMAL(10,2)) as amount,  -- Ensure amount is numeric
    ca.name as account_name,
    o.id as order_number
  FROM credit_transactions ct
  LEFT JOIN credit_accounts ca ON ct.credit_account_id = ca.id
  LEFT JOIN orders o ON ct.order_id = o.id  
  WHERE ct.credit_account_id = $1 ${dateFilter}
  ORDER BY ct.created_at DESC 
  LIMIT ${limitParam} OFFSET ${offsetParam}
`;
    const { rows } = await pool.query(query, params);
    
    // Get total count with same date filter
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM credit_transactions ct 
      WHERE ct.credit_account_id = $1 ${dateFilter}
    `;
    
    // Use same params as main query but without limit/offset
    const countParams = params.slice(0, -2);
    
    const countResult = await pool.query(countQuery, countParams);
    
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
    console.error('Error details:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch credit transactions',
      details: error.message 
    });
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
export const processTicketSaleCredit = async (orderId, tickets, client, mealTotal = 0) => {
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
      const ticketAmount = ticket.quantity * ticket.price;
      
      if (creditDeductions.has(credit_account_id)) {
        creditDeductions.set(credit_account_id, {
          ...creditDeductions.get(credit_account_id),
          ticketAmount: creditDeductions.get(credit_account_id).ticketAmount + ticketAmount,
          totalTickets: creditDeductions.get(credit_account_id).totalTickets + ticket.quantity
        });
      } else {
        creditDeductions.set(credit_account_id, {
          accountId: credit_account_id,
          accountName: account_name,
          ticketAmount: ticketAmount,
          mealAmount: 0, // Will be distributed below
          categories: [category],
          totalTickets: ticket.quantity,
          currentBalance: parseFloat(balance)
        });
      }
    }
    
    // Distribute meal costs proportionally across credit accounts
    if (mealTotal > 0 && creditDeductions.size > 0) {
      const totalTicketAmount = Array.from(creditDeductions.values())
        .reduce((sum, deduction) => sum + deduction.ticketAmount, 0);
      
      for (const [accountId, deduction] of creditDeductions) {
        if (totalTicketAmount > 0) {
          // Distribute meal cost proportionally based on ticket amounts
          const proportionalMealAmount = (deduction.ticketAmount / totalTicketAmount) * mealTotal;
          deduction.mealAmount = proportionalMealAmount;
        }
      }
    }
    
    // Process all credit deductions - TRIGGER WILL HANDLE BALANCE UPDATES
    const creditTransactions = [];
    let totalCreditUsed = 0;
    
    for (const [accountId, deduction] of creditDeductions) {
      const totalDeductionAmount = -(deduction.ticketAmount + deduction.mealAmount); // Negative for deduction
      
      // Optional: Check for insufficient credit
      const balanceCheck = await client.query(
        'SELECT balance FROM credit_accounts WHERE id = $1',
        [accountId]
      );
      
      const currentBalance = parseFloat(balanceCheck.rows[0].balance);
      const newBalance = currentBalance + totalDeductionAmount; // amount is negative
      
      if (newBalance < 0) {
        console.warn(`⚠️ Credit account ${deduction.accountName} will go into debt: ${currentBalance} + (${totalDeductionAmount}) = ${newBalance}`);
        // Uncomment to prevent debt:
        // throw new Error(`Insufficient credit balance in account "${deduction.accountName}". Available: ${currentBalance}, Required: ${Math.abs(totalDeductionAmount)}`);
      }
      
      // Insert credit transaction - TRIGGER WILL UPDATE BALANCE AUTOMATICALLY
      const transactionResult = await client.query(
        `INSERT INTO credit_transactions 
         (credit_account_id, amount, transaction_type, description, order_id, created_at)
         VALUES ($1, $2, 'ticket_sale', $3, $4, CURRENT_TIMESTAMP)
         RETURNING id, amount`,
        [
          accountId,
          totalDeductionAmount, // Negative amount for deduction (tickets + meals)
          `Order sale: ${deduction.totalTickets} tickets (EGP ${deduction.ticketAmount.toFixed(2)}) + meals (EGP ${deduction.mealAmount.toFixed(2)}) from categories: ${deduction.categories.join(', ')}`,
          orderId
        ]
      );
      
      creditTransactions.push({
        transactionId: transactionResult.rows[0].id,
        accountId: accountId,
        accountName: deduction.accountName,
        ticketAmount: deduction.ticketAmount,
        mealAmount: deduction.mealAmount,
        totalAmount: Math.abs(totalDeductionAmount),
        categories: deduction.categories,
        ticketCount: deduction.totalTickets,
        newBalance: newBalance,
        wentIntoDebt: newBalance < 0
      });
      
      totalCreditUsed += Math.abs(totalDeductionAmount);
      
      console.log(`💳 Credit deducted from ${deduction.accountName}: EGP ${Math.abs(totalDeductionAmount).toFixed(2)} (${deduction.totalTickets} tickets: ${deduction.ticketAmount.toFixed(2)}, meals: ${deduction.mealAmount.toFixed(2)})`);
    }
    
    return {
      success: true,
      creditTransactions,
      totalCreditUsed,
      message: `Successfully processed ${creditTransactions.length} credit account(s) with total deduction of EGP ${totalCreditUsed.toFixed(2)} (including meals)`
    };
    
  } catch (error) {
    console.error('❌ Error in processTicketSaleCredit:', error);
    throw error;
  }
};

// Add new function to handle meal-only credit orders
export const processMealOnlyCredit = async (orderId, meals, client, defaultCreditAccountId = null) => {
  try {
    if (!meals || meals.length === 0) {
      return { success: true, creditTransactions: [], totalCreditUsed: 0 };
    }
    
    let mealTotal = 0;
    for (const meal of meals) {
      mealTotal += (meal.price || 0) * (meal.quantity || 0);
    }
    
    if (mealTotal <= 0) {
      return { success: true, creditTransactions: [], totalCreditUsed: 0 };  
    }
    
    // If no default credit account specified, use the first available one
    let creditAccountId = defaultCreditAccountId;
    if (!creditAccountId) {
      const accountQuery = await client.query(
        'SELECT id FROM credit_accounts ORDER BY id LIMIT 1'
      );
      
      if (accountQuery.rows.length === 0) {
        throw new Error('No credit accounts available for meal-only orders');
      }
      
      creditAccountId = accountQuery.rows[0].id;
    }
    
    // Get credit account details
    const accountQuery = await client.query(
      'SELECT id, name, balance FROM credit_accounts WHERE id = $1',
      [creditAccountId]
    );
    
    if (accountQuery.rows.length === 0) {
      throw new Error(`Credit account ${creditAccountId} not found`);
    }
    
    const account = accountQuery.rows[0];
    const deductionAmount = -mealTotal; // Negative for deduction
    const newBalance = parseFloat(account.balance) + deductionAmount;
    
    if (newBalance < 0) {
      console.warn(`⚠️ Credit account ${account.name} will go into debt: ${account.balance} + (${deductionAmount}) = ${newBalance}`);
    }
    
    // Insert credit transaction
    const transactionResult = await client.query(
      `INSERT INTO credit_transactions 
       (credit_account_id, amount, transaction_type, description, order_id, created_at)
       VALUES ($1, $2, 'meal_sale', $3, $4, CURRENT_TIMESTAMP)
       RETURNING id, amount`,
      [
        creditAccountId,
        deductionAmount,
        `Meal-only order: EGP ${mealTotal.toFixed(2)} (${meals.length} meal items)`,
        orderId
      ]
    );
    
    const creditTransaction = {
      transactionId: transactionResult.rows[0].id,
      accountId: creditAccountId,
      accountName: account.name,
      ticketAmount: 0,
      mealAmount: mealTotal,
      totalAmount: mealTotal,
      categories: ['meals'],
      ticketCount: 0,
      newBalance: newBalance,
      wentIntoDebt: newBalance < 0
    };
    
    console.log(`💳 Credit deducted from ${account.name}: EGP ${mealTotal.toFixed(2)} (meals only)`);
    
    return {
      success: true,
      creditTransactions: [creditTransaction],
      totalCreditUsed: mealTotal,
      message: `Successfully processed meal-only credit order with total deduction of EGP ${mealTotal.toFixed(2)}`
    };
    
  } catch (error) {
    console.error('❌ Error in processMealOnlyCredit:', error);
    throw error;
  }
};

// Get credit report
export const getCreditReport = async (req, res) => {
  try {
    const { startDate, endDate, date } = req.query;
    
    let dateFilter = '';
    const params = [];
    
    // Handle date filtering
    if (startDate && endDate) {
      dateFilter = 'AND DATE(ct.created_at) BETWEEN $1 AND $2';
      params.push(startDate, endDate);
    } else if (date) {
      dateFilter = 'AND DATE(ct.created_at) = $1';
      params.push(date);
    }
    
    // Get all credit accounts with their details
    const accountsQuery = `
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
        ) as linked_categories,
        COALESCE(
          SUM(
            CASE 
              WHEN ct.transaction_type = 'ticket_sale' AND ct.amount < 0 ${dateFilter.replace('AND', 'AND')}
              THEN ABS(ct.amount)
              ELSE 0 
            END
          ), 0
        ) as credit_used_in_period,
        COUNT(
          CASE 
            WHEN ct.id IS NOT NULL ${dateFilter.replace('AND', 'AND')}
            THEN 1 
            ELSE NULL 
          END
        ) as transactions_in_period
      FROM credit_accounts ca
      LEFT JOIN category_credit_accounts cca ON ca.id = cca.credit_account_id
      LEFT JOIN credit_transactions ct ON ca.id = ct.credit_account_id
      GROUP BY ca.id, ca.name, ca.balance, ca.description, ca.created_at, ca.updated_at
      ORDER BY ca.balance DESC, ca.name
    `;
    
    const { rows: accounts } = await pool.query(accountsQuery, params);
    
    // Calculate summary statistics
    const summary = {
      total_accounts: accounts.length,
      total_current_balance: accounts.reduce((sum, acc) => sum + parseFloat(acc.balance), 0),
      total_credit_used: accounts.reduce((sum, acc) => sum + parseFloat(acc.credit_used_in_period), 0),
      total_transactions: accounts.reduce((sum, acc) => sum + parseInt(acc.transactions_in_period), 0),
      accounts_in_debt: accounts.filter(acc => acc.balance < 0).length,
      accounts_with_surplus: accounts.filter(acc => acc.balance > 0).length,
      accounts_neutral: accounts.filter(acc => acc.balance === 0).length
    };
    
    // Get period-specific transaction details if needed
    const transactionsSummaryQuery = `
      SELECT 
        ca.id as account_id,
        ca.name as account_name,
        COUNT(ct.id) as transaction_count,
        COALESCE(SUM(CASE WHEN ct.amount > 0 THEN ct.amount ELSE 0 END), 0) as total_credits,
        COALESCE(SUM(CASE WHEN ct.amount < 0 THEN ABS(ct.amount) ELSE 0 END), 0) as total_debits,
        COALESCE(SUM(ct.amount), 0) as net_change
      FROM credit_accounts ca
      LEFT JOIN credit_transactions ct ON ca.id = ct.credit_account_id
      WHERE 1=1 ${dateFilter}
      GROUP BY ca.id, ca.name
      ORDER BY ca.name
    `;
    
    const { rows: transactionsSummary } = await pool.query(transactionsSummaryQuery, params);
    
    res.json({
      summary,
      accounts: accounts.map(account => ({
        ...account,
        balance: parseFloat(account.balance),
        credit_used_in_period: parseFloat(account.credit_used_in_period),
        transactions_in_period: parseInt(account.transactions_in_period),
        linked_categories: account.linked_categories || []
      })),
      transactions_summary: transactionsSummary.map(ts => ({
        ...ts,
        total_credits: parseFloat(ts.total_credits),
        total_debits: parseFloat(ts.total_debits),
        net_change: parseFloat(ts.net_change),
        transaction_count: parseInt(ts.transaction_count)
      })),
      report_generated: new Date().toISOString(),
      period: {
        start: startDate || date || 'All time',
        end: endDate || date || 'Present',
        is_range: !!(startDate && endDate)
      }
    });
    
  } catch (error) {
    console.error('Error generating credit report:', error);
    res.status(500).json({ error: 'Failed to generate credit report', details: error.message });
  }
};