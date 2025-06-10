import pool from "../db.js";

export const getOrdersByDate = async (req, res) => {
  const { date } = req.query;

  if (!date) {
    return res.status(400).json({ error: "Please provide a date (YYYY-MM-DD)" });
  }

  try {
    const query = `
      SELECT 
        o.id AS order_id,
        o.user_id,
        u.name AS user_name,
        o.created_at,
        o.total_amount,
        o.description,

        (
          SELECT json_agg(ticket_summary)
          FROM (
            SELECT 
              tt.id AS ticket_type_id,
              tt.category,
              tt.subcategory,
              t.sold_price,
              COUNT(*) AS quantity
            FROM tickets t
            JOIN ticket_types tt ON t.ticket_type_id = tt.id
            WHERE t.order_id = o.id
            GROUP BY tt.id, tt.category, tt.subcategory, t.sold_price
          ) AS ticket_summary
        ) AS tickets,

        json_agg(
          DISTINCT jsonb_build_object(
            'meal_id', m.id,
            'name', m.name,
            'quantity', om.quantity,
            'price_at_order', om.price_at_order
          )
        ) FILTER (WHERE om.id IS NOT NULL) AS meals,

        (
          SELECT json_agg(jsonb_build_object('method', p.method, 'amount', p.amount))
          FROM payments p
          WHERE p.order_id = o.id
        ) AS payments

      FROM orders o
      JOIN users u ON o.user_id = u.id
      LEFT JOIN order_meals om ON o.id = om.order_id
      LEFT JOIN meals m ON om.meal_id = m.id
      WHERE DATE(o.created_at) = $1
      GROUP BY o.id, u.name
      ORDER BY o.created_at DESC;
    `;

    const { rows } = await pool.query(query, [date]);
    res.json(rows);
  } catch (error) {
    console.error("Error fetching orders by date:", error);
    res.status(500).json({ error: "Server error" });
  }
};


export const getOrdersBetweenDates = async (req, res) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({ error: "Provide both startDate and endDate" });
  }

  try {
    const query = `
      SELECT 
        o.id AS order_id,
        o.user_id,
        u.name AS user_name,
        o.created_at,
        o.total_amount,
        o.description,

        (
          SELECT json_agg(ticket_summary)
          FROM (
            SELECT 
              tt.id AS ticket_type_id,
              tt.category,
              tt.subcategory,
              t.sold_price,
              COUNT(*) AS quantity
            FROM tickets t
            JOIN ticket_types tt ON t.ticket_type_id = tt.id
            WHERE t.order_id = o.id
            GROUP BY tt.id, tt.category, tt.subcategory, t.sold_price
          ) AS ticket_summary
        ) AS tickets,

        json_agg(
          DISTINCT jsonb_build_object(
            'meal_id', m.id,
            'name', m.name,
            'quantity', om.quantity,
            'price_at_order', om.price_at_order
          )
        ) FILTER (WHERE om.id IS NOT NULL) AS meals,

        (
          SELECT json_agg(jsonb_build_object('method', p.method, 'amount', p.amount))
          FROM payments p
          WHERE p.order_id = o.id
        ) AS payments

      FROM orders o
      JOIN users u ON o.user_id = u.id
      LEFT JOIN order_meals om ON o.id = om.order_id
      LEFT JOIN meals m ON om.meal_id = m.id
      WHERE DATE(o.created_at) BETWEEN $1::date AND $2::date
      GROUP BY o.id, u.name
      ORDER BY o.created_at DESC;
    `;

    const { rows } = await pool.query(query, [startDate, endDate]);
    res.json(rows);
  } catch (error) {
    console.error("Error fetching orders by range:", error);
    res.status(500).json({ error: "Server error" });
  }
};

