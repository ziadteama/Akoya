import React, { useState, useEffect } from 'react';
import { Box, Container, Grid, Paper, Typography, Card, CardContent, 
  Tab, Tabs, IconButton, Menu, MenuItem, Chip, CircularProgress, Divider, 
  useTheme, Drawer, List, ListItem, ListItemIcon, ListItemText, AppBar, 
  Toolbar, CssBaseline, Button } from '@mui/material';
import { styled } from '@mui/material/styles';
import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import axios from "axios";
import { useNavigate } from "react-router-dom";

// Import MUI X Charts components
import { 
  LineChart, 
  BarChart,
  PieChart,
} from '@mui/x-charts';

import TopBar from "../components/TopBar";
import UsersManagement from '../components/UsersManagement';
import OrdersManagement from '../components/OrdersManagement';
import AdminMeals from '../components/AdminMeals';
import AdminCategories from '../components/AdminCategories';
import AdminReports from '../components/AdminReports';

// Icons
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import CategoryIcon from '@mui/icons-material/Category';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import SettingsIcon from '@mui/icons-material/Settings';
import HelpIcon from '@mui/icons-material/Help';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import LogoutIcon from '@mui/icons-material/Logout';
import FilterListIcon from '@mui/icons-material/FilterList';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DateRangeIcon from '@mui/icons-material/DateRange';
import RefreshIcon from '@mui/icons-material/Refresh';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import PrintIcon from '@mui/icons-material/Print';
// Remove config import
// import config from '../../../config';

const drawerWidth = 240;

const Main = styled('main', { shouldForwardProp: (prop) => prop !== 'open' })(
  ({ theme, open }) => ({
    flexGrow: 1,
    padding: theme.spacing(3),
    paddingBottom: theme.spacing(10), // Add bottom padding for better spacing
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    marginLeft: `-${drawerWidth}px`,
    height: '100vh', // Set height to 100% of viewport height
    overflowY: 'auto', // Enable vertical scrolling
    overflowX: 'hidden', // Prevent horizontal scrolling
    ...(open && {
      transition: theme.transitions.create('margin', {
        easing: theme.transitions.easing.easeOut,
        duration: theme.transitions.duration.enteringScreen,
      }),
      marginLeft: 0,
    }),
  }),
);

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(0, 1),
  // necessary for content to be below app bar
  ...theme.mixins.toolbar,
  justifyContent: 'flex-end',
}));

