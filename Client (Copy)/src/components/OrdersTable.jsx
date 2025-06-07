import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Collapse,
  Box,
  Typography,
  Chip,
  Button
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import PrintIcon from '@mui/icons-material/Print';
import { notify } from '../utils/toast';

const OrdersTable = ({ data }) => {
  const [expandedRows, setExpandedRows] = useState({});

  const toggleRow = (orderId) => {
    setExpandedRows(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };

  // Helper function to calculate gross total
  const calculateGrossTotal = (order) => {
    const tickets = Array.isArray(order.tickets) ? order.tickets : [];
    const meals = Array.isArray(order.meals) ? order.meals : [];

    const ticketTotal = tickets.reduce((sum, ticket) => {
      const quantity = Number(ticket.quantity) || 1;
      const price = Number(ticket.sold_price) || 0;
      return sum + (quantity * price);
    }, 0);

    const mealTotal = meals.reduce((sum, meal) => {
      const quantity = Number(meal.quantity) || 1;
      const price = Number(meal.price_at_order) || 0;
      return sum + (quantity * price);
    }, 0);

    return ticketTotal + mealTotal;
  };

  // Updated print logic - same format as CheckoutPanel but single copy
  const printOrderReceipt = (order) => {
    // Parse order data
    const tickets = Array.isArray(order.tickets) ? order.tickets : [];
    const meals = Array.isArray(order.meals) ? order.meals : [];
    const payments = Array.isArray(order.payments) ? order.payments : [];

    // Calculate totals
    const ticketTotal = tickets.reduce((sum, ticket) => {
      const quantity = Number(ticket.quantity) || 1;
      const price = Number(ticket.sold_price) || 0;
      return sum + (quantity * price);
    }, 0);

    const mealTotal = meals.reduce((sum, meal) => {
      const quantity = Number(meal.quantity) || 1;
      const price = Number(meal.price_at_order) || 0;
      return sum + (quantity * price);
    }, 0);

    const discountAmount = payments
      .filter(p => p.method === 'discount')
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    const finalTotal = Number(order.total_amount) || 0;
    const grossTotal = ticketTotal + mealTotal; // Calculate gross total

    // Format payment methods with Arabic mapping
    const mapPaymentMethod = (method) => {
      const methodMappings = {
        'postponed': 'آجل',
        'الاهلي': 'بنك الاهلي و مصر',
        'مصر': 'بنك الاهلي و مصر',
        'الاهلي و مصر': 'بنك الاهلي و مصر',
        'cash': 'نقدي',
        'credit': 'فيزا',
        'OTHER': 'بنوك اخرى',
        'other': 'بنوك اخرى',
        'visa': 'فيزا',
        'debit': 'بطاقة خصم',
        'discount': 'خصم',
        'vodafone cash': 'فودافون كاش',
        'vodafone_cash': 'فودافون كاش'
      };
      
      const normalizedMethod = (method || '').toString().toLowerCase().trim();
      
      if (methodMappings[normalizedMethod]) {
        return methodMappings[normalizedMethod];
      }
      
      if (normalizedMethod.includes('الاهلي') || normalizedMethod.includes('مصر')) {
        return 'بنك الاهلي و مصر';
      }
      
      if (normalizedMethod.includes('postponed') || normalizedMethod.includes('آجل')) {
        return 'آجل';
      }
      
      if (normalizedMethod.includes('cash') || normalizedMethod.includes('نقد')) {
        return 'نقدي';
      }
      
      if (normalizedMethod.includes('bank') || normalizedMethod.includes('بنك') || 
          normalizedMethod.includes('card') || normalizedMethod.includes('بطاقة')) {
        return 'بنوك اخرى';
      }
      
      return method || 'غير محدد';
    };

    // Build receipt data
    const receiptData = {
      header: {
        title: 'AKOYA WATER PARK',
        timestamp: new Date(order.created_at).toLocaleString(),
        cashier: order.user_name || 'System',
        orderId: `#${order.order_id}`
      },
      description: order.description && order.description.trim() ? order.description.trim() : '',
      items: {
        tickets: tickets.map(ticket => ({
          name: `${ticket.category || 'Ticket'} - ${ticket.subcategory || 'Standard'}`,
          quantity: Number(ticket.quantity) || 1,
          price: Number(ticket.sold_price) || 0,
          total: (Number(ticket.quantity) || 1) * (Number(ticket.sold_price) || 0)
        })),
        meals: meals.map(meal => ({
          name: meal.name || 'Unknown Meal',
          quantity: Number(meal.quantity) || 1,
          price: Number(meal.price_at_order) || 0,
          total: (Number(meal.quantity) || 1) * (Number(meal.price_at_order) || 0)
        }))
      },
      totals: {
        ticketTotal,
        mealTotal,
        discountAmount,
        finalTotal,
        grossTotal // Add calculated gross total
      },
      payments: payments
        .filter(payment => payment.method !== 'discount' && Number(payment.amount) > 0)
        .map(payment => ({
          method: mapPaymentMethod(payment.method),
          amount: Number(payment.amount)
        }))
    };

    // Generate HTML (same format as CheckoutPanel but description at bottom and bolder)
    const receiptHTML = `
      <div style="width: 74mm; font-family: 'Courier New', monospace; font-size: 12pt; line-height: 1.3; font-weight: 900;">
        <div style="text-align: center; margin-bottom: 5mm;">
          <div style="font-weight: 900; font-size: 18pt; margin-bottom: 2mm; letter-spacing: 1px;">${receiptData.header.title}</div>
          <div style="font-size: 11pt; margin-bottom: 1mm; font-weight: 900;">${receiptData.header.timestamp}</div>
          <div style="font-size: 11pt; margin-bottom: 1mm; font-weight: 900;">Cashier: ${receiptData.header.cashier}</div>
          <div style="font-size: 11pt; margin-bottom: 1mm; font-weight: 900;">Order ID: ${receiptData.header.orderId}</div>
          <div style="font-size: 10pt; font-weight: 900; color: #000; margin-top: 2mm; border: 3px solid #000; padding: 4px; background: #f0f0f0;">[REPRINT]</div>
        </div>
        
        <div style="border-top: 3px solid black; margin: 4mm 0;"></div>
        
        <div style="font-weight: 900; margin: 4mm 0 3mm 0; font-size: 14pt; text-decoration: underline; text-align: center;">ORDER ITEMS</div>
        
        ${receiptData.items.tickets && receiptData.items.tickets.length > 0 ? receiptData.items.tickets.map(ticket => `
          <div style="display: flex; justify-content: space-between; margin-bottom: 3mm; font-size: 11pt; font-weight: 900; padding: 2mm 0; border-bottom: 2px dotted #000;">
            <span style="flex: 1; padding-right: 4mm;">${ticket.name}${ticket.quantity > 1 ? ` × ${ticket.quantity}` : ''}</span>
            <span style="white-space: nowrap; font-weight: 900;">EGP ${(ticket.total || 0).toFixed(2)}</span>
          </div>
        `).join('') : ''}
        
        ${receiptData.items.meals && receiptData.items.meals.length > 0 ? receiptData.items.meals.map(meal => `
          <div style="display: flex; justify-content: space-between; margin-bottom: 3mm; font-size: 11pt; font-weight: 900; padding: 2mm 0; border-bottom: 2px dotted #000;">
            <span style="flex: 1; padding-right: 4mm;">${meal.name} × ${meal.quantity}</span>
            <span style="white-space: nowrap; font-weight: 900;">EGP ${(meal.total || 0).toFixed(2)}</span>
          </div>
        `).join('') : ''}
        
        <div style="border-top: 3px solid black; margin: 4mm 0;"></div>
        
        ${receiptData.totals.ticketTotal > 0 ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 3mm; font-size: 11pt; font-weight: 900;">
            <span>Tickets Subtotal:</span><span style="font-weight: 900;">EGP ${receiptData.totals.ticketTotal.toFixed(2)}</span>
          </div>
        ` : ''}
        
        ${receiptData.totals.mealTotal > 0 ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 3mm; font-size: 11pt; font-weight: 900;">
            <span>Meals Subtotal:</span><span style="font-weight: 900;">EGP ${receiptData.totals.mealTotal.toFixed(2)}</span>
          </div>
        ` : ''}
        
        ${receiptData.totals.discountAmount > 0 ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 3mm; font-size: 11pt; font-weight: 900; color: #d32f2f;">
            <span>Discount Applied:</span><span style="font-weight: 900;">-EGP ${receiptData.totals.discountAmount.toFixed(2)}</span>
          </div>
        ` : ''}
        
        <div style="border-top: 4px solid black; margin: 4mm 0;"></div>
        
        <div style="display: flex; justify-content: space-between; font-weight: 900; margin-top: 4mm; font-size: 16pt; background: #e0e0e0; padding: 3mm; border: 3px solid black;">
          <span>TOTAL:</span><span>EGP ${receiptData.totals.finalTotal.toFixed(2)}</span>
        </div>
        
        <div style="border-top: 3px solid black; margin: 4mm 0;"></div>
        
        <div style="font-weight: 900; margin: 4mm 0 3mm 0; font-size: 14pt; text-decoration: underline; text-align: center;">PAYMENT DETAILS</div>
        
        ${receiptData.payments && receiptData.payments.length > 0 ? receiptData.payments.map(payment => `
          <div style="display: flex; justify-content: space-between; margin-bottom: 3mm; font-size: 11pt; font-weight: 900; padding: 2mm; background: #f5f5f5; border: 2px solid #333;">
            <span style="font-weight: 900;">${payment.method}:</span><span style="font-weight: 900;">EGP ${payment.amount.toFixed(2)}</span>
          </div>
        `).join('') : ''}
        
        <div style="border-top: 3px solid black; margin: 4mm 0;"></div>
        
        <div style="text-align: center; margin-top: 5mm; font-size: 11pt; font-weight: 900;">
          <div style="margin-bottom: 2mm; font-weight: 900;">Thank you for visiting</div>
          <div style="margin-bottom: 2mm; font-weight: 900; font-size: 12pt;">Akoya Water Park!</div>
          <div style="font-size: 12pt; font-weight: 900;">Have a wonderful day! 🌊</div>
        </div>
        
        ${receiptData.description ? `
          <div style="border-top: 3px solid black; margin: 5mm 0 3mm 0;"></div>
          <div style="margin: 4mm 0;">
            <div style="font-weight: 900; margin-bottom: 3mm; font-size: 12pt; text-decoration: underline; text-align: center;">ORDER NOTES:</div>
            <div style="font-size: 10pt; font-weight: 900; background: #f8f8f8; padding: 3mm; border: 2px solid #000; border-radius: 2px; word-wrap: break-word; text-align: center; font-style: italic;">${receiptData.description}</div>
          </div>
        ` : ''}
      </div>
    `;
    
    // Open print window (single copy only)
    const printWindow = window.open('', '_blank', 'width=300,height=600,left=100,top=100');
    
    if (!printWindow) {
      notify.error("Print window blocked. Please allow popups.");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - Order #${order.order_id}</title>
          <meta charset="UTF-8">
          <style>
            @page { 
              size: 80mm auto; 
              margin: 0; 
            }
            body { 
              margin: 0; 
              padding: 3mm; 
              font-family: 'Courier New', monospace; 
              font-size: 10pt; 
              background: white; 
              color: black; 
            }
          </style>
        </head>
        <body>
          ${receiptHTML}
          <script>
            window.onload = function() {
              window.focus();
              setTimeout(function() {
                window.print();
              }, 500);
            };
            
            window.onafterprint = function() {
              window.close();
            };
          </script>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    notify.success(`📄 Receipt for Order #${order.order_id} sent to printer!`);
  };

  // Original formatting functions
  const formatPaymentMethods = (payments) => {
    if (!Array.isArray(payments) || payments.length === 0) return 'N/A';
    
    return payments.map(payment => {
      const method = payment.method || 'Unknown';
      const amount = Number(payment.amount || 0).toFixed(2);
      return `${method}: EGP ${amount}`;
    }).join(', ');
  };

  const formatTickets = (tickets) => {
    if (!Array.isArray(tickets) || tickets.length === 0) return 'No tickets';
    
    return tickets.map(ticket => {
      const category = ticket.category || 'Ticket';
      const subcategory = ticket.subcategory || 'Standard';
      const quantity = ticket.quantity || 1;
      const price = Number(ticket.sold_price || 0).toFixed(2);
      return `${category}-${subcategory} (${quantity}x @ EGP ${price})`;
    }).join(', ');
  };

  const formatMeals = (meals) => {
    if (!Array.isArray(meals) || meals.length === 0) return 'No meals';
    
    return meals.map(meal => {
      const name = meal.name || 'Unknown';
      const quantity = meal.quantity || 1;
      const price = Number(meal.price_at_order || 0).toFixed(2);
      return `${name} (${quantity}x @ EGP ${price})`;
    }).join(', ');
  };

  // Original table UI
  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
            <TableCell />
            <TableCell><strong>Order ID</strong></TableCell>
            <TableCell><strong>Date & Time</strong></TableCell>
            <TableCell><strong>Cashier</strong></TableCell>
            <TableCell><strong>Total (EGP)</strong></TableCell>
            <TableCell><strong>Actions</strong></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((order) => (
            <React.Fragment key={order.order_id}>
              <TableRow hover>
                <TableCell>
                  <IconButton
                    size="small"
                    onClick={() => toggleRow(order.order_id)}
                  >
                    {expandedRows[order.order_id] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </IconButton>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={`#${order.order_id}`} 
                    size="small" 
                    color="primary" 
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  {new Date(order.created_at).toLocaleString()}
                </TableCell>
                <TableCell>{order.user_name || 'Unknown'}</TableCell>
                <TableCell>
                  <strong>EGP {Number(order.total_amount || 0).toFixed(2)}</strong>
                </TableCell>
                <TableCell>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<PrintIcon />}
                    onClick={() => printOrderReceipt(order)}
                    sx={{
                      fontSize: '0.75rem',
                      px: 1,
                      py: 0.5,
                      borderColor: "#00AEEF",
                      color: "#00AEEF",
                      '&:hover': {
                        borderColor: "#007EA7",
                        backgroundColor: "#E0F7FF",
                      }
                    }}
                  >
                    Print
                  </Button>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
                  <Collapse in={expandedRows[order.order_id]} timeout="auto" unmountOnExit>
                    <Box sx={{ margin: 1, padding: 2, backgroundColor: '#f9f9f9', borderRadius: 1 }}>
                      <Typography variant="h6" gutterBottom component="div" color="#00AEEF">
                        Order Details
                      </Typography>
                      
                      {order.description && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#666' }}>
                            Description:
                          </Typography>
                          <Typography variant="body2" sx={{ 
                            backgroundColor: '#fff', 
                            padding: 1, 
                            borderRadius: 1, 
                            border: '1px solid #ddd',
                            fontStyle: 'italic'
                          }}>
                            {order.description}
                          </Typography>
                        </Box>
                      )}
                      
                      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#666' }}>
                            Tickets:
                          </Typography>
                          <Typography variant="body2">
                            {formatTickets(order.tickets)}
                          </Typography>
                        </Box>
                        
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#666' }}>
                            Meals:
                          </Typography>
                          <Typography variant="body2">
                            {formatMeals(order.meals)}
                          </Typography>
                        </Box>
                        
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#666' }}>
                            Payment Methods:
                          </Typography>
                          <Typography variant="body2">
                            {formatPaymentMethods(order.payments)}
                          </Typography>
                        </Box>
                        
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#666' }}>
                            Gross Total:
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#2e7d32' }}>
                            EGP {calculateGrossTotal(order).toFixed(2)}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  </Collapse>
                </TableCell>
              </TableRow>
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default OrdersTable;
