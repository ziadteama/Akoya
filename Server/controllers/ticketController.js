import pool from "../db.js";
import { processTicketSaleCredit } from './creditController.js';


export const getAllTickets = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM tickets");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};

export const getAllTicketTypes = async (req, res) => {
  try {
    const { archived } = req.query;

    let query = "SELECT * FROM ticket_types";
    let values = [];

    if (archived !== undefined) {
      query += " WHERE archived = $1";
      values.push(archived === "true");
    }

    query += " ORDER BY id";

    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Server error" });
  }
};


export const sellTickets = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { tickets = [], user_id, description, payments = [], meals = [] } = req.body;

    // Validate and categorize tickets
    let ticketTotal = 0;
    let mealTotal = 0;
    const validTickets = [];
    let creditCategories = new Set();
    let nonCreditCategories = new Set();

    for (const ticket of tickets) {
      // Get ticket type with credit account info
      const { rows } = await client.query(
        `SELECT 
           tt.*,
           cca.credit_account_id,
           ca.name as credit_account_name,
           ca.balance as credit_balance
         FROM ticket_types tt
         LEFT JOIN category_credit_accounts cca ON tt.category = cca.category_name
         LEFT JOIN credit_accounts ca ON cca.credit_account_id = ca.id
         WHERE tt.id = $1`,
        [ticket.ticket_type_id]
      );
      
      if (rows.length === 0) {
        throw new Error(`Invalid ticket type ID: ${ticket.ticket_type_id}`);
      }
      
      const ticketType = rows[0];
      const ticketAmount = ticketType.price * ticket.quantity;
      ticketTotal += ticketAmount;
      
      const ticketData = {
        ...ticket,
        price: ticketType.price,
        category: ticketType.category,
        subcategory: ticketType.subcategory,
        total: ticketAmount,
        is_credit_enabled: !!ticketType.credit_account_id,
        credit_account_id: ticketType.credit_account_id,
        credit_account_name: ticketType.credit_account_name,
        credit_balance: ticketType.credit_balance
      };

      validTickets.push(ticketData);

      // Track credit vs non-credit categories
      if (ticketData.is_credit_enabled) {
        creditCategories.add(ticketData.category);
      } else {
        nonCreditCategories.add(ticketData.category);
      }
    }

    // Calculate meal total
    if (meals && Array.isArray(meals)) {
      for (const meal of meals) {
        mealTotal += (meal.price || 0) * (meal.quantity || 0);
      }
    }

    const grossTotal = ticketTotal + mealTotal;

    // For meals-only orders, skip credit/cash category checking
    const hasTickets = tickets && tickets.length > 0;
    const hasMeals = meals && meals.length > 0;

    // Only check for mixed credit/non-credit if there are actual tickets
    if (hasTickets && creditCategories.size > 0 && nonCreditCategories.size > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: "Cannot mix credit-enabled and cash-only tickets in the same order",
        type: "MIXED_PAYMENT_ERROR",
        creditCategories: Array.from(creditCategories),
        nonCreditCategories: Array.from(nonCreditCategories)
      });
    }

    // For meals-only orders, treat as cash-only
    const isMealsOnly = !hasTickets && hasMeals;
    const isCredit = hasTickets && creditCategories.size > 0;
    const isPostponedPayment = payments.some(p => p.method === 'postponed');

    // Create order
    const orderResult = await client.query(
      `INSERT INTO orders (user_id, description, gross_total, total_amount, created_at)
       VALUES ($1, $2, $3, $3, CURRENT_TIMESTAMP)
       RETURNING id`,
      [user_id, description || (isCredit ? 'Credit sale' : 'Cash sale'), grossTotal]
    );
    
    const orderId = orderResult.rows[0].id;

    // Process credit-only orders with postponed payment
    if (isCredit && isPostponedPayment) {
      console.log('🏦 Processing credit-only order with postponed payment...');
      console.log(`💰 Total ticket amount: EGP ${ticketTotal.toFixed(2)}`);
      console.log(`🍽️ Total meal amount: EGP ${mealTotal.toFixed(2)}`);
      console.log(`📊 Grand total to deduct: EGP ${grossTotal.toFixed(2)}`);
      
      // Process credit with meal total included
      const creditResult = await processTicketSaleCredit(orderId, validTickets, client, mealTotal);
      
      // Insert tickets
      await insertTicketsToDatabase(client, orderId, validTickets);
      
      // Insert meals if any
      await insertMealsToDatabase(client, orderId, meals);

      // Add postponed payment record
      await client.query(
        `INSERT INTO payments (order_id, method, amount, reference)
         VALUES ($1, 'postponed'::payment_method, $2, 'Credit account deduction')`,
        [orderId, grossTotal]
      );

      await client.query('COMMIT');

      res.json({
        message: "Credit sale completed successfully with postponed payment",
        order_id: orderId,
        total_amount: grossTotal,
        payment_type: "POSTPONED",
        credit_used: creditResult.totalCreditUsed,
        credit_breakdown: creditResult.creditTransactions.map(ct => ({
          account: ct.accountName,
          amount: ct.totalAmount,
          new_balance: ct.newBalance,
          went_into_debt: ct.wentIntoDebt
        }))
      });

    } else {
      // CASH-ONLY ORDER
      console.log('💵 Processing cash-only order...');
      
      // Validate cash payments
      const totalPayments = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
      
      if (Math.abs(totalPayments - grossTotal) > 0.01) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          error: `Payment mismatch. Expected: ${grossTotal.toFixed(2)}, Received: ${totalPayments.toFixed(2)}`
        });
      }

      // Insert cash payments
      for (const payment of payments) {
        await client.query(
          `INSERT INTO payments (order_id, method, amount, reference)
           VALUES ($1, $2::payment_method, $3, $4)`,
          [orderId, payment.method, payment.amount, payment.reference || null]
        );
      }

      // Insert tickets
      await insertTicketsToDatabase(client, orderId, validTickets);
      
      // Insert meals if any
      await insertMealsToDatabase(client, orderId, meals);

      await client.query('COMMIT');

      res.json({
        message: "Cash sale completed successfully",
        order_id: orderId,
        total_amount: grossTotal,
        payment_type: "CASH_ONLY"
      });
    }

  } catch (error) {
    await client.query('ROLLBACK');
    console.error("❌ sellTickets error:", error);
    res.status(500).json({ 
      error: "Failed to process sale",
      details: error.message,
      type: error.message.includes('Insufficient') ? 'INSUFFICIENT_CREDIT' : 'SALE_ERROR'
    });
  } finally {
    client.release();
  }
};