// Custom card for KPIs display
const StatsCard = ({ icon, title, value, color, secondaryValue }) => {
  return (
    <Card sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
      borderRadius: 3,
      transition: 'transform 0.3s, box-shadow 0.3s',
      '&:hover': {
        transform: 'translateY(-5px)',
        boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)',
      }
    }}>
      <CardContent sx={{ flexGrow: 1, position: 'relative', pt: 2 }}>
        <Box sx={{ 
          position: 'absolute', 
          top: 16, 
          right: 16, 
          backgroundColor: `${color}20`, 
          borderRadius: '50%',
          p: 1.2
        }}>
          {icon}
        </Box>
        <Typography variant="subtitle2" sx={{ color: 'text.secondary', mb: 1 }}>
          {title}
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 0.5 }}>
          {value}
        </Typography>
        {secondaryValue && (
          <Typography variant="body2" color="text.secondary">
            {secondaryValue}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

const AdminDashboard = () => {
  const theme = useTheme();
  const navigate = useNavigate();

  const baseUrl = window.runtimeConfig?.apiBaseUrl;

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [dateRange, setDateRange] = useState('week');
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [activePage, setActivePage] = useState('dashboard');
  const [fromDate, setFromDate] = useState(dayjs().subtract(7, 'day'));
  const [toDate, setToDate] = useState(dayjs());
  const [dateMenuAnchorEl, setDateMenuAnchorEl] = useState(null);
  const [error, setError] = useState(null);
  const [kpiData, setKpiData] = useState({
    totalRevenue: "0.00",
    ticketsCount: "0",
    mealsCount: "0",
    avgOrderValue: "0.00"
  });

  // Define chart colors
  const COLORS = [
    '#00B4D8', // Primary blue
    '#0077B6', // Darker blue
    '#00BFFF', // Sky blue
    '#90E0EF', // Light blue
    '#CAF0F8', // Very light blue
    '#005F73', // Deep blue
    '#0094C6', // Medium blue
    '#48CAE4', // Bright blue
    '#ADE8F4', // Pale blue
    '#023E8A', // Navy blue
  ];

  // Fetch data using the API like in AccountantReports
  const fetchData = async () => {
    if (!baseUrl) {
      setError("API configuration not available");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const params = { 
        startDate: fromDate.format("YYYY-MM-DD"), 
        endDate: toDate.format("YYYY-MM-DD") 
      };
      
      console.log("Fetching data with params:", params); // Debug log
      
      const response = await axios.get(`${baseUrl}/api/orders/range-report`, { params });
      
      console.log("API response:", response); // Debug log
      
      // The data is directly in response.data (not in response.data.items)
      if (response.data && Array.isArray(response.data)) {
        // We have an array of orders directly
        setOrders(response.data);
        
        // Process data for KPIs and charts
        processOrderData(response.data);
        console.log("Orders set:", response.data.length);
      } else {
        console.error("Unexpected data format:", response.data);
        setError("Received unexpected data format from server");
        setOrders([]);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setError("Failed to fetch dashboard data. Please try again.");
      setOrders([]);
      setKpiData({
        totalRevenue: "0.00",
        ticketsCount: "0",
        mealsCount: "0",
        avgOrderValue: "0.00"
      });
    } finally {
      setLoading(false);
    }
  };

  // Update processOrderData to exclude discounts from total revenue
  const processOrderData = (data) => {
    if (!data || data.length === 0) {
      setKpiData({
        totalRevenue: "0.00",
        ticketsCount: "0",
        mealsCount: "0",
        avgOrderValue: "0.00"
      });
      return;
    }

    // Calculate total revenue (excluding discounts)
    let totalRevenue = 0;
    
    data.forEach(order => {
      // Just use the order amount which already has discounts removed
      const orderAmount = parseFloat(order.total_amount || 0);
      totalRevenue += orderAmount;
    });
    
    // Count tickets
    let ticketsCount = 0;
    data.forEach(order => {
      if (order.tickets) {
        order.tickets.forEach(ticket => {
          ticketsCount += (ticket.quantity || 0);
        });
      }
    });
    
    // Count meals
    let mealsCount = 0;
    data.forEach(order => {
      if (order.meals) {
        order.meals.forEach(meal => {
          mealsCount += (meal.quantity || 0);
        });
      }
    });
    
    // Calculate average order value (excluding discounts)
    const avgOrderValue = data.length ? totalRevenue / data.length : 0;
    
    setKpiData({
      totalRevenue: totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      ticketsCount: ticketsCount.toString(),
      mealsCount: mealsCount.toString(),
      avgOrderValue: avgOrderValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    });
  };

  // Fetch data on component mount and when date range changes
  useEffect(() => {
    fetchData();
  }, [fromDate, toDate, baseUrl]);

  // Handle drawer toggle
  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  // Handle navigation
  const handleNavigation = (page) => {
    setActivePage(page);
  };
  
  // Handle date menu click
  const handleDateMenuClick = (event) => {
    setDateMenuAnchorEl(event.currentTarget);
  };

  // Handle date menu close
  const handleDateMenuClose = () => {
    setDateMenuAnchorEl(null);
  };
  
  // Handle date range change
  const handleDateRangeChange = (range) => {
    setDateRange(range);
    setDateMenuAnchorEl(null);
    
    const today = dayjs();
    
    switch (range) {
      case 'today':
        setFromDate(today.startOf('day'));
        setToDate(today);
        break;
      case 'yesterday':
        const yesterday = today.subtract(1, 'day');
        setFromDate(yesterday.startOf('day'));
        setToDate(yesterday.endOf('day'));
        break;
      case 'week':
        setFromDate(today.subtract(7, 'day'));
        setToDate(today);
        break;
      case 'month':
        setFromDate(today.subtract(30, 'day'));
        setToDate(today);
        break;
      case 'quarter':
        setFromDate(today.subtract(90, 'day'));
        setToDate(today);
        break;
      case 'year':
        setFromDate(today.subtract(365, 'day'));
        setToDate(today);
        break;
      default:
        setFromDate(today.subtract(7, 'day'));
        setToDate(today);
        break;
    }
  };

  // Handle from date change
  const handleFromDateChange = (newVal) => {
    if (newVal) {
      setFromDate(newVal);
      // Ensure from date is not after to date
      if (newVal.isAfter(toDate)) {
        setToDate(newVal);
      }
    }
  };
  
  // Handle to date change
  const handleToDateChange = (newVal) => {
    if (newVal) {
      setToDate(newVal);
      // Ensure to date is not before from date
      if (fromDate.isAfter(newVal)) {
        setFromDate(newVal);
      }
    }
  };
  
  // Process data for line chart (revenue over time)
  const getRevenueByDateData = () => {
    const revenueByDate = {};
    
    orders.forEach(order => {
      const date = new Date(order.created_at).toLocaleDateString();

      if (!revenueByDate[date]) {
        revenueByDate[date] = 0;
      }
      
      // Just use the order amount with discounts already removed
      const orderAmount = parseFloat(order.total_amount || 0);
      revenueByDate[date] += orderAmount;
    });
    
    const sortedDates = Object.keys(revenueByDate).sort((a, b) => new Date(a) - new Date(b));
    
    return {
      xAxis: sortedDates,
      data: sortedDates.map(date => revenueByDate[date]),
    };
  };
  
  // Process data for pie chart (payment methods)
  const getPaymentMethodsData = () => {
    const methods = {};
    
    orders.forEach(order => {
      if (order.payments) {
        order.payments.forEach(payment => {
          const method = payment.method.replace('_', ' ');
          if (!methods[method]) {
            methods[method] = 0;
          }
          methods[method] += parseFloat(payment.amount || 0);
        });
      }
    });
    
    return Object.keys(methods).map((method, index) => ({
      id: index,
      value: methods[method],
      label: method.charAt(0).toUpperCase() + method.slice(1),
      color: COLORS[index % COLORS.length]
    }));
  };
  
  // Process data for bar chart (ticket categories)
  const getTicketCategoriesData = () => {
    const categories = {};
    
    orders.forEach(order => {
      if (order.tickets) {
        order.tickets.forEach(ticket => {
          const category = ticket.category;
          if (!categories[category]) {
            categories[category] = 0;
          }
          categories[category] += (ticket.quantity || 0);
        });
      }
    });
    
    return {
      data: Object.values(categories),
      labels: Object.keys(categories).map(cat => cat.charAt(0).toUpperCase() + cat.slice(1))
    };
  };

  // Navigation menu items
  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, page: 'dashboard' },
    { text: 'Users', icon: <PeopleIcon />, page: 'users' },
    { text: 'Orders', icon: <ReceiptLongIcon />, page: 'orders' },
    { text: 'Meals', icon: <RestaurantIcon />, page: 'meals' },
    { text: 'Categories', icon: <CategoryIcon />, page: 'categories' },
    { text: 'Reports', icon: <AttachMoneyIcon />, page: 'reports' },
  ];

  // Format data for revenue line chart
  const revenueData = getRevenueByDateData();
  const lineChartData = revenueData.data;
  const lineChartLabels = revenueData.xAxis;

  // Format data for payment methods pie chart
  const paymentData = getPaymentMethodsData();

  // Format data for ticket categories bar chart
  const ticketData = getTicketCategoriesData();

  // Add logout handler function
  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userName");
    localStorage.removeItem("userId");
    navigate("/"); // Redirect to login page
  };
  
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={{ display: 'flex' }}>
        <CssBaseline />
        <AppBar
          position="fixed"
          sx={{
            width: { sm: `calc(100% - ${drawerOpen ? drawerWidth : 0}px)` },
            ml: { sm: `${drawerOpen ? drawerWidth : 0}px` },
            transition: theme.transitions.create(['margin', 'width'], {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.leavingScreen,
            }),
            bgcolor: 'white',
            color: 'primary.main',
          }}
        >
          <Toolbar>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
              Hola, {localStorage.getItem('userName')}
            </Typography>
            <IconButton 
              color="inherit" 
              aria-label="logout"
              onClick={handleLogout}
              sx={{
                '&:hover': {
                  color: '#f44336',
                  backgroundColor: 'rgba(244, 67, 54, 0.08)'
                },
              }}
            >
              <LogoutIcon />
            </IconButton>
          </Toolbar>
        </AppBar>
        <Drawer
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              boxSizing: 'border-box',
              backgroundColor: '#00B4D8',
              color: 'white',
            },
          }}
          variant="persistent"
          anchor="left"
          open={drawerOpen}
        >
          <DrawerHeader sx={{ backgroundColor: '#0077B6', justifyContent: 'space-between' }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', px: 2 }}>
              Admin Console
            </Typography>
            <IconButton onClick={handleDrawerToggle} sx={{ color: 'white' }}>
              <ChevronLeftIcon />
            </IconButton>
          </DrawerHeader>
          <Divider sx={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
          <List>
            {menuItems.map((item) => (
              <ListItem 
                button 
                key={item.text}
                onClick={() => handleNavigation(item.page)}
                sx={{ 
                  mb: 0.5,
                  borderRadius: '0 25px 25px 0',
                  pl: 3,
                  backgroundColor: activePage === item.page ? 'rgba(255,255,255,0.2)' : 'transparent',
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.1)',
                  }
                }}
              >
                <ListItemIcon sx={{ color: 'white' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItem>
            ))}
          </List>
        </Drawer>
        <Main open={drawerOpen}>
          <DrawerHeader />
          
          {activePage === 'dashboard' && (
            <>
              {/* Date Range Selector */}
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 3
              }}>
                <Typography variant="h5" fontWeight="bold">
                  Dashboard Overview
                </Typography>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Button
                    color="primary"
                    startIcon={<DateRangeIcon />}
                    onClick={handleDateMenuClick}
                    sx={{ 
                      backgroundColor: '#f0f9ff', 
                      borderRadius: 2, 
                      textTransform: 'none',
                      px: 2
                    }}
                  >
                    {dateRange === 'today' ? 'Today' : 
                     dateRange === 'yesterday' ? 'Yesterday' : 
                     dateRange === 'week' ? 'Last 7 Days' :
                     dateRange === 'month' ? 'Last 30 Days' :
                     dateRange === 'quarter' ? 'Last 90 Days' :
                     dateRange === 'year' ? 'Last Year' : 'Custom Range'}
                  </Button>
                  
                  <Button 
                    onClick={fetchData} 
                    sx={{ 
                      minWidth: 40, 
                      width: 40, 
                      height: 40, 
                      borderRadius: '50%',
                      backgroundColor: '#f0f9ff'
                    }}
                  >
                    <RefreshIcon color="primary" />
                  </Button>
                  
                  <Menu
                    anchorEl={dateMenuAnchorEl}
                    open={Boolean(dateMenuAnchorEl)}
                    onClose={handleDateMenuClose}
                    PaperProps={{
                      sx: { minWidth: 180, boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)' }
                    }}
                  >
                    <MenuItem onClick={() => handleDateRangeChange('today')}>
                      Today
                    </MenuItem>
                    <MenuItem onClick={() => handleDateRangeChange('yesterday')}>
                      Yesterday
                    </MenuItem>
                    <MenuItem onClick={() => handleDateRangeChange('week')}>
                      Last 7 Days
                    </MenuItem>
                    <MenuItem onClick={() => handleDateRangeChange('month')}>
                      Last 30 Days
                    </MenuItem>
                    <MenuItem onClick={() => handleDateRangeChange('quarter')}>
                      Last 90 Days
                    </MenuItem>
                    <MenuItem onClick={() => handleDateRangeChange('year')}>
                      Last Year
                    </MenuItem>
                    <Divider />
                    <Box sx={{ px: 2, py: 1 }}>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        Custom Range
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                        <DatePicker 
                          label="From" 
                          value={fromDate} 
                          onChange={handleFromDateChange}
                          slotProps={{ textField: { size: 'small' } }}
                        />
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <DatePicker 
                          label="To" 
                          value={toDate} 
                          onChange={handleToDateChange}
                          slotProps={{ textField: { size: 'small' } }}
                        />
                      </Box>
                      <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button 
                          variant="contained" 
                          size="small" 
                          onClick={handleDateMenuClose}
                        >
                          Apply
                        </Button>
                      </Box>
                    </Box>
                  </Menu>
                </Box>
              </Box>

              {/* KPI Section */}
              <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} md={3}>
                  <StatsCard 
                    icon={<AttachMoneyIcon sx={{ color: '#00B4D8', fontSize: 28 }} />}
                    title="Total Revenue"
                    value={`$${kpiData.totalRevenue}`}
                    color="#00B4D8"
                    secondaryValue={`${orders.length} orders`}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <StatsCard 
                    icon={<ConfirmationNumberIcon sx={{ color: '#0077B6', fontSize: 28 }} />}
                    title="Tickets Sold"
                    value={kpiData.ticketsCount}
                    color="#0077B6"
                    secondaryValue="All categories"
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <StatsCard 
                    icon={<RestaurantIcon sx={{ color: '#00B4D8', fontSize: 28 }} />}
                    title="Meals Sold"
                    value={kpiData.mealsCount}
                    color="#00B4D8"
                    secondaryValue="All types"
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <StatsCard 
                    icon={<AttachMoneyIcon sx={{ color: '#0077B6', fontSize: 28 }} />}
                    title="Avg. Order Value"
                    value={`$${kpiData.avgOrderValue}`}
                    color="#0077B6"
                    secondaryValue="Per transaction"
                  />
                </Grid>
              </Grid>

              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                  <CircularProgress />
                </Box>
              ) : error ? (
                <Paper sx={{ p: 4, textAlign: 'center', mb: 3 }}>
                  <Typography color="error">{error}</Typography>
                  <Button 
                    variant="contained" 
                    onClick={fetchData}
                    sx={{ mt: 2 }}
                  >
                    Try Again
                  </Button>
                </Paper>
              ) : (
                /* Charts Section */
                <Grid container spacing={3}>
                  {/* Revenue Over Time */}
                  <Grid item xs={12} md={8}>
                    <Paper sx={{ p: 3, height: '100%', borderRadius: 3, boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Revenue Over Time</Typography>
                        <Box>
                          <IconButton size="small">
                            <FileDownloadIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small">
                            <PrintIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </Box>
                      
                      <Box sx={{ height: 300, width: '100%' }}>
                        {lineChartData && lineChartData.length > 0 ? (
                          <LineChart
                            xAxis={[{ 
                              data: Array.from({ length: lineChartData.length }, (_, i) => i),
                              scaleType: 'point',
                              valueFormatter: (index) => lineChartLabels[index] || ''
                            }]}
                            series={[{
                              data: lineChartData,
                              label: 'Revenue',
                              color: '#00B4D8',
                              valueFormatter: (value) => `$${value}`
                            }]}
                            height={300}
                            margin={{ top: 20, bottom: 30, left: 40, right: 20 }}
                          />
                        ) : (
                          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                            <Typography color="text.secondary">No revenue data available for the selected period</Typography>
                          </Box>
                        )}
                      </Box>
                    </Paper>
                  </Grid>
                  
                  {/* Payment Methods */}
                  <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 3, height: '100%', borderRadius: 3, boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)' }}>
                      <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>Payment Methods</Typography>
                      <Box sx={{ height: 300, width: '100%' }}>
                        {paymentData && paymentData.length > 0 ? (
                          <PieChart
                            series={[
                              {
                                data: paymentData,
                                highlightScope: { faded: 'global', highlighted: 'item' },
                                faded: { innerRadius: 30, additionalRadius: -30, color: 'gray' }
                              }
                            ]}
                            height={300}
                            margin={{ top: 20, bottom: 20, left: 20, right: 20 }}
                            slotProps={{
                              legend: {
                                direction: 'column',
                                position: { vertical: 'middle', horizontal: 'right' },
                                padding: 0,
                              }
                            }}
                          />
                        ) : (
                          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                            <Typography color="text.secondary">No payment data available for the selected period</Typography>
                          </Box>
                        )}
                      </Box>
                    </Paper>
                  </Grid>
                  
                  {/* Ticket Categories */}
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3, height: '100%', borderRadius: 3, boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)' }}>
                      <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>Ticket Categories</Typography>
                      <Box sx={{ height: 300, width: '100%' }}>
                        {ticketData && ticketData.data.length > 0 ? (
                          <BarChart
                            xAxis={[{ 
                              scaleType: 'band', 
                              data: ticketData.labels,
                            }]}
                            series={[
                              {
                                data: ticketData.data,
                                label: 'Tickets',
                                color: '#0077B6',
                                valueFormatter: (value) => `${value} tickets`
                              }
                            ]}
                            height={300}
                            margin={{ top: 20, bottom: 30, left: 40, right: 20 }}
                          />
                        ) : (
                          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                            <Typography color="text.secondary">No ticket data available for the selected period</Typography>
                          </Box>
                        )}
                      </Box>
                    </Paper>
                  </Grid>
                  
                  {/* Recent Orders */}
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3, height: '100%', borderRadius: 3, boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                        <Typography variant="h6" fontWeight="bold">Recent Orders</Typography>
                        <Button 
                          variant="text" 
                          size="small" 
                          onClick={() => handleNavigation('orders')}
                        >
                          View All
                        </Button>
                      </Box>
                      {orders.length === 0 ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 240 }}>
                          <Typography color="text.secondary">No recent orders available for the selected period</Typography>
                        </Box>
                      ) : (
                        <Box>
                          {orders.slice(0, 5).map((order) => {
                            // Just use the order amount which already has discounts removed
                            const orderTotal = parseFloat(order.total_amount || 0);
                            
                            return (
                              <Box 
                                key={order.order_id}
                                sx={{ 
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  p: 1.5,
                                  borderBottom: '1px solid #f0f0f0',
                                  '&:last-child': { borderBottom: 'none' }
                                }}
                              >
                                <Box>
                                  <Typography variant="subtitle2" fontWeight="bold">
                                    Order #{order.order_id}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    {new Date(order.created_at).toLocaleString()}
                                  </Typography>
                                </Box>
                                <Box>
                                  <Typography variant="subtitle2" fontWeight="bold">
                                    ${orderTotal.toFixed(2)}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary" align="right">
                                    {order.user_name}
                                  </Typography>
                                </Box>
                              </Box>
                            );
                          })}
                        </Box>
                      )}
                    </Paper>
                  </Grid>
                </Grid>
              )}
            </>
          )}

          {/* Other pages */}
          {activePage === 'users' && <UsersManagement />}
          {activePage === 'orders' && <OrdersManagement />}
          {activePage === 'meals' && <AdminMeals />}
          {activePage === 'categories' && <AdminCategories />}
          {activePage === 'reports' && <AdminReports />}
          {activePage !== 'dashboard' && 
           activePage !== 'users' && 
           activePage !== 'orders' && 
           activePage !== 'meals' && 
           activePage !== 'categories' &&
           activePage !== 'reports' && (
            <Box sx={{ p: 3 }}>
              <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold' }}>
                {activePage.charAt(0).toUpperCase() + activePage.slice(1)}
              </Typography>
              <Paper sx={{ p: 3, borderRadius: 3 }}>
                <Typography variant="body1">
                  This is the {activePage} page content. In a real application, this would be a separate component with specific functionality for {activePage}.
                </Typography>
              </Paper>
            </Box>
          )}
        </Main>
      </Box>
    </LocalizationProvider>
  );
};

export default AdminDashboard;

