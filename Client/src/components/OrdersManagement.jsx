import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../utils/api';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Chip,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Card,
  CardContent,
  CardActions,
  Tabs,
  Tab,
  useTheme,
  useMediaQuery,
  Stack,
  Collapse
} from '@mui/material';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import axios from 'axios';
import { notify, confirmToast } from '../utils/toast';

// Icons
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import SaveIcon from '@mui/icons-material/Save';
import ReceiptIcon from '@mui/icons-material/Receipt';
import PaymentIcon from '@mui/icons-material/Payment';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import LocalActivityIcon from '@mui/icons-material/LocalActivity';
import DateRangeIcon from '@mui/icons-material/DateRange';
import RefreshIcon from '@mui/icons-material/Refresh';
import PrintIcon from '@mui/icons-material/Print';
import PersonIcon from '@mui/icons-material/Person';

// Mobile Order Card Component
const MobileOrderCard = ({ order, onEdit, onDelete, formatCurrency, formatPaymentMethod, getPaymentMethodColor }) => {
  const [expanded, setExpanded] = useState(false);
  const orderDate = new Date(order.created_at);
  
  const ticketCount = order.tickets ? 
    order.tickets.reduce((sum, ticket) => sum + (ticket.quantity || 0), 0) : 0;
  
  const mealCount = order.meals ? 
    order.meals.reduce((sum, meal) => sum + (meal.quantity || 0), 0) : 0;

  return (
    <Card sx={{ 
      mb: 2, 
      borderRadius: 2,
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      transition: 'all 0.3s ease',
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
      }
    }}>
      <CardContent sx={{ pb: 1 }}>
        {/* Header Row */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" color="primary" fontWeight="bold">
            Order #{order.order_id}
          </Typography>
          <Typography variant="h6" fontWeight="bold" color="success.main">
            {formatCurrency(order.total_amount)}
          </Typography>
        </Box>

        {/* Date and Cashier Row */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="body2" color="text.secondary">
              {orderDate.toLocaleDateString()}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {orderDate.toLocaleTimeString()}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <PersonIcon fontSize="small" color="action" />
            <Typography variant="body2">{order.user_name || 'Unknown'}</Typography>
          </Box>
        </Box>

        {/* Items Summary */}
        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
          {ticketCount > 0 && (
            <Chip 
              icon={<LocalActivityIcon fontSize="small" />}
              label={`${ticketCount} ticket${ticketCount !== 1 ? 's' : ''}`}
              size="small"
              color="primary"
              variant="outlined"
            />
          )}
          {mealCount > 0 && (
            <Chip 
              icon={<RestaurantIcon fontSize="small" />}
              label={`${mealCount} meal${mealCount !== 1 ? 's' : ''}`}
              size="small"
              color="secondary"
              variant="outlined"
            />
          )}
        </Box>

        {/* Payment Methods - Collapsible */}
        <Box sx={{ mb: 1 }}>
          <Button
            size="small"
            onClick={() => setExpanded(!expanded)}
            endIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            sx={{ mb: 1, textTransform: 'none' }}
            color="inherit"
          >
            Payment Details
          </Button>
          <Collapse in={expanded}>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {order.payments && order.payments.map((payment, index) => (
                <Chip 
                  key={index}
                  label={`${formatPaymentMethod(payment.method)}: ${formatCurrency(payment.amount)}`}
                  size="small"
                  color={getPaymentMethodColor(payment.method)}
                  variant="outlined"
                  sx={{ fontSize: '0.7rem', height: 24 }}
                />
              ))}
            </Box>
          </Collapse>
        </Box>
      </CardContent>

      <CardActions sx={{ pt: 0, justifyContent: 'flex-end', px: 2, pb: 2 }}>
        <IconButton
          color="primary"
          onClick={() => onEdit(order)}
          title="Edit Order"
          sx={{ 
            backgroundColor: '#f0f9ff',
            '&:hover': { backgroundColor: '#e0f2fe' }
          }}
        >
          <EditIcon />
        </IconButton>
        <IconButton
          color="error"
          onClick={() => onDelete(order)}
          title="Delete Order"
          sx={{ 
            backgroundColor: '#fef2f2',
            '&:hover': { backgroundColor: '#fee2e2' }
          }}
        >
          <DeleteIcon />
        </IconButton>
      </CardActions>
    </Card>
  );
};

const OrdersManagement = () => {
  const { user, isAdmin, logout } = useAuth();
  // Get theme and responsive breakpoints
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // State variables
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState('week');
  const [fromDate, setFromDate] = useState(dayjs().subtract(7, 'day'));
  const [toDate, setToDate] = useState(dayjs());
  
  // Pagination - responsive defaults
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(isMobile ? 5 : 10);
  
  // Edit Dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [editableOrder, setEditableOrder] = useState(null);
  
  // Filter menu
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [filterOptions, setFilterOptions] = useState({
    paymentMethods: [],
    orderTotal: { min: '', max: '' }
  });
  
  // Ticket and meal modification
  const [availableTicketTypes, setAvailableTicketTypes] = useState([]);
  const [availableMeals, setAvailableMeals] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  
  // Tab state for edit dialog
  const [editTab, setEditTab] = useState(0);

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);

  // Update rows per page when screen size changes
  useEffect(() => {
    setRowsPerPage(isMobile ? 5 : 10);
    setPage(0);
  }, [isMobile]);

  // Security check - ensure only admins can access
  useEffect(() => {
    if (!user || !isAdmin()) {
      logout();
      window.location.href = '/signin';
      return;
    }
  }, [user, isAdmin, logout]);

  // Fetch orders on component mount and when date range changes
  useEffect(() => {
    fetchOrders();
  }, [fromDate, toDate, user, isAdmin]);
  
  // Fetch ticket types and meals for order editing
  useEffect(() => {
    fetchTicketTypes();
    fetchMeals();
  }, [user, isAdmin]);
  
  // Fetch payment methods on component mount
  useEffect(() => {
    fetchPaymentMethods();
  }, [user, isAdmin]);
  
  // Fetch orders from API
  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Format dates for API
      const startDate = fromDate.format('YYYY-MM-DD');
      const endDate = toDate.format('YYYY-MM-DD');
      
      // Use the correct apiClient.request method
      const data = await apiClient.request(`/api/orders/range-report?startDate=${startDate}&endDate=${endDate}`, {
        method: 'GET'
      });
      
      setOrders(data);
    } catch (error) {
      console.error('Error fetching orders:', error);
      setError(error.message || 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  // Fetch ticket types for adding tickets to order
  const fetchTicketTypes = async () => {
    if (!user || !isAdmin()) return;

    try {
      // Use the correct apiClient.request method
      const response = await apiClient.request('/api/tickets/ticket-types', {
        method: 'GET'
      });
      
      console.log('All ticket types fetched:', response.length, 'types');
      setAvailableTicketTypes(response);
    } catch (error) {
      console.error('Error fetching ticket types:', error);
      setAvailableTicketTypes([]);
    }
  };
  
  // Fetch meals for adding to order
  const fetchMeals = async () => {
    if (!user || !isAdmin()) return;

    try {
      // Use the correct apiClient.request method
      const response = await apiClient.request('/api/meals', {
        method: 'GET'
      });
      
      console.log('All meals fetched:', response.length, 'meals');
      setAvailableMeals(response);
    } catch (error) {
      console.error('Error fetching meals:', error);
      setAvailableMeals([]);
    }
  };

  // Function to fetch payment methods from database
  const fetchPaymentMethods = async () => {
    if (!user || !isAdmin()) return;

    try {
      // Use the correct apiClient.request method
      const response = await apiClient.request('/api/orders/payment-methods', {
        method: 'GET'
      });
      
      setPaymentMethods(response);
      console.log('Payment methods loaded:', response);
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      // Fallback to hardcoded methods
      setPaymentMethods([
        { value: 'cash', label: 'Cash' },
        { value: 'visa', label: 'Visa' },
        { value: 'vodafone_cash', label: 'Vodafone Cash' },
        { value: 'postponed', label: 'Postponed' },
        { value: 'discount', label: 'Discount' },
        { value: 'الاهلي و مصر', label: 'الأهلي و مصر' },
        { value: 'OTHER', label: 'Other' },
        { value: 'CREDIT', label: 'Credit' }
      ]);
    }
  };

  // Handle pagination
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Handle search
  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
    setPage(0);
  };

  // Handle date range filtering
  const handleDateRangeChange = (range) => {
    setDateRange(range);
    
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
      default:
        setFromDate(today.subtract(7, 'day'));
        setToDate(today);
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

  // Format currency for display
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Update the formatPaymentMethod function
  const formatPaymentMethod = (method) => {
    const paymentMethod = paymentMethods.find(pm => pm.value === method);
    if (paymentMethod) {
      return paymentMethod.label;
    }
    
    // Fallback formatting
    switch (method) {
      case 'vodafone_cash':
        return 'Vodafone Cash';
      case 'الاهلي و مصر':
        return 'الأهلي و مصر';
      case 'OTHER':
        return 'Other';
      case 'CREDIT':
        return 'Credit';
      default:
        return method.charAt(0).toUpperCase() + method.slice(1);
    }
  };

  // Get payment method color based on type
  const getPaymentMethodColor = (method) => {
    switch (method) {
      case 'cash':
        return 'success';
      case 'visa':
        return 'primary';
      case 'vodafone_cash':
      case 'الاهلي و مصر':
        return 'info';
      case 'CREDIT':
        return 'secondary';
      case 'discount':
        return 'error';
      case 'postponed':
        return 'warning';
      case 'OTHER':
        return 'default';
      default:
        return 'default';
    }
  };

  // Enhanced delete confirmation function
  const handleDeleteOrder = (order) => {
    setOrderToDelete(order);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteOrder = async () => {
    if (!orderToDelete) return;

    try {
      setLoading(true);
      
      // Use the correct apiClient.request method
      await apiClient.request(`/api/orders/${orderToDelete.order_id}`, {
        method: 'DELETE'
      });

      notify.success('Order deleted successfully');
      setDeleteDialogOpen(false);
      setOrderToDelete(null);
      fetchOrders(); // Refresh orders
    } catch (error) {
      console.error('Error deleting order:', error);
      notify.error(error.message || 'Failed to delete order');
    } finally {
      setLoading(false);
    }
  };

  // Filter orders based on search term and other filters
  const filteredOrders = orders.filter(order => {
    const searchMatch = 
      order.order_id?.toString().includes(searchTerm) ||
      order.user_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return searchMatch;
  });

  // REPLACE the current handleOpenEditDialog function with this OLD WORKING LOGIC
  const handleOpenEditDialog = (order) => {
    // Create a deep copy of the order to avoid modifying the original
    const orderCopy = JSON.parse(JSON.stringify(order));
    
    // Make sure payments are properly formatted
    const formattedPayments = orderCopy.payments && orderCopy.payments.length > 0 
      ? orderCopy.payments 
      : [{ method: 'cash', amount: parseFloat(orderCopy.total_amount) || 0 }];
    
    // Ensure each payment has both method and amount properties
    const validatedPayments = formattedPayments.map(payment => ({
      method: payment.method || 'cash',
      amount: parseFloat(payment.amount) || 0
    }));
    
    console.log('Original order payments:', order.payments);
    console.log('Formatted payments for editing:', validatedPayments);
    
    setSelectedOrder(order);
    setEditableOrder({
      ...orderCopy,
      tickets: orderCopy.tickets || [],
      meals: orderCopy.meals || [],
      payments: validatedPayments,
      addedTickets: [],
      removedTickets: [],
      addedMeals: [],
      removedMeals: [],
      originalPayments: validatedPayments // Keep a copy of original payments for comparison
    });
    setEditDialogOpen(true);
    
    // Set the initial tab to the Payments tab if we're specifically editing payments
    // setEditTab(2); // Uncomment this line if you want to default to the payments tab
  };
  
  // ALSO REPLACE the handleCloseEditDialog to ensure proper cleanup
  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setSelectedOrder(null);
    setEditableOrder(null);
    setEditTab(0);
  };

  // Handle tab change in edit dialog
  const handleEditTabChange = (event, newValue) => {
    setEditTab(newValue);
  };

  // Handle adding a ticket to the order (SINGLE WORKING VERSION)
  const handleAddTicket = (ticketType) => {
    if (!editableOrder) return;
    
    console.log('Adding ticket:', ticketType);
    
    // Check quantity limit (optional constraint)
    const existingTicketIndex = editableOrder.tickets.findIndex(
      t => t.ticket_type_id === ticketType.id || t.ticket_type_id === ticketType.ticket_type_id
    );
    
    const updatedTickets = [...(editableOrder.tickets || [])];
    
    if (existingTicketIndex >= 0) {
      const currentQuantity = updatedTickets[existingTicketIndex].quantity || 1;
      if (currentQuantity >= 50) {
        notify.error('Maximum 50 tickets of the same type allowed');
        return;
      }
      
      updatedTickets[existingTicketIndex] = {
        ...updatedTickets[existingTicketIndex],
        quantity: currentQuantity + 1
      };
    } else {
      const newTicket = {
        ticket_type_id: ticketType.id || ticketType.ticket_type_id,
        category: ticketType.category,
        subcategory: ticketType.subcategory,
        sold_price: ticketType.price,
        quantity: 1
      };
      
      updatedTickets.push(newTicket);
    }
    
    const newAddedTicket = {
      ticket_type_id: ticketType.id || ticketType.ticket_type_id,
      quantity: 1
    };
    
    // Calculate updated totals
    const ticketTotal = updatedTickets.reduce((sum, ticket) => {
      const price = parseFloat(ticket.sold_price) || 0;
      const quantity = ticket.quantity || 1;
      return sum + (price * quantity);
    }, 0);
    
    const mealTotal = (editableOrder.meals || []).reduce((sum, meal) => {
      const price = parseFloat(meal.price_at_order) || 0;
      const quantity = meal.quantity || 1;
      return sum + (price * quantity);
    }, 0);
    
    const grossTotal = parseFloat((ticketTotal + mealTotal).toFixed(2));
    const discountAmount = (editableOrder.payments || [])
      .filter(payment => payment.method === 'discount')
      .reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0);
    const totalAmount = parseFloat((grossTotal - discountAmount).toFixed(2));
    
    let updatedPayments = [...editableOrder.payments];
    if (updatedPayments.length === 1) {
      const isDiscount = updatedPayments[0].method === 'discount';
      updatedPayments[0] = {
        ...updatedPayments[0],
        amount: isDiscount ? grossTotal : totalAmount
      };
    }
    
    setEditableOrder(prevState => ({
      ...prevState,
      tickets: updatedTickets,
      gross_total: grossTotal,
      total_amount: totalAmount,
      payments: updatedPayments,
      addedTickets: [...(prevState.addedTickets || []), newAddedTicket]
    }));
    
    notify.success(`Added ticket: ${ticketType.category} - ${ticketType.subcategory}`);
  };

  // Handle removing a ticket from the order
  const handleRemoveTicket = (ticketTypeId) => {
    if (!editableOrder) return;
    
    const ticketIndex = editableOrder.tickets.findIndex(t => t.ticket_type_id === ticketTypeId);
    
    if (ticketIndex >= 0) {
      const updatedTickets = [...editableOrder.tickets];
      
      if (updatedTickets[ticketIndex].quantity > 1) {
        updatedTickets[ticketIndex] = {
          ...updatedTickets[ticketIndex],
          quantity: updatedTickets[ticketIndex].quantity - 1
        };
      } else {
        updatedTickets.splice(ticketIndex, 1);
      }
      
      const ticketTotal = updatedTickets.reduce((sum, ticket) => {
        const price = parseFloat(ticket.sold_price) || 0;
        const quantity = parseInt(ticket.quantity) || 1;
        return sum + (price * quantity);
      }, 0);
      
      const mealTotal = (editableOrder.meals || []).reduce((sum, meal) => {
        const price = parseFloat(meal.price_at_order) || 0;
        const quantity = parseInt(meal.quantity) || 1;
        return sum + (price * quantity);
      }, 0);
      
      const grossTotal = parseFloat((ticketTotal + mealTotal).toFixed(2));
      const discountAmount = (editableOrder.payments || [])
        .filter(payment => payment.method === 'discount')
        .reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0);
      const totalAmount = parseFloat((grossTotal - discountAmount).toFixed(2));
      
      let updatedPayments = [...editableOrder.payments];
      const nonDiscountPayments = updatedPayments.filter(p => p.method !== 'discount');
      
      if (nonDiscountPayments.length === 1) {
        const nonDiscountIndex = updatedPayments.findIndex(p => p.method !== 'discount');
        updatedPayments[nonDiscountIndex].amount = totalAmount;
      }
      
      setEditableOrder(prevState => ({
        ...prevState,
        tickets: updatedTickets,
        gross_total: grossTotal,
        total_amount: totalAmount,
        payments: updatedPayments,
        removedTickets: [...(prevState.removedTickets || []), { ticket_type_id: ticketTypeId, quantity: 1 }]
      }));
    }
  };

  // Handle adding a meal to the order
  const handleAddMeal = (meal) => {
    if (!editableOrder) return;
    
    console.log('Adding meal:', meal);
    
    const existingMealIndex = editableOrder.meals.findIndex(
      m => m.meal_id === meal.id || m.meal_id === meal.meal_id
    );
    
    let updatedMeals = [...editableOrder.meals];
    
    if (existingMealIndex >= 0) {
      const currentQuantity = updatedMeals[existingMealIndex].quantity || 1;
      if (currentQuantity >= 20) {
        notify.error('Maximum 20 meals of the same type allowed');
        return;
      }
      
      updatedMeals[existingMealIndex] = {
        ...updatedMeals[existingMealIndex],
        quantity: currentQuantity + 1
      };
    } else {
      const newMeal = {
        meal_id: meal.id || meal.meal_id,
        name: meal.name,
        quantity: 1,
        price_at_order: meal.price
      };
      
      updatedMeals = [...updatedMeals, newMeal];
    }
    
    const newAddedMeal = {
      meal_id: meal.id || meal.meal_id,
      quantity: 1,
      price: meal.price
    };
    
    const ticketTotal = (editableOrder.tickets || []).reduce((sum, ticket) => {
      const price = parseFloat(ticket.sold_price) || 0;
      const quantity = parseInt(ticket.quantity) || 1;
      return sum + (price * quantity);
    }, 0);
    
    const mealTotal = updatedMeals.reduce((sum, meal) => {
      const price = parseFloat(meal.price_at_order) || 0;
      const quantity = parseInt(meal.quantity) || 1;
      return sum + (price * quantity);
    }, 0);
    
    const grossTotal = parseFloat((ticketTotal + mealTotal).toFixed(2));
    const discountAmount = (editableOrder.payments || [])
      .filter(payment => payment.method === 'discount')
      .reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0);
    const totalAmount = parseFloat((grossTotal - discountAmount).toFixed(2));
    
    let updatedPayments = [...editableOrder.payments];
    const nonDiscountPayments = updatedPayments.filter(p => p.method !== 'discount');
    
    if (nonDiscountPayments.length === 1) {
      const nonDiscountIndex = updatedPayments.findIndex(p => p.method !== 'discount');
      updatedPayments[nonDiscountIndex].amount = totalAmount;
    }
    
    setEditableOrder(prevState => ({
      ...prevState,
      meals: updatedMeals,
      gross_total: grossTotal,
      total_amount: totalAmount,
      payments: updatedPayments,
      addedMeals: [...(prevState.addedMeals || []), newAddedMeal]
    }));
    
    notify.success(`Added meal: ${meal.name}`);
  };

  // Handle removing a meal from the order
  const handleRemoveMeal = (mealId) => {
    if (!editableOrder) return;
    
    const mealIndex = editableOrder.meals.findIndex(m => m.meal_id === mealId);
    
    if (mealIndex >= 0) {
      const updatedMeals = [...editableOrder.meals];
      
      if (updatedMeals[mealIndex].quantity > 1) {
        updatedMeals[mealIndex] = {
          ...updatedMeals[mealIndex],
          quantity: updatedMeals[mealIndex].quantity - 1
        };
      } else {
        updatedMeals.splice(mealIndex, 1);
      }
      
      setEditableOrder(prevState => ({
        ...prevState,
        meals: updatedMeals,
        removedMeals: [...(prevState.removedMeals || []), { meal_id: mealId, quantity: 1 }]
      }));
      
      setTimeout(() => recalculateOrderTotal(), 50);
    }
  };

  // Payment method change handler
  const handlePaymentMethodChange = (index, method) => {
    if (!editableOrder) return;
    
    const oldMethod = editableOrder.payments[index].method;
    const wasDiscount = oldMethod === 'discount';
    const isDiscount = method === 'discount';
    const updatedPayments = [...editableOrder.payments];
    
    updatedPayments[index] = { 
      ...updatedPayments[index], 
      method 
    };
    
    setEditableOrder({
      ...editableOrder,
      payments: updatedPayments
    });
    
    if (wasDiscount !== isDiscount) {
      setTimeout(() => recalculateOrderTotal(), 50);
    }
  };

  // Payment amount change handler
  const handlePaymentAmountChange = (index, amount) => {
    if (!editableOrder) return;
    
    const parsedAmount = parseFloat(amount) || 0;
    const updatedPayments = [...editableOrder.payments];
    const isDiscountPayment = updatedPayments[index].method === 'discount';
    
    updatedPayments[index] = { ...updatedPayments[index], amount: parsedAmount };
    
    const ticketTotal = Array.isArray(editableOrder.tickets) 
      ? editableOrder.tickets.reduce((sum, ticket) => {
          const price = parseFloat(ticket.sold_price) || 0;
          const quantity = parseInt(ticket.quantity) || 1;
          return sum + (price * quantity);
        }, 0)
      : 0;
    
    const mealTotal = Array.isArray(editableOrder.meals)
      ? editableOrder.meals.reduce((sum, meal) => {
          const price = parseFloat(meal.price_at_order) || 0;
          const quantity = parseInt(meal.quantity) || 1;
          return sum + (price * quantity);
        }, 0)
      : 0;
    
    const grossTotal = parseFloat((ticketTotal + mealTotal).toFixed(2));
    const discountAmount = updatedPayments
      .filter(payment => payment.method === 'discount')
      .reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0);
    const totalAmount = parseFloat((grossTotal - discountAmount).toFixed(2));
    
    if (isDiscountPayment && parsedAmount > grossTotal) {
      notify.error(`Discount amount cannot exceed gross total of ${formatCurrency(grossTotal)}`);
      updatedPayments[index].amount = grossTotal;
    }
    
    if (totalAmount < 0) {
      notify.error('Total discount cannot exceed gross amount');
      return;
    }
    
    setEditableOrder(prevState => ({
      ...prevState,
      payments: updatedPayments,
      gross_total: grossTotal,
      total_amount: Math.max(0, totalAmount)
    }));
  };

  // Add payment method
  const handleAddPayment = () => {
    if (!editableOrder) return;
    
    if (editableOrder.payments.length >= 5) {
      notify.error('Maximum 5 payment methods allowed per order');
      return;
    }
    
    const grossTotal = parseFloat(editableOrder.gross_total || 0);
    const discountAmount = editableOrder.payments
      .filter(payment => payment.method === 'discount')
      .reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0);
    
    const netTotal = grossTotal - discountAmount;
    const nonDiscountTotal = editableOrder.payments
      .filter(payment => payment.method !== 'discount')
      .reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0);
    
    const remainingAmount = Math.max(0, netTotal - nonDiscountTotal);
    const newPaymentAmount = remainingAmount > 0 ? remainingAmount : 0;
    
    const updatedPayments = [
      ...editableOrder.payments,
      { method: 'cash', amount: newPaymentAmount }
    ];
    
    setEditableOrder({
      ...editableOrder,
      payments: updatedPayments
    });
    
    if (newPaymentAmount > 0) {
      notify.info(`Added payment method with remaining amount: ${formatCurrency(newPaymentAmount)}`);
    }
  };

  // Remove payment method
  const handleRemovePayment = (index) => {
    if (!editableOrder || editableOrder.payments.length <= 1) {
      notify.error('At least one payment method is required');
      return;
    }
    
    const updatedPayments = [...editableOrder.payments];
    const removedPayment = updatedPayments[index];
    
    updatedPayments.splice(index, 1);
    
    setEditableOrder({
      ...editableOrder,
      payments: updatedPayments
    });
    
    if (removedPayment.method === 'discount') {
      setTimeout(() => recalculateOrderTotal(), 50);
    }
    
    notify.info(`Removed ${formatPaymentMethod(removedPayment.method)} payment method`);
  };

  // Recalculate order total
  const recalculateOrderTotal = () => {
    if (!editableOrder) return;
    
    setTimeout(() => {
      setEditableOrder(prev => {
        if (!prev) return null;
        
        const ticketTotal = Array.isArray(prev.tickets) 
          ? prev.tickets.reduce((sum, ticket) => {
              const price = parseFloat(ticket.sold_price) || 0;
              const quantity = parseInt(ticket.quantity) || 1;
              return sum + (price * quantity);
            }, 0)
          : 0;
        
        const mealTotal = Array.isArray(prev.meals)
          ? prev.meals.reduce((sum, meal) => {
              const price = parseFloat(meal.price_at_order) || 0;
              const quantity = parseInt(meal.quantity) || 1;
              return sum + (price * quantity);
            }, 0)
          : 0;
        
        const grossTotal = parseFloat((ticketTotal + mealTotal).toFixed(2));
        const discountAmount = Array.isArray(prev.payments)
          ? prev.payments
              .filter(payment => payment.method === 'discount')
              .reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0)
          : 0;
        
        const totalAmount = parseFloat((grossTotal - discountAmount).toFixed(2));
        let updatedPayments = [...prev.payments];
        const nonDiscountPayments = updatedPayments.filter(p => p.method !== 'discount');
        
        if (nonDiscountPayments.length === 1) {
          const nonDiscountIndex = updatedPayments.findIndex(p => p.method !== 'discount');
          updatedPayments[nonDiscountIndex].amount = totalAmount;
        }
        
        return {
          ...prev,
          gross_total: grossTotal,
          total_amount: totalAmount,
          payments: updatedPayments
        };
      });
    }, 0);
  };

  // Save order changes with validation
  const saveOrderChanges = async () => {
    if (!editableOrder) return;

    try {
      setLoading(true);
      
      // Use the correct apiClient.request method
      await apiClient.request(`/api/orders/${editableOrder.order_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          addedTickets: editableOrder.addedTickets || [],
          removedTickets: editableOrder.removedTickets || [],
          addedMeals: editableOrder.addedMeals || [],
          removedMeals: editableOrder.removedMeals || [],
          payments: editableOrder.payments || []
        })
      });

      notify.success('Order updated successfully');
      handleCloseEditDialog();
      fetchOrders(); // Refresh orders
    } catch (error) {
      console.error('Error updating order:', error);
      notify.error(error.message || 'Failed to update order');
    } finally {
      setLoading(false);
    }
  };

  // Render edit tab content
  const renderEditTabContent = () => {
    if (!editableOrder) return null;

    switch (editTab) {
      case 0: // Tickets Tab
        return (
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Typography 
              variant={isMobile ? "subtitle2" : "h6"} 
              gutterBottom
              sx={{ fontSize: { xs: '0.9rem', sm: '1rem', md: '1.1rem' } }}
            >
              Current Tickets
            </Typography>
            {editableOrder.tickets.length === 0 ? (
              <Typography 
                variant="body2" 
                color="text.secondary" 
                sx={{ 
                  mb: 2,
                  fontSize: { xs: '0.8rem', sm: '0.875rem' }
                }}
              >
                No tickets in this order
              </Typography>
            ) : (
              <Box sx={{ 
                mb: 2, 
                maxHeight: { xs: '30vh', sm: '35vh', md: '40vh' }, 
                overflow: 'auto',
                border: 1,
                borderColor: 'divider',
                borderRadius: 1
              }}>
                {editableOrder.tickets.map((ticket, index) => (
                  <Box
                    key={index}
                    sx={{
                      p: { xs: 1, sm: 1.5 },
                      borderBottom: index < editableOrder.tickets.length - 1 ? 1 : 0,
                      borderColor: 'divider',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 1
                    }}
                  >
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography 
                        variant={isMobile ? "body2" : "body1"}
                        sx={{ 
                          fontWeight: 'medium',
                          fontSize: { xs: '0.8rem', sm: '0.875rem' }
                        }}
                        noWrap
                      >
                        {ticket.category} - {ticket.subcategory}
                      </Typography>
                      <Typography 
                        variant="caption" 
                        color="text.secondary"
                        sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                      >
                        {formatCurrency(ticket.sold_price)} each
                      </Typography>
                    </Box>
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: { xs: 0.5, sm: 1 },
                      flexShrink: 0
                    }}>
                      <IconButton 
                        size="small" 
                        onClick={() => handleRemoveTicket(ticket.ticket_type_id)}
                        sx={{ p: { xs: 0.25, sm: 0.5 } }}
                      >
                        <RemoveIcon fontSize="small" />
                      </IconButton>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          minWidth: { xs: 16, sm: 20 }, 
                          textAlign: 'center',
                          fontSize: { xs: '0.8rem', sm: '0.875rem' },
                          fontWeight: 'bold'
                        }}
                      >
                        {ticket.quantity}
                      </Typography>
                      <IconButton 
                        size="small" 
                        onClick={() => handleAddTicket({
                          id: ticket.ticket_type_id,
                          category: ticket.category,
                          subcategory: ticket.subcategory,
                          price: ticket.sold_price
                        })}
                        sx={{ p: { xs: 0.25, sm: 0.5 } }}
                      >
                        <AddIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                ))}
              </Box>
            )}

            <Divider sx={{ my: { xs: 1, sm: 2 } }} />

            <Typography 
              variant={isMobile ? "subtitle2" : "h6"} 
              gutterBottom
              sx={{ fontSize: { xs: '0.9rem', sm: '1rem', md: '1.1rem' } }}
            >
              Add Tickets
            </Typography>
            <Box sx={{ 
              flex: 1,
              overflow: 'auto',
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
              p: { xs: 0.5, sm: 1 }
            }}>
              <Grid container spacing={{ xs: 0.5, sm: 1 }}>
                {availableTicketTypes.map((ticketType) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={ticketType.id}>
                    <Card 
                      sx={{ 
                        cursor: 'pointer',
                        '&:hover': { 
                          backgroundColor: 'action.hover',
                          transform: 'scale(1.02)'
                        },
                        height: '100%',
                        minHeight: { xs: 60, sm: 80 },
                        transition: 'all 0.2s'
                      }}
                      onClick={() => handleAddTicket(ticketType)}
                    >
                      <CardContent sx={{ 
                        p: { xs: 0.5, sm: 1, md: 1.5 },
                        '&:last-child': { pb: { xs: 0.5, sm: 1, md: 1.5 } }
                      }}>
                        <Typography 
                          variant={isMobile ? "caption" : "body2"} 
                          fontWeight="bold"
                          sx={{ 
                            fontSize: { xs: '0.7rem', sm: '0.8rem', md: '0.875rem' },
                            lineHeight: 1.2
                          }}
                          noWrap
                        >
                          {ticketType.name}
                        </Typography>
                        <Typography 
                          variant="caption" 
                          color="text.secondary" 
                          display="block"
                          sx={{ 
                            fontSize: { xs: '0.65rem', sm: '0.7rem', md: '0.75rem' },
                            lineHeight: 1.1
                          }}
                          noWrap
                        >
                          {ticketType.category} - {ticketType.subcategory}
                        </Typography>
                        <Typography 
                          variant={isMobile ? "caption" : "body2"} 
                          color="primary"
                          fontWeight="bold"
                          sx={{ 
                            fontSize: { xs: '0.7rem', sm: '0.8rem', md: '0.875rem' },
                            mt: 0.25
                          }}
                        >
                          {formatCurrency(ticketType.price)}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </Box>
        );

      case 1: // Meals Tab
        return (
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Typography 
              variant={isMobile ? "subtitle2" : "h6"} 
              gutterBottom
              sx={{ fontSize: { xs: '0.9rem', sm: '1rem', md: '1.1rem' } }}
            >
              Current Meals
            </Typography>
            {editableOrder.meals.length === 0 ? (
              <Typography 
                variant="body2" 
                color="text.secondary" 
                sx={{ 
                  mb: 2,
                  fontSize: { xs: '0.8rem', sm: '0.875rem' }
                }}
              >
                No meals in this order
              </Typography>
            ) : (
              <Box sx={{ 
                mb: 2, 
                maxHeight: { xs: '30vh', sm: '35vh', md: '40vh' }, 
                overflow: 'auto',
                border: 1,
                borderColor: 'divider',
                borderRadius: 1
              }}>
                {editableOrder.meals.map((meal, index) => (
                  <Box
                    key={index}
                    sx={{
                      p: { xs: 1, sm: 1.5 },
                      borderBottom: index < editableOrder.meals.length - 1 ? 1 : 0,
                      borderColor: 'divider',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 1
                    }}
                  >
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography 
                        variant={isMobile ? "body2" : "body1"}
                        sx={{ 
                          fontWeight: 'medium',
                          fontSize: { xs: '0.8rem', sm: '0.875rem' }
                        }}
                        noWrap
                      >
                        {meal.name}
                      </Typography>
                      <Typography 
                        variant="caption" 
                        color="text.secondary"
                        sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                      >
                        {formatCurrency(meal.price_at_order)} each
                      </Typography>
                    </Box>
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: { xs: 0.5, sm: 1 },
                      flexShrink: 0
                    }}>
                      <IconButton 
                        size="small" 
                        onClick={() => handleRemoveMeal(meal.meal_id)}
                        sx={{ p: { xs: 0.25, sm: 0.5 } }}
                      >
                        <RemoveIcon fontSize="small" />
                      </IconButton>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          minWidth: { xs: 16, sm: 20 }, 
                          textAlign: 'center',
                          fontSize: { xs: '0.8rem', sm: '0.875rem' },
                          fontWeight: 'bold'
                        }}
                      >
                        {meal.quantity}
                      </Typography>
                      <IconButton 
                        size="small" 
                        onClick={() => handleAddMeal({
                          id: meal.meal_id,
                          name: meal.name,
                          price: meal.price_at_order
                        })}
                        sx={{ p: { xs: 0.25, sm: 0.5 } }}
                      >
                        <AddIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                ))}
              </Box>
            )}

            <Divider sx={{ my: { xs: 1, sm: 2 } }} />

            <Typography 
              variant={isMobile ? "subtitle2" : "h6"} 
              gutterBottom
              sx={{ fontSize: { xs: '0.9rem', sm: '1rem', md: '1.1rem' } }}
            >
              Add Meals
            </Typography>
            <Box sx={{ 
              flex: 1,
              overflow: 'auto',
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
              p: { xs: 0.5, sm: 1 }
            }}>
              <Grid container spacing={{ xs: 0.5, sm: 1 }}>
                {availableMeals.map((meal) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={meal.id}>
                    <Card 
                      sx={{ 
                        cursor: 'pointer',
                        '&:hover': { 
                          backgroundColor: 'action.hover',
                          transform: 'scale(1.02)'
                        },
                        height: '100%',
                        minHeight: { xs: 60, sm: 80 },
                        transition: 'all 0.2s'
                      }}
                      onClick={() => handleAddMeal(meal)}
                    >
                      <CardContent sx={{ 
                        p: { xs: 0.5, sm: 1, md: 1.5 },
                        '&:last-child': { pb: { xs: 0.5, sm: 1, md: 1.5 } }
                      }}>
                        <Typography 
                          variant={isMobile ? "caption" : "body2"} 
                          fontWeight="bold"
                          sx={{ 
                            fontSize: { xs: '0.7rem', sm: '0.8rem', md: '0.875rem' },
                            lineHeight: 1.2
                          }}
                          noWrap
                        >
                          {meal.name}
                        </Typography>
                        <Typography 
                          variant="caption" 
                          color="text.secondary" 
                          display="block"
                          sx={{ 
                            fontSize: { xs: '0.65rem', sm: '0.7rem', md: '0.75rem' },
                            lineHeight: 1.1
                          }}
                          noWrap
                        >
                          {meal.category}
                        </Typography>
                        <Typography 
                          variant={isMobile ? "caption" : "body2"} 
                          color="primary"
                          fontWeight="bold"
                          sx={{ 
                            fontSize: { xs: '0.7rem', sm: '0.8rem', md: '0.875rem' },
                            mt: 0.25
                          }}
                        >
                          {formatCurrency(meal.price)}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </Box>
        );

      case 2: // Payment Tab
        const totalPayments = editableOrder.payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
        const orderTotal = parseFloat(editableOrder.total_amount) || 0;
        const difference = totalPayments - orderTotal;
        const isValid = Math.abs(difference) < 0.01;
        
        return (
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Typography 
              variant={isMobile ? "subtitle2" : "h6"} 
              gutterBottom
              sx={{ fontSize: { xs: '0.9rem', sm: '1rem', md: '1.1rem' } }}
            >
              Payment Methods
            </Typography>
            
            <Box sx={{ 
              flex: 1, 
              overflow: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: { xs: 1, sm: 2 }
            }}>
              <Stack spacing={{ xs: 1, sm: 1.5 }}>
                {editableOrder.payments.map((payment, index) => (
                  <Box 
                    key={index} 
                    sx={{ 
                      display: 'flex', 
                      gap: { xs: 0.5, sm: 1 }, 
                      alignItems: 'flex-start', 
                      flexWrap: 'wrap',
                      p: { xs: 1, sm: 1.5 },
                      border: 1,
                      borderColor: 'divider',
                      borderRadius: 1,
                      bgcolor: 'background.default'
                    }}
                  >
                    <FormControl 
                      size="small" 
                      sx={{ 
                        minWidth: { xs: '100%', sm: 120, md: 150 },
                        mb: { xs: 1, sm: 0 }
                      }}
                    >
                      <InputLabel sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                        Method
                      </InputLabel>
                      <Select
                        value={payment.method}
                        label="Method"
                        onChange={(e) => handlePaymentMethodChange(index, e.target.value)}
                        sx={{
                          fontSize: { xs: '0.8rem', sm: '0.875rem' },
                          '& .MuiSelect-select': {
                            py: { xs: 1, sm: 1.5 }
                          }
                        }}
                      >
                        {paymentMethods.map((method) => (
                          <MenuItem 
                            key={method.value} 
                            value={method.value}
                            sx={{ 
                              color: method.value === 'discount' ? 'error.main' : 'inherit',
                              fontWeight: method.value === 'CREDIT' ? 'bold' : 'normal',
                              fontSize: { xs: '0.8rem', sm: '0.875rem' }
                            }}
                          >
                            {method.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    
                    <TextField
                      label="Amount"
                      type="number"
                      size="small"
                      value={payment.amount}
                      onChange={(e) => handlePaymentAmountChange(index, e.target.value)}
                      sx={{ 
                        minWidth: { xs: '100%', sm: 100, md: 120 },
                        mb: { xs: 1, sm: 0 },
                        '& .MuiInputBase-input': {
                          fontSize: { xs: '0.8rem', sm: '0.875rem' }
                        },
                        '& .MuiInputLabel-root': {
                          fontSize: { xs: '0.8rem', sm: '0.875rem' }
                        }
                      }}
                      inputProps={{ 
                        step: "0.01", 
                        min: "0",
                        max: payment.method === 'discount' ? editableOrder.gross_total : undefined
                      }}
                      error={payment.method === 'discount' && payment.amount > (editableOrder.gross_total || 0)}
                      helperText={
                        payment.method === 'discount' && payment.amount > (editableOrder.gross_total || 0)
                          ? 'Discount cannot exceed gross total'
                          : undefined
                      }
                    />
                    
                    {editableOrder.payments.length > 1 && (
                      <IconButton 
                        color="error" 
                        size="small"
                        onClick={() => handleRemovePayment(index)}
                        title="Remove payment method"
                        sx={{ 
                          p: { xs: 0.5, sm: 1 },
                          alignSelf: { xs: 'center', sm: 'flex-start' },
                          mt: { sm: 0.5 }
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                ))}
                
                <Button
                  startIcon={<AddIcon />}
                  onClick={handleAddPayment}
                  variant="outlined"
                  size="small"
                  sx={{ 
                    alignSelf: 'flex-start',
                    fontSize: { xs: '0.75rem', sm: '0.875rem' }
                  }}
                  disabled={editableOrder.payments.length >= 5}
                >
                  Add Payment {editableOrder.payments.length >= 5 && '(Max 5)'}
                </Button>
              </Stack>
              
              <Box sx={{ 
                mt: 'auto',
                p: { xs: 1, sm: 1.5 }, 
                bgcolor: isValid ? 'success.light' : 'error.light', 
                borderRadius: 1,
                border: 1,
                borderColor: isValid ? 'success.main' : 'error.main'
              }}>
                <Typography 
                  variant="body2" 
                  fontWeight="bold" 
                  gutterBottom
                  sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
                >
                  Payment Summary
                </Typography>
                <Stack spacing={0.25}>
                  <Typography 
                    variant="body2" 
                    color="text.secondary"
                    sx={{ fontSize: { xs: '0.75rem', sm: '0.8rem' } }}
                  >
                    Gross Total: {formatCurrency(editableOrder.gross_total || 0)}
                  </Typography>
                  {editableOrder.payments.some(p => p.method === 'discount') && (
                    <Typography 
                      variant="body2" 
                      color="error.main"
                      sx={{ fontSize: { xs: '0.75rem', sm: '0.8rem' } }}
                    >
                      Discount: -{formatCurrency(
                        editableOrder.payments
                          .filter(p => p.method === 'discount')
                          .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)
                      )}
                    </Typography>
                  )}
                  <Typography 
                    variant="body2" 
                    color="text.secondary"
                    sx={{ fontSize: { xs: '0.75rem', sm: '0.8rem' } }}
                  >
                    Net Total: {formatCurrency(orderTotal)}
                  </Typography>
                  <Typography 
                    variant="body2" 
                    color="text.secondary"
                    sx={{ fontSize: { xs: '0.75rem', sm: '0.8rem' } }}
                  >
                    Total Payments: {formatCurrency(totalPayments)}
                  </Typography>
                  <Typography 
                    variant="body2" 
                    color={isValid ? 'success.main' : 'error.main'}
                    fontWeight="bold"
                    sx={{ fontSize: { xs: '0.75rem', sm: '0.8rem' } }}
                  >
                    {isValid ? '✅ ' : '❌ '}
                    Difference: {formatCurrency(difference)}
                    {!isValid && ' (Must be $0.00)'}
                  </Typography>
                </Stack>
              </Box>
            </Box>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
        
        {/* Compact Mobile Header */}
        <Box sx={{ mb: 2 }}>
          <Typography variant={isMobile ? "h6" : "h4"} fontWeight="bold" sx={{ mb: 1 }}>
            Orders Management
          </Typography>
          
          {/* Compact Search Bar */}
          <TextField
            placeholder="Search by Order ID or Cashier..."
            variant="outlined"
            size="small"
            value={searchTerm}
            onChange={handleSearchChange}
            fullWidth
            sx={{ mb: 1 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={fetchOrders}
                    disabled={loading}
                    title="Refresh"
                  >
                    <RefreshIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          {/* Compact Date Controls - Collapsible */}
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
              {fromDate.format('MMM DD')} - {toDate.format('MMM DD')} ({filteredOrders.length} orders)
            </Button>
            
            <Collapse in={filterMenuOpen}>
              <Box sx={{ p: 1, bgcolor: 'grey.50', borderRadius: 1, mb: 1 }}>
                {/* Compact Date Pickers */}
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
              </Box>
            </Collapse>
          </Box>
        </Box>

        {/* Responsive Orders Display */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={32} />
          </Box>
        ) : error ? (
          <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
            <Typography color="error" variant="body2" sx={{ mb: 1 }}>
              {error}
            </Typography>
            <Button
              variant="outlined"
              onClick={fetchOrders}
              size="small"
            >
              Retry
            </Button>
          </Paper>
        ) : filteredOrders.length === 0 ? (
          <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
            <Typography variant="body2">
              No orders found for the selected period
            </Typography>
          </Paper>
        ) : (
          <>
            {/* Mobile Card View */}
            {isMobile ? (
              <Box>
                {filteredOrders
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((order) => {
                    const orderDate = new Date(order.created_at);
                    const ticketCount = order.tickets ? 
                      order.tickets.reduce((sum, ticket) => sum + (ticket.quantity || 0), 0) : 0;
                    const mealCount = order.meals ? 
                      order.meals.reduce((sum, meal) => sum + (meal.quantity || 0), 0) : 0;

                    return (
                      <Card key={order.order_id} sx={{ 
                        mb: 1.5, 
                        borderRadius: 2,
                        boxShadow: '0 1px 4px rgba(0,0,0,0.1)'
                      }}>
                        <CardContent sx={{ p: 1.5, pb: 1 }}>
                          {/* Compact Header */}
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography variant="subtitle2" color="primary" fontWeight="bold">
                              #{order.order_id}
                            </Typography>
                            <Typography variant="subtitle2" fontWeight="bold" color="success.main">
                              {formatCurrency(order.total_amount)}
                            </Typography>
                          </Box>

                          {/* Compact Info Row */}
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                              {orderDate.toLocaleDateString()} {orderDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {order.user_name || 'Unknown'}
                            </Typography>
                          </Box>

                          {/* Compact Items & Payments */}
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              {ticketCount > 0 && (
                                <Chip 
                                  label={`${ticketCount}T`}
                                  size="small"
                                  color="primary"
                                  variant="outlined"
                                  sx={{ height: 20, fontSize: '0.65rem' }}
                                />
                              )}
                              {mealCount > 0 && (
                                <Chip 
                                  label={`${mealCount}M`}
                                  size="small"
                                  color="secondary"
                                  variant="outlined"
                                  sx={{ height: 20, fontSize: '0.65rem' }}
                                />
                              )}
                            </Box>
                            
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              {order.payments && order.payments.slice(0, 2).map((payment, index) => (
                                <Chip 
                                  key={index}
                                  label={formatPaymentMethod(payment.method).substring(0, 4)}
                                  size="small"
                                  color={getPaymentMethodColor(payment.method)}
                                  variant="outlined"
                                  sx={{ height: 20, fontSize: '0.6rem' }}
                                />
                              ))}
                              {order.payments && order.payments.length > 2 && (
                                <Chip 
                                  label={`+${order.payments.length - 2}`}
                                  size="small"
                                  variant="outlined"
                                  sx={{ height: 20, fontSize: '0.6rem' }}
                                />
                              )}
                            </Box>
                          </Box>
                        </CardContent>

                        <CardActions sx={{ pt: 0, px: 1.5, pb: 1, justifyContent: 'flex-end' }}>
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleOpenEditDialog(order)}
                            sx={{ p: 0.5 }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteOrder(order)}
                            sx={{ p: 0.5 }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </CardActions>
                      </Card>
                    );
                  })}
              
              {/* Compact Mobile Pagination */}
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                mt: 1,
                px: 1
              }}>
                <Typography variant="caption" color="text.secondary">
                  {page * rowsPerPage + 1}-{Math.min((page + 1) * rowsPerPage, filteredOrders.length)} of {filteredOrders.length}
                </Typography>
                <Box>
                  <IconButton
                    size="small"
                    disabled={page === 0}
                    onClick={(e) => handleChangePage(e, page - 1)}
                  >
                    <ExpandMoreIcon sx={{ transform: 'rotate(90deg)' }} />
                  </IconButton>
                  <IconButton
                    size="small"
                    disabled={page >= Math.ceil(filteredOrders.length / rowsPerPage) - 1}
                    onClick={(e) => handleChangePage(e, page + 1)}
                  >
                    <ExpandMoreIcon sx={{ transform: 'rotate(-90deg)' }} />
                  </IconButton>
                </Box>
              </Box>
            </Box>
          ) : (
            /* Desktop Table View - Keep existing */
            <Paper sx={{ width: '100%', overflow: 'hidden', borderRadius: 2 }}>
              <TableContainer sx={{ maxHeight: 'calc(100vh - 300px)' }}>
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>Order ID</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Date & Time</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Cashier</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Items</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Payment</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }} align="right">Total</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                 <TableBody>
  {filteredOrders
    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
    .map((order) => {
      const orderDate = new Date(order.created_at);
      
      const ticketCount = order.tickets ? 
        order.tickets.reduce((sum, ticket) => sum + (ticket.quantity || 0), 0) : 0;
      
      const mealCount = order.meals ? 
        order.meals.reduce((sum, meal) => sum + (meal.quantity || 0), 0) : 0;
        
      return (
        <TableRow 
          hover
          key={order.order_id}
          sx={{ '&:hover': { cursor: 'pointer' } }}
        >
          <TableCell>#{order.order_id}</TableCell>
          <TableCell>
            <Typography variant="body2">
              {orderDate.toLocaleDateString()}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {orderDate.toLocaleTimeString()}
            </Typography>
          </TableCell>
          <TableCell>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PersonIcon fontSize="small" color="action" />
              <Typography>{order.user_name || 'Unknown'}</Typography>
            </Box>
          </TableCell>
          <TableCell>
            {ticketCount > 0 && (
              <Chip 
                icon={<LocalActivityIcon fontSize="small" />}
                label={`${ticketCount} ticket${ticketCount !== 1 ? 's' : ''}`}
                size="small"
                color="primary"
                variant="outlined"
                sx={{ mr: 1, mb: 0.5 }}
              />
            )}
            {mealCount > 0 && (
              <Chip 
                icon={<RestaurantIcon fontSize="small" />}
                label={`${mealCount} meal${mealCount !== 1 ? 's' : ''}`}
                size="small"
                color="secondary"
                variant="outlined"
                sx={{ mb: 0.5 }}
              />
            )}
          </TableCell>
          <TableCell>
            {order.payments && order.payments.map((payment, index) => (
              <Chip 
                key={index}
                label={`${formatPaymentMethod(payment.method)}: ${formatCurrency(payment.amount)}`}
                size="small"
                color={getPaymentMethodColor(payment.method)}
                variant="outlined"
                sx={{ mr: 0.5, mb: 0.5 }}
              />
            ))}
          </TableCell>
          <TableCell align="right">
            <Typography fontWeight="bold">
              {formatCurrency(order.total_amount)}
            </Typography>
          </TableCell>
          <TableCell align="center">
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
              <IconButton
                color="primary"
                onClick={() => handleOpenEditDialog(order)}
                title="Edit Order"
              >
                <EditIcon />
              </IconButton>
              <IconButton
                color="error"
                onClick={() => handleDeleteOrder(order)}
                title="Delete Order"
              >
                <DeleteIcon />
              </IconButton>
            </Box>
          </TableCell>
        </TableRow>
      );
    })} {/* ✅ FIXED: Added the missing closing bracket and parenthesis */}
</TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                rowsPerPageOptions={[5, 10, 25]}
                component="div"
                count={filteredOrders.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
              />
            </Paper>
          )}
        </>
      )}

      {/* Responsive Edit Dialog */}
      <Dialog 
        open={editDialogOpen} 
        onClose={handleCloseEditDialog}
        fullWidth
        maxWidth={false}
        fullScreen={isMobile}
        PaperProps={{
          sx: {
            // Mobile: Full screen with safe areas
            ...(isMobile ? {
              height: '100vh',
              maxHeight: '100vh',
              width: '100vw',
              maxWidth: '100vw',
              margin: 0,
              borderRadius: 0,
              // Add safe area insets for mobile browsers
              paddingTop: 'env(safe-area-inset-top)',
              paddingBottom: 'env(safe-area-inset-bottom)',
              // Ensure it's below browser UI
              position: 'fixed',
              top: 0,
              left: 0,
              zIndex: 1300
            } : {
              // Desktop: Responsive sizing
              width: '90vw',
              maxWidth: '1200px',
              height: '85vh',
              maxHeight: '800px',
              margin: 'auto'
            })
          }
        }}
        // Add these props for mobile
        {...(isMobile && {
          TransitionProps: {
            onEntered: () => {
              // Prevent body scroll when dialog opens on mobile
              document.body.style.overflow = 'hidden';
              // Set viewport height to actual visible height
              document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
            },
            onExited: () => {
              // Restore body scroll when dialog closes
              document.body.style.overflow = 'unset';
            }
          }
        })}
      >
        <DialogTitle sx={{ 
          p: { xs: 1, sm: 1.5, md: 2 },
          fontSize: { xs: '0.9rem', sm: '1.1rem', md: '1.25rem' },
          borderBottom: 1,
          borderColor: 'divider',
          position: 'sticky',
          top: 0,
          zIndex: 1,
          bgcolor: 'background.paper',
          // Mobile adjustments
          ...(isMobile && {
            // Add top padding for mobile browser UI
            pt: { xs: 2 },
            // Ensure it's visible above browser chrome
            minHeight: 56
          })
        }}>
          <Stack 
            direction="row"
            justifyContent="space-between" 
            alignItems="center"
            spacing={1}
          >
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography 
                variant={isMobile ? "subtitle2" : "h6"} 
                noWrap
                fontWeight="bold"
              >
                Edit Order #{selectedOrder?.order_id}
              </Typography>
              {selectedOrder && (
                <Typography 
                  variant="caption" 
                  color="text.secondary" 
                  sx={{ 
                    display: 'block', 
                    mt: 0.25,
                    fontSize: { xs: '0.7rem', sm: '0.75rem' }
                  }}
                >
                  {new Date(selectedOrder.created_at).toLocaleDateString()} • {selectedOrder.user_name}
                </Typography>
              )}
            </Box>
            <Chip 
              label={formatCurrency(editableOrder?.total_amount || 0)}
              color="primary"
              size={isMobile ? "small" : "medium"}
              sx={{ 
                minWidth: 'auto',
                '& .MuiChip-label': {
                  fontSize: { xs: '0.7rem', sm: '0.8rem' }
                }
              }}
            />
          </Stack>
        </DialogTitle>

        <Tabs 
          value={editTab} 
          onChange={handleEditTabChange} 
          sx={{ 
            px: { xs: 0.5, sm: 1, md: 2 }, 
            borderBottom: 1, 
            borderColor: 'divider',
            minHeight: { xs: 40, sm: 48 },
            '& .MuiTab-root': {
              minHeight: { xs: 40, sm: 48 },
              fontSize: { xs: '0.7rem', sm: '0.75rem', md: '0.8rem' },
              padding: { xs: '6px 8px', sm: '8px 12px', md: '12px 16px' }
            }
          }}
          variant={isMobile ? "fullWidth" : "standard"}
          scrollButtons="auto"
          allowScrollButtonsMobile
        >
          <Tab 
            icon={<LocalActivityIcon fontSize="small" />} 
            iconPosition={isMobile ? "top" : "start"}
            label="Tickets"
            wrapped
          />
          <Tab 
            icon={<RestaurantIcon fontSize="small" />} 
            iconPosition={isMobile ? "top" : "start"}
            label="Meals"
            wrapped
          />
          <Tab 
            icon={<PaymentIcon fontSize="small" />} 
            iconPosition={isMobile ? "top" : "start"}
            label="Payment"
            wrapped
          />
        </Tabs>
        
        <DialogContent 
          dividers 
          sx={{ 
            p: { xs: 0.5, sm: 1, md: 2 },
            // Mobile: Use CSS custom property for dynamic height
            height: isMobile 
              ? 'calc(100vh - 200px)' // Fallback
              : 'calc(85vh - 200px)',
            // Better mobile height calculation
            ...(isMobile && {
              height: 'calc(var(--vh, 1vh) * 100 - 200px)',
              minHeight: '50vh',
              maxHeight: 'calc(100vh - 200px)'
            }),
            overflow: 'auto',
            '&::-webkit-scrollbar': {
              width: '6px',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: 'rgba(0,0,0,0.2)',
              borderRadius: '3px',
            }
          }}
        >
          {renderEditTabContent()}
        </DialogContent>
        
        <DialogActions sx={{ 
          p: { xs: 1, sm: 1.5, md: 2 },
          gap: { xs: 0.5, sm: 1 },
          borderTop: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
          zIndex: 1,
          // Mobile: Stick to bottom of screen
          ...(isMobile ? {
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            width: '100%',
            pb: 'max(16px, env(safe-area-inset-bottom))', // Safe area for home indicator
            pt: 2,
            boxShadow: '0 -2px 10px rgba(0,0,0,0.1)', // Add shadow for better separation
            borderTop: '1px solid',
            borderColor: 'divider'
          } : {
            // Desktop: Keep sticky within dialog
            position: 'sticky',
            bottom: 0
          })
        }}>
          <Button 
            onClick={handleCloseEditDialog}
            size={isMobile ? "small" : "medium"}
            sx={{ 
              flex: 1,
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
              ...(isMobile && {
                minHeight: 44,
                fontSize: '0.85rem'
              })
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={saveOrderChanges} 
            variant="contained"
            startIcon={<SaveIcon fontSize="small" />}
            disabled={
              loading || 
              !editableOrder || 
              Math.abs(
                (editableOrder?.payments?.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0) || 0) - 
                (parseFloat(editableOrder?.total_amount) || 0)
              ) >= 0.01 ||
              !(
                (editableOrder?.addedTickets && editableOrder.addedTickets.length > 0) ||
                (editableOrder?.removedTickets && editableOrder.removedTickets.length > 0) ||
                (editableOrder?.addedMeals && editableOrder.addedMeals.length > 0) ||
                (editableOrder?.removedMeals && editableOrder.removedMeals.length > 0) ||
                (editableOrder?.payments && editableOrder?.originalPayments && 
                 JSON.stringify(editableOrder.payments.map(p => ({
                   method: p.method,
                   amount: parseFloat(p.amount).toFixed(2)
                 }))) !== JSON.stringify((editableOrder.originalPayments || []).map(p => ({
                   method: p.method,
                   amount: parseFloat(p.amount).toFixed(2)
                 })))))
            }
            size={isMobile ? "small" : "medium"}
            sx={{ 
              flex: 2,
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
              ...(isMobile && {
                minHeight: 44,
                fontSize: '0.85rem'
              })
            }}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Keep existing Delete Dialog but make it more compact */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        fullScreen={isSmallMobile}
      >
        <DialogTitle sx={{ 
          color: 'error.main', 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1,
          fontSize: { xs: '1rem', sm: '1.5rem' },
          p: { xs: 1.5, sm: 2 }
        }}>
          <DeleteIcon />
          Delete Order
        </DialogTitle>
        <DialogContent sx={{ p: { xs: 1.5, sm: 2 } }}>
          {orderToDelete && (
            <Box>
              <Typography gutterBottom variant="body2">
                Are you sure you want to delete <strong>Order #{orderToDelete.order_id}</strong>?
              </Typography>
              
              <Box sx={{ 
                mt: 1, 
                p: 1.5, 
                bgcolor: 'grey.100', 
                borderRadius: 1 
              }}>
                <Typography variant="caption" color="text.secondary">
                  <strong>Order Details:</strong>
                </Typography>
                <Typography variant="caption" display="block">
                  • Created: {new Date(orderToDelete.created_at).toLocaleString()}
                </Typography>
                <Typography variant="caption" display="block">
                  • Cashier: {orderToDelete.user_name}
                </Typography>
                <Typography variant="caption" display="block">
                  • Total: {formatCurrency(orderToDelete.total_amount)}
                </Typography>
              </Box>
              
              <Typography 
                variant="caption" 
                color="error" 
                sx={{ mt: 1, fontWeight: 'medium', display: 'block' }}
              >
                ⚠️ This action cannot be undone.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ 
          p: { xs: 1.5, sm: 2 },
          gap: 1
        }}>
          <Button 
            onClick={() => setDeleteDialogOpen(false)}
            size="small"
            sx={{ flex: 1 }}
          >
            Cancel
          </Button>
          <Button 
            onClick={confirmDeleteOrder}
            color="error"
            variant="contained"
            startIcon={<DeleteIcon fontSize="small" />}
            disabled={loading}
            size="small"
            sx={{ flex: 1 }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
        </Box>
      </LocalizationProvider>
    );
};

export default OrdersManagement;