export const updateOrder = async (req, res) => {
  try {
    const { 
      order_id, 
      addedTickets, 
      removedTickets, 
      addedMeals, 
      removedMeals, 
      payments 
    } = req.body;

    if (!order_id) {
      return res.status(400).json({ message: "Order ID is required" });
    }

    // Begin transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Check if order exists
      const orderCheck = await client.query(
        'SELECT * FROM orders WHERE id = $1',
        [order_id]
      );

      if (orderCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: "Order not found" });
      }

      let updatedTotal = parseFloat(orderCheck.rows[0].total_amount);
      
      // 1. Handle added tickets
      if (addedTickets && addedTickets.length > 0) {
        // Fetch ticket prices
        const ticketTypeIds = addedTickets.map(t => t.ticket_type_id);
        const ticketPrices = await client.query(
          'SELECT id, price FROM ticket_types WHERE id = ANY($1)',
          [ticketTypeIds]
        );
        
        const priceMap = new Map();
        ticketPrices.rows.forEach(row => {
          priceMap.set(row.id, parseFloat(row.price));
        });

        // Insert new tickets
        for (const ticket of addedTickets) {
          const price = priceMap.get(ticket.ticket_type_id);
          if (!price) continue;

          // Add tickets to the order
          for (let i = 0; i < ticket.quantity; i++) {
            await client.query(
              `INSERT INTO tickets 
               (ticket_type_id, status, valid, sold_at, sold_price, order_id) 
               VALUES ($1, 'sold', true, NOW(), $2, $3)`,
              [ticket.ticket_type_id, price, order_id]
            );
            
            // Update total amount
            updatedTotal += price;
          }
        }
      }

      // 2. Handle removed tickets
      if (removedTickets && removedTickets.length > 0) {
        for (const ticket of removedTickets) {
          // Find tickets of this type in the order
          const ticketsToRemove = await client.query(
            `SELECT id, sold_price FROM tickets 
             WHERE order_id = $1 AND ticket_type_id = $2 AND status = 'sold'
             LIMIT $3`,
            [order_id, ticket.ticket_type_id, ticket.quantity]
          );

          // Remove each ticket
          for (const ticketRow of ticketsToRemove.rows) {
            await client.query(
              'DELETE FROM tickets WHERE id = $1',
              [ticketRow.id]
            );
            
            // Update total amount
            updatedTotal -= parseFloat(ticketRow.sold_price);
          }
        }
      }

      // 3. Handle added meals
      if (addedMeals && addedMeals.length > 0) {
        for (const meal of addedMeals) {
          // Check if this meal already exists in the order
          const existingMeal = await client.query(
            'SELECT * FROM order_meals WHERE order_id = $1 AND meal_id = $2',
            [order_id, meal.meal_id]
          );

          if (existingMeal.rows.length > 0) {
            // Update existing meal quantity
            await client.query(
              'UPDATE order_meals SET quantity = quantity + $1 WHERE order_id = $2 AND meal_id = $3',
              [meal.quantity, order_id, meal.meal_id]
            );
          } else {
            // Add new meal to order
            await client.query(
              'INSERT INTO order_meals (order_id, meal_id, quantity, price_at_order) VALUES ($1, $2, $3, $4)',
              [order_id, meal.meal_id, meal.quantity, meal.price]
            );
          }
          
          // Update total amount
          updatedTotal += (meal.quantity * parseFloat(meal.price));
        }
      }

      // 4. Handle removed meals
      if (removedMeals && removedMeals.length > 0) {
        for (const meal of removedMeals) {
          // Get current meal info
          const currentMeal = await client.query(
            'SELECT quantity, price_at_order FROM order_meals WHERE order_id = $1 AND meal_id = $2',
            [order_id, meal.meal_id]
          );
          
          if (currentMeal.rows.length > 0) {
            const currentQuantity = currentMeal.rows[0].quantity;
            const newQuantity = currentQuantity - meal.quantity;
            
            if (newQuantity <= 0) {
              // Remove meal entirely
              await client.query(
                'DELETE FROM order_meals WHERE order_id = $1 AND meal_id = $2',
                [order_id, meal.meal_id]
              );
            } else {
              // Reduce quantity
              await client.query(
                'UPDATE order_meals SET quantity = $1 WHERE order_id = $2 AND meal_id = $3',
                [newQuantity, order_id, meal.meal_id]
              );
            }
            
            // Update total amount
            updatedTotal -= (meal.quantity * parseFloat(currentMeal.rows[0].price_at_order));
          }
        }
      }

      // 5. Update order total
      await client.query(
        'UPDATE orders SET total_amount = $1 WHERE id = $2',
        [updatedTotal, order_id]
      );

      // 6. Update payments
      if (payments && payments.length > 0) {
        // First delete all existing payments
        await client.query('DELETE FROM payments WHERE order_id = $1', [order_id]);
        
        // Then insert new payments
        for (const payment of payments) {
          await client.query(
            'INSERT INTO payments (order_id, method, amount) VALUES ($1, $2, $3)',
            [order_id, payment.method, payment.amount]
          );
        }
      }

      // Commit transaction
      await client.query('COMMIT');

      res.json({
        message: "Order updated successfully",
        order_id,
        total_amount: updatedTotal
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error updating order:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getPaymentMethods = async (req, res) => {
  try {
    const query = `
      SELECT unnest(enum_range(NULL::payment_method)) as method
    `;
    
    const { rows } = await pool.query(query);
    
    // Filter to only the methods you want and format them - CREDIT REMOVED
    const allowedMethods = ['visa', 'cash', 'vodafone_cash', 'postponed', 'discount', 'الاهلي و مصر', 'OTHER'];
    
    const paymentMethods = rows
      .filter(row => allowedMethods.includes(row.method))
      .map(row => {
        const method = row.method;
        let label;
        
        // Custom labels for specific methods
        switch (method) {
          case 'vodafone_cash':
            label = 'Vodafone Cash';
            break;
          case 'الاهلي و مصر':
            label = 'الأهلي و مصر';
            break;
          case 'OTHER':
            label = 'Other';
            break;
          case 'postponed':
            label = 'Postponed';
            break;
          default:
            // Capitalize first letter
            label = method.charAt(0).toUpperCase() + method.slice(1);
        }
        
        return {
          value: method,
          label: label
        };
      });
    
    res.json(paymentMethods);
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    res.status(500).json({ error: 'Failed to fetch payment methods' });
  }
};

// Add this function to your ordersController.js
export const deleteOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    if (!orderId) {
      return res.status(400).json({ error: 'Order ID is required' });
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Check if order exists
      const orderCheck = await client.query(
        'SELECT id, total_amount, created_at FROM orders WHERE id = $1',
        [orderId]
      );
      
      if (orderCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Order not found' });
      }
      
      const order = orderCheck.rows[0];
      
      // Delete in proper order to handle foreign key constraints
      
      // 1. Delete payments
      await client.query('DELETE FROM payments WHERE order_id = $1', [orderId]);
      
      // 2. Delete order_meals
      await client.query('DELETE FROM order_meals WHERE order_id = $1', [orderId]);
      
      // 3. Delete tickets (set order_id to NULL or delete based on your business logic)
      // Option A: Set tickets back to available
      await client.query(
        `UPDATE tickets 
         SET order_id = NULL, status = 'available', sold_at = NULL, sold_price = NULL 
         WHERE order_id = $1`,
        [orderId]
      );
      
      // Option B: Delete tickets completely (uncomment if you prefer this)
      // await client.query('DELETE FROM tickets WHERE order_id = $1', [orderId]);
      
      // 4. Delete credit transactions related to this order (if any)
      await client.query('DELETE FROM credit_transactions WHERE order_id = $1', [orderId]);
      
      // 5. Finally delete the order
      await client.query('DELETE FROM orders WHERE id = $1', [orderId]);
      
      await client.query('COMMIT');
      
      res.json({
        success: true,
        message: 'Order deleted successfully',
        deletedOrder: {
          id: orderId,
          totalAmount: order.total_amount,
          createdAt: order.created_at
        }
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({ error: 'Failed to delete order' });
  }
};

export const getCategorySalesReport = async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'subcategory' } = req.query;
    
    let dateFilter = '';
    const params = [];
    
    if (startDate && endDate) {
      dateFilter = 'WHERE DATE(o.created_at) BETWEEN $1 AND $2';
      params.push(startDate, endDate);
    } else if (startDate) {
      dateFilter = 'WHERE DATE(o.created_at) >= $1';
      params.push(startDate);
    } else if (endDate) {
      dateFilter = 'WHERE DATE(o.created_at) <= $1';
      params.push(endDate);
    }
    
    // Get basic category sales data
    const salesQuery = `
      SELECT 
        tt.category,
        tt.subcategory,
        tt.price as unit_price,
        COUNT(t.id) as tickets_sold,
        SUM(t.sold_price) as category_revenue,
        MIN(o.created_at) as first_sale,
        MAX(o.created_at) as last_sale,
        COUNT(DISTINCT o.id) as orders_count
      FROM tickets t
      JOIN ticket_types tt ON t.ticket_type_id = tt.id
      JOIN orders o ON t.order_id = o.id
      ${dateFilter}
      GROUP BY tt.category, tt.subcategory, tt.price
      ORDER BY category_revenue DESC, tickets_sold DESC
    `;
    
    const { rows: salesRows } = await pool.query(salesQuery, params);
    
    // Get payment data with proper allocation
    const paymentAllocationQuery = `
      WITH order_category_breakdown AS (
        SELECT 
          o.id as order_id,
          o.total_amount,
          tt.category,
          tt.subcategory,
          tt.price as unit_price,
          SUM(t.sold_price) as category_amount_in_order,
          COUNT(t.id) as tickets_in_category
        FROM orders o
        JOIN tickets t ON o.id = t.order_id
        JOIN ticket_types tt ON t.ticket_type_id = tt.id
        ${dateFilter.replace('WHERE', 'WHERE')}
        GROUP BY o.id, o.total_amount, tt.category, tt.subcategory, tt.price
      ),
      payment_allocations AS (
        SELECT 
          ocb.*,
          p.method,
          p.amount as payment_amount,
          -- Calculate the proportion of this payment that belongs to this category/subcategory
          CASE 
            WHEN ocb.total_amount > 0 
            THEN p.amount * (ocb.category_amount_in_order / ocb.total_amount)
            ELSE 0
          END as allocated_payment_amount
        FROM order_category_breakdown ocb
        JOIN payments p ON ocb.order_id = p.order_id
        WHERE p.method IS NOT NULL
      )
      SELECT 
        category,
        subcategory,
        unit_price,
        method,
        SUM(allocated_payment_amount) as method_total
      FROM payment_allocations
      GROUP BY category, subcategory, unit_price, method
      ORDER BY category, subcategory, method_total DESC
    `;
    
    const { rows: paymentRows } = await pool.query(paymentAllocationQuery, params);
    
    // Combine sales data with payment data
    const enrichedData = salesRows.map(sale => {
      const paymentMethods = paymentRows.filter(payment => 
        payment.category === sale.category && 
        payment.subcategory === sale.subcategory && 
        Math.abs(parseFloat(payment.unit_price) - parseFloat(sale.unit_price)) < 0.01 // Handle floating point comparison
      );
      
      const payment_summary = {};
      paymentMethods.forEach(pm => {
        if (pm.method && pm.method_total) {
          payment_summary[pm.method] = Math.round(parseFloat(pm.method_total) * 100) / 100;
        }
      });
      
      return {
        ...sale,
        payment_summary,
        payment_methods: paymentMethods.map(pm => ({
          method: pm.method,
          amount: Math.round(parseFloat(pm.method_total || 0) * 100) / 100
        }))
      };
    });
    
    // Calculate summary totals
    const summary = {
      total_tickets_sold: enrichedData.reduce((sum, row) => sum + parseInt(row.tickets_sold), 0),
      total_revenue: enrichedData.reduce((sum, row) => sum + parseFloat(row.category_revenue), 0),
      categories_count: [...new Set(enrichedData.map(row => row.category))].length,
      date_range: {
        start: startDate || 'All time',
        end: endDate || 'Present'
      }
    };
    
    // Get total payments for verification
    const totalPaymentsQuery = `
      SELECT SUM(p.amount) as total_payments
      FROM payments p
      JOIN orders o ON p.order_id = o.id
      ${dateFilter}
    `;
    
    const { rows: totalPayments } = await pool.query(totalPaymentsQuery, params);
    
    // Calculate total allocated payments
    const totalAllocatedPayments = enrichedData.reduce((sum, item) => {
      if (item.payment_summary) {
        return sum + Object.values(item.payment_summary).reduce((pSum, amount) => pSum + parseFloat(amount || 0), 0);
      }
      return sum;
    }, 0);
    
    res.json({
      summary: {
        ...summary,
        total_payments_verification: parseFloat(totalPayments[0]?.total_payments || 0),
        total_allocated_payments: Math.round(totalAllocatedPayments * 100) / 100,
        allocation_accuracy: Math.abs(parseFloat(totalPayments[0]?.total_payments || 0) - totalAllocatedPayments) < 1 ? 'ACCURATE' : 'DISCREPANCY_DETECTED'
      },
      categories: enrichedData,
      report_generated: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error generating category sales report:', error);
    res.status(500).json({ error: 'Failed to generate report', details: error.message });
  }
};

// Alternative: More detailed report with payment methods
export const getDetailedCategorySalesReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let dateFilter = '';
    const params = [];
    
    if (startDate && endDate) {
      dateFilter = 'AND o.created_at BETWEEN $1 AND $2';
      params.push(startDate, endDate);
    }
    
    const query = `
      SELECT 
        t.category,
        t.subcategory,
        t.price as unit_price,
        COUNT(t.id) as tickets_sold,
        SUM(t.price) as category_revenue,
        
        -- Payment method breakdown
        json_agg(DISTINCT 
          json_build_object(
            'method', p.method,
            'amount', p.amount
          )
        ) FILTER (WHERE p.method IS NOT NULL) as payment_methods,
        
        -- Time analysis
        DATE_TRUNC('day', o.created_at) as sale_date,
        
        -- Cashier info
        array_agg(DISTINCT u.name) as cashiers
        
      FROM tickets t
      JOIN orders o ON t.order_id = o.id
      JOIN users u ON o.user_id = u.id
      LEFT JOIN payments p ON o.id = p.order_id
      WHERE 1=1 ${dateFilter}
      GROUP BY t.category, t.subcategory, t.price, DATE_TRUNC('day', o.created_at)
      ORDER BY sale_date DESC, category_revenue DESC
    `;
    
    const { rows } = await pool.query(query, params);
    
    res.json({
      detailed_report: rows,
      report_generated: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error generating detailed report:', error);
    res.status(500).json({ error: 'Failed to generate detailed report' });
  }
};

// Or use this simpler approach:

export const getCategorySalesReportSimple = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let dateFilter = '';
    const params = [];
    
    if (startDate && endDate) {
      dateFilter = 'WHERE DATE(o.created_at) BETWEEN $1 AND $2';
      params.push(startDate, endDate);
    } else if (startDate) {
      dateFilter = 'WHERE DATE(o.created_at) >= $1';
      params.push(startDate);
    } else if (endDate) {
      dateFilter = 'WHERE DATE(o.created_at) <= $1';
      params.push(endDate);
    }
    
    // Get basic category sales
    const salesQuery = `
      SELECT 
        tt.category,
        tt.subcategory,
        tt.price as unit_price,
        COUNT(t.id) as tickets_sold,
        SUM(t.sold_price) as category_revenue,
        MIN(o.created_at) as first_sale,
        MAX(o.created_at) as last_sale,
        COUNT(DISTINCT o.id) as orders_count,
        
        -- Get all order IDs for this category/subcategory
        array_agg(DISTINCT o.id) as order_ids
        
      FROM tickets t
      JOIN ticket_types tt ON t.ticket_type_id = tt.id
      JOIN orders o ON t.order_id = o.id
      ${dateFilter}
      GROUP BY tt.category, tt.subcategory, tt.price
      ORDER BY category_revenue DESC, tickets_sold DESC
    `;
    
    const { rows: salesRows } = await pool.query(salesQuery, params);
    
    // For each category, get proportional payments
    const enrichedData = await Promise.all(
      salesRows.map(async (row) => {
        if (row.order_ids && row.order_ids.length > 0) {
          // Get payments for orders that include this category/subcategory
          const paymentQuery = `
            SELECT 
              o.id as order_id,
              o.total_amount,
              p.method,
              p.amount,
              -- Calculate how much of this order is from our category
              (
                SELECT SUM(t2.sold_price) 
                FROM tickets t2 
                JOIN ticket_types tt2 ON t2.ticket_type_id = tt2.id
                WHERE t2.order_id = o.id 
                AND tt2.category = $1 
                AND tt2.subcategory = $2
                AND tt2.price = $3
              ) as category_amount_in_order
            FROM orders o
            JOIN payments p ON o.id = p.order_id
            WHERE o.id = ANY($4)
            AND p.method IS NOT NULL
          `;
          
          const { rows: paymentRows } = await pool.query(paymentQuery, [
            row.category, 
            row.subcategory, 
            row.unit_price, 
            row.order_ids
          ]);
          
          // Calculate proportional payments
          const payment_summary = {};
          paymentRows.forEach(payment => {
            const proportion = payment.category_amount_in_order / payment.total_amount;
            const allocatedAmount = payment.amount * proportion;
            
            if (payment_summary[payment.method]) {
              payment_summary[payment.method] += allocatedAmount;
            } else {
              payment_summary[payment.method] = allocatedAmount;
            }
          });
          
          // Round the amounts
          Object.keys(payment_summary).forEach(method => {
            payment_summary[method] = Math.round(payment_summary[method] * 100) / 100;
          });
          
          return {
            ...row,
            payment_summary,
            payment_methods: Object.entries(payment_summary).map(([method, amount]) => ({
              method,
              amount
            }))
          };
        }
        
        return {
          ...row,
          payment_summary: {},
          payment_methods: []
        };
      })
    );
    
    // Calculate summary
    const summary = {
      total_tickets_sold: enrichedData.reduce((sum, row) => sum + parseInt(row.tickets_sold), 0),
      total_revenue: enrichedData.reduce((sum, row) => sum + parseFloat(row.category_revenue), 0),
      categories_count: [...new Set(enrichedData.map(row => row.category))].length,
      date_range: {
        start: startDate || 'All time',
        end: endDate || 'Present'
      }
    };
    
    res.json({
      summary,
      categories: enrichedData.map(row => {
        // Remove order_ids from response
        const { order_ids, ...cleanRow } = row;
        return cleanRow;
      }),
      report_generated: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error generating category sales report:', error);
    res.status(500).json({ error: 'Failed to generate report', details: error.message });
  }
};

// Add this new function for payment verification:

export const verifyCategoryPaymentTotals = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let dateFilter = '';
    const params = [];
    
    if (startDate && endDate) {
      dateFilter = 'WHERE DATE(o.created_at) BETWEEN $1 AND $2';
      params.push(startDate, endDate);
    } else if (startDate) {
      dateFilter = 'WHERE DATE(o.created_at) >= $1';
      params.push(startDate);
    } else if (endDate) {
      dateFilter = 'WHERE DATE(o.created_at) <= $1';
      params.push(endDate);
    }
    
    // Get total payments from payments table
    const totalPaymentsQuery = `
      SELECT 
        p.method,
        SUM(p.amount) as total_amount
      FROM payments p
      JOIN orders o ON p.order_id = o.id
      ${dateFilter}
      GROUP BY p.method
      ORDER BY total_amount DESC
    `;
    
    const { rows: actualPayments } = await pool.query(totalPaymentsQuery, params);
    
    // Get total revenue from tickets
    const totalRevenueQuery = `
      SELECT SUM(t.sold_price) as total_revenue
      FROM tickets t
      JOIN orders o ON t.order_id = o.id
      ${dateFilter}
    `;
    
    const { rows: revenueData } = await pool.query(totalRevenueQuery, params);
    
    // Get category-wise payment allocations (using the same logic as the main report)
    const categoryPaymentsQuery = `
      WITH order_totals AS (
        SELECT 
          o.id as order_id,
          o.total_amount,
          SUM(t.sold_price) as calculated_total
        FROM orders o
        JOIN tickets t ON o.id = t.order_id
        ${dateFilter}
        GROUP BY o.id, o.total_amount
      ),
      category_allocations AS (
        SELECT 
          tt.category,
          p.method,
          SUM(
            CASE 
              WHEN ot.total_amount > 0 
              THEN p.amount * (t.sold_price / ot.total_amount)
              ELSE 0
            END
          ) as allocated_amount
        FROM tickets t
        JOIN ticket_types tt ON t.ticket_type_id = tt.id
        JOIN orders o ON t.order_id = o.id
        JOIN order_totals ot ON o.id = ot.order_id
        JOIN payments p ON o.id = p.order_id
        ${dateFilter}
        GROUP BY tt.category, p.method
      )
      SELECT 
        method,
        SUM(allocated_amount) as total_allocated
      FROM category_allocations
      GROUP BY method
      ORDER BY total_allocated DESC
    `;
    
    const { rows: allocatedPayments } = await pool.query(categoryPaymentsQuery, params);
    
    // Compare actual vs allocated
    const comparison = actualPayments.map(actual => {
      const allocated = allocatedPayments.find(a => a.method === actual.method);
      const difference = parseFloat(actual.total_amount) - parseFloat(allocated?.total_allocated || 0);
      
      return {
        method: actual.method,
        actual_total: parseFloat(actual.total_amount),
        allocated_total: parseFloat(allocated?.total_allocated || 0),
        difference: Math.round(difference * 100) / 100,
        accuracy_percentage: allocated ? Math.round((parseFloat(allocated.total_allocated) / parseFloat(actual.total_amount)) * 10000) / 100 : 0
      };
    });
    
    const totalActual = actualPayments.reduce((sum, p) => sum + parseFloat(p.total_amount), 0);
    const totalAllocated = allocatedPayments.reduce((sum, p) => sum + parseFloat(p.total_allocated), 0);
    
    res.json({
      verification_summary: {
        total_actual_payments: Math.round(totalActual * 100) / 100,
        total_allocated_payments: Math.round(totalAllocated * 100) / 100,
        total_difference: Math.round((totalActual - totalAllocated) * 100) / 100,
        overall_accuracy: Math.round((totalAllocated / totalActual) * 10000) / 100,
        total_revenue: parseFloat(revenueData[0]?.total_revenue || 0)
      },
      payment_method_breakdown: comparison,
      date_range: {
        start: startDate || 'All time',
        end: endDate || 'Present'
      },
      verification_timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error verifying payment totals:', error);
    res.status(500).json({ error: 'Failed to verify payment totals', details: error.message });
  }
};

