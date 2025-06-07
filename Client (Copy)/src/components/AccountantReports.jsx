import React, { useState, useEffect, useContext } from "react";
import {
  TextField,
  Paper,
  Typography,
  Button,
  Box,
  FormControlLabel,
  Switch,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
  Card,
  CardContent,
  Grid,
  Divider,
  Chip,
  Avatar,
  IconButton,
  Collapse
} from "@mui/material";
import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import axios from "axios";
import dayjs from "dayjs";
import { saveAs } from "file-saver";
import OrdersTable from "./OrdersTable";
import { notify } from '../utils/toast';

// Update dayjs locale configuration for DD/MM/YYYY format
dayjs.locale({
  ...dayjs.Ls.en,
  formats: {
    ...dayjs.Ls.en.formats,
    L: "DD/MM/YYYY",
    LL: "DD MMMM YYYY",
  }
});

const AccountantReports = () => {
  // Add report mode state
  const [reportMode, setReportMode] = useState('orders');
  const [expandedCategories, setExpandedCategories] = useState({});
  
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [fromDate, setFromDate] = useState(dayjs().subtract(7, 'day'));
  const [toDate, setToDate] = useState(dayjs());
  const [useRange, setUseRange] = useState(false);
  const [reportData, setReportData] = useState([]);
  const [ticketsReportData, setTicketsReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState({ totalTickets: 0, totalRevenue: 0 });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // Update format functions
  const formatDisplayDate = (date) => date.format("DD/MM/YYYY");
  const formatApiDate = (date) => date.format("YYYY-MM-DD");

  const baseUrl = window.runtimeConfig?.apiBaseUrl;

  const handleModeChange = (event, newMode) => {
    if (newMode !== null) {
      setReportMode(newMode);
    }
  };

  const toggleCategoryExpansion = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const fetchOrdersReport = async (shouldFetch = true) => {
    if (!shouldFetch) return;
    
    if (!baseUrl) {
      setError("API configuration not available");
      notify.error("API configuration not available");
      return;
    }
    
    if (useRange && fromDate.isAfter(toDate)) {
      setError("Start date cannot be after end date");
      notify.warning("Start date cannot be after end date");
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
      
      // Check if the data includes summary from backend
      if (data && typeof data === 'object' && data.summary) {
        // Backend provides summary
        setReportData(Array.isArray(data.items) ? data.items : []);
        setSummary({
          totalTickets: data.summary.totalTickets || 0,
          totalRevenue: data.summary.totalRevenue || 0,
          totalDiscounts: data.summary.totalDiscounts || 0
        });
        notify.success("Orders report loaded successfully");
      } else {
        // Calculate summary on frontend
        const reportItems = Array.isArray(data) ? data : [];
        setReportData(reportItems);
        setSummary(calculateSummary(reportItems));
        notify.success("Orders report loaded successfully");
      }
    } catch (error) {
      console.error("Error fetching orders report:", error);
      const errorMessage = "Failed to fetch orders report. Please try again.";
      setError(errorMessage);
      notify.error(errorMessage);
      setReportData([]);
      setSummary({ totalTickets: 0, totalRevenue: 0, totalDiscounts: 0 });
    } finally {
      setLoading(false);
    }
  };

  const fetchTicketsReport = async (shouldFetch = true) => {
    if (!shouldFetch || !baseUrl) {
      if (!baseUrl) {
        setError("API configuration not available");
        notify.error("API configuration not available");
      }
      return;
    }
    
    if (useRange && fromDate.isAfter(toDate)) {
      setError("Start date cannot be after end date");
      notify.warning("Start date cannot be after end date");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const params = useRange
        ? { startDate: formatApiDate(fromDate), endDate: formatApiDate(toDate) }
        : { date: formatApiDate(selectedDate) };
          
      const endpoint = useRange
        ? `${baseUrl}/api/tickets/tickets-report-range`
        : `${baseUrl}/api/tickets/tickets-report`;
          
      const { data } = await axios.get(endpoint, { params });
      
      setTicketsReportData(data);
      notify.success("Tickets report loaded successfully");
    } catch (error) {
      console.error("Error fetching tickets report:", error);
      const errorMessage = "Failed to fetch tickets report. Please try again.";
      setError(errorMessage);
      notify.error(errorMessage);
      setTicketsReportData(null);
    } finally {
      setLoading(false);
    }
  };

  // Modified useEffect to handle both report types
  useEffect(() => {
    const timer = setTimeout(() => {
      if (reportMode === 'orders') {
        fetchOrdersReport();
      } else {
        fetchTicketsReport();
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [selectedDate, fromDate, toDate, useRange, baseUrl, reportMode]);

  // Enhanced sidebar state management
  useEffect(() => {
    const handleSidebarChange = () => {
      // Check multiple possible storage keys and states
      const storedState = localStorage.getItem('sidebarOpen') || 
                         localStorage.getItem('sidebar-open') ||
                         localStorage.getItem('sidebarExpanded');
      
      // Handle different possible values
      const isOpen = storedState === 'true' || storedState === true || storedState === '1';
      setSidebarOpen(isOpen);
      
      console.log('Sidebar state changed:', isOpen); // Debug log
    };
    
    // Initial check
    handleSidebarChange();
    
    // Listen for storage changes (cross-tab)
    window.addEventListener('storage', handleSidebarChange);
    
    // Listen for custom events (same tab)
    window.addEventListener('sidebarToggle', handleSidebarChange);
    window.addEventListener('sidebar-toggle', handleSidebarChange);
    
    // Listen for resize events that might affect sidebar
    window.addEventListener('resize', handleSidebarChange);
    
    // Poll for changes every second as fallback (remove after debugging)
    const pollInterval = setInterval(() => {
      const currentState = localStorage.getItem('sidebarOpen') === 'true';
      if (currentState !== sidebarOpen) {
        setSidebarOpen(currentState);
        console.log('Sidebar state polled and updated:', currentState);
      }
    }, 1000);
    
    return () => {
      window.removeEventListener('storage', handleSidebarChange);
      window.removeEventListener('sidebarToggle', handleSidebarChange);
      window.removeEventListener('sidebar-toggle', handleSidebarChange);
      window.removeEventListener('resize', handleSidebarChange);
      clearInterval(pollInterval);
    };
  }, [sidebarOpen]);

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

    // Payment method mapping function
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
      
      // Check for exact matches first
      if (methodMappings[normalizedMethod]) {
        return methodMappings[normalizedMethod];
      }
      
      // Check if it contains الاهلي or مصر
      if (normalizedMethod.includes('الاهلي') || normalizedMethod.includes('مصر')) {
        return 'بنك الاهلي و مصر';
      }
      
      // Check if it's postponed in different forms
      if (normalizedMethod.includes('postponed') || normalizedMethod.includes('آجل')) {
        return 'آجل';
      }
      
      // Check if it's cash in different forms
      if (normalizedMethod.includes('cash') || normalizedMethod.includes('نقد')) {
        return 'نقدي';
      }
      
      // Default to "بنوك اخرى" for any other bank-like payment
      if (normalizedMethod.includes('bank') || normalizedMethod.includes('بنك') || 
          normalizedMethod.includes('card') || normalizedMethod.includes('بطاقة')) {
        return 'بنوك اخرى';
      }
      
      // Return original if no mapping found
      return method || 'غير محدد';
    };

    let csvContent = "\uFEFF";
    csvContent += useRange
      ? `Orders Report from ${formatDisplayDate(fromDate)} to ${formatDisplayDate(toDate)}\r\n\r\n`
      : `Orders Report for ${formatDisplayDate(selectedDate)}\r\n\r\n`;

    csvContent += `SUMMARY REPORT\r\n`;
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

    // Payment method breakdown with Arabic mapping
    const paymentsByMethod = {};
    reportData.forEach(order => {
      if (order.payments && order.payments.length > 0) {
        order.payments.forEach(payment => {
          const originalMethod = payment.method || 'Unknown';
          const mappedMethod = mapPaymentMethod(originalMethod);
          
          if (!paymentsByMethod[mappedMethod]) {
            paymentsByMethod[mappedMethod] = 0;
          }
          
          paymentsByMethod[mappedMethod] += parseFloat(payment.amount || 0);
        });
      }
    });

    // Calculate total payments (including discounts)
    const totalPayments = Object.values(paymentsByMethod).reduce((sum, amount) => sum + amount, 0);

    csvContent += `\r\nPAYMENT METHOD BREAKDOWN\r\n`;
    csvContent += `Payment Method,Total Amount (EGP)\r\n`;
    Object.entries(paymentsByMethod).forEach(([method, amount]) => {
      csvContent += `${escapeCSV(method)},${amount.toFixed(2)}\r\n`;
    });

    // Add total row for payment methods
    csvContent += `TOTAL PAYMENTS,${totalPayments.toFixed(2)}\r\n`;

    const filename = useRange
      ? `Report_from_${fromDate.format("YYYY-MM-DD")}_to_${toDate.format("YYYY-MM-DD")}.csv`
      : `Report_${selectedDate.format("YYYY-MM-DD")}.csv`;

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, filename);
    notify.success("Orders CSV exported successfully!");
  };

  const exportTicketsCSV = () => {
    if (!ticketsReportData || (!ticketsReportData.tickets.length && !ticketsReportData.meals.length)) {
      notify.warning("No tickets data to export");
      return;
    }

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
      ? `Tickets Report from ${formatDisplayDate(fromDate)} to ${formatDisplayDate(toDate)}\r\n\r\n`
      : `Tickets Report for ${formatDisplayDate(selectedDate)}\r\n\r\n`;

    // Tickets section - removed money columns
    csvContent += "TICKETS REPORT\r\n";
    csvContent += "Category,Subcategory,Quantity,First Sale,Last Sale\r\n";
    
    const ticketsByCategory = ticketsReportData.tickets.reduce((acc, ticket) => {
      if (!acc[ticket.category]) {
        acc[ticket.category] = [];
      }
      acc[ticket.category].push(ticket);
      return acc;
    }, {});

    Object.entries(ticketsByCategory).forEach(([category, tickets]) => {
      let categoryQuantity = 0;
      
      tickets.forEach(ticket => {
        const quantity = parseInt(ticket.quantity);
        const firstSale = ticket.first_sale ? new Date(ticket.first_sale).toLocaleString() : 'N/A';
        const lastSale = ticket.last_sale ? new Date(ticket.last_sale).toLocaleString() : 'N/A';
        
        csvContent += `${escapeCSV(category)},${escapeCSV(ticket.subcategory)},${quantity},${escapeCSV(firstSale)},${escapeCSV(lastSale)}\r\n`;
        
        categoryQuantity += quantity;
      });
      
      csvContent += `${escapeCSV(category)} SUBTOTAL,,${categoryQuantity},,\r\n`;
      csvContent += `\r\n`;
    });

    csvContent += `TICKETS SUMMARY\r\n`;
    csvContent += `Total Tickets Sold,${ticketsReportData.summary.tickets.totalQuantity}\r\n`;
    csvContent += `\r\n\r\n`;

    // Meals section - removed money columns
    if (ticketsReportData.meals.length > 0) {
      csvContent += "MEALS REPORT\r\n";
      csvContent += "Meal Name,Quantity,First Sale,Last Sale\r\n";
      
      ticketsReportData.meals.forEach(meal => {
        const quantity = parseInt(meal.total_quantity);
        const firstSale = meal.first_sale ? new Date(meal.first_sale).toLocaleString() : 'N/A';
        const lastSale = meal.last_sale ? new Date(meal.last_sale).toLocaleString() : 'N/A';
        
        csvContent += `${escapeCSV(meal.meal_name)},${quantity},${escapeCSV(firstSale)},${escapeCSV(lastSale)}\r\n`;
      });

      csvContent += `\r\nMEALS SUMMARY\r\n`;
      csvContent += `Total Meals Sold,${ticketsReportData.summary.meals.totalQuantity}\r\n`;
      csvContent += `\r\n`;
    }

    csvContent += `GRAND TOTAL SUMMARY\r\n`;
    csvContent += `Total Items Sold,${ticketsReportData.summary.tickets.totalQuantity + ticketsReportData.summary.meals.totalQuantity}\r\n`;

    const filename = useRange
      ? `Tickets_Report_${formatApiDate(fromDate)}_to_${formatApiDate(toDate)}.csv`
      : `Tickets_Report_${formatApiDate(selectedDate)}.csv`;

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, filename);
    notify.success("Tickets CSV exported successfully!");
  };

  const handleRefresh = () => {
    if (reportMode === 'orders') {
      fetchOrdersReport(true);
    } else {
      fetchTicketsReport(true);
    }
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

  // Enhanced calculation of totals to properly handle discounts
  const calculateSummary = (reportItems) => {
    // Calculate totals excluding discount payments
    const totalRevenue = reportItems.reduce((sum, row) => 
      sum + (Number(row.total_amount) || 0), 0);
    
    // FIX: Calculate actual ticket quantities, not just ticket count
    const totalTickets = reportItems.reduce((sum, row) => {
      if (row.tickets && Array.isArray(row.tickets)) {
        const orderTicketCount = row.tickets.reduce((ticketSum, ticket) => {
          return ticketSum + (Number(ticket.quantity) || 1);
        }, 0);
        return sum + orderTicketCount;
      }
      return sum;
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

  // Group tickets by category and subcategory for tickets report
  const groupTicketsByCategory = (tickets) => {
    return tickets.reduce((acc, ticket) => {
      if (!acc[ticket.category]) {
        acc[ticket.category] = {};
      }
      if (!acc[ticket.category][ticket.subcategory]) {
        acc[ticket.category][ticket.subcategory] = [];
      }
      acc[ticket.category][ticket.subcategory].push(ticket);
      return acc;
    }, {});
  };

  // Enhanced category colors
  const getCategoryColor = () => {
    // Return unified color scheme for all main categories
    return {
      primary: '#00AEEF', 
      secondary: '#E0F7FF', 
      icon: '🏷️'
    };
  };

  // Enhanced subcategory colors - Only for subcategories (child, adult, grand)
  const getSubcategoryColor = (subcategory) => {
    const colors = {
      'child': { primary: '#FF6B6B', secondary: '#FFE3E3', icon: '🧒' },
      'adult': { primary: '#4ECDC4', secondary: '#E0F9F7', icon: '👤' },
      'grand': { primary: '#45B7D1', secondary: '#E3F4FD', icon: '👴' },
      'default': { primary: '#6C5CE7', secondary: '#F0EFFF', icon: '🎫' }
    };
    
    // Normalize the subcategory name - convert to lowercase and trim
    const normalizedSubcategory = (subcategory || '').toString().toLowerCase().trim();
    
    // Return the matching color scheme or default
    return colors[normalizedSubcategory] || colors.default;
  };

  const EnhancedTicketCategoryCard = ({ category, subcategories }) => {
    const categoryTotal = Object.values(subcategories).flat().reduce((sum, ticket) => 
      sum + parseFloat(ticket.total_revenue), 0
    );
    const categoryQuantity = Object.values(subcategories).flat().reduce((sum, ticket) => 
      sum + parseInt(ticket.quantity), 0
    );

    // Use unified category color for the main card header
    const categoryColorScheme = getCategoryColor();
    const isExpanded = expandedCategories[category];

    return (
      <Card sx={{ 
        mb: 2, 
        background: `linear-gradient(135deg, ${categoryColorScheme.secondary} 0%, #ffffff 50%)`,
        border: `2px solid ${categoryColorScheme.primary}`,
        borderRadius: 3,
        overflow: 'hidden',
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: `0 8px 25px rgba(0, 174, 239, 0.15)`
        }
      }}>
        <CardContent sx={{ p: 2 }}>
          {/* Header with expand/collapse - Using unified category colors */}
          <Box 
            display="flex" 
            justifyContent="space-between" 
            alignItems="center" 
            sx={{ cursor: 'pointer' }}
            onClick={() => toggleCategoryExpansion(category)}
          >
            <Box display="flex" alignItems="center" gap={1.5}>
              <Avatar sx={{ 
                bgcolor: categoryColorScheme.primary, 
                width: 40, 
                height: 40,
                fontSize: '1.2rem'
              }}>
                {categoryColorScheme.icon}
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ 
                  color: categoryColorScheme.primary, 
                  fontWeight: 700,
                  fontSize: '1.1rem'
                }}>
                  {category}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {categoryQuantity} tickets sold
                </Typography>
              </Box>
            
            <Box display="flex" alignItems="center" gap={2}>
              <Box textAlign="right">
                <Typography variant="h5" sx={{ 
                  color: categoryColorScheme.primary, 
                  fontWeight: 800,
                  lineHeight: 1
                }}>
                  EGP {categoryTotal.toFixed(0)}
                </Typography>
                <Chip 
                  label={`${categoryQuantity} tickets`}
                  size="small"
                  sx={{ 
                    bgcolor: categoryColorScheme.primary + '20',
                    color: categoryColorScheme.primary,
                    fontWeight: 600,
                    fontSize: '0.7rem'
                  }}
                />
              </Box>
              <IconButton size="small">
                {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            </Box>
          </Box>
          </Box>
          
          {/* Expandable content - Subcategories with different colors */}
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <Box mt={2}>
              <Grid container spacing={1.5}>
                {Object.entries(subcategories).map(([subcategory, tickets]) => {
                  const subTotal = tickets.reduce((sum, ticket) => sum + parseFloat(ticket.total_revenue), 0);
                  const subQuantity = tickets.reduce((sum, ticket) => sum + parseInt(ticket.quantity), 0);
                  
                  // Get subcategory-specific colors
                  const subColorScheme = getSubcategoryColor(subcategory);
                  
                  return (
                    <Grid item xs={12} sm={6} md={4} key={subcategory}>
                      <Paper sx={{ 
                        p: 1.5, 
                        bgcolor: 'rgba(255,255,255,0.8)', 
                        borderRadius: 2,
                        border: `2px solid ${subColorScheme.primary}`,
                        background: `linear-gradient(135deg, ${subColorScheme.secondary} 0%, rgba(255,255,255,0.9) 100%)`,
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          bgcolor: 'rgba(255,255,255,0.95)',
                          transform: 'scale(1.02)',
                          boxShadow: `0 4px 15px ${subColorScheme.primary}30`
                        }
                      }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Avatar sx={{ 
                              bgcolor: subColorScheme.primary, 
                              width: 24, 
                              height: 24,
                              fontSize: '0.8rem'
                            }}>
                              {subColorScheme.icon}
                            </Avatar>
                            <Typography variant="subtitle2" fontWeight="600" color={subColorScheme.primary}>
                              {subcategory}
                            </Typography>
                          </Box>
                          <Chip 
                            label={`${subQuantity}x`}
                            size="small"
                            sx={{ 
                              bgcolor: subColorScheme.primary,
                              color: 'white',
                              fontWeight: 600
                            }}
                          />
                        </Box>
                        
                        <Typography variant="h6" fontWeight="bold" color={subColorScheme.primary}>
                          EGP {subTotal.toFixed(0)}
                        </Typography>
                        
                        <Box mt={1}>
                          {tickets.map((ticket, index) => (
                            <Typography key={index} variant="caption" display="block" color="textSecondary">
                              {ticket.quantity}x @ EGP {parseFloat(ticket.unit_price).toFixed(0)}
                            </Typography>
                          ))}
                        </Box>
                      </Paper>
                    </Grid>
                  );
                })}
              </Grid>
            </Box>
          </Collapse>
        </CardContent>
      </Card>
    );
  };

  const EnhancedMealsCard = ({ meals }) => {
    const mealsTotal = meals.reduce((sum, meal) => sum + parseFloat(meal.total_revenue), 0);
    const mealsQuantity = meals.reduce((sum, meal) => sum + parseInt(meal.total_quantity), 0);
    
    // Check if meals section is expanded
    const isExpanded = expandedCategories['meals'];

    return (
      <Card sx={{ 
        mb: 2, 
        background: 'linear-gradient(135deg, #FFF3E0 0%, #ffffff 50%)',
        border: "2px solid #FF9800",
        borderRadius: 3,
        overflow: 'hidden',
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 8px 25px rgba(255, 152, 0, 0.15)'
        }
      }}>
        <CardContent sx={{ p: 2 }}>
          {/* Header with expand/collapse */}
          <Box 
            display="flex" 
            justifyContent="space-between" 
            alignItems="center" 
            sx={{ cursor: 'pointer' }}
            onClick={() => toggleCategoryExpansion('meals')}
          >
            <Box display="flex" alignItems="center" gap={1.5}>
              <Avatar sx={{ 
                bgcolor: '#FF9800', 
                width: 40, 
                height: 40,
                fontSize: '1.2rem'
              }}>
                🍽️
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ 
                  color: "#FF9800", 
                  fontWeight: 700,
                  fontSize: '1.1rem'
                }}>
                  Meals & Beverages
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {mealsQuantity} items sold
                </Typography>
              </Box>
            </Box>
            
            <Box display="flex" alignItems="center" gap={2}>
              <Box textAlign="right">
                <Typography variant="h5" sx={{ 
                  color: "#FF9800", 
                  fontWeight: 800,
                  lineHeight: 1
                }}>
                  EGP {mealsTotal.toFixed(0)}
                </Typography>
                <Chip 
                  label={`${mealsQuantity} items`}
                  size="small"
                  sx={{ 
                    bgcolor: '#FF980020',
                    color: '#FF9800',
                    fontWeight: 600,
                    fontSize: '0.7rem'
                  }}
                />
              </Box>
              <IconButton size="small">
                {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            </Box>
          </Box>
          
          {/* Expandable content */}
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <Box mt={2}>
              <Grid container spacing={1.5}>
                {meals.map((meal, index) => (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <Paper sx={{ 
                      p: 1.5, 
                      bgcolor: 'rgba(255,255,255,0.8)', 
                      borderRadius: 2,
                      border: '1px solid #FF980030',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        bgcolor: 'rgba(255,255,255,0.95)',
                        transform: 'scale(1.02)'
                      }
                    }}>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <Typography variant="subtitle2" fontWeight="600" color="#FF9800">
                          {meal.meal_name}
                        </Typography>
                        <Chip 
                          label={`${meal.total_quantity}x`}
                          size="small"
                          sx={{ bgcolor: '#FF9800', color: 'white' }}
                        />
                      </Box>
                      
                      <Typography variant="h6" fontWeight="bold" color="text.primary">
                        EGP {parseFloat(meal.total_revenue).toFixed(0)}
                      </Typography>
                      
                      <Typography variant="caption" color="textSecondary">
                        @ EGP {parseFloat(meal.unit_price).toFixed(0)} each
                      </Typography>
                      
                      {/* Additional meal details */}
                      <Box mt={1}>
                        <Typography variant="caption" display="block" color="textSecondary">
                          {meal.total_quantity}x @ EGP {parseFloat(meal.unit_price).toFixed(0)}
                        </Typography>
                        {meal.first_sale && (
                          <Typography variant="caption" display="block" color="textSecondary">
                            First Sale: {new Date(meal.first_sale).toLocaleDateString()}
                          </Typography>
                        )}
                        {meal.last_sale && (
                          <Typography variant="caption" display="block" color="textSecondary">
                            Last Sale: {new Date(meal.last_sale).toLocaleDateString()}
                          </Typography>
                        )}
                      </Box>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </Collapse>
        </CardContent>
      </Card>
    );
  };

  // New print function for orders
  const printOrdersReport = () => {
    if (reportData.length === 0) return;

    // Payment method mapping function (same as CSV)
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
        'discount': 'خصم'
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
      if (normalizedMethod.includes('vodafone_cash') || normalizedMethod.includes('vodafone cash')) {
        return 'فودافون كاش';
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

    // Create print content
    const reportTitle = useRange
      ? `Orders Report from ${formatDisplayDate(fromDate)} to ${formatDisplayDate(toDate)}`
      : `Orders Report for ${formatDisplayDate(selectedDate)}`;

    // Calculate breakdowns
    const ticketsByCategory = {};
    reportData.forEach(order => {
      if (order.tickets && order.tickets.length > 0) {
        order.tickets.forEach(ticket => {
          const category = ticket.category || 'Unknown';
          const subcategory = ticket.subcategory || 'Standard';
          const key = `${category}-${subcategory}`;
          
          if (!ticketsByCategory[key]) {
            ticketsByCategory[key] = { quantity: 0, revenue: 0 };
          }
          
          ticketsByCategory[key].quantity += (ticket.quantity || 1);
          ticketsByCategory[key].revenue += (ticket.quantity || 1) * parseFloat(ticket.sold_price || 0);
        });
      }
    });

    const mealsByType = {};
    reportData.forEach(order => {
      if (order.meals && order.meals.length > 0) {
        order.meals.forEach(meal => {
          const name = meal.name || 'Unknown';
          
          if (!mealsByType[name]) {
            mealsByType[name] = { quantity: 0, revenue: 0 };
          }
          
          mealsByType[name].quantity += (meal.quantity || 1);
          mealsByType[name].revenue += (meal.quantity || 1) * parseFloat(meal.price_at_order || 0);
        });
      }
    });

    const paymentsByMethod = {};
    reportData.forEach(order => {
      if (order.payments && order.payments.length > 0) {
        order.payments.forEach(payment => {
          const originalMethod = payment.method || 'Unknown';
          const mappedMethod = mapPaymentMethod(originalMethod);
          
          if (!paymentsByMethod[mappedMethod]) {
            paymentsByMethod[mappedMethod] = 0;
          }
          
          paymentsByMethod[mappedMethod] += parseFloat(payment.amount || 0);
        });
      }
    });

    // Create HTML content for printing
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${reportTitle}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px; 
              font-size: 12px;
              direction: ltr;
            }
            .header { 
              text-align: center; 
              margin-bottom: 30px; 
              border-bottom: 2px solid #00AEEF;
              padding-bottom: 10px;
            }
            .section { 
              margin-bottom: 25px; 
            }
            .section-title { 
              font-size: 16px; 
              font-weight: bold; 
              color: #00AEEF; 
              margin-bottom: 10px;
              border-bottom: 1px solid #ddd;
              padding-bottom: 5px;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-bottom: 15px;
            }
            th, td { 
              border: 1px solid #ddd; 
              padding: 8px; 
              text-align: left; 
            }
            th { 
              background-color: #f5f5f5; 
              font-weight: bold;
            }
            .summary-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-bottom: 20px;
            }
            .summary-item {
              background-color: #f9f9f9;
              padding: 10px;
              border-radius: 5px;
              border-left: 4px solid #00AEEF;
            }
            .arabic { 
              direction: rtl; 
              text-align: right; 
            }
            @media print {
              body { margin: 0; }
              .section { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${reportTitle}</h1>
            <p>Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
          </div>

          <div class="section">
            <div class="section-title">SUMMARY REPORT</div>
            <div class="summary-grid">
              <div class="summary-item">
                <strong>📋 Total Orders:</strong> ${reportData.length}
              </div>
              <div class="summary-item">
                <strong>🎟️ Total Tickets:</strong> ${summary.totalTickets}
              </div>
              <div class="summary-item">
                <strong>💰 Total Revenue:</strong> EGP ${summary.totalRevenue.toFixed(2)}
              </div>
              <div class="summary-item">
                <strong>💸 Total Discounts:</strong> EGP ${(summary.totalDiscounts || 0).toFixed(2)}
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">TICKET BREAKDOWN</div>
            <table>
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Quantity</th>
                  <th>Revenue (EGP)</th>
                </tr>
              </thead>
              <tbody>
                ${Object.entries(ticketsByCategory).map(([category, data]) => `
                  <tr>
                    <td>${category}</td>
                    <td>${data.quantity}</td>
                    <td>${data.revenue.toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          ${Object.keys(mealsByType).length > 0 ? `
          <div class="section">
            <div class="section-title">MEAL BREAKDOWN</div>
            <table>
              <thead>
                <tr>
                  <th>Meal Type</th>
                  <th>Quantity</th>
                  <th>Revenue (EGP)</th>
                </tr>
              </thead>
              <tbody>
                ${Object.entries(mealsByType).map(([mealName, data]) => `
                  <tr>
                    <td>${mealName}</td>
                    <td>${data.quantity}</td>
                    <td>${data.revenue.toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          ` : ''}

          <div class="section">
            <div class="section-title">PAYMENT METHOD BREAKDOWN</div>
            <table>
              <thead>
                <tr>
                  <th class="arabic">Payment Method</th>
                  <th>Total Amount (EGP)</th>
                </tr>
              </thead>
              <tbody>
                ${Object.entries(paymentsByMethod).map(([method, amount]) => `
                  <tr>
                    <td class="arabic">${method}</td>
                    <td>${amount.toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </body>
      </html>
    `;

    // Open print window
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();

    notify.success("Orders report prepared for printing!");
  };

  // New print function for tickets
  const printTicketsReport = () => {
    if (!ticketsReportData || (!ticketsReportData.tickets.length && !ticketsReportData.meals.length)) {
      notify.warning("No tickets data to print");
      return;
    }

    const reportTitle = useRange
      ? `Tickets Report from ${formatDisplayDate(fromDate)} to ${formatDisplayDate(toDate)}`
      : `Tickets Report for ${formatDisplayDate(selectedDate)}`;

    const ticketsByCategory = ticketsReportData.tickets.reduce((acc, ticket) => {
      if (!acc[ticket.category]) {
        acc[ticket.category] = [];
      }
      acc[ticket.category].push(ticket);
      return acc;
    }, {});

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${reportTitle}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px; 
              font-size: 12px;
            }
            .header { 
              text-align: center; 
              margin-bottom: 30px; 
              border-bottom: 2px solid #FF9800;
              padding-bottom: 10px;
            }
            .section { 
              margin-bottom: 25px; 
            }
            .section-title { 
              font-size: 16px; 
              font-weight: bold; 
              color: #FF9800; 
              margin-bottom: 10px;
              border-bottom: 1px solid #ddd;
              padding-bottom: 5px;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-bottom: 15px;
            }
            th, td { 
              border: 1px solid #ddd; 
              padding: 8px; 
              text-align: left; 
            }
            th { 
              background-color: #f5f5f5; 
              font-weight: bold;
            }
            .summary-grid {
              display: grid;
              grid-template-columns: 1fr 1fr 1fr;
              gap: 20px;
              margin-bottom: 20px;
            }
            .summary-item {
              background-color: #fff3e0;
              padding: 15px;
              border-radius: 5px;
              border-left: 4px solid #FF9800;
              text-align: center;
            }
            @media print {
              body { margin: 0; }
              .section { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${reportTitle}</h1>
            <p>Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
          </div>

          <div class="section">
            <div class="section-title">SUMMARY</div>
            <div class="summary-grid">
              <div class="summary-item">
                <strong>🎟️ Total Tickets</strong><br>
                ${ticketsReportData.summary.tickets.totalQuantity}
              </div>
              <div class="summary-item">
                <strong>🍽️ Total Meals</strong><br>
                ${ticketsReportData.summary.meals.totalQuantity}
              </div>
              <div class="summary-item">
                <strong>📊 Total Items</strong><br>
                ${ticketsReportData.summary.tickets.totalQuantity + ticketsReportData.summary.meals.totalQuantity}
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">TICKETS REPORT</div>
            <table>
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Subcategory</th>
                  <th>Quantity</th>
                  <th>First Sale</th>
                  <th>Last Sale</th>
                </tr>
              </thead>
              <tbody>
                ${Object.entries(ticketsByCategory).map(([category, tickets]) => {
                  let categoryRows = '';
                  let categoryQuantity = 0;
                  
                  tickets.forEach(ticket => {
                    const quantity = parseInt(ticket.quantity);
                    const firstSale = ticket.first_sale ? new Date(ticket.first_sale).toLocaleString() : 'N/A';
                    const lastSale = ticket.last_sale ? new Date(ticket.last_sale).toLocaleString() : 'N/A';
                    
                    categoryRows += `
                      <tr>
                        <td>${category}</td>
                        <td>${ticket.subcategory}</td>
                        <td>${quantity}</td>
                        <td>${firstSale}</td>
                        <td>${lastSale}</td>
                      </tr>
                    `;
                    categoryQuantity += quantity;
                  });
                  
                  categoryRows += `
                    <tr style="background-color: #f0f0f0; font-weight: bold;">
                      <td>${category} SUBTOTAL</td>
                      <td>-</td>
                      <td>${categoryQuantity}</td>
                      <td>-</td>
                      <td>-</td>
                    </tr>
                  `;
                  
                  return categoryRows;
                }).join('')}
              </tbody>
            </table>
          </div>

          ${ticketsReportData.meals.length > 0 ? `
          <div class="section">
            <div class="section-title">MEALS REPORT</div>
            <table>
              <thead>
                <tr>
                  <th>Meal Name</th>
                  <th>Quantity</th>
                  <th>First Sale</th>
                  <th>Last Sale</th>
                </tr>
              </thead>
              <tbody>
                ${ticketsReportData.meals.map(meal => {
                  const quantity = parseInt(meal.total_quantity);
                  const firstSale = meal.first_sale ? new Date(meal.first_sale).toLocaleString() : 'N/A';
                  const lastSale = meal.last_sale ? new Date(meal.last_sale).toLocaleString() : 'N/A';
                  
                  return `
                    <tr>
                      <td>${meal.meal_name}</td>
                      <td>${quantity}</td>
                      <td>${firstSale}</td>
                      <td>${lastSale}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
          ` : ''}
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();

    notify.success("Tickets report prepared for printing!");
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={{ height: "100vh", display: "flex", flexDirection: "column" }}>
        {/* Compact Header */}
        <Paper sx={{ 
          p: 1.5,
          m: 1,
          backgroundColor: "#F0F9FF", 
          borderRadius: 2,
          flexShrink: 0
        }}>
          {/* Report Mode Toggle */}
          <Box display="flex" justifyContent="center" alignItems="center" mb={2}>
            <ToggleButtonGroup
              value={reportMode}
              exclusive
              onChange={handleModeChange}
              size="small"
              sx={{ 
                '& .MuiToggleButton-root': {
                  px: 2,
                  py: 0.5,
                  border: '2px solid #00AEEF',
                  fontSize: '0.85rem',
                  '&.Mui-selected': {
                    backgroundColor: '#00AEEF',
                    color: 'white',
                    '&:hover': {
                      backgroundColor: '#007EA7',
                    }
                  }
                }
              }}
            >
              <ToggleButton value="orders">📋 Orders</ToggleButton>
              <ToggleButton value="tickets">🎟️ Tickets</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {/* Compact Controls */}
          <Box display="flex" justifyContent="center" alignItems="center" gap={2} flexWrap="wrap">
            <FormControlLabel
              control={
                <Switch 
                  checked={useRange} 
                  onChange={(e) => setUseRange(e.target.checked)}
                  size="small"
                />
              }
              label={
                <Typography variant="body2">
                  {useRange ? "Date Range" : "Single Date"}
                </Typography>
              }
            />

            {useRange ? (
              <>
                <DatePicker 
                  label="From" 
                  value={fromDate} 
                  onChange={handleFromDateChange}
                  slotProps={{ 
                    textField: { 
                      size: "small",
                      sx: { width: 140, backgroundColor: "#fff" }
                    } 
                  }}
                />
                <DatePicker 
                  label="To" 
                  value={toDate} 
                  onChange={handleToDateChange}
                  slotProps={{ 
                    textField: { 
                      size: "small",
                      sx: { width: 140, backgroundColor: "#fff" }
                    } 
                  }}
                />
              </>
            ) : (
              <DatePicker 
                label="Date" 
                value={selectedDate} 
                onChange={(newVal) => newVal && setSelectedDate(newVal)}
                slotProps={{ 
                  textField: { 
                    size: "small",
                    sx: { width: 160, backgroundColor: "#fff" }
                  } 
                }}
              />
            )}

            <Button 
              variant="contained" 
              onClick={handleRefresh}
              disabled={loading}
              size="small"
              startIcon={loading ? <CircularProgress size={16} /> : null}
            >
              {loading ? "Loading..." : "Refresh"}
            </Button>
          </Box>

          {error && (
            <Typography color="error" variant="body2" sx={{ mt: 1, textAlign: "center" }}>
              {error}
            </Typography>
          )}
        </Paper>

        {/* Main Content - removed mb: 9 since bar is no longer fixed */}
        <Box sx={{ 
          flex: 1, 
          overflow: "hidden",
          mx: 1,
          display: "flex",
          flexDirection: "column"
        }}>
          <Paper sx={{ 
            flex: 1,
            display: "flex",
            flexDirection: "column",
            borderRadius: 2,
            overflow: "hidden"
          }}>
            {/* Content Area */}
            <Box sx={{ 
              flex: 1,
              overflow: "auto",
              p: reportMode === 'tickets' ? 2 : 0
            }}>
              {loading ? (
                <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                  <CircularProgress size={60} />
                </Box>
              ) : reportMode === 'orders' ? (
                reportData.length === 0 ? (
                  <Box display="flex" justifyContent="center" alignItems="center" height="100%" flexDirection="column">
                    <Typography variant="h6" color="textSecondary" mb={1}>📋</Typography>
                    <Typography variant="body1" color="textSecondary">
                      No orders data available for the selected period
                    </Typography>
                  </Box>
                ) : (
                  <OrdersTable data={reportData} />
                )
              ) : (
                !ticketsReportData || (!ticketsReportData.tickets.length && !ticketsReportData.meals.length) ? (
                  <Box display="flex" justifyContent="center" alignItems="center" height="100%" flexDirection="column">
                    <Typography variant="h6" color="textSecondary" mb={1}>🎟️</Typography>
                    <Typography variant="body1" color="textSecondary">
                      No tickets or meals data available for the selected period
                    </Typography>
                  </Box>
                ) : (
                  <Box>
                    {/* Tickets Section */}
                    {ticketsReportData.tickets.length > 0 && (
                      <Box mb={2}>
                        {Object.entries(groupTicketsByCategory(ticketsReportData.tickets)).map(([category, subcategories]) => (
                          <EnhancedTicketCategoryCard 
                            key={category} 
                            category={category} 
                            subcategories={subcategories} 
                          />
                        ))}
                      </Box>
                    )}

                    {/* Meals Section */}
                    {ticketsReportData.meals.length > 0 && (
                      <EnhancedMealsCard meals={ticketsReportData.meals} />
                    )}
                  </Box>
                )
              )}
            </Box>
          </Paper>

          {/* Bottom Summary Bar - Updated with print buttons */}
          <Paper sx={{ 
            background: "linear-gradient(135deg, #E0F7FF 0%, #ffffff 100%)", 
            borderRadius: 2,
            p: 2,
            mt: 1,
            borderTop: "3px solid #00AEEF",
            boxShadow: "0 -4px 20px rgba(0, 174, 239, 0.15)",
            flexShrink: 0
          }}>
            {reportMode === 'orders' ? (
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={8}>
                  <Box display="flex" flexDirection="column" gap={1}>
                    {/* First Row - Main Stats - FIXED */}
                    <Box display="flex" gap={4} justifyContent={{ xs: "center", md: "flex-start" }} flexWrap="wrap">
                      <Typography variant="body1" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
                        <b>📋 Orders:</b> {reportData.length}
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
                        <b>🎟️ Tickets:</b> {summary.totalTickets}
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 700, color: "#00AEEF", fontSize: '1.1rem' }}>
                        <b>💰 Revenue:</b> EGP {summary.totalRevenue.toFixed(2)}
                      </Typography>
                    </Box>
                    
                    {/* Second Row - Discounts (if any) */}
                    {summary.totalDiscounts > 0 && (
                      <Box display="flex" justifyContent={{ xs: "center", md: "flex-start" }}>
                        <Typography variant="body1" sx={{ color: 'error.main', fontWeight: 700, fontSize: '1.1rem' }}>
                          <b>💸 Total Discounts Applied:</b> EGP {summary.totalDiscounts.toFixed(2)}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Grid>
                <Grid item xs={12} md={4} display="flex" justifyContent="center" gap={1}>
                  <Button
                    variant="contained"
                    disabled={reportData.length === 0 || loading}
                    onClick={exportOrdersCSV}
                    size="medium"
                    startIcon={<TrendingUpIcon />}
                    sx={{
                      background: "linear-gradient(45deg, #00AEEF 30%, #007EA7 90%)",
                      boxShadow: "0 3px 5px 2px rgba(0,174,239,.3)",
                      fontSize: '0.9rem',
                      px: 2,
                      py: 1,
                      '&:hover': {
                        background: "linear-gradient(45deg, #007EA7 30%, #005577 90%)",
                      }
                    }}
                  >
                    📊 Export CSV
                  </Button>
                  <Button
                    variant="outlined"
                    disabled={reportData.length === 0 || loading}
                    onClick={printOrdersReport}
                    size="medium"
                    startIcon={<span>🖨️</span>}
                    sx={{
                      borderColor: "#00AEEF",
                      color: "#00AEEF",
                      fontSize: '0.9rem',
                      px: 2,
                      py: 1,
                      '&:hover': {
                        borderColor: "#007EA7",
                        backgroundColor: "#E0F7FF",
                      }
                    }}
                  >
                    Print
                  </Button>
                </Grid>
              </Grid>
            ) : ticketsReportData ? (
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={8}>
                  {/* FIXED - Tickets section */}
                  <Box display="flex" gap={4} justifyContent={{ xs: "center", md: "flex-start" }} flexWrap="wrap">
                    <Typography variant="body1" sx={{ fontWeight: 700, color: "#00AEEF", fontSize: '1.1rem' }}>
                      <b>🎟️ Tickets:</b> {ticketsReportData.summary.tickets.totalQuantity}
                    </Typography>
                    {ticketsReportData.summary.meals.totalQuantity > 0 && (
                      <Typography variant="body1" sx={{ fontWeight: 700, color: "#FF9800", fontSize: '1.1rem' }}>
                        <b>🍽️ Meals:</b> {ticketsReportData.summary.meals.totalQuantity}
                      </Typography>
                    )}
                    <Typography variant="body1" sx={{ color: "#ff9800", fontWeight: 800, fontSize: '1.2rem' }}>
                      <b>📊 TOTAL ITEMS:</b> {ticketsReportData.summary.tickets.totalQuantity + ticketsReportData.summary.meals.totalQuantity}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={4} display="flex" justifyContent="center" gap={1}>
                  <Button
                    variant="contained"
                    disabled={!ticketsReportData || loading}
                    onClick={exportTicketsCSV}
                    size="medium"
                    startIcon={<TrendingUpIcon />}
                    sx={{
                      background: "linear-gradient(45deg, #FF9800 30%, #FF5722 90%)",
                      boxShadow: "0 3px 5px 2px rgba(255, 152, 0, .3)",
                      fontSize: '0.9rem',
                      px: 2,
                      py: 1,
                      '&:hover': {
                        background: "linear-gradient(45deg, #FF5722 30%, #E64A19 90%)",
                      }
                    }}
                  >
                    📊 Export CSV
                  </Button>
                  <Button
                    variant="outlined"
                    disabled={!ticketsReportData || loading}
                    onClick={printTicketsReport}
                    size="medium"
                    startIcon={<span>🖨️</span>}
                    sx={{
                      borderColor: "#FF9800",
                      color: "#FF9800",
                      fontSize: '0.9rem',
                      px: 2,
                      py: 1,
                      '&:hover': {
                        borderColor: "#FF5722",
                        backgroundColor: "#FFF3E0",
                      }
                    }}
                  >
                    Print
                  </Button>
                </Grid>
              </Grid>
            ) : (
              <Box display="flex" justifyContent="center" alignItems="center">
                <Typography variant="body1" color="textSecondary" sx={{ fontSize: '1.1rem' }}>
                  No data available for summary
                </Typography>
              </Box>
            )}
          </Paper>
        </Box>
      </Box>
    </LocalizationProvider>
  );
};

export default AccountantReports;