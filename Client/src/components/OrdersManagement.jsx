import React, { useState, useEffect } from 'react';
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
  Tabs,
  Tab
} from '@mui/material';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import axios from 'axios';
// Remove config import
// import config from '../../../config';
import { notify, confirmToast } from '../utils/toast';

// Icons
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
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

const OrdersManagement = () => {
  // State variables
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState('week');
  const [fromDate, setFromDate] = useState(dayjs().subtract(7, 'day'));
  const [toDate, setToDate] = useState(dayjs());
  
  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
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
  
  // Tab state for edit dialog
  const [editTab, setEditTab] = useState(0);

  const baseUrl = window.runtimeConfig?.apiBaseUrl;

  // Fetch orders on component mount and when date range changes
  useEffect(() => {
    fetchOrders();
  }, [fromDate, toDate, baseUrl]);
  
  // Fetch ticket types and meals for order editing
  useEffect(() => {
    fetchTicketTypes();
    fetchMeals();
  }, [baseUrl]);
  
  // Fetch orders from API
  const fetchOrders = async () => {
    if (!baseUrl) {
      setError('API configuration not available');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        setError('Authentication required. Please log in again.');
        notify.error('Authentication required. Please log in again.');
        setLoading(false);
        return;
      }
      
      const params = {
        startDate: fromDate.format('YYYY-MM-DD'),
        endDate: toDate.format('YYYY-MM-DD')
      };
      
      const response = await axios.get(`${baseUrl}/api/orders/range-report`, { 
        params,
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('Orders fetched:', response.data);
      
      if (Array.isArray(response.data)) {
        setOrders(response.data);
      } else {
        setError('Unexpected data format received');
        notify.error('Unexpected data format received');
        setOrders([]);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      setError('Failed to fetch orders. Please try again.');
      notify.error('Failed to fetch orders. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch ticket types for adding tickets to order
  const fetchTicketTypes = async () => {
    if (!baseUrl) return;

    try {
      const token = localStorage.getItem('authToken');
      
      if (!token) return;
      
      const response = await axios.get(`${baseUrl}/api/tickets/ticket-types`, {
        params: { archived: false },
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setAvailableTicketTypes(response.data);
    } catch (error) {
      console.error('Error fetching ticket types:', error);
    }
  };
  
  // Fetch meals for adding to order
  const fetchMeals = async () => {
    if (!baseUrl) return;

    try {
      const token = localStorage.getItem('authToken');
      
      if (!token) return;
      
      const response = await axios.get(`${baseUrl}/api/meals`, {
        params: { archived: false },
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setAvailableMeals(response.data);
    } catch (error) {
      console.error('Error fetching meals:', error);
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
      // Ensure fromDate is not after toDate
      if (newValue.isAfter(toDate)) {
        setToDate(newValue);
      }
    }
  };
  
  // Handle to date change
  const handleToDateChange = (newValue) => {
    if (newValue) {
      setToDate(newValue);
      // Ensure toDate is not before fromDate
      if (fromDate.isAfter(newValue)) {
        setFromDate(newValue);
      }
    }
  };

  // Open edit dialog
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
  
  // Close edit dialog
  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setSelectedOrder(null);
    setEditableOrder(null);
    setEditTab(0);
  };

  // Handle adding a ticket to the order
  const handleAddTicket = (ticketType) => {
    if (!editableOrder) return;
    
    console.log('Adding ticket:', ticketType); // Debug log
    
    // Check if this ticket type is already in the order
    const existingTicketIndex = editableOrder.tickets.findIndex(
      t => t.ticket_type_id === ticketType.id || t.ticket_type_id === ticketType.ticket_type_id
    );
    
    // Create a copy of the tickets array for updating
    const updatedTickets = [...(editableOrder.tickets || [])];
    
    if (existingTicketIndex >= 0) {
      // Increment quantity of existing ticket
      updatedTickets[existingTicketIndex] = {
        ...updatedTickets[existingTicketIndex],
        quantity: (updatedTickets[existingTicketIndex].quantity || 1) + 1
      };
    } else {
      // Add new ticket type
      const newTicket = {
        ticket_type_id: ticketType.id || ticketType.ticket_type_id,
        category: ticketType.category,
        subcategory: ticketType.subcategory,
        sold_price: ticketType.price,
        quantity: 1
      };
      
      console.log('New ticket being added:', newTicket); // Debug log
      updatedTickets.push(newTicket);
    }
    
    // Add to addedTickets for tracking changes
    const newAddedTicket = {
      ticket_type_id: ticketType.id || ticketType.ticket_type_id,
      quantity: 1
    };
    
    // Calculate updated totals using the updatedTickets array
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
    
    // Update payment if only one exists
    let updatedPayments = [...editableOrder.payments];
    if (updatedPayments.length === 1) {
      const isDiscount = updatedPayments[0].method === 'discount';
      updatedPayments[0] = {
        ...updatedPayments[0],
        amount: isDiscount ? grossTotal : totalAmount
      };
    }
    
    // Update state with all changes in one go
    setEditableOrder(prevState => ({
      ...prevState,
      tickets: updatedTickets,
      gross_total: grossTotal,
      total_amount: totalAmount,
      payments: updatedPayments,
      addedTickets: [...(prevState.addedTickets || []), newAddedTicket]
    }));
  };
  
  // Handle removing a ticket from the order
  const handleRemoveTicket = (ticketTypeId) => {
    if (!editableOrder) return;
    
    // Find the ticket in the order
    const ticketIndex = editableOrder.tickets.findIndex(t => t.ticket_type_id === ticketTypeId);
    
    if (ticketIndex >= 0) {
      const updatedTickets = [...editableOrder.tickets];
      
      if (updatedTickets[ticketIndex].quantity > 1) {
        // Decrement quantity
        updatedTickets[ticketIndex] = {
          ...updatedTickets[ticketIndex],
          quantity: updatedTickets[ticketIndex].quantity - 1
        };
      } else {
        // Remove the ticket type completely
        updatedTickets.splice(ticketIndex, 1);
      }
      
      // Calculate updated totals using the updatedTickets array
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
      
      // Calculate gross total and discount
      const grossTotal = parseFloat((ticketTotal + mealTotal).toFixed(2));
      const discountAmount = (editableOrder.payments || [])
        .filter(payment => payment.method === 'discount')
        .reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0);
      const totalAmount = parseFloat((grossTotal - discountAmount).toFixed(2));
      
      // Update payments
      let updatedPayments = [...editableOrder.payments];
      const nonDiscountPayments = updatedPayments.filter(p => p.method !== 'discount');
      
      if (nonDiscountPayments.length === 1) {
        // If there's just one non-discount payment, adjust it to match the total
        const nonDiscountIndex = updatedPayments.findIndex(p => p.method !== 'discount');
        updatedPayments[nonDiscountIndex].amount = totalAmount;
      } else if (nonDiscountPayments.length > 1) {
        // If multiple non-discount payments, adjust them proportionally
        // Same logic as in recalculateOrderTotal
        const currentNonDiscountTotal = nonDiscountPayments.reduce(
          (sum, p) => sum + (parseFloat(p.amount) || 0), 0
        );
        
        if (currentNonDiscountTotal > 0) {
          // Apply scaling factor
          const scaleFactor = totalAmount / currentNonDiscountTotal;
          let adjustedTotal = 0;
          const nonDiscountIndices = updatedPayments
            .map((p, i) => p.method !== 'discount' ? i : -1)
            .filter(i => i !== -1);
          
          for (let i = 0; i < nonDiscountIndices.length - 1; i++) {
            const index = nonDiscountIndices[i];
            const scaledAmount = parseFloat((updatedPayments[index].amount * scaleFactor).toFixed(2));
            updatedPayments[index].amount = scaledAmount;
            adjustedTotal += scaledAmount;
          }
          
          // Last payment covers remainder
          const lastIndex = nonDiscountIndices[nonDiscountIndices.length - 1];
          updatedPayments[lastIndex].amount = parseFloat((totalAmount - adjustedTotal).toFixed(2));
        }
      }
      
      // Update all state in one operation
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
    
    console.log('Adding meal:', meal); // Debug log
    
    // Check if this meal is already in the order
    const existingMealIndex = editableOrder.meals.findIndex(
      m => m.meal_id === meal.id || m.meal_id === meal.meal_id
    );
    
    let updatedMeals = [...editableOrder.meals];
    
    if (existingMealIndex >= 0) {
      // Increment quantity of existing meal
      updatedMeals[existingMealIndex] = {
        ...updatedMeals[existingMealIndex],
        quantity: (updatedMeals[existingMealIndex].quantity || 1) + 1
      };
    } else {
      // Add new meal
      const newMeal = {
        meal_id: meal.id || meal.meal_id,
        name: meal.name,
        quantity: 1,
        price_at_order: meal.price
      };
      
      console.log('New meal being added:', newMeal);
      updatedMeals = [...updatedMeals, newMeal];
    }
    
    // Create newAddedMeal for tracking changes
    const newAddedMeal = {
      meal_id: meal.id || meal.meal_id,
      quantity: 1,
      price: meal.price
    };
    
    // Calculate totals immediately
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
    
    // Calculate gross total and discount
    const grossTotal = parseFloat((ticketTotal + mealTotal).toFixed(2));
    const discountAmount = (editableOrder.payments || [])
      .filter(payment => payment.method === 'discount')
      .reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0);
    const totalAmount = parseFloat((grossTotal - discountAmount).toFixed(2));
    
    // Update payments to maintain balance
    let updatedPayments = [...editableOrder.payments];
    const nonDiscountPayments = updatedPayments.filter(p => p.method !== 'discount');
    
    if (nonDiscountPayments.length === 1) {
      // If there's just one non-discount payment, adjust it to match the total
      const nonDiscountIndex = updatedPayments.findIndex(p => p.method !== 'discount');
      updatedPayments[nonDiscountIndex].amount = totalAmount;
    } else if (nonDiscountPayments.length > 1) {
      // If multiple non-discount payments, adjust them proportionally (same logic as in recalculateOrderTotal)
      const currentNonDiscountTotal = nonDiscountPayments.reduce(
        (sum, p) => sum + (parseFloat(p.amount) || 0), 0
      );
      
      if (currentNonDiscountTotal > 0) {
        // Apply scaling factor
        const scaleFactor = totalAmount / currentNonDiscountTotal;
        let adjustedTotal = 0;
        const nonDiscountIndices = updatedPayments
          .map((p, i) => p.method !== 'discount' ? i : -1)
          .filter(i => i !== -1);
        
        for (let i = 0; i < nonDiscountIndices.length - 1; i++) {
          const index = nonDiscountIndices[i];
          const scaledAmount = parseFloat((updatedPayments[index].amount * scaleFactor).toFixed(2));
          updatedPayments[index].amount = scaledAmount;
          adjustedTotal += scaledAmount;
        }
        
        // Last payment covers remainder
        const lastIndex = nonDiscountIndices[nonDiscountIndices.length - 1];
        updatedPayments[lastIndex].amount = parseFloat((totalAmount - adjustedTotal).toFixed(2));
      }
    }
    
    // Update everything in one state change
    setEditableOrder(prevState => ({
      ...prevState,
      meals: updatedMeals,
      gross_total: grossTotal,
      total_amount: totalAmount,
      payments: updatedPayments,
      addedMeals: [...(prevState.addedMeals || []), newAddedMeal]
    }));
    
    console.log(`Updated order: Gross=${grossTotal.toFixed(2)}, Net=${totalAmount.toFixed(2)}, Meals=${updatedMeals.length}`);
  };
  
  // Handle removing a meal from the order
  const handleRemoveMeal = (mealId) => {
    if (!editableOrder) return;
    
    // Find the meal in the order
    const mealIndex = editableOrder.meals.findIndex(m => m.meal_id === mealId);
    
    if (mealIndex >= 0) {
      const updatedMeals = [...editableOrder.meals];
      
      if (updatedMeals[mealIndex].quantity > 1) {
        // Decrement quantity
        updatedMeals[mealIndex] = {
          ...updatedMeals[mealIndex],
          quantity: updatedMeals[mealIndex].quantity - 1
        };
      } else {
        // Remove the meal completely
        updatedMeals.splice(mealIndex, 1);
      }
      
      setEditableOrder({
        ...editableOrder,
        meals: updatedMeals
      });
      
      // Add to removedMeals for tracking changes
      setEditableOrder(prevState => ({
        ...prevState,
        removedMeals: [...(prevState.removedMeals || []), { meal_id: mealId, quantity: 1 }]
      }));
      
      // Recalculate total after a short delay to ensure state is updated
      recalculateOrderTotal();
    }
  };

  // Add this helper function to format payment method names
  const formatPaymentMethod = (method) => {
    return method.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Update the recalculateOrderTotal function to ensure it properly updates state synchronously
  const recalculateOrderTotal = () => {
    if (!editableOrder) return;
    
    // Calculate ticket and meal totals with proper handling of potentially undefined values
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
    
    // Calculate gross total with proper rounding
    const grossTotal = parseFloat((ticketTotal + mealTotal).toFixed(2));
    
    // Calculate discount amount
    const discountAmount = Array.isArray(editableOrder.payments)
      ? editableOrder.payments
          .filter(payment => payment.method === 'discount')
          .reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0)
      : 0;
    
    // Calculate final total
    const totalAmount = parseFloat((grossTotal - discountAmount).toFixed(2));
    
    // Update payments to maintain balance
    let updatedPayments = [...editableOrder.payments];
    
    // Check how many non-discount payments we have
    const nonDiscountPayments = updatedPayments.filter(p => p.method !== 'discount');
    
    if (nonDiscountPayments.length === 1) {
      // If there's just one non-discount payment, adjust it to match the total
      const nonDiscountIndex = updatedPayments.findIndex(p => p.method !== 'discount');
      updatedPayments[nonDiscountIndex].amount = totalAmount;
    } else if (nonDiscountPayments.length > 1) {
      // If there are multiple non-discount payments, scale them proportionally
      const currentNonDiscountTotal = nonDiscountPayments.reduce(
        (sum, p) => sum + (parseFloat(p.amount) || 0), 0
      );
      
      if (currentNonDiscountTotal > 0) {
        // Calculate a scaling factor
        const scaleFactor = totalAmount / currentNonDiscountTotal;
        
        // Apply scaling factor to all non-discount payments
        let adjustedTotal = 0;
        const nonDiscountIndices = updatedPayments
          .map((p, i) => p.method !== 'discount' ? i : -1)
          .filter(i => i !== -1);
        
        // Scale all payments except the last one
        for (let i = 0; i < nonDiscountIndices.length - 1; i++) {
          const index = nonDiscountIndices[i];
          const scaledAmount = parseFloat((updatedPayments[index].amount * scaleFactor).toFixed(2));
          updatedPayments[index].amount = scaledAmount;
          adjustedTotal += scaledAmount;
        }
        
        // Make the last payment cover the remainder
        const lastIndex = nonDiscountIndices[nonDiscountIndices.length - 1];
        updatedPayments[lastIndex].amount = parseFloat((totalAmount - adjustedTotal).toFixed(2));
      } else {
        // If all current non-discount payments are zero, distribute evenly
        const perPayment = parseFloat((totalAmount / nonDiscountPayments.length).toFixed(2));
        let remaining = totalAmount;
        
        for (let i = 0; i < nonDiscountPayments.length; i++) {
          const paymentIndex = updatedPayments.indexOf(nonDiscountPayments[i]);
          
          if (i === nonDiscountPayments.length - 1) {
            // Last payment gets the remainder
            updatedPayments[paymentIndex].amount = remaining;
          } else {
            updatedPayments[paymentIndex].amount = perPayment;
            remaining -= perPayment;
          }
        }
      }
    } else if (nonDiscountPayments.length === 0 && totalAmount > 0) {
      // If there are no non-discount payments, add a cash payment
      updatedPayments.push({
        method: 'cash',
        amount: totalAmount
      });
    }
    
    // Update state with the new calculated values
    setEditableOrder(prevState => ({
      ...prevState,
      gross_total: grossTotal,
      total_amount: totalAmount,
      payments: updatedPayments
    }));
    
    console.log(`Recalculated: Gross=${grossTotal.toFixed(2)}, Net=${totalAmount.toFixed(2)}, Discount=${discountAmount.toFixed(2)}`);
  };
  
  // Update the validatePaymentTotal to show warning toast for invalid payments
  const validatePaymentTotal = () => {
    if (!editableOrder || !editableOrder.payments) return false;
    
    // Calculate non-discount payments total
    const nonDiscountPayments = editableOrder.payments
      .filter(payment => payment.method !== 'discount')
      .reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0);
    
    // Calculate discount amount
    const discountAmount = editableOrder.payments
      .filter(payment => payment.method === 'discount')
      .reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0);
    
    // Use editableOrder.gross_total which is now reliably calculated
    const grossTotal = parseFloat(editableOrder.gross_total || 0);
    
    // Calculate net total (after discounts)
    const netTotal = parseFloat((grossTotal - discountAmount).toFixed(2));
    
    // Compare with slightly higher tolerance (0.05) for floating point errors
    const difference = Math.abs(netTotal - nonDiscountPayments);
    const isValid = difference < 0.05; // Increased tolerance slightly
    
    console.log(`Payment validation: Gross=${grossTotal.toFixed(2)}, Discount=${discountAmount.toFixed(2)}, Net=${netTotal.toFixed(2)}, 
                 Non-discount payments=${nonDiscountPayments.toFixed(2)}, Difference=${difference.toFixed(2)}, Valid=${isValid}`);
    
    return isValid;
  };

  // Add this function to remove payment methods
  const handleRemovePayment = (index) => {
    if (!editableOrder || editableOrder.payments.length <= 1) return;
    
    const updatedPayments = [...editableOrder.payments];
    const removedPayment = updatedPayments[index];
    
    // Remove the payment
    updatedPayments.splice(index, 1);
    
    setEditableOrder({
      ...editableOrder,
      payments: updatedPayments
    });
    
    // If we removed a discount payment, recalculate the order total
    if (removedPayment.method === 'discount') {
      setTimeout(() => recalculateOrderTotal(), 50);
    }
  };

  // Update handlePaymentMethodChange to not call autoDistributeRemainingAmount
  const handlePaymentMethodChange = (index, method) => {
    if (!editableOrder) return;
    
    const oldMethod = editableOrder.payments[index].method;
    const wasDiscount = oldMethod === 'discount';
    const isDiscount = method === 'discount';
    const updatedPayments = [...editableOrder.payments];
    
    // Update the payment method
    updatedPayments[index] = { 
      ...updatedPayments[index], 
      method 
    };
    
    setEditableOrder({
      ...editableOrder,
      payments: updatedPayments
    });
    
    // If changing to/from discount, recalculate order total
    if (wasDiscount !== isDiscount) {
      setTimeout(() => {
        recalculateOrderTotal();
      }, 50);
    }
  };

  // Update handlePaymentAmountChange to allow manual discount amount changes
  const handlePaymentAmountChange = (index, amount) => {
    if (!editableOrder) return;
    
    const parsedAmount = parseFloat(amount) || 0;
    const updatedPayments = [...editableOrder.payments];
    const isDiscountPayment = updatedPayments[index].method === 'discount';
    
    // Update the payment amount
    updatedPayments[index] = { ...updatedPayments[index], amount: parsedAmount };
    
    // Calculate current values
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
    
    // Calculate total discount (may have multiple discount payments)
    const discountAmount = updatedPayments
      .filter(payment => payment.method === 'discount')
      .reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0);
    
    // Calculate net amount after discount
    const totalAmount = parseFloat((grossTotal - discountAmount).toFixed(2));
    
    // Only update the edited payment without auto-adjusting others
    // (This is the key change - we're not auto-adjusting other payments)
    setEditableOrder(prevState => ({
      ...prevState,
      payments: updatedPayments,
      gross_total: grossTotal,
      total_amount: totalAmount
    }));
  };

  // Handle adding a new payment method
  const handleAddPayment = () => {
    if (!editableOrder) return;
    
    const grossTotal = parseFloat(editableOrder.gross_total || 0);
    const currentTotal = editableOrder.payments.reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0);
    
    // Calculate how much is left to allocate
    const discountAmount = editableOrder.payments
      .filter(payment => payment.method === 'discount')
      .reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0);
    
    const netTotal = grossTotal - discountAmount;
    const nonDiscountTotal = editableOrder.payments
      .filter(payment => payment.method !== 'discount')
      .reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0);
    
    // Default amount is what remains to be paid
    const newPaymentAmount = Math.max(0, netTotal - nonDiscountTotal);
    
    const updatedPayments = [
      ...editableOrder.payments,
      { method: 'cash', amount: newPaymentAmount }
    ];
    
    setEditableOrder({
      ...editableOrder,
      payments: updatedPayments
    });
  };

  // Save order changes
  const saveOrderChanges = async () => {
    if (!baseUrl) {
      notify.error('API configuration not available');
      return;
    }

    try {
      if (!editableOrder || !selectedOrder) return;
      
      // Force recalculation to ensure everything is in sync
      recalculateOrderTotal();
      
      // Validate payment total matches order total
      if (!validatePaymentTotal()) {
        notify.error('Payment total must match order total - please adjust payment amounts');
        return;
      }
      
      setLoading(true);
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        notify.error('Authentication required. Please log in again.');
        setLoading(false);
        return;
      }
      
      // Format payload with careful number parsing
      const payments = editableOrder.payments.map(payment => ({
        method: payment.method,
        amount: Number(parseFloat(payment.amount).toFixed(2))
      }));
      
      // Sanitize arrays before sending
      const addedTickets = Array.isArray(editableOrder.addedTickets) 
        ? editableOrder.addedTickets.map(ticket => ({
            ...ticket,
            quantity: Number(ticket.quantity)
          }))
        : [];
        
      const removedTickets = Array.isArray(editableOrder.removedTickets)
        ? editableOrder.removedTickets.map(ticket => ({
            ...ticket,
            quantity: Number(ticket.quantity)
          }))
        : [];
        
      const addedMeals = Array.isArray(editableOrder.addedMeals)
        ? editableOrder.addedMeals.map(meal => ({
            ...meal,
            quantity: Number(meal.quantity),
            price: Number(parseFloat(meal.price).toFixed(2))
          }))
        : [];
        
      const removedMeals = Array.isArray(editableOrder.removedMeals)
        ? editableOrder.removedMeals.map(meal => ({
            ...meal,
            quantity: Number(meal.quantity)
          }))
        : [];
    
      // Build the update payload
      const updatePayload = {
        order_id: selectedOrder.order_id,
        addedTickets,
        removedTickets,
        addedMeals,
        removedMeals,
        payments
      };
      
      console.log('Sending update payload:', updatePayload);
      
      // Send the update request
      const response = await axios.put(
        `${baseUrl}/api/orders/update`,
        updatePayload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      console.log('Update response:', response.data);
      
      // Close dialog and show success message
      handleCloseEditDialog();
      notify.success('Order updated successfully');
      
      // Refresh orders list
      fetchOrders();
    } catch (error) {
      console.error('Error updating order:', error.response?.data || error);
      notify.error(error.response?.data?.message || 'Failed to update order');
    } finally {
      setLoading(false);
    }
  };

  // Apply filters to orders
  const applyFilters = () => {
    // Implementation depends on your filtering requirements
    // This is a placeholder for the filtering logic
    console.log('Applying filters:', filterOptions);
    setFilterMenuOpen(false);
  };

  // Filter orders based on search term and other filters
  const filteredOrders = orders.filter(order => {
    // Filter by search term
    const searchMatch = 
      order.order_id?.toString().includes(searchTerm) ||
      order.user_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Add more filter conditions as needed
    return searchMatch;
  });

  // Format currency for display
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Handle tab change in edit dialog
  const handleEditTabChange = (event, newValue) => {
    setEditTab(newValue);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box>
        {/* Header and Controls */}
        <Box sx={{ 
          mb: 3, 
          display: 'flex', 
          justifyContent: 'space-between',
          flexDirection: { xs: 'column', md: 'row' },
          gap: 2
        }}>
          {/* Search bar */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <TextField
              placeholder="Search orders..."
              variant="outlined"
              size="small"
              value={searchTerm}
              onChange={handleSearchChange}
              sx={{ width: { xs: '100%', md: 300 } }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          {/* Date range selector */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <DatePicker
                label="From Date"
                value={fromDate}
                onChange={handleFromDateChange}
                slotProps={{ textField: { size: 'small' } }}
                sx={{ width: 150 }}
              />
              <Typography sx={{ mx: 1 }}>-</Typography>
              <DatePicker
                label="To Date"
                value={toDate}
                onChange={handleToDateChange}
                slotProps={{ textField: { size: 'small' } }}
                sx={{ width: 150 }}
              />
            </Box>
            
            <Button
              variant="outlined"
              onClick={fetchOrders}
              startIcon={<RefreshIcon />}
            >
              Refresh
            </Button>
          </Box>
        </Box>

        {/* Quick date range buttons */}
        <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
          <Button 
            variant={dateRange === 'today' ? 'contained' : 'outlined'}
            size="small"
            onClick={() => handleDateRangeChange('today')}
          >
            Today
          </Button>
          <Button 
            variant={dateRange === 'yesterday' ? 'contained' : 'outlined'}
            size="small"
            onClick={() => handleDateRangeChange('yesterday')}
          >
            Yesterday
          </Button>
          <Button 
            variant={dateRange === 'week' ? 'contained' : 'outlined'}
            size="small"
            onClick={() => handleDateRangeChange('week')}
          >
            Last 7 Days
          </Button>
          <Button 
            variant={dateRange === 'month' ? 'contained' : 'outlined'}
            size="small"
            onClick={() => handleDateRangeChange('month')}
          >
            Last 30 Days
          </Button>
          <Button 
            variant={dateRange === 'quarter' ? 'contained' : 'outlined'}
            size="small"
            onClick={() => handleDateRangeChange('quarter')}
          >
            Last 90 Days
          </Button>
        </Box>

        {/* Orders Table */}
        <Paper sx={{ width: '100%', overflow: 'hidden', borderRadius: 2 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="error">{error}</Typography>
              <Button
                variant="outlined"
                onClick={fetchOrders}
                sx={{ mt: 2 }}
              >
                Retry
              </Button>
            </Box>
          ) : filteredOrders.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography>No orders found for the selected period</Typography>
            </Box>
          ) : (
            <>
              <TableContainer sx={{ maxHeight: 'calc(100vh - 300px)' }}>
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>Order ID</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Date & Time</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Cashier</TableCell> {/* Changed from Customer to Cashier */}
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
                        
                        // Calculate item counts
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
                                <Typography>{order.user_name || 'Unknown'}</Typography> {/* Changed text from Anonymous to Unknown */}
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
                                  color={
                                    payment.method === 'cash' ? 'success' :
                                    payment.method === 'visa' ? 'primary' :
                                    payment.method === 'vodafone_cash' ? 'info' :
                                    payment.method === 'discount' ? 'error' :
                                    'default'  // For postponed
                                  }
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
                              <IconButton
                                color="primary"
                                onClick={() => handleOpenEditDialog(order)}
                              >
                                <EditIcon />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                rowsPerPageOptions={[10, 25, 50]}
                component="div"
                count={filteredOrders.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
              />
            </>
          )}
        </Paper>

        {/* Edit Order Dialog */}
        <Dialog 
          open={editDialogOpen} 
          onClose={handleCloseEditDialog}
          fullWidth
          maxWidth="md"
        >
          <DialogTitle sx={{ pb: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">Edit Order #{selectedOrder?.order_id}</Typography>
              <Chip 
                label={formatCurrency(editableOrder?.total_amount || 0)}
                color="primary"
                size="medium"
              />
            </Box>
          </DialogTitle>
          
          <Box sx={{ px: 3, pb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {selectedOrder ? `Created on ${new Date(selectedOrder.created_at).toLocaleString()} by ${selectedOrder.user_name}` : ''}
            </Typography>
          </Box>

          <Tabs value={editTab} onChange={handleEditTabChange} sx={{ px: 3, borderBottom: 1, borderColor: 'divider' }}>
            <Tab icon={<LocalActivityIcon />} iconPosition="start" label="Tickets" />
            <Tab icon={<RestaurantIcon />} iconPosition="start" label="Meals" />
            <Tab icon={<PaymentIcon />} iconPosition="start" label="Payment" />
          </Tabs>
          
          <DialogContent dividers>
            {editableOrder && (
              <>
                {/* Tickets Tab */}
                {editTab === 0 && (
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="h6" gutterBottom>Current Tickets</Typography>
                      
                      {(!editableOrder.tickets || editableOrder.tickets.length === 0) ? (
                        <Typography color="text.secondary">No tickets in this order</Typography>
                      ) : (
                        <List>
                          {editableOrder.tickets.map((ticket, index) => (
                            <ListItem key={index} divider={index < (editableOrder.tickets.length - 1)}>
                              <ListItemText 
                                primary={`${ticket.category} - ${ticket.subcategory}`}
                                secondary={`${ticket.quantity} x ${formatCurrency(ticket.sold_price)}`}
                              />
                              <ListItemSecondaryAction>
                                <IconButton 
                                  edge="end" 
                                  color="error"
                                  onClick={() => handleRemoveTicket(ticket.ticket_type_id)}
                                >
                                  <RemoveIcon />
                                </IconButton>
                              </ListItemSecondaryAction>
                            </ListItem>
                          ))}
                        </List>
                      )}
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <Typography variant="h6" gutterBottom>Add Tickets</Typography>
                      
                      {(!availableTicketTypes || availableTicketTypes.length === 0) ? (
                        <Typography color="text.secondary">No ticket types available</Typography>
                      ) : (
                        <List sx={{ maxHeight: 300, overflow: 'auto' }}>
                          {availableTicketTypes.map((ticketType) => (
                            <ListItem key={ticketType.id} divider>
                              <ListItemText 
                                primary={`${ticketType.category} - ${ticketType.subcategory}`}
                                secondary={formatCurrency(ticketType.price)}
                              />
                              <ListItemSecondaryAction>
                                <IconButton 
                                  edge="end" 
                                  color="primary"
                                  onClick={() => handleAddTicket(ticketType)}
                                >
                                  <AddIcon />
                                </IconButton>
                              </ListItemSecondaryAction>
                            </ListItem>
                          ))}
                        </List>
                      )}
                    </Grid>
                  </Grid>
                )}
                
                {/* Meals Tab */}
                {editTab === 1 && (
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="h6" gutterBottom>Current Meals</Typography>
                      
                      {(!editableOrder.meals || editableOrder.meals.length === 0) ? (
                        <Typography color="text.secondary">No meals in this order</Typography>
                      ) : (
                        <List>
                          {editableOrder.meals.map((meal, index) => (
                            <ListItem key={index} divider={index < (editableOrder.meals.length - 1)}>
                              <ListItemText 
                                primary={meal.name}
                                secondary={`${meal.quantity} x ${formatCurrency(meal.price_at_order)}`}
                              />
                              <ListItemSecondaryAction>
                                <IconButton 
                                  edge="end" 
                                  color="error"
                                  onClick={() => handleRemoveMeal(meal.meal_id)}
                                >
                                  <RemoveIcon />
                                </IconButton>
                              </ListItemSecondaryAction>
                            </ListItem>
                          ))}
                        </List>
                      )}
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <Typography variant="h6" gutterBottom>Add Meals</Typography>
                      
                      {(!availableMeals || availableMeals.length === 0) ? (
                        <Typography color="text.secondary">No meals available</Typography>
                      ) : (
                        <List sx={{ maxHeight: 300, overflow: 'auto' }}>
                          {availableMeals.map((meal) => (
                            <ListItem key={meal.id} divider>
                              <ListItemText 
                                primary={meal.name}
                                secondary={formatCurrency(meal.price)}
                              />
                              <ListItemSecondaryAction>
                                <IconButton 
                                  edge="end" 
                                  color="primary"
                                  onClick={() => handleAddMeal(meal)}
                                >
                                  <AddIcon />
                                </IconButton>
                              </ListItemSecondaryAction>
                            </ListItem>
                          ))}
                        </List>
                      )}
                    </Grid>
                  </Grid>
                )}
                
                {/* Payments Tab */}
                {editTab === 2 && (
                  <Box>
                    {/* Order Summary Section */}
                    <Box sx={{ 
                      p: 2, 
                      mb: 3, 
                      border: '1px solid #e0e0e0',
                      borderRadius: 1,
                      bgcolor: '#f9f9f9'
                    }}>
                      <Typography variant="h6" gutterBottom>Order Summary</Typography>
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography>Gross Total:</Typography>
                        <Typography fontWeight="medium">{formatCurrency(editableOrder.gross_total || 0)}</Typography>
                      </Box>
                      
                      {/* Show discount info */}
                      {editableOrder.payments && editableOrder.payments.some(p => p.method === 'discount') && (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography color="error">Discount:</Typography>
                          <Typography color="error" fontWeight="medium">
                            -{formatCurrency(editableOrder.payments
                              .filter(p => p.method === 'discount')
                              .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)
                            )}
                          </Typography>
                        </Box>
                      )}
                      
                      <Divider sx={{ my: 1 }} />
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1 }}>
                        <Typography fontWeight="bold">Net Total:</Typography>
                        <Typography fontWeight="bold">{formatCurrency(editableOrder.total_amount)}</Typography>
                      </Box>
                    </Box>
                    
                    <Typography variant="h6" gutterBottom>Payment Methods</Typography>
                    
                    {(!editableOrder.payments || editableOrder.payments.length === 0) ? (
                      <Typography color="text.secondary">No payment methods defined</Typography>
                    ) : (
                      <Grid container spacing={2}>
                        {editableOrder.payments.map((payment, index) => (
                          <Grid item xs={12} key={index}>
                            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                              <FormControl sx={{ width: '50%' }}>
                                <InputLabel>Payment Method</InputLabel>
                                <Select
                                  value={payment.method}
                                  onChange={(e) => handlePaymentMethodChange(index, e.target.value)}
                                  label="Payment Method"
                                  size="small"
                                >
                                  <MenuItem value="cash">Cash</MenuItem>
                                  <MenuItem value="visa">Visa</MenuItem>
                                  <MenuItem value="vodafone_cash">{formatPaymentMethod('vodafone_cash')}</MenuItem>
                                  <MenuItem value="discount" sx={{ color: 'error.main' }}>Discount</MenuItem>
                                  <MenuItem value="postponed">Postponed</MenuItem>
                                </Select>
                              </FormControl>
                              
                              <TextField
                                label="Amount"
                                type="number"
                                value={payment.amount}
                                onChange={(e) => handlePaymentAmountChange(index, e.target.value)}
                                InputProps={{
                                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                                }}
                                size="small"
                                sx={{ width: '40%' }}
                              />
                              
                              <IconButton
                                color="error"
                                onClick={() => handleRemovePayment(index)}
                                disabled={editableOrder.payments.length <= 1}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Box>
                          </Grid>
                        ))}
                      </Grid>
                    )}
                    
                    {/* Payment validation message */}
                    {!validatePaymentTotal() && (
                      <Box sx={{ mt: 2, p: 1, bgcolor: '#fff4e5', borderRadius: 1 }}>
                        <Typography color="error">
                          Payment total must match order total of {formatCurrency(editableOrder.total_amount)}
                        </Typography>
                      </Box>
                    )}
                    
                    {/* Add payment button */}
                    <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                      <Button
                        startIcon={<AddIcon />}
                        onClick={handleAddPayment}
                      >
                        Add Payment Method
                      </Button>
                    </Box>
                  </Box>
                )}
              </>
            )}
          </DialogContent>
          
          <DialogActions>
            <Button onClick={handleCloseEditDialog}>Cancel</Button>
            <Button 
              onClick={saveOrderChanges} 
              variant="contained"
              startIcon={<SaveIcon />}
              disabled={!validatePaymentTotal()}
            >
              Save Changes
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default OrdersManagement;
