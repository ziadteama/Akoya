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
  Tabs,
  useMediaQuery,
  useTheme,
  Stack,
  TextField,
  InputAdornment,
  Collapse
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
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

// Import components
import OrdersTable from "./OrdersTable";
import CategorySalesReport from "./CategorySalesReport";
import CreditReport from "./CreditReport";

const AdminReports = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [fromDate, setFromDate] = useState(dayjs().subtract(7, 'day'));
  const [toDate, setToDate] = useState(dayjs());
  const [useRange, setUseRange] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Tab management
  const [currentTab, setCurrentTab] = useState(0);
  
  // Date filter menu
  const [dateRange, setDateRange] = useState('week');
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  
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

  // Handle date range filtering
  const handleDateRangeChange = (range) => {
    setDateRange(range);
    
    const today = dayjs();
    
    switch (range) {
      case 'today':
        setFromDate(today.startOf('day'));
        setToDate(today);
        setUseRange(false);
        setSelectedDate(today);
        break;
      case 'yesterday':
        const yesterday = today.subtract(1, 'day');
        setFromDate(yesterday.startOf('day'));
        setToDate(yesterday.endOf('day'));
        setUseRange(false);
        setSelectedDate(yesterday);
        break;
      case 'week':
        setFromDate(today.subtract(7, 'day'));
        setToDate(today);
        setUseRange(true);
        break;
      case 'month':
        setFromDate(today.subtract(30, 'day'));
        setToDate(today);
        setUseRange(true);
        break;
      case 'quarter':
        setFromDate(today.subtract(90, 'day'));
        setToDate(today);
        setUseRange(true);
        break;
      default:
        setFromDate(today.subtract(7, 'day'));
        setToDate(today);
        setUseRange(true);
    }
  };

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

  // Handle from date change
  const handleFromDateChange = (newValue) => {
    if (newValue) {
      setFromDate(newValue);
      if (newValue.isAfter(toDate)) {
        setToDate(newValue);
      }
    }
  };
  
  // Handle to date change
  const handleToDateChange = (newValue) => {
    if (newValue) {
      setToDate(newValue);
      if (fromDate.isAfter(newValue)) {
        setFromDate(newValue);
      }
    }
  };

  // Handle single date change
  const handleSelectedDateChange = (newValue) => {
    if (newValue) {
      setSelectedDate(newValue);
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

  const getResultsText = () => {
    if (currentTab === 0) {
      return `${reportData.length} orders`;
    } else if (currentTab === 1) {
      return categorySalesData?.categories?.length ? `${categorySalesData.categories.length} categories` : '0 categories';
    } else if (currentTab === 2) {
      return creditReportData?.length ? `${creditReportData.length} records` : '0 records';
    }
    return '';
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
        {/* Compact Mobile Header - Same style as OrdersManagement */}
        <Box sx={{ mb: 2 }}>
          <Typography variant={isMobile ? "h6" : "h4"} fontWeight="bold" sx={{ mb: 1 }}>
            📊 Admin Reports
          </Typography>
          
          {/* Collapsible Date Filter Button - Same style */}
          <Box>
            <Button
              size="small"
              onClick={() => setFilterMenuOpen(!filterMenuOpen)}
              endIcon={filterMenuOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              sx={{ mb: 1, textTransform: 'none', fontSize: '0.8rem' }}
              startIcon={<DateRangeIcon />}
              variant="outlined"
              fullWidth
            >
              {useRange ? 
                `${fromDate.format('MMM DD')} - ${toDate.format('MMM DD')}` :
                selectedDate.format('MMM DD, YYYY')
              } ({getResultsText()})
            </Button>
            
            <Collapse in={filterMenuOpen}>
              <Box sx={{ p: 1, bgcolor: 'grey.50', borderRadius: 1, mb: 1 }}>
                {/* Date Range Switch */}
                <FormControlLabel
                  control={
                    <Switch 
                      checked={useRange} 
                      onChange={(e) => setUseRange(e.target.checked)}
                      size="small"
                    />
                  }
                  label={
                    <Typography sx={{ fontSize: '0.75rem' }}>
                      {useRange ? "Date Range" : "Single Date"}
                    </Typography>
                  }
                  sx={{ mb: 1, ml: 0 }}
                />

                {/* Compact Date Pickers */}
                {useRange ? (
                  <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                    <DatePicker
                      label="From"
                      value={fromDate}
                      onChange={handleFromDateChange}
                      slotProps={{ 
                        textField: { 
                          size: 'small',
                          sx: { flex: 1 }
                        } 
                      }}
                    />
                    <DatePicker
                      label="To"
                      value={toDate}
                      onChange={handleToDateChange}
                      slotProps={{ 
                        textField: { 
                          size: 'small',
                          sx: { flex: 1 }
                        } 
                      }}
                    />
                  </Stack>
                ) : (
                  <DatePicker
                    label="Date"
                    value={selectedDate}
                    onChange={handleSelectedDateChange}
                    slotProps={{ 
                      textField: { 
                        size: 'small',
                        fullWidth: true,
                        sx: { mb: 1 }
                      } 
                    }}
                  />
                )}

                {/* Compact Quick Date Buttons */}
                <Grid container spacing={0.5}>
                  {[
                    { key: 'today', label: 'Today' },
                    { key: 'yesterday', label: 'Yesterday' },
                    { key: 'week', label: '7 Days' },
                    { key: 'month', label: '30 Days' },
                    { key: 'quarter', label: '90 Days' }
                  ].map(({ key, label }) => (
                    <Grid item xs={6} sm={4} key={key}>
                      <Button 
                        variant={dateRange === key ? 'contained' : 'outlined'}
                        size="small"
                        onClick={() => handleDateRangeChange(key)}
                        fullWidth
                        sx={{ 
                          fontSize: '0.7rem',
                          minHeight: 'auto',
                          py: 0.5
                        }}
                      >
                        {label}
                      </Button>
                    </Grid>
                  ))}
                </Grid>

                {/* Action Buttons */}
                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                  <IconButton
                    onClick={handleRefresh}
                    size="small"
                    sx={{ 
                      bgcolor: 'rgba(0, 174, 239, 0.1)',
                      '&:hover': { bgcolor: 'rgba(0, 174, 239, 0.2)' },
                      flex: 1
                    }}
                    title="Refresh"
                  >
                    <RefreshIcon fontSize="small" sx={{ color: '#00AEEF' }} />
                  </IconButton>
                  
                  {currentTab === 0 && (
                    <IconButton
                      disabled={reportData.length === 0 || loading}
                      onClick={exportOrdersCSV}
                      size="small"
                      sx={{ 
                        bgcolor: 'rgba(76, 175, 80, 0.1)',
                        '&:hover': { bgcolor: 'rgba(76, 175, 80, 0.2)' },
                        '&:disabled': { bgcolor: 'rgba(0, 0, 0, 0.04)' },
                        flex: 1
                      }}
                      title="Export CSV"
                    >
                      <FileDownloadIcon fontSize="small" sx={{ color: '#4CAF50' }} />
                    </IconButton>
                  )}
                </Stack>
              </Box>
            </Collapse>
          </Box>
        </Box>

        {/* Compact Navigation Tabs */}
        <Paper sx={{ mb: 2, borderRadius: 2 }}>
          <Tabs 
            value={currentTab} 
            onChange={handleTabChange}
            variant={isMobile ? "scrollable" : "standard"}
            scrollButtons={isMobile ? "auto" : false}
            allowScrollButtonsMobile={isMobile}
            sx={{ 
              minHeight: { xs: 40, sm: 48 },
              '& .MuiTab-root': {
                minHeight: { xs: 40, sm: 48 },
                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                textTransform: 'none',
                padding: { xs: '4px 8px', sm: '8px 12px' },
                '& .MuiSvgIcon-root': {
                  fontSize: { xs: '1rem', sm: '1.25rem' }
                }
              }
            }}
          >
            <Tab 
              icon={<ShoppingCartIcon />} 
              label={isSmallMobile ? "Orders" : "Orders Report"}
              iconPosition="start"
            />
            <Tab 
              icon={<CategoryIcon />} 
              label={isSmallMobile ? "Sales" : "Category Sales"}
              iconPosition="start"
            />
            <Tab 
              icon={<CreditCardIcon />} 
              label={isSmallMobile ? "Credit" : "Credit Report"}
              iconPosition="start"
            />
          </Tabs>
        </Paper>

        {/* Tab Content */}
        {currentTab === 0 && (
          <>
            {/* Compact Summary Cards for Orders */}
            <Grid container spacing={{ xs: 1, sm: 2 }} sx={{ mb: 2 }}>
              <Grid item xs={6} sm={3}>
                <Card sx={{ 
                  borderRadius: 2, 
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  height: '100%'
                }}>
                  <CardContent sx={{ p: { xs: 1, sm: 1.5 } }}>
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      mb: 0.5
                    }}>
                      <Box sx={{ 
                        backgroundColor: '#e3f2fd', 
                        borderRadius: '50%', 
                        p: 0.5, 
                        mr: 1
                      }}>
                        <ReceiptIcon sx={{ 
                          color: '#2196f3',
                          fontSize: { xs: '1rem', sm: '1.25rem' }
                        }} />
                      </Box>
                      <Typography 
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}
                      >
                        Orders
                      </Typography>
                    </Box>
                    <Typography 
                      variant={isSmallMobile ? "h6" : "h5"}
                      fontWeight="bold"
                      sx={{ fontSize: { xs: '1.1rem', sm: '1.5rem' } }}
                    >
                      {summary.totalOrders}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={6} sm={3}>
                <Card sx={{ 
                  borderRadius: 2, 
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  height: '100%'
                }}>
                  <CardContent sx={{ p: { xs: 1, sm: 1.5 } }}>
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      mb: 0.5
                    }}>
                      <Box sx={{ 
                        backgroundColor: '#e8f5e9', 
                        borderRadius: '50%', 
                        p: 0.5, 
                        mr: 1
                      }}>
                        <AttachMoneyIcon sx={{ 
                          color: '#4caf50',
                          fontSize: { xs: '1rem', sm: '1.25rem' }
                        }} />
                      </Box>
                      <Typography 
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}
                      >
                        Revenue
                      </Typography>
                    </Box>
                    <Typography 
                      variant={isSmallMobile ? "subtitle2" : "h5"}
                      fontWeight="bold"
                      sx={{ fontSize: { xs: '0.9rem', sm: '1.5rem' } }}
                    >
                      {isSmallMobile ? 
                        `${summary.totalRevenue.toFixed(0)}` : 
                        `EGP ${summary.totalRevenue.toFixed(2)}`
                      }
                    </Typography>
                    {isSmallMobile && (
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>
                        EGP
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={6} sm={3}>
                <Card sx={{ 
                  borderRadius: 2, 
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  height: '100%'
                }}>
                  <CardContent sx={{ p: { xs: 1, sm: 1.5 } }}>
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      mb: 0.5
                    }}>
                      <Box sx={{ 
                        backgroundColor: '#fff8e1', 
                        borderRadius: '50%', 
                        p: 0.5, 
                        mr: 1
                      }}>
                        <LocalOfferIcon sx={{ 
                          color: '#ff9800',
                          fontSize: { xs: '1rem', sm: '1.25rem' }
                        }} />
                      </Box>
                      <Typography 
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}
                      >
                        Discounts
                      </Typography>
                    </Box>
                    <Typography 
                      variant={isSmallMobile ? "subtitle2" : "h5"}
                      fontWeight="bold"
                      sx={{ fontSize: { xs: '0.9rem', sm: '1.5rem' } }}
                    >
                      {isSmallMobile ? 
                        `${summary.totalDiscounts.toFixed(0)}` : 
                        `EGP ${summary.totalDiscounts.toFixed(2)}`
                      }
                    </Typography>
                    {isSmallMobile && (
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>
                        EGP
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={6} sm={3}>
                <Card sx={{ 
                  borderRadius: 2, 
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  height: '100%'
                }}>
                  <CardContent sx={{ p: { xs: 1, sm: 1.5 } }}>
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      mb: 0.5
                    }}>
                      <Box sx={{ 
                        backgroundColor: '#e1f5fe', 
                        borderRadius: '50%', 
                        p: 0.5, 
                        mr: 1
                      }}>
                        <ConfirmationNumberIcon sx={{ 
                          color: '#03a9f4',
                          fontSize: { xs: '1rem', sm: '1.25rem' }
                        }} />
                      </Box>
                      <Typography 
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}
                      >
                        Tickets
                      </Typography>
                    </Box>
                    <Typography 
                      variant={isSmallMobile ? "h6" : "h5"}
                      fontWeight="bold"
                      sx={{ fontSize: { xs: '1.1rem', sm: '1.5rem' } }}
                    >
                      {summary.totalTickets}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Compact Orders Table Container */}
            <Paper sx={{ 
              width: '100%', 
              borderRadius: 2, 
              overflow: 'hidden',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            }}>
              <Box sx={{ 
                p: { xs: 1, sm: 1.5 }, 
                borderBottom: '1px solid #f0f0f0', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center'
              }}>
                <Typography 
                  variant="subtitle1"
                  fontWeight="bold"
                  sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
                >
                  🛒 Orders List
                </Typography>
                <Chip 
                  label={`${reportData.length} orders`} 
                  size="small"
                  color="primary" 
                  variant="outlined" 
                />
              </Box>
              
              <Box sx={{ 
                height: { xs: 'calc(100vh - 420px)', sm: 'calc(100vh - 450px)' },
                position: 'relative', 
                minHeight: { xs: '250px', sm: '300px' }
              }}>
                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    <CircularProgress size={isMobile ? 32 : 40} />
                  </Box>
                ) : error ? (
                  <Box sx={{ 
                    p: { xs: 2, sm: 3 }, 
                    textAlign: 'center', 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    justifyContent: 'center' 
                  }}>
                    <Typography 
                      color="error" 
                      variant={isSmallMobile ? "body2" : "body1"}
                      gutterBottom
                    >
                      {error}
                    </Typography>
                    <Button 
                      variant="contained" 
                      onClick={handleRefresh} 
                      sx={{ mt: 2, alignSelf: 'center' }}
                      size="small"
                    >
                      Try Again
                    </Button>
                  </Box>
                ) : reportData.length === 0 ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    <Typography 
                      color="text.secondary"
                      variant="body2"
                      textAlign="center"
                      sx={{ px: 2 }}
                    >
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