// Helper function to insert tickets
async function insertTicketsToDatabase(client, orderId, tickets) {
  for (const ticket of tickets) {
    for (let i = 0; i < ticket.quantity; i++) {
      await client.query(
        `INSERT INTO tickets (ticket_type_id, status, order_id, sold_at, sold_price)
         VALUES ($1, 'sold', $2, CURRENT_TIMESTAMP, $3)`,
        [ticket.ticket_type_id, orderId, ticket.price]
      );
    }
  }
}

// Helper function to insert meals
async function insertMealsToDatabase(client, orderId, meals) {
  for (const meal of meals) {
    await client.query(
      `INSERT INTO order_meals (order_id, meal_id, quantity, price_at_order)
       VALUES ($1, $2, $3, $4)`,
      [orderId, meal.id, meal.quantity, meal.price]
    );
  }
}

export const getTicketsByDate = async (req, res) => {
  try {
    const { date } = req.query;

    // Ensure date is provided
    if (!date) {
      return res
        .status(400)
        .json({ error: "Please provide a valid date (YYYY-MM-DD)." });
    }

    const query = `
      SELECT 
          tt.category, 
          tt.subcategory, 
          COUNT(t.id) AS total_tickets, 
          SUM(t.sold_price) AS total_revenue
      FROM tickets t
      JOIN ticket_types tt ON t.ticket_type_id = tt.id
      WHERE t.valid = TRUE 
      AND t.status = 'sold' 
      AND DATE(t.sold_at) = $1
      GROUP BY tt.category, tt.subcategory;
    `;

    const { rows } = await pool.query(query, [date]);

    return res.status(200).json(rows);
  } catch (error) {
    console.error("Error fetching tickets by date:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getTicketsBetweenDates = async (req, res) => {
  try {
    let { startDate, endDate } = req.query;

    // Ensure both dates are provided
    if (!startDate || !endDate) {
      return res
        .status(400)
        .json({ error: "Please provide both startDate and endDate" });
    }

    // Validate date format
    if (isNaN(new Date(startDate)) || isNaN(new Date(endDate))) {
      return res
        .status(400)
        .json({ error: "Invalid date format. Use YYYY-MM-DD." });
    }

    const query = `
      SELECT 
          tt.category, 
          tt.subcategory, 
          COUNT(t.id) AS total_tickets, 
          SUM(t.sold_price) AS total_revenue
      FROM tickets t
      JOIN ticket_types tt ON t.ticket_type_id = tt.id
      WHERE t.valid = TRUE 
      AND t.status = 'sold' 
      AND DATE(t.sold_at) BETWEEN $1::date AND $2::date
      GROUP BY tt.category, tt.subcategory;
    `;

    const { rows } = await pool.query(query, [startDate, endDate]);

    return res.status(200).json(rows);
  } catch (error) {
    console.error("Error fetching tickets:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};


export const addTicketTypes = async (req, res) => {
  try {
    const { ticketTypes } = req.body;

    if (!Array.isArray(ticketTypes) || ticketTypes.length === 0) {
      return res
        .status(400)
        .json({ message: "Provide an array of ticket types" });
    }

    const categories = [];
    const subcategories = [];
    const prices = [];
    const descriptions = [];

    for (const ticket of ticketTypes) {
      const { category, subcategory, price, description } = ticket;

      if (!price || isNaN(price) || price <= 0) {
        return res
          .status(400)
          .json({ message: `Invalid price for ${category} - ${subcategory}` });
      }

      categories.push(category);
      subcategories.push(subcategory);
      prices.push(price);
      descriptions.push(description);
    }

    const query = `
      INSERT INTO ticket_types (category, subcategory, price, description)
      SELECT * FROM UNNEST($1::text[], $2::text[], $3::numeric[], $4::text[])
      ON CONFLICT (category, subcategory) DO NOTHING
      RETURNING *;
    `;

    const result = await pool.query(query, [
      categories,
      subcategories,
      prices,
      descriptions,
    ]);

    res.status(201).json({
      message: "Ticket types added successfully",
      ticketTypes: result.rows,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateTicketPrices = async (req, res) => {
  try {
    const { tickets } = req.body;

    if (!Array.isArray(tickets) || tickets.length === 0) {
      return res.status(400).json({ message: "Invalid request format" });
    }

    const validTickets = tickets.filter(({ id, price }) => id && price > 0);
    if (validTickets.length === 0) {
      return res.status(400).json({ message: "No valid tickets to update" });
    }

    const ids = validTickets.map((ticket) => ticket.id);
    const prices = validTickets.map((ticket) => ticket.price);

    const query = `
      UPDATE ticket_types AS tt
      SET price = new_data.price
      FROM (SELECT UNNEST($1::int[]) AS id, UNNEST($2::numeric[]) AS price) AS new_data
      WHERE tt.id = new_data.id
      RETURNING tt.*;
    `;

    const result = await pool.query(query, [ids, prices]);

    res.json({
      message: "Prices updated successfully",
      updatedTickets: result.rows,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const generateTickets = async (req, res) => {
  try {
    const { tickets } = req.body;

    if (!Array.isArray(tickets) || tickets.length === 0) {
      return res.status(400).json({ message: "Invalid request format" });
    }

    const validTickets = tickets
      .filter(({ ticket_type_id, quantity }) => ticket_type_id && quantity > 0)
      .flatMap(({ ticket_type_id, quantity }) =>
        Array(quantity).fill([ticket_type_id, "available", true, null])
      );

    if (validTickets.length === 0) {
      return res.status(400).json({ message: "No valid tickets to generate" });
    }

    const query = `
      WITH new_tickets AS (
        SELECT 
          UNNEST($1::int[]) AS ticket_type_id,
          UNNEST($2::text[]) AS status,
          UNNEST($3::boolean[]) AS valid,
          UNNEST($4::timestamptz[]) AS sold_at
      )
      INSERT INTO tickets (ticket_type_id, status, valid, sold_at)
      SELECT ticket_type_id, status, valid, sold_at
      FROM new_tickets
      RETURNING id;
    `;

    const result = await pool.query(query, [
      validTickets.map((row) => row[0]),
      validTickets.map((row) => row[1]),
      validTickets.map((row) => row[2]),
      validTickets.map((row) => row[3]),
    ]);

    res.json({
      message: "Tickets generated successfully",
      generatedTicketIds: result.rows.map((row) => row.id),
    });
  } catch (error) {
    console.error("Error generating tickets:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Checkout existing tickets by ID
 * @route POST /api/tickets/checkout-existing
 * @access Private
 */

export const checkoutExistingTickets = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { ticket_ids, user_id, description, payments, meals } = req.body;
    
    if (!ticket_ids || !Array.isArray(ticket_ids) || ticket_ids.length === 0) {
      return res.status(400).json({ message: "No ticket IDs provided" });
    }
    
    if (!payments || !Array.isArray(payments) || payments.length === 0) {
      return res.status(400).json({ message: "Payment information required" });
    }
    
    // Verify all tickets exist and are available
    const ticketsResult = await client.query(
      `SELECT t.id, t.ticket_type_id, t.status, tt.price, tt.category, tt.subcategory,
              cca.credit_account_id, ca.name as credit_account_name, ca.balance as credit_balance
       FROM tickets t
       JOIN ticket_types tt ON t.ticket_type_id = tt.id
       LEFT JOIN category_credit_accounts cca ON tt.category = cca.category_name
       LEFT JOIN credit_accounts ca ON cca.credit_account_id = ca.id
       WHERE t.id = ANY($1)`,
      [ticket_ids]
    );
    
    if (ticketsResult.rows.length !== ticket_ids.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: "One or more tickets not found" });
    }
    
    const unavailableTickets = ticketsResult.rows.filter(t => t.status !== 'available');
    if (unavailableTickets.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        message: `Tickets not available: ${unavailableTickets.map(t => t.id).join(', ')}` 
      });
    }
    
    // Categorize tickets and calculate totals
    let ticketTotal = 0;
    let mealTotal = 0;
    const validTickets = [];
    let creditCategories = new Set();
    let nonCreditCategories = new Set();

    // Process tickets
    for (const ticket of ticketsResult.rows) {
      const ticketPrice = parseFloat(ticket.price || 0);
      ticketTotal += ticketPrice;
      
      const ticketData = {
        id: ticket.id,
        ticket_type_id: ticket.ticket_type_id,
        price: ticketPrice,
        category: ticket.category,
        subcategory: ticket.subcategory,
        is_credit_enabled: !!ticket.credit_account_id,
        credit_account_id: ticket.credit_account_id,
        credit_account_name: ticket.credit_account_name,
        credit_balance: ticket.credit_balance,
        quantity: 1 // Existing tickets are always quantity 1
      };

      validTickets.push(ticketData);

      // Track credit vs non-credit categories
      if (ticketData.is_credit_enabled) {
        creditCategories.add(ticketData.category);
      } else {
        nonCreditCategories.add(ticketData.category);
      }
    }

    // Add meals total
    if (meals && Array.isArray(meals)) {
      for (const meal of meals) {
        mealTotal += (meal.price || 0) * (meal.quantity || 0);
      }
    }

    const grossTotal = ticketTotal + mealTotal;

    // Check for mixed credit/non-credit orders
    const hasTickets = ticket_ids.length > 0;
    const hasMeals = meals && meals.length > 0;

    // Only check for mixed credit/non-credit if there are actual tickets
    if (hasTickets && creditCategories.size > 0 && nonCreditCategories.size > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: "Cannot mix credit-enabled and cash-only tickets in the same order",
        type: "MIXED_PAYMENT_ERROR",
        creditCategories: Array.from(creditCategories),
        nonCreditCategories: Array.from(nonCreditCategories)
      });
    }

    // Determine order type
    const isCredit = hasTickets && creditCategories.size > 0;
    const isPostponedPayment = payments.some(p => p.method === 'postponed');

    // Create order
    const orderResult = await client.query(
      `INSERT INTO orders (user_id, description, gross_total, total_amount, created_at)
       VALUES ($1, $2, $3, $3, CURRENT_TIMESTAMP)
       RETURNING id`,
      [user_id || null, description || (isCredit ? 'Credit sale - existing tickets' : 'Cash sale - existing tickets'), grossTotal]
    );
    
    const orderId = orderResult.rows[0].id;

    // Process credit-enabled tickets with postponed payment
    if (isCredit && isPostponedPayment) {
      console.log('🏦 Processing credit-enabled existing tickets with postponed payment...');
      console.log(`💰 Total ticket amount: EGP ${ticketTotal.toFixed(2)}`);
      console.log(`🍽️ Total meal amount: EGP ${mealTotal.toFixed(2)}`);
      console.log(`📊 Grand total to deduct: EGP ${grossTotal.toFixed(2)}`);
      
      // Import and use the credit processing function WITH meal total
      const { processTicketSaleCredit } = await import('./creditController.js');
      const creditResult = await processTicketSaleCredit(orderId, validTickets, client, mealTotal);
      
      console.log('💳 Credit processing completed:', creditResult);
    }

    // Mark tickets as sold with proper price
    for (const ticket of validTickets) {
      await client.query(
        `UPDATE tickets 
         SET status = 'sold', 
             order_id = $1, 
             sold_at = CURRENT_TIMESTAMP, 
             sold_price = $2
         WHERE id = $3`,
        [orderId, ticket.price, ticket.id]
      );
    }
    
    // Add payments
    for (const payment of payments) {
      await client.query(
        `INSERT INTO payments (order_id, method, amount, reference) 
         VALUES ($1, $2::payment_method, $3, $4)`,
        [orderId, payment.method, payment.amount, payment.reference || (isCredit ? 'Credit account deduction' : null)]
      );
    }
    
    // Add meals if any
    if (meals && Array.isArray(meals) && meals.length > 0) {
      for (const meal of meals) {
        await client.query(
          `INSERT INTO order_meals (order_id, meal_id, quantity, price_at_order) 
           VALUES ($1, $2, $3, $4)`,
          [orderId, meal.id, meal.quantity, meal.price]
        );
      }
    }
    
    await client.query('COMMIT');

    // Return appropriate response
    if (isCredit && isPostponedPayment) {
      res.status(200).json({ 
        success: true, 
        message: "Credit sale completed successfully with postponed payment", 
        order_id: orderId,
        total_amount: grossTotal,
        payment_type: "POSTPONED",
        tickets_processed: ticket_ids.length,
        meals_processed: meals ? meals.length : 0
      });
    } else {
      res.status(200).json({ 
        success: true, 
        message: "Cash sale completed successfully", 
        order_id: orderId,
        total_amount: grossTotal,
        payment_type: "CASH_ONLY",
        tickets_processed: ticket_ids.length,
        meals_processed: meals ? meals.length : 0
      });
    }
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error selling existing tickets:", error);
    res.status(500).json({ 
      message: "Server error: " + error.message,
      type: error.message.includes('Insufficient') ? 'INSUFFICIENT_CREDIT' : 'SALE_ERROR'
    });
  } finally {
    client.release();
  }
};

export const getTicketsByUser = async (req, res) => {
  const { userId } = req.params;

  try {
    const result = await pool.query(
      `SELECT 
          t.id, t.status, t.valid, t.sold_at, t.sold_price, t.created_at,
          tt.id AS ticket_type_id, tt.category, tt.subcategory, tt.description
       FROM tickets t
       LEFT JOIN ticket_types tt ON t.ticket_type_id = tt.id
       WHERE t.user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "No tickets found for this user" });
    }

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateTicketValidation = async (req, res) => {
  const { tickets, valid } = req.body; // Expecting an array of ticket IDs and the new validity status

  if (!Array.isArray(tickets) || tickets.length === 0) {
    return res.status(400).json({ message: "No tickets provided" });
  }

  try {
    // Get current validation statuses of the provided ticket IDs
    const checkQuery = `
            SELECT id, valid 
            FROM tickets 
            WHERE id = ANY($1);
        `;
    const checkResult = await pool.query(checkQuery, [tickets]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: "No matching tickets found" });
    }

    let alreadyInState = [];
    let toUpdate = [];

    // Filter tickets based on their current state
    checkResult.rows.forEach((ticket) => {
      if (ticket.valid === valid) {
        alreadyInState.push(ticket.id);
      } else {
        toUpdate.push(ticket.id);
      }
    });

    if (toUpdate.length > 0) {
      // Update only the tickets that need to change
      const updateQuery = `
                UPDATE tickets 
                SET valid = $1 
                WHERE id = ANY($2) 
                RETURNING *;
            `;
      const updateResult = await pool.query(updateQuery, [valid, toUpdate]);

      res.json({
        message: `Successfully updated ${updateResult.rowCount} tickets`,
        updatedTickets: updateResult.rows,
        alreadyInState: alreadyInState.length > 0 ? alreadyInState : null,
      });
    } else {
      // No tickets needed updating
      res.json({
        message:
          "No tickets were updated as they were already in the requested state",
        alreadyInState,
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
export const getTicketById = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT 
          t.id, t.status, t.valid, t.sold_at, t.sold_price, t.created_at,
          t.order_id, -- Include order_id
          tt.id AS ticket_type_id, tt.category, tt.subcategory, tt.description, 
          tt.price,
          o.user_id AS sold_by, -- Get user_id from orders table
          u.name AS sold_by_name -- Get seller's name
       FROM tickets t
       LEFT JOIN ticket_types tt ON t.ticket_type_id = tt.id
       LEFT JOIN orders o ON t.order_id = o.id -- Join with orders
       LEFT JOIN users u ON o.user_id = u.id -- Join with users to get seller name
       WHERE t.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const refundTickets = async (req, res) => {
  try {
    const { ticketIds } = req.body; // Expecting an array of ticket IDs

    if (!Array.isArray(ticketIds) || ticketIds.length === 0) {
      return res
        .status(400)
        .json({ message: "Invalid request. Provide an array of ticket IDs." });
    }

    // Execute the bulk update query
    const result = await pool.query(
      `UPDATE tickets 
             SET status = 'available', sold_at = NULL, sold_price = NULL 
             WHERE id = ANY($1) AND status = 'sold'
             RETURNING id;`,
      [ticketIds]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "No valid tickets were refunded. Ensure tickets are sold.",
      });
    }

    res.json({ message: "Refund successful", refundedTickets: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateTicketTypeArchiveStatus = async (req, res) => {
  try {
    const { category, archived } = req.body;

    if (!category || typeof archived !== "boolean") {
      return res.status(400).json({
        message: "Both 'category' and boolean 'archived' status are required.",
      });
    }

    const query = `
      UPDATE ticket_types
      SET archived = $1
      WHERE category = $2
      RETURNING *;
    `;

    const { rows } = await pool.query(query, [archived, category]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Category not found." });
    }

    res.json({
      message: `Category '${category}' archive status updated successfully.`,
      updatedTicketTypes: rows,
    });
  } catch (error) {
    console.error("Error updating archive status:", error);
    res.status(500).json({ message: "Server error" });
  }
};


export const assignTicketTypesById = async (req, res) => {
  const { assignments } = req.body;

  // Validate input
  if (!Array.isArray(assignments) || assignments.length === 0) {
    return res.status(400).json({ message: "Provide a list of ticket assignments" });
  }

  // Validate each assignment - ALLOW NULL for unassignment
  for (const entry of assignments) {
    if (!entry.id || typeof entry.id !== "number") {
      return res.status(400).json({
        message: `Invalid assignment entry - missing or invalid ID: ${JSON.stringify(entry)}`
      });
    }
    
    // Allow ticket_type_id to be null for unassignment
    if (entry.ticket_type_id !== null && (typeof entry.ticket_type_id !== "number" || entry.ticket_type_id <= 0)) {
      return res.status(400).json({
        message: `Invalid assignment entry - ticket_type_id must be a positive number or null: ${JSON.stringify(entry)}`
      });
    }
  }

  try {
    const ids = assignments.map(a => a.id);
    const typeIds = assignments.map(a => a.ticket_type_id); // This can now include null values

    const query = `
      UPDATE tickets AS t
      SET ticket_type_id = a.ticket_type_id
      FROM (
        SELECT UNNEST($1::int[]) AS id,
               UNNEST($2::int[]) AS ticket_type_id
      ) AS a
      WHERE t.id = a.id
      RETURNING t.id, t.ticket_type_id, 
                CASE WHEN t.ticket_type_id IS NULL THEN 'unassigned' ELSE 'assigned' END as assignment_status;
    `;

    const { rows } = await pool.query(query, [ids, typeIds]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "No tickets found with the provided IDs" });
    }

    // Separate assigned vs unassigned results
    const assigned = rows.filter(row => row.ticket_type_id !== null);
    const unassigned = rows.filter(row => row.ticket_type_id === null);

    res.json({
      message: `Successfully processed ${rows.length} tickets`,
      results: {
        assigned: assigned.length,
        unassigned: unassigned.length,
        details: rows
      },
      updated: rows
    });
  } catch (error) {
    console.error("Error assigning/unassigning ticket types:", error);
    res.status(500).json({ message: "Server error: " + error.message });
  }
};
export const getTicketsReportByDate = async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ error: "Please provide a valid date (YYYY-MM-DD)." });
    }

    const ticketsQuery = `
      SELECT 
        tt.category,
        tt.subcategory,
        COUNT(t.id) as quantity,
        t.sold_price as unit_price,
        SUM(t.sold_price) as total_revenue,
        STRING_AGG(DISTINCT u.name, ', ') as sold_by_users,
        MIN(t.sold_at) as first_sale,
        MAX(t.sold_at) as last_sale
      FROM tickets t
      JOIN ticket_types tt ON t.ticket_type_id = tt.id
      LEFT JOIN orders o ON t.order_id = o.id
      LEFT JOIN users u ON o.user_id = u.id
      WHERE t.status = 'sold' 
        AND t.valid = TRUE 
        AND DATE(t.sold_at) = $1
      GROUP BY tt.category, tt.subcategory, t.sold_price
      ORDER BY tt.category, tt.subcategory, t.sold_price;
    `;

    const mealsQuery = `
      SELECT 
        m.name as meal_name,
        SUM(om.quantity) as total_quantity,
        om.price_at_order as unit_price,
        SUM(om.quantity * om.price_at_order) as total_revenue,
        STRING_AGG(DISTINCT u.name, ', ') as sold_by_users,
        MIN(o.created_at) as first_sale,
        MAX(o.created_at) as last_sale
      FROM order_meals om
      JOIN orders o ON om.order_id = o.id
      JOIN meals m ON om.meal_id = m.id
      LEFT JOIN users u ON o.user_id = u.id
      WHERE DATE(o.created_at) = $1
      GROUP BY m.name, om.price_at_order
      ORDER BY m.name, om.price_at_order;
    `;

    const [ticketsResult, mealsResult] = await Promise.all([
      pool.query(ticketsQuery, [date]),
      pool.query(mealsQuery, [date])
    ]);

    // Calculate summary
    const ticketsSummary = ticketsResult.rows.reduce((acc, row) => {
      acc.totalQuantity += parseInt(row.quantity);
      acc.totalRevenue += parseFloat(row.total_revenue);
      return acc;
    }, { totalQuantity: 0, totalRevenue: 0 });

    const mealsSummary = mealsResult.rows.reduce((acc, row) => {
      acc.totalQuantity += parseInt(row.total_quantity);
      acc.totalRevenue += parseFloat(row.total_revenue);
      return acc;
    }, { totalQuantity: 0, totalRevenue: 0 });

    res.json({
      date,
      tickets: ticketsResult.rows,
      meals: mealsResult.rows,
      summary: {
        tickets: ticketsSummary,
        meals: mealsSummary,
        grandTotal: ticketsSummary.totalRevenue + mealsSummary.totalRevenue
      }
    });

  } catch (error) {
    console.error("Error fetching tickets report by date:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getTicketsReportByDateRange = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: "Please provide both startDate and endDate" });
    }

    if (isNaN(new Date(startDate)) || isNaN(new Date(endDate))) {
      return res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD." });
    }

    const ticketsQuery = `
      SELECT 
        tt.category,
        tt.subcategory,
        COUNT(t.id) as quantity,
        t.sold_price as unit_price,
        SUM(t.sold_price) as total_revenue,
        STRING_AGG(DISTINCT u.name, ', ') as sold_by_users,
        MIN(t.sold_at) as first_sale,
        MAX(t.sold_at) as last_sale
      FROM tickets t
      JOIN ticket_types tt ON t.ticket_type_id = tt.id
      LEFT JOIN orders o ON t.order_id = o.id
      LEFT JOIN users u ON o.user_id = u.id
      WHERE t.status = 'sold' 
        AND t.valid = TRUE 
        AND DATE(t.sold_at) BETWEEN $1::date AND $2::date
      GROUP BY tt.category, tt.subcategory, t.sold_price
      ORDER BY tt.category, tt.subcategory, t.sold_price;
    `;

    const mealsQuery = `
      SELECT 
        m.name as meal_name,
        SUM(om.quantity) as total_quantity,
        om.price_at_order as unit_price,
        SUM(om.quantity * om.price_at_order) as total_revenue,
        STRING_AGG(DISTINCT u.name, ', ') as sold_by_users,
        MIN(o.created_at) as first_sale,
        MAX(o.created_at) as last_sale
      FROM order_meals om
      JOIN orders o ON om.order_id = o.id
      JOIN meals m ON om.meal_id = m.id
      LEFT JOIN users u ON o.user_id = u.id
      WHERE DATE(o.created_at) BETWEEN $1::date AND $2::date
      GROUP BY m.name, om.price_at_order
      ORDER BY m.name, om.price_at_order;
    `;

    const [ticketsResult, mealsResult] = await Promise.all([
      pool.query(ticketsQuery, [startDate, endDate]),
      pool.query(mealsQuery, [startDate, endDate])
    ]);

    // Calculate summary
    const ticketsSummary = ticketsResult.rows.reduce((acc, row) => {
      acc.totalQuantity += parseInt(row.quantity);
      acc.totalRevenue += parseFloat(row.total_revenue);
      return acc;
    }, { totalQuantity: 0, totalRevenue: 0 });

    const mealsSummary = mealsResult.rows.reduce((acc, row) => {
      acc.totalQuantity += parseInt(row.total_quantity);
      acc.totalRevenue += parseFloat(row.total_revenue);
      return acc;
    }, { totalQuantity: 0, totalRevenue: 0 });

    res.json({
      startDate,
      endDate,
      tickets: ticketsResult.rows,
      meals: mealsResult.rows,
      summary: {
        tickets: ticketsSummary,
        meals: mealsSummary,
        grandTotal: ticketsSummary.totalRevenue + mealsSummary.totalRevenue
      }
    });

  } catch (error) {
    console.error("Error fetching tickets report by date range:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// NEW: Rename category endpoint
export const renameCategoryName = async (req, res) => {
  try {
    const { oldCategoryName, newCategoryName } = req.body;

    if (!oldCategoryName || !newCategoryName) {
      return res.status(400).json({
        message: "Both old and new category names are required"
      });
    }

    if (oldCategoryName.trim() === newCategoryName.trim()) {
      return res.status(400).json({
        message: "New category name must be different from the current name"
      });
    }

    // Check if new category name already exists
    const existingCategory = await pool.query(
      "SELECT id FROM ticket_types WHERE LOWER(category) = LOWER($1) LIMIT 1",
      [newCategoryName.trim()]
    );

    if (existingCategory.rows.length > 0) {
      return res.status(400).json({
        message: "A category with this name already exists"
      });
    }

    // Update all ticket types with the old category name
    const result = await pool.query(
      `UPDATE ticket_types 
       SET category = $1 
       WHERE category = $2 
       RETURNING *`,
      [newCategoryName.trim(), oldCategoryName]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Category not found"
      });
    }

    res.json({
      message: `Category renamed from "${oldCategoryName}" to "${newCategoryName}" successfully`,
      updatedTicketTypes: result.rows
    });

  } catch (error) {
    console.error("Error renaming category:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Add new endpoint to check if categories are credit-enabled
export const checkCreditStatus = async (req, res) => {
  try {
    const { ticketTypeIds } = req.body;
    
    if (!Array.isArray(ticketTypeIds) || ticketTypeIds.length === 0) {
      return res.status(400).json({ error: 'Ticket type IDs array is required' });
    }
    
    const query = `
      SELECT 
        tt.id,
        tt.category,
        tt.subcategory,
        tt.price,
        CASE WHEN cca.credit_account_id IS NOT NULL THEN true ELSE false END as is_credit_enabled,
        ca.name as credit_account_name,
        ca.balance as credit_balance
      FROM ticket_types tt
      LEFT JOIN category_credit_accounts cca ON tt.category = cca.category_name
      LEFT JOIN credit_accounts ca ON cca.credit_account_id = ca.id
      WHERE tt.id = ANY($1)
    `;
    
    const { rows } = await pool.query(query, [ticketTypeIds]);
    
    const creditEnabled = rows.filter(row => row.is_credit_enabled);
    const cashOnly = rows.filter(row => !row.is_credit_enabled);
    
    res.json({
      tickets: rows,
      summary: {
        total_tickets: rows.length,
        credit_enabled: creditEnabled.length,
        cash_only: cashOnly.length,
        can_mix: false, // We don't allow mixing
        payment_type: creditEnabled.length > 0 && cashOnly.length > 0 ? 'MIXED_ERROR' :
                     creditEnabled.length > 0 ? 'CREDIT_ONLY' : 'CASH_ONLY'
      }
    });
    
  } catch (error) {
    console.error('Error checking credit status:', error);
    res.status(500).json({ error: 'Failed to check credit status' });
  }
};