import React, { useState, useEffect } from "react";
import {
  Paper,
  Typography,
  Button,
  Box,
  FormControlLabel,
  Switch,
  CircularProgress,
  Grid,
  Divider,
  IconButton,
  Chip,
  Card,
  CardContent
} from "@mui/material";
import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import axios from "axios";
import dayjs from "dayjs";
import { saveAs } from "file-saver";

// Icons
import RefreshIcon from '@mui/icons-material/Refresh';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import DateRangeIcon from '@mui/icons-material/DateRange';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import ReceiptIcon from '@mui/icons-material/Receipt';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';

// Import the OrdersTable component
import OrdersTable from "./OrdersTable";
// Remove config import
// import config from '../../../config';

const AdminReports = () => {
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [fromDate, setFromDate] = useState(dayjs().subtract(7, 'day'));
  const [toDate, setToDate] = useState(dayjs());
  const [useRange, setUseRange] = useState(true); // Default to range view
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState({ 
    totalTickets: 0, 
    totalRevenue: 0,
    totalDiscounts: 0,
    totalOrders: 0
  });

  const baseUrl = window.runtimeConfig?.apiBaseUrl;

  const fetchReport = async (shouldFetch = true) => {
    if (!shouldFetch) return;
    
    if (!baseUrl) {
      setError("API configuration not available");
      return;
    }
    
    if (useRange && fromDate.isAfter(toDate)) {
      setError("Start date cannot be after end date");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const params = useRange
        ? { startDate: fromDate.format("YYYY-MM-DD"), endDate: toDate.format("YYYY-MM-DD") }
        : { date: selectedDate.format("YYYY-MM-DD") };
          
      const endpoint = useRange
        ? `${baseUrl}/api/orders/range-report`
        : `${baseUrl}/api/orders/day-report`;
          
      const { data } = await axios.get(endpoint, { params });
      
      // Check if the data includes summary from backend
      if (data && typeof data === 'object' && data.summary) {
        // Backend provides summary
        setReportData(Array.isArray(data.items) ? data.items : []);
        setSummary({
          totalTickets: data.summary.totalTickets || 0,
          totalRevenue: data.summary.totalRevenue || 0,
          totalDiscounts: data.summary.totalDiscounts || 0,
          totalOrders: Array.isArray(data.items) ? data.items.length : 0
        });
      } else {
        // Calculate summary on frontend
        const reportItems = Array.isArray(data) ? data : [];
        setReportData(reportItems);
        const calculatedSummary = calculateSummary(reportItems);
        setSummary({
          ...calculatedSummary,
          totalOrders: reportItems.length
        });
      }
    } catch (error) {
      console.error("Error fetching report:", error);
      setError("Failed to fetch report data. Please try again.");
      setReportData([]);
      setSummary({ 
        totalTickets: 0, 
        totalRevenue: 0,
        totalDiscounts: 0,
        totalOrders: 0 
      });
    } finally {
      setLoading(false);
    }
  };

  // Use effect with debounce for date changes
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchReport();
    }, 500); // Wait 500ms after last change before fetching
    
    return () => clearTimeout(timer);
  }, [selectedDate, fromDate, toDate, useRange, baseUrl]);

  const exportCSV = () => {
    if (reportData.length === 0) return;

    // Helper function to escape CSV fields properly
    const escapeCSV = (field) => {
      if (field === null || field === undefined) return '';
      const str = String(field);
      // If the field contains quotes, commas, or newlines, wrap in quotes and escape internal quotes
      if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    let csvContent = "\uFEFF"; // BOM for Excel UTF-8
    csvContent += useRange
      ? `Report from ${fromDate.format("YYYY-MM-DD")} to ${toDate.format("YYYY-MM-DD")}\r\n\r\n`
      : `Report for ${selectedDate.format("YYYY-MM-DD")}\r\n\r\n`;

    // Create a CSV for orders
    csvContent += "Order ID,Order Date,User,Total Amount (EGP),Ticket Details,Meal Details,Payment Methods\r\n";
    
    reportData.forEach(order => {
      // Basic order info
      const orderId = order.order_id || 'N/A';
      const orderDate = order.created_at ? new Date(order.created_at).toLocaleString() : 'N/A';
      const userName = order.user_name || 'N/A';
      const totalAmount = parseFloat(order.total_amount || 0).toFixed(2);
      
      // Process tickets into a single detailed string
      let ticketDetails = '';
      if (order.tickets && order.tickets.length > 0) {
        const ticketInfoArray = order.tickets.map(t => {
          const category = t.category || 'Unknown';
          const subcategory = t.subcategory || 'Standard';
          const price = parseFloat(t.sold_price || 0).toFixed(2);
          const qty = t.quantity || 1;
          const subtotal = (qty * parseFloat(t.sold_price || 0)).toFixed(2);
          
          return `${qty}x ${category}-${subcategory} @${price} = ${subtotal}`;
        });
        
        ticketDetails = ticketInfoArray.join(' | ');
      } else {
        ticketDetails = 'No tickets';
      }
      
      // Process meals into a single detailed string
      let mealDetails = '';
      if (order.meals && order.meals.length > 0) {
        const mealInfoArray = order.meals.map(m => {
          const name = m.name || 'Unknown';
          const price = parseFloat(m.price_at_order || 0).toFixed(2);
          const qty = m.quantity || 1;
          const subtotal = (qty * parseFloat(m.price_at_order || 0)).toFixed(2);
          
          return `${qty}x ${name} @${price} = ${subtotal}`;
        });
        
        mealDetails = mealInfoArray.join(' | ');
      } else {
        mealDetails = 'No meals';
      }
      
      // Process payment methods
      const paymentMethods = order.payments && order.payments.length > 0 
        ? order.payments.map(p => `${p.method || 'Unknown'}: ${parseFloat(p.amount || 0).toFixed(2)}`).join(' | ')
        : 'No payments';
      
      // Combine all fields into a CSV row with proper escaping
      csvContent += `${escapeCSV(orderId)},${escapeCSV(orderDate)},${escapeCSV(userName)},${escapeCSV(totalAmount)},${escapeCSV(ticketDetails)},${escapeCSV(mealDetails)},${escapeCSV(paymentMethods)}\r\n`;
    });
    
    // Add a summary section at the end
    csvContent += `\r\n\r\nSUMMARY REPORT\r\n`;
    csvContent += `Total Orders,${reportData.length}\r\n`;
    csvContent += `Total Revenue (EGP),${summary.totalRevenue.toFixed(2)}\r\n`;
    csvContent += `Total Discounts (EGP),${(summary.totalDiscounts || 0).toFixed(2)}\r\n`;
    csvContent += `Total Tickets,${summary.totalTickets}\r\n`;
    
    // Get total tickets by category
    const ticketsByCategory = {};
    reportData.forEach(order => {
      if (order.tickets && order.tickets.length > 0) {
        order.tickets.forEach(ticket => {
          const category = ticket.category || 'Unknown';
          const subcategory = ticket.subcategory || 'Standard';
          const key = `${category}-${subcategory}`;
          
          if (!ticketsByCategory[key]) {
            ticketsByCategory[key] = {
              quantity: 0,
              revenue: 0
            };
          }
          
          ticketsByCategory[key].quantity += (ticket.quantity || 1);
          ticketsByCategory[key].revenue += (ticket.quantity || 1) * parseFloat(ticket.sold_price || 0);
        });
      }
    });
    
    csvContent += `\r\nTICKET BREAKDOWN\r\n`;
    csvContent += `Category,Quantity,Revenue (EGP)\r\n`;
    Object.entries(ticketsByCategory).forEach(([category, data]) => {
      csvContent += `${escapeCSV(category)},${data.quantity},${data.revenue.toFixed(2)}\r\n`;
    });
    
    // Get total meals
    const mealsByType = {};
    reportData.forEach(order => {
      if (order.meals && order.meals.length > 0) {
        order.meals.forEach(meal => {
          const name = meal.name || 'Unknown';
          
          if (!mealsByType[name]) {
            mealsByType[name] = {
              quantity: 0,
              revenue: 0
            };
          }
          
          mealsByType[name].quantity += (meal.quantity || 1);
          mealsByType[name].revenue += (meal.quantity || 1) * parseFloat(meal.price_at_order || 0);
        });
      }
    });
    
    csvContent += `\r\nMEAL BREAKDOWN\r\n`;
    csvContent += `Meal Type,Quantity,Revenue (EGP)\r\n`;
    Object.entries(mealsByType).forEach(([mealName, data]) => {
      csvContent += `${escapeCSV(mealName)},${data.quantity},${data.revenue.toFixed(2)}\r\n`;
    });
    
    // Payment method breakdown
    const paymentsByMethod = {};
    reportData.forEach(order => {
      if (order.payments && order.payments.length > 0) {
        order.payments.forEach(payment => {
          const method = payment.method || 'Unknown';
          
          if (!paymentsByMethod[method]) {
            paymentsByMethod[method] = 0;
          }
          
          paymentsByMethod[method] += parseFloat(payment.amount || 0);
        });
      }
    });
    
    csvContent += `\r\nPAYMENT METHOD BREAKDOWN\r\n`;
    csvContent += `Payment Method,Total Amount (EGP)\r\n`;
    Object.entries(paymentsByMethod).forEach(([method, amount]) => {
      csvContent += `${escapeCSV(method)},${amount.toFixed(2)}\r\n`;
    });

    const filename = useRange
      ? `Report_from_${fromDate.format("YYYY-MM-DD")}_to_${toDate.format("YYYY-MM-DD")}.csv`
      : `Report_${selectedDate.format("YYYY-MM-DD")}.csv`;

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, filename);
  };

  const handleRefresh = () => {
    fetchReport(true);
  };

  const handleFromDateChange = (newVal) => {
    if (newVal) {
      setFromDate(newVal);
      if (newVal.isAfter(toDate)) {
        setToDate(newVal);
      }
    }
  };
  
  const handleToDateChange = (newVal) => {
    if (newVal) {
      setToDate(newVal);
      if (fromDate.isAfter(newVal)) {
        setFromDate(newVal);
      }
    }
  };

  // Calculate totals with proper handling of discounts
  const calculateSummary = (reportItems) => {
    // Calculate totals excluding discount payments
    const totalRevenue = reportItems.reduce((sum, row) => 
      sum + (Number(row.total_amount) || 0), 0);
    
    const totalTickets = reportItems.reduce((sum, row) => {
      if (!row.tickets) return sum;
      return sum + row.tickets.reduce((ticketSum, ticket) => 
        ticketSum + (Number(ticket.quantity) || 0), 0);
    }, 0);
    
    // Calculate total discounts applied (for reporting)
    const totalDiscounts = reportItems.reduce((sum, row) => {
      if (row.payments && Array.isArray(row.payments)) {
        const discounts = row.payments
          .filter(p => p.method === 'discount')
          .reduce((subSum, p) => subSum + Number(p.amount || 0), 0);
        return sum + discounts;
      }
      return sum;
    }, 0);
    
    // Return the complete summary object
    return {
      totalTickets,
      totalRevenue,
      totalDiscounts
    };
  };

  return (
    <Box>
      {/* Header and Controls */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center', 
        mb: 3 
      }}>
        <Typography variant="h5" fontWeight="bold">
          Revenue Reports
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FormControlLabel
            control={
              <Switch 
                checked={useRange} 
                onChange={(e) => setUseRange(e.target.checked)}
              />
            }
            label={useRange ? "Date Range" : "Single Date"}
          />
          
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
          >
            Refresh
          </Button>
          
          <Button
            variant="contained"
            startIcon={<FileDownloadIcon />}
            disabled={reportData.length === 0 || loading}
            onClick={exportCSV}
          >
            Export CSV
          </Button>
        </Box>
      </Box>

      {/* Date Selection */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {useRange ? (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <DateRangeIcon sx={{ color: 'primary.main', mr: 1 }} />
                <Typography variant="subtitle1" fontWeight="medium">
                  Date Range:
                </Typography>
              </Box>
              <DatePicker 
                label="From" 
                value={fromDate} 
                onChange={handleFromDateChange}
                slotProps={{ textField: { size: 'small' } }}
              />
              <DatePicker 
                label="To" 
                value={toDate} 
                onChange={handleToDateChange}
                slotProps={{ textField: { size: 'small' } }} 
              />
            </>
          ) : (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CalendarTodayIcon sx={{ color: 'primary.main', mr: 1 }} />
                <Typography variant="subtitle1" fontWeight="medium">
                  Select Date:
                </Typography>
              </Box>
              <DatePicker 
                value={selectedDate} 
                onChange={(newVal) => newVal && setSelectedDate(newVal)} 
                slotProps={{ textField: { size: 'small' } }}
              />
            </>
          )}
        </Box>
      </Paper>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card sx={{ 
            height: '100%', 
            borderRadius: 2, 
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)' 
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box sx={{ 
                  backgroundColor: '#e3f2fd', 
                  borderRadius: '50%',
                  p: 1,
                  mr: 2
                }}>
                  <ReceiptIcon sx={{ color: '#2196f3' }} />
                </Box>
                <Typography variant="subtitle1" color="text.secondary">
                  Total Orders
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight="bold">
                {summary.totalOrders}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card sx={{ 
            height: '100%', 
            borderRadius: 2, 
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)' 
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box sx={{ 
                  backgroundColor: '#e8f5e9', 
                  borderRadius: '50%',
                  p: 1,
                  mr: 2
                }}>
                  <AttachMoneyIcon sx={{ color: '#4caf50' }} />
                </Box>
                <Typography variant="subtitle1" color="text.secondary">
                  Total Revenue
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight="bold">
                ${summary.totalRevenue.toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card sx={{ 
            height: '100%', 
            borderRadius: 2, 
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)' 
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box sx={{ 
                  backgroundColor: '#fff8e1', 
                  borderRadius: '50%',
                  p: 1,
                  mr: 2
                }}>
                  <LocalOfferIcon sx={{ color: '#ff9800' }} />
                </Box>
                <Typography variant="subtitle1" color="text.secondary">
                  Total Discounts
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight="bold">
                ${summary.totalDiscounts.toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card sx={{ 
            height: '100%', 
            borderRadius: 2, 
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)' 
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box sx={{ 
                  backgroundColor: '#e1f5fe', 
                  borderRadius: '50%',
                  p: 1,
                  mr: 2
                }}>
                  <ConfirmationNumberIcon sx={{ color: '#03a9f4' }} />
                </Box>
                <Typography variant="subtitle1" color="text.secondary">
                  Tickets Sold
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight="bold">
                {summary.totalTickets}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Orders Table */}
      <Paper sx={{ 
        width: '100%', 
        borderRadius: 2, 
        overflow: 'hidden',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        overflowY: 'auto',
      }}>
        <Box sx={{ p: 2, borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight="bold">
            Orders List
          </Typography>
          
          <Chip 
            label={`${reportData.length} orders`} 
            size="small" 
            color="primary" 
            variant="outlined"
          />
        </Box>
        
        <Box sx={{ 
          height: 'calc(100vh - 380px)', 
          position: 'relative',
          minHeight: '400px'
        }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Box sx={{ p: 4, textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Typography color="error" variant="body1" gutterBottom>
                {error}
              </Typography>
              <Button 
                variant="contained" 
                onClick={handleRefresh}
                sx={{ mt: 2, alignSelf: 'center' }}
              >
                Try Again
              </Button>
            </Box>
          ) : reportData.length === 0 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <Typography color="text.secondary">
                No orders found for the selected period
              </Typography>
            </Box>
          ) : (
            <OrdersTable data={reportData} />
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default AdminReports;
