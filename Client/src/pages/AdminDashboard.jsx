import React, { useState, useEffect } from 'react';
import { Box, Container, Grid, Paper, Typography, Card, CardContent, 
  Tab, Tabs, IconButton, Menu, MenuItem, Chip, CircularProgress, Divider, 
  useTheme, Drawer, List, ListItem, ListItemIcon, ListItemText, AppBar, 
  Toolbar, CssBaseline, Button, useMediaQuery, SwipeableDrawer, Fab } from '@mui/material';
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
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import CloseIcon from '@mui/icons-material/Close';

const drawerWidth = 240;

// Responsive Main component
const Main = styled('main', { shouldForwardProp: (prop) => prop !== 'open' && prop !== 'isMobile' })(
  ({ theme, open, isMobile }) => ({
    flexGrow: 1,
    padding: isMobile ? theme.spacing(1) : theme.spacing(3),
    paddingTop: theme.spacing(1),
    paddingBottom: theme.spacing(10),
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    marginLeft: isMobile ? 0 : `-${drawerWidth}px`,
    height: '100vh',
    overflowY: 'auto',
    overflowX: 'hidden',
    ...(!isMobile && open && {
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
  ...theme.mixins.toolbar,
  justifyContent: 'flex-end',
}));

// Responsive StatsCard component
// Update the StatsCard component
const StatsCard = ({ icon, title, value, color, secondaryValue }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  return (
    <Card sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
      borderRadius: 3,
      transition: 'transform 0.3s, box-shadow 0.3s',
      '&:hover': {
        transform: isMobile ? 'none' : 'translateY(-5px)',
        boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)',
      }
    }}>
      <CardContent sx={{ 
        flexGrow: 1, 
        position: 'relative', 
        pt: 2, 
        pb: 2,
        // Add more padding for better spacing
        px: { xs: 1.5, sm: 2 }
      }}>
        <Box sx={{ 
          position: 'absolute', 
          top: isMobile ? 8 : 16, 
          right: isMobile ? 8 : 16, 
          backgroundColor: `${color}20`, 
          borderRadius: '50%',
          p: isMobile ? 0.8 : 1.2
        }}>
          {React.cloneElement(icon, { 
            sx: { 
              fontSize: isMobile ? 20 : 28,
              color: color
            }
          })}
        </Box>
        <Typography 
          variant={isMobile ? "caption" : "subtitle2"} 
          sx={{ 
            color: 'text.secondary', 
            mb: 1,
            fontSize: { xs: '0.7rem', sm: '0.875rem' },
            lineHeight: 1.2
          }}
        >
          {title}
        </Typography>
        <Typography 
          variant={isMobile ? "h6" : "h4"} 
          sx={{ 
            fontWeight: 'bold', 
            mb: 0.5,
            // Make text responsive for large numbers
            fontSize: {
              xs: title === 'Total Revenue' ? '1.1rem' : '1.25rem', // Smaller for revenue on mobile
              sm: title === 'Total Revenue' ? '1.5rem' : '2.125rem', // Smaller for revenue on tablet
              md: title === 'Total Revenue' ? '1.75rem' : '2.125rem'  // Smaller for revenue on desktop
            },
            lineHeight: 1.1,
            // Prevent text overflow
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            // Add more space from the right for the icon
            pr: { xs: 4, sm: 5 }
          }}
        >
          {value}
        </Typography>
        {secondaryValue && (
          <Typography 
            variant={isMobile ? "caption" : "body2"} 
            color="text.secondary"
            sx={{
              fontSize: { xs: '0.65rem', sm: '0.875rem' },
              lineHeight: 1.2
            }}
          >
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
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const baseUrl = window.runtimeConfig?.apiBaseUrl;

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [dateRange, setDateRange] = useState('week');
  const [drawerOpen, setDrawerOpen] = useState(!isMobile); // Default closed on mobile
  const [activePage, setActivePage] = useState('dashboard');
  const [fromDate, setFromDate] = useState(dayjs().subtract(7, 'day'));
  const [toDate, setToDate] = useState(dayjs());
  const [dateMenuAnchorEl, setDateMenuAnchorEl] = useState(null);
  const [error, setError] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [kpiData, setKpiData] = useState({
    totalRevenue: "0.00",
    ticketsCount: "0",
    mealsCount: "0",
    avgTicketValue: "0.00"
  });

  // Close drawer on mobile when navigating
  useEffect(() => {
    if (isMobile) {
      setDrawerOpen(false);
    }
  }, [isMobile]);

  // Define chart colors
  const COLORS = [
    '#00B4D8', '#0077B6', '#00BFFF', '#90E0EF', '#CAF0F8', 
    '#005F73', '#0094C6', '#48CAE4', '#ADE8F4', '#023E8A',
  ];

  // Fullscreen toggle function
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch((err) => {
        console.error('Error attempting to enable fullscreen:', err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch((err) => {
        console.error('Error attempting to exit fullscreen:', err);
      });
    }
  };

  // Add fullscreen event listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

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
      
      const response = await axios.get(`${baseUrl}/api/orders/range-report`, { params });
      
      if (response.data && Array.isArray(response.data)) {
        setOrders(response.data);
        processOrderData(response.data);
      } else {
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
        avgTicketValue: "0.00"
      });
    } finally {
      setLoading(false);
    }
  };

  // Update processOrderData to calculate average ticket value
  // Update the processOrderData function to format large numbers better
const processOrderData = (data) => {
  if (!data || data.length === 0) {
    setKpiData({
      totalRevenue: "0.00",
      ticketsCount: "0",
      mealsCount: "0",
      avgTicketValue: "0.00"
    });
    return;
  }

  let totalRevenue = 0;
  let ticketsCount = 0;
  let mealsCount = 0;
  
  data.forEach(order => {
    const orderAmount = parseFloat(order.total_amount || 0);
    totalRevenue += orderAmount;
    
    if (order.tickets) {
      order.tickets.forEach(ticket => {
        ticketsCount += (ticket.quantity || 0);
      });
    }
    
    if (order.meals) {
      order.meals.forEach(meal => {
        mealsCount += (meal.quantity || 0);
      });
    }
  });
  
  const avgTicketValue = ticketsCount ? totalRevenue / ticketsCount : 0;
  
  // Format large numbers more compactly
  const formatLargeNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    } else {
      return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
  };
  
  setKpiData({
    totalRevenue: formatLargeNumber(totalRevenue),
    ticketsCount: ticketsCount.toLocaleString(),
    mealsCount: mealsCount.toLocaleString(),
    avgTicketValue: avgTicketValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
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
    if (isMobile) {
      setDrawerOpen(false); // Close drawer on mobile after navigation
    }
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
      if (newVal.isAfter(toDate)) {
        setToDate(newVal);
      }
    }
  };
  
  // Handle to date change
  const handleToDateChange = (newVal) => {
    if (newVal) {
      setToDate(newVal);
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

  // Format data for charts
  const revenueData = getRevenueByDateData();
  const lineChartData = revenueData.data;
  const lineChartLabels = revenueData.xAxis;
  const paymentData = getPaymentMethodsData();
  const ticketData = getTicketCategoriesData();

  // Add logout handler function
  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userName");
    localStorage.removeItem("userId");
    navigate("/");
  };

  // Responsive drawer component
  const DrawerContent = () => (
    <>
      <DrawerHeader sx={{ 
        backgroundColor: '#0077B6', 
        justifyContent: 'space-between',
        flexDirection: isMobile ? 'row-reverse' : 'row'
      }}>
        <Typography variant={isMobile ? "subtitle1" : "h6"} sx={{ fontWeight: 'bold', px: 2 }}>
          Admin Console
        </Typography>
        <IconButton onClick={handleDrawerToggle} sx={{ color: 'white' }}>
          {isMobile ? <CloseIcon /> : <ChevronLeftIcon />}
        </IconButton>
      </DrawerHeader>
      <Divider sx={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
      <List sx={{ px: 1 }}>
        {menuItems.map((item) => (
          <ListItem 
            button 
            key={item.text}
            onClick={() => handleNavigation(item.page)}
            sx={{ 
              mb: 0.5,
              borderRadius: '0 25px 25px 0',
              pl: 2,
              py: isMobile ? 1.5 : 1,
              backgroundColor: activePage === item.page ? 'rgba(255,255,255,0.2)' : 'transparent',
              '&:hover': {
                backgroundColor: 'rgba(255,255,255,0.1)',
              }
            }}
          >
            <ListItemIcon sx={{ color: 'white', minWidth: 40 }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
      </List>
    </>
  );
  
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={{ display: 'flex' }}>
        <CssBaseline />
        <AppBar
          position="fixed"
          sx={{
            width: { sm: `calc(100% - ${!isMobile && drawerOpen ? drawerWidth : 0}px)` },
            ml: { sm: `${!isMobile && drawerOpen ? drawerWidth : 0}px` },
            transition: theme.transitions.create(['margin', 'width'], {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.leavingScreen,
            }),
            bgcolor: 'white',
            color: 'primary.main',
            zIndex: theme.zIndex.drawer + 1,
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
            <Typography 
              variant={isMobile ? "subtitle1" : "h6"} 
              noWrap 
              component="div" 
              sx={{ flexGrow: 1 }}
            >
              Hola, {localStorage.getItem('userName')}
            </Typography>
            
            {/* Hide fullscreen on mobile */}
            {!isMobile && (
              <IconButton 
                color="inherit" 
                aria-label="toggle fullscreen"
                onClick={toggleFullscreen}
                sx={{
                  mr: 1,
                  '&:hover': {
                    color: '#00B4D8',
                    backgroundColor: 'rgba(0, 180, 216, 0.08)'
                  },
                }}
              >
                {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
              </IconButton>
            )}
            
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

        {/* Responsive Drawer */}
        {isMobile ? (
          <SwipeableDrawer
            anchor="left"
            open={drawerOpen}
            onClose={handleDrawerToggle}
            onOpen={handleDrawerToggle}
            sx={{
              '& .MuiDrawer-paper': {
                width: drawerWidth,
                backgroundColor: '#00B4D8',
                color: 'white',
              },
            }}
          >
            <DrawerContent />
          </SwipeableDrawer>
        ) : (
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
            <DrawerContent />
          </Drawer>
        )}

        <Main open={drawerOpen} isMobile={isMobile}>
          <DrawerHeader />
          
          {activePage === 'dashboard' && (
            <>
              {/* Responsive Date Range Selector */}
              <Box sx={{ 
                display: 'flex', 
                flexDirection: isSmallMobile ? 'column' : 'row',
                justifyContent: 'space-between',
                alignItems: isSmallMobile ? 'stretch' : 'center',
                mb: 3,
                gap: isSmallMobile ? 2 : 0
              }}>
                <Typography 
                  variant={isMobile ? "h6" : "h5"} 
                  fontWeight="bold"
                >
                  Dashboard Overview
                </Typography>
                
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1,
                  flexWrap: isSmallMobile ? 'wrap' : 'nowrap'
                }}>
                  <Button
                    color="primary"
                    startIcon={<DateRangeIcon />}
                    onClick={handleDateMenuClick}
                    size={isMobile ? "small" : "medium"}
                    sx={{ 
                      backgroundColor: '#f0f9ff', 
                      borderRadius: 2, 
                      textTransform: 'none',
                      px: isSmallMobile ? 1 : 2,
                      fontSize: isSmallMobile ? '0.75rem' : 'inherit'
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
                    size={isMobile ? "small" : "medium"}
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
                </Box>
              </Box>

              {/* Responsive Menu */}
              <Menu
                anchorEl={dateMenuAnchorEl}
                open={Boolean(dateMenuAnchorEl)}
                onClose={handleDateMenuClose}
                PaperProps={{
                  sx: { 
                    minWidth: 180, 
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
                    maxWidth: isMobile ? '90vw' : 'none'
                  }
                }}
              >
                <MenuItem onClick={() => handleDateRangeChange('today')}>Today</MenuItem>
                <MenuItem onClick={() => handleDateRangeChange('yesterday')}>Yesterday</MenuItem>
                <MenuItem onClick={() => handleDateRangeChange('week')}>Last 7 Days</MenuItem>
                <MenuItem onClick={() => handleDateRangeChange('month')}>Last 30 Days</MenuItem>
                <MenuItem onClick={() => handleDateRangeChange('quarter')}>Last 90 Days</MenuItem>
                <MenuItem onClick={() => handleDateRangeChange('year')}>Last Year</MenuItem>
                <Divider />
                <Box sx={{ px: 2, py: 1 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Custom Range
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 1 }}>
                    <DatePicker 
                      label="From" 
                      value={fromDate} 
                      onChange={handleFromDateChange}
                      slotProps={{ textField: { size: 'small', fullWidth: true } }}
                    />
                    <DatePicker 
                      label="To" 
                      value={toDate} 
                      onChange={handleToDateChange}
                      slotProps={{ textField: { size: 'small', fullWidth: true } }}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
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

              {/* Responsive KPI Section */}
              <Grid container spacing={isMobile ? 2 : 3} sx={{ mb: 4 }}>
                <Grid item xs={6} sm={6} md={3}>
                  <StatsCard 
                    icon={<AttachMoneyIcon />}
                    title="Total Revenue"
                    value={`$${kpiData.totalRevenue}`}
                    color="#00B4D8"
                    secondaryValue={`${orders.length} orders`}
                  />
                </Grid>
                <Grid item xs={6} sm={6} md={3}>
                  <StatsCard 
                    icon={<ConfirmationNumberIcon />}
                    title="Tickets Sold"
                    value={kpiData.ticketsCount}
                    color="#0077B6"
                    secondaryValue="All categories"
                  />
                </Grid>
                <Grid item xs={6} sm={6} md={3}>
                  <StatsCard 
                    icon={<RestaurantIcon />}
                    title="Meals Sold"
                    value={kpiData.mealsCount}
                    color="#00B4D8"
                    secondaryValue="All types"
                  />
                </Grid>
                <Grid item xs={6} sm={6} md={3}>
                  <StatsCard 
                    icon={<ConfirmationNumberIcon />}
                    title="Avg. Ticket Value"
                    value={`$${kpiData.avgTicketValue}`}
                    color="#0077B6"
                    secondaryValue="Per ticket"
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
                /* Responsive Charts Section */
                <Grid container spacing={isMobile ? 2 : 3}>
                  {/* Revenue Over Time */}
                  <Grid item xs={12} lg={8}>
                    <Paper sx={{ p: isMobile ? 2 : 3, height: '100%', borderRadius: 3, boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                        <Typography variant={isMobile ? "subtitle1" : "h6"} sx={{ fontWeight: 'bold' }}>
                          Revenue Over Time
                        </Typography>
                        {!isMobile && (
                          <Box>
                            <IconButton size="small">
                              <FileDownloadIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small">
                              <PrintIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        )}
                      </Box>
                      
                      <Box sx={{ height: isMobile ? 250 : 300, width: '100%' }}>
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
                            height={isMobile ? 250 : 300}
                            margin={{ 
                              top: 20, 
                              bottom: 30, 
                              left: isMobile ? 30 : 40, 
                              right: isMobile ? 10 : 20 
                            }}
                          />
                        ) : (
                          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                            <Typography color="text.secondary" textAlign="center">
                              No revenue data available for the selected period
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </Paper>
                  </Grid>
                  
                  {/* Payment Methods */}
                  <Grid item xs={12} lg={4}>
                    <Paper sx={{ p: isMobile ? 2 : 3, height: '100%', borderRadius: 3, boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)' }}>
                      <Typography variant={isMobile ? "subtitle1" : "h6"} sx={{ mb: 2, fontWeight: 'bold' }}>
                        Payment Methods
                      </Typography>
                      <Box sx={{ 
                        height: isMobile ? 250 : 300, 
                        width: '100%',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        overflow: 'hidden'
                      }}>
                        {paymentData && paymentData.length > 0 ? (
                          <PieChart
                            series={[
                              {
                                data: paymentData,
                                highlightScope: { faded: 'global', highlighted: 'item' },
                                faded: { innerRadius: 30, additionalRadius: -30, color: 'gray' },
                                outerRadius: isMobile ? 60 : 80,
                                innerRadius: isMobile ? 15 : 20,
                              }
                            ]}
                            width={isMobile ? 280 : 300}
                            height={isMobile ? 250 : 300}
                            slotProps={{
                              legend: {
                                direction: 'column',
                                position: { vertical: 'bottom', horizontal: 'middle' },
                                padding: 0,
                                labelStyle: {
                                  fontSize: isMobile ? 10 : 12,
                                }
                              }
                            }}
                          />
                        ) : (
                          <Typography color="text.secondary" textAlign="center">
                            No payment data available for the selected period
                          </Typography>
                        )}
                      </Box>
                    </Paper>
                  </Grid>
                  
                  {/* Ticket Categories */}
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: isMobile ? 2 : 3, height: '100%', borderRadius: 3, boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)' }}>
                      <Typography variant={isMobile ? "subtitle1" : "h6"} sx={{ mb: 2, fontWeight: 'bold' }}>
                        Ticket Categories
                      </Typography>
                      <Box sx={{ height: isMobile ? 250 : 300, width: '100%' }}>
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
                            height={isMobile ? 250 : 300}
                            margin={{ 
                              top: 20, 
                              bottom: 30, 
                              left: isMobile ? 30 : 40, 
                              right: isMobile ? 10 : 20 
                            }}
                          />
                        ) : (
                          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                            <Typography color="text.secondary" textAlign="center">
                              No ticket data available for the selected period
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </Paper>
                  </Grid>
                  
                  {/* Recent Orders */}
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: isMobile ? 2 : 3, height: '100%', borderRadius: 3, boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                        <Typography variant={isMobile ? "subtitle1" : "h6"} fontWeight="bold">
                          Recent Orders
                        </Typography>
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
                          <Typography color="text.secondary" textAlign="center">
                            No recent orders available for the selected period
                          </Typography>
                        </Box>
                      ) : (
                        <Box>
                          {orders.slice(0, 5).map((order) => {
                            const orderTotal = parseFloat(order.total_amount || 0);
                            
                            return (
                              <Box 
                                key={order.order_id}
                                sx={{ 
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  p: isMobile ? 1 : 1.5,
                                  borderBottom: '1px solid #f0f0f0',
                                  '&:last-child': { borderBottom: 'none' }
                                }}
                              >
                                <Box>
                                  <Typography variant={isMobile ? "body2" : "subtitle2"} fontWeight="bold">
                                    Order #{order.order_id}
                                  </Typography>
                                  <Typography variant={isMobile ? "caption" : "body2"} color="text.secondary">
                                    {new Date(order.created_at).toLocaleString()}
                                  </Typography>
                                </Box>
                                <Box>
                                  <Typography variant={isMobile ? "body2" : "subtitle2"} fontWeight="bold">
                                    ${orderTotal.toFixed(2)}
                                  </Typography>
                                  <Typography variant={isMobile ? "caption" : "body2"} color="text.secondary" align="right">
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
            <Box sx={{ p: isMobile ? 2 : 3 }}>
              <Typography variant={isMobile ? "h5" : "h4"} sx={{ mb: 3, fontWeight: 'bold' }}>
                {activePage.charAt(0).toUpperCase() + activePage.slice(1)}
              </Typography>
              <Paper sx={{ p: isMobile ? 2 : 3, borderRadius: 3 }}>
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