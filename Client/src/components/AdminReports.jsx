// Replace the entire AdminReports.jsx with this updated version:

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
  CardContent,
  Tab,
  Tabs
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
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import CategoryIcon from '@mui/icons-material/Category';
import CreditCardIcon from '@mui/icons-material/CreditCard';

// Import components
import OrdersTable from "./OrdersTable";
import CategorySalesReport from "./CategorySalesReport";
import CreditReport from "./CreditReport";

const AdminReports = () => {
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [fromDate, setFromDate] = useState(dayjs().subtract(7, 'day'));
  const [toDate, setToDate] = useState(dayjs());
  const [useRange, setUseRange] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Tab management
  const [currentTab, setCurrentTab] = useState(0);
  
  // Orders data
  const [reportData, setReportData] = useState([]);
  const [summary, setSummary] = useState({ 
    totalTickets: 0, 
    totalRevenue: 0,
    totalDiscounts: 0,
    totalOrders: 0
  });
  
  // Category sales data
  const [categorySalesData, setCategorySalesData] = useState(null);
  
  // Credit report data
  const [creditReportData, setCreditReportData] = useState(null);

  const baseUrl = window.runtimeConfig?.apiBaseUrl;

  // Format date for API calls
  const formatApiDate = (date) => date.format("YYYY-MM-DD");
  const formatDisplayDate = (date) => date.format("MMM DD, YYYY");

  // Fetch orders report
  const fetchOrdersReport = async () => {
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
        ? { startDate: formatApiDate(fromDate), endDate: formatApiDate(toDate) }
        : { date: formatApiDate(selectedDate) };
          
      const endpoint = useRange
        ? `${baseUrl}/api/orders/range-report`
        : `${baseUrl}/api/orders/day-report`;
          
      const { data } = await axios.get(endpoint, { params });
      
      if (data && typeof data === 'object' && data.summary) {
        setReportData(Array.isArray(data.items) ? data.items : []);
        setSummary({
          totalTickets: data.summary.totalTickets || 0,
          totalRevenue: data.summary.totalRevenue || 0,
          totalDiscounts: data.summary.totalDiscounts || 0,
          totalOrders: Array.isArray(data.items) ? data.items.length : 0
        });
      } else {
        const reportItems = Array.isArray(data) ? data : [];
        setReportData(reportItems);
        const calculatedSummary = calculateSummary(reportItems);
        setSummary({
          ...calculatedSummary,
          totalOrders: reportItems.length
        });
      }
    } catch (error) {
      console.error("Error fetching orders report:", error);
      setError("Failed to fetch orders report data. Please try again.");
      setReportData([]);
      setSummary({ totalTickets: 0, totalRevenue: 0, totalDiscounts: 0, totalOrders: 0 });
    } finally {
      setLoading(false);
    }
  };

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
    
    // Clear data for inactive tabs to trigger fresh fetches
    if (newValue === 0) {
      // Orders tab - clear other data
      setCategorySalesData(null);
      setCreditReportData(null);
      if (reportData.length === 0) {
        fetchOrdersReport();
      }
    } else if (newValue === 1) {
      // Category sales tab - clear other data
      setReportData([]);
      setCreditReportData(null);
      setSummary({ totalTickets: 0, totalRevenue: 0, totalDiscounts: 0, totalOrders: 0 });
      // CategorySalesReport will handle its own fetching
    } else if (newValue === 2) {
      // Credit report tab - clear other data
      setReportData([]);
      setCategorySalesData(null);
      setSummary({ totalTickets: 0, totalRevenue: 0, totalDiscounts: 0, totalOrders: 0 });
      // CreditReport will handle its own fetching
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    if (currentTab === 0) {
      fetchOrdersReport();
    } else if (currentTab === 1) {
      setCategorySalesData(null); // This will trigger refetch in CategorySalesReport
    } else if (currentTab === 2) {
      setCreditReportData(null); // This will trigger refetch in CreditReport
    }
  };

  // Fetch data on date changes
  useEffect(() => {
    if (currentTab === 0) {
      const timer = setTimeout(() => {
        fetchOrdersReport();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [selectedDate, fromDate, toDate, useRange, baseUrl, currentTab]);

  // Orders CSV export
  const exportOrdersCSV = () => {
    if (reportData.length === 0) return;

    const escapeCSV = (field) => {
      if (field === null || field === undefined) return '';
      const str = String(field);
      if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    let csvContent = "\uFEFF";
    csvContent += useRange
      ? `Orders Report from ${formatApiDate(fromDate)} to ${formatApiDate(toDate)}\r\n\r\n`
      : `Orders Report for ${formatApiDate(selectedDate)}\r\n\r\n`;

    csvContent += "Order ID,Order Date,User,Total Amount (EGP),Ticket Details,Meal Details,Payment Methods\r\n";
    
    reportData.forEach(order => {
      const orderId = order.order_id || 'N/A';
      const orderDate = order.created_at ? new Date(order.created_at).toLocaleString() : 'N/A';
      const userName = order.user_name || 'N/A';
      const totalAmount = parseFloat(order.total_amount || 0).toFixed(2);
      
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
      
      const paymentMethods = order.payments && order.payments.length > 0 
        ? order.payments.map(p => `${p.method || 'Unknown'}: ${parseFloat(p.amount || 0).toFixed(2)}`).join(' | ')
        : 'No payments';
      
      csvContent += `${escapeCSV(orderId)},${escapeCSV(orderDate)},${escapeCSV(userName)},${escapeCSV(totalAmount)},${escapeCSV(ticketDetails)},${escapeCSV(mealDetails)},${escapeCSV(paymentMethods)}\r\n`;
    });
    
    csvContent += `\r\n\r\nSUMMARY\r\n`;
    csvContent += `Total Orders,${reportData.length}\r\n`;
    csvContent += `Total Revenue (EGP),${summary.totalRevenue.toFixed(2)}\r\n`;
    csvContent += `Total Discounts (EGP),${(summary.totalDiscounts || 0).toFixed(2)}\r\n`;
    csvContent += `Total Tickets,${summary.totalTickets}\r\n`;

    const filename = useRange
      ? `Orders_Report_${formatApiDate(fromDate)}_to_${formatApiDate(toDate)}.csv`
      : `Orders_Report_${formatApiDate(selectedDate)}.csv`;

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, filename);
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

  const calculateSummary = (reportItems) => {
    const totalRevenue = reportItems.reduce((sum, row) => 
      sum + (Number(row.total_amount) || 0), 0);
    
    const totalTickets = reportItems.reduce((sum, row) => {
      if (!row.tickets) return sum;
      return sum + row.tickets.reduce((ticketSum, ticket) => 
        ticketSum + (Number(ticket.quantity) || 0), 0);
    }, 0);
    
    const totalDiscounts = reportItems.reduce((sum, row) => {
      if (row.payments && Array.isArray(row.payments)) {
        const discounts = row.payments
          .filter(p => p.method === 'discount')
          .reduce((subSum, p) => subSum + Number(p.amount || 0), 0);
        return sum + discounts;
      }
      return sum;
    }, 0);
    
    return { totalTickets, totalRevenue, totalDiscounts };
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box>
        {/* Header and Controls */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center', 
          mb: 3 
        }}>
          <Typography variant="h5" fontWeight="bold">
            📊 Admin Reports
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
            
            {currentTab === 0 && (
              <Button
                variant="contained"
                startIcon={<FileDownloadIcon />}
                disabled={reportData.length === 0 || loading}
                onClick={exportOrdersCSV}
              >
                Export CSV
              </Button>
            )}
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

        {/* Navigation Tabs */}
        <Paper sx={{ mb: 3, borderRadius: 2 }}>
          <Tabs 
            value={currentTab} 
            onChange={handleTabChange}
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab 
              icon={<ShoppingCartIcon />} 
              label="Orders Report" 
              sx={{ minHeight: 72, textTransform: 'none' }}
            />
            <Tab 
              icon={<CategoryIcon />} 
              label="Category Sales" 
              sx={{ minHeight: 72, textTransform: 'none' }}
            />
            <Tab 
              icon={<CreditCardIcon />} 
              label="Credit Report" 
              sx={{ minHeight: 72, textTransform: 'none' }}
            />
          </Tabs>
        </Paper>

        {/* Tab Content */}
        {currentTab === 0 && (
          <>
            {/* Summary Cards for Orders */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} md={3}>
                <Card sx={{ height: '100%', borderRadius: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Box sx={{ backgroundColor: '#e3f2fd', borderRadius: '50%', p: 1, mr: 2 }}>
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
                <Card sx={{ height: '100%', borderRadius: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Box sx={{ backgroundColor: '#e8f5e9', borderRadius: '50%', p: 1, mr: 2 }}>
                        <AttachMoneyIcon sx={{ color: '#4caf50' }} />
                      </Box>
                      <Typography variant="subtitle1" color="text.secondary">
                        Total Revenue
                      </Typography>
                    </Box>
                    <Typography variant="h4" fontWeight="bold">
                      EGP {summary.totalRevenue.toFixed(2)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={3}>
                <Card sx={{ height: '100%', borderRadius: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Box sx={{ backgroundColor: '#fff8e1', borderRadius: '50%', p: 1, mr: 2 }}>
                        <LocalOfferIcon sx={{ color: '#ff9800' }} />
                      </Box>
                      <Typography variant="subtitle1" color="text.secondary">
                        Total Discounts
                      </Typography>
                    </Box>
                    <Typography variant="h4" fontWeight="bold">
                      EGP {summary.totalDiscounts.toFixed(2)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={3}>
                <Card sx={{ height: '100%', borderRadius: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Box sx={{ backgroundColor: '#e1f5fe', borderRadius: '50%', p: 1, mr: 2 }}>
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
            }}>
              <Box sx={{ p: 2, borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" fontWeight="bold">
                  🛒 Orders List
                </Typography>
                <Chip label={`${reportData.length} orders`} size="small" color="primary" variant="outlined" />
              </Box>
              
              <Box sx={{ height: 'calc(100vh - 500px)', position: 'relative', minHeight: '400px' }}>
                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    <CircularProgress />
                  </Box>
                ) : error ? (
                  <Box sx={{ p: 4, textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <Typography color="error" variant="body1" gutterBottom>
                      {error}
                    </Typography>
                    <Button variant="contained" onClick={handleRefresh} sx={{ mt: 2, alignSelf: 'center' }}>
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
          </>
        )}

        {currentTab === 1 && (
          <CategorySalesReport
            selectedDate={selectedDate}
            fromDate={fromDate}
            toDate={toDate}
            useRange={useRange}
            formatApiDate={formatApiDate}
            formatDisplayDate={formatDisplayDate}
            loading={loading}
            setLoading={setLoading}
            error={error}
            setError={setError}
            categorySalesData={categorySalesData}
            setCategorySalesData={setCategorySalesData}
          />
        )}

        {currentTab === 2 && (
          <CreditReport
            selectedDate={selectedDate}
            fromDate={fromDate}
            toDate={toDate}
            useRange={useRange}
            formatApiDate={formatApiDate}
            loading={loading}
            setLoading={setLoading}
            error={error}
            setError={setError}
            creditReportData={creditReportData}
            setCreditReportData={setCreditReportData}
          />
        )}
      </Box>
    </LocalizationProvider>
  );
};

export default AdminReports;