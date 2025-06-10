import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Avatar,
  Chip,
  IconButton,
  Collapse,
  Grid,
  Paper,
  CircularProgress,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from "@mui/material";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import FilterListIcon from '@mui/icons-material/FilterList';
import axios from "axios";
import { notify } from '../utils/toast';
import { saveAs } from "file-saver";

const CategorySalesReport = ({ 
  selectedDate, 
  fromDate, 
  toDate, 
  useRange, 
  formatApiDate, 
  loading, 
  setLoading, 
  error, 
  setError,
  categorySalesData,
  setCategorySalesData
}) => {
  const [expandedCategories, setExpandedCategories] = useState({});
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  const baseUrl = window.runtimeConfig?.apiBaseUrl;

  const toggleCategoryExpansion = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  // Create formatDisplayDate function locally
  const formatDisplayDate = (date) => {
    if (!date) return '';
    return date.format ? date.format('YYYY-MM-DD') : date.toISOString().split('T')[0];
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
    return methodMappings[normalizedMethod] || method || 'غير محدد';
  };

  const exportCategorySalesCSV = () => {
    if (!categorySalesData || !categorySalesData.categories) {
      notify.warning("No category sales data to export");
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
      ? `Category Sales Report from ${formatDisplayDate(fromDate)} to ${formatDisplayDate(toDate)}\r\n\r\n`
      : `Category Sales Report for ${formatDisplayDate(selectedDate)}\r\n\r\n`;

    // Summary section
    csvContent += `SUMMARY\r\n`;
    csvContent += `Total Categories,${categorySalesData.summary.categories_count}\r\n`;
    csvContent += `Total Tickets Sold,${categorySalesData.summary.total_tickets_sold}\r\n`;
    csvContent += `Total Revenue (EGP),${categorySalesData.summary.total_revenue.toFixed(2)}\r\n`;
    if (categorySalesData.summary.total_payments_verification) {
      csvContent += `Total Payments Verification (EGP),${categorySalesData.summary.total_payments_verification.toFixed(2)}\r\n`;
    }
    csvContent += `\r\n`;

    // Category details header
    csvContent += `CATEGORY BREAKDOWN\r\n`;
    csvContent += `Category Name,Tickets Sold,Revenue (EGP),Linked Categories\r\n`;

    // Process each category
    categorySalesData.categories.forEach(category => {
      // FIX: Handle multiple linked categories by separating them with semicolons instead of commas
      const linkedCategoriesText = category.linked_categories && category.linked_categories.length > 0
        ? category.linked_categories.map(linkedCat => linkedCat.category_name).join('; ') // Use semicolon separator
        : 'None';

      csvContent += `${escapeCSV(category.category_name)},${category.tickets_sold},${category.total_revenue.toFixed(2)},${escapeCSV(linkedCategoriesText)}\r\n`;
    });

    // Subcategory breakdown if available
    if (categorySalesData.categories.some(cat => cat.subcategories && cat.subcategories.length > 0)) {
      csvContent += `\r\nSUBCATEGORY BREAKDOWN\r\n`;
      csvContent += `Category,Subcategory,Tickets Sold,Revenue (EGP)\r\n`;

      categorySalesData.categories.forEach(category => {
        if (category.subcategories && category.subcategories.length > 0) {
          category.subcategories.forEach(sub => {
            csvContent += `${escapeCSV(category.category_name)},${escapeCSV(sub.subcategory)},${sub.tickets_sold},${sub.total_revenue.toFixed(2)}\r\n`;
          });
        }
      });
    }

    // Credit account breakdown if available
    if (categorySalesData.categories.some(cat => cat.credit_accounts && cat.credit_accounts.length > 0)) {
      csvContent += `\r\nCREDIT ACCOUNT USAGE BREAKDOWN\r\n`;
      csvContent += `Category,Credit Account Name,Tickets Purchased,Credit Used (EGP)\r\n`;

      categorySalesData.categories.forEach(category => {
        if (category.credit_accounts && category.credit_accounts.length > 0) {
          category.credit_accounts.forEach(account => {
            csvContent += `${escapeCSV(category.category_name)},${escapeCSV(account.account_name)},${account.tickets_purchased},${account.credit_used.toFixed(2)}\r\n`;
          });
        }
      });
    }

    const filename = useRange
      ? `Category_Sales_${formatApiDate(fromDate)}_to_${formatApiDate(toDate)}.csv`
      : `Category_Sales_${formatApiDate(selectedDate)}.csv`;

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, filename);
    notify.success("Category Sales CSV exported successfully!");
  };

  const fetchCategorySalesReport = async (shouldFetch = true) => {
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
      const params = new URLSearchParams();
      if (useRange) {
        params.append('startDate', formatApiDate(fromDate));
        params.append('endDate', formatApiDate(toDate));
      } else {
        params.append('startDate', formatApiDate(selectedDate));
        params.append('endDate', formatApiDate(selectedDate));
      }
      params.append('groupBy', 'subcategory');
      
      const url = `${baseUrl}/api/orders/reports/category-sales?${params}`;
      const { data } = await axios.get(url);
      
      setCategorySalesData(data);
      notify.success("Category sales report loaded successfully");
    } catch (error) {
      console.error("Error fetching category sales report:", error);
      const errorMessage = error.response?.data?.details || 
                          error.response?.data?.error || 
                          "Failed to fetch category sales report. Please try again.";
      setError(errorMessage);
      notify.error(errorMessage);
      setCategorySalesData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    
    const timer = setTimeout(() => {
      if (isMounted && !categorySalesData) {
        fetchCategorySalesReport();
      }
    }, 1000);
    
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [selectedDate, fromDate, toDate, useRange]);

  // Get unique categories for filter
  const availableCategories = categorySalesData ? 
    [...new Set(categorySalesData.categories.map(item => item.category))] : [];

  // Filter data based on selected category
  const filteredCategoriesData = categorySalesData && selectedCategoryFilter !== 'all' 
    ? categorySalesData.categories.filter(item => item.category === selectedCategoryFilter)
    : categorySalesData?.categories || [];

  const getPaymentMethodColor = (method) => {
    const colors = {
      'cash': '#4CAF50',
      'visa': '#2196F3', 
      'credit': '#FF9800',
      'vodafone_cash': '#E91E63',
      'الاهلي و مصر': '#9C27B0',
      'postponed': '#FF5722',
      'discount': '#795548',
      'OTHER': '#607D8B'
    };
    return colors[method] || '#757575';
  };

  const CategorySalesCard = ({ category, data }) => {
    // Calculate category total EXCLUDING discounts from revenue
    const categoryTotal = data.reduce((sum, item) => sum + parseFloat(item.category_revenue), 0);
    const categoryTickets = data.reduce((sum, item) => sum + parseInt(item.tickets_sold), 0);
    const isExpanded = expandedCategories[category];

    // Aggregate payment methods for the ENTIRE category
    const categoryPayments = {};
    let totalNonDiscountPayments = 0; // For percentage calculation base
    
    data.forEach(item => {
      if (item.payment_summary) {
        Object.entries(item.payment_summary).forEach(([method, amount]) => {
          if (method && method !== 'null') {
            const mappedMethod = mapPaymentMethod(method);
            const paymentAmount = parseFloat(amount || 0);
            categoryPayments[mappedMethod] = (categoryPayments[mappedMethod] || 0) + paymentAmount;
            
            // Only count non-discount payments for percentage calculation
            if (mappedMethod !== 'خصم' && mappedMethod !== 'discount') {
              totalNonDiscountPayments += paymentAmount;
            }
          }
        });
      }
    });

    return (
      <Card sx={{ 
        mb: 2, 
        background: 'linear-gradient(135deg, #E0F7FF 0%, #ffffff 50%)',
        border: '2px solid #00AEEF',
        borderRadius: 3,
        overflow: 'hidden',
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 8px 25px rgba(0, 174, 239, 0.15)'
        }
      }}>
        <CardContent sx={{ p: 2 }}>
          <Box 
            display="flex" 
            justifyContent="space-between" 
            alignItems="center" 
            sx={{ cursor: 'pointer' }}
            onClick={() => toggleCategoryExpansion(category)}
          >
            <Box display="flex" alignItems="center" gap={1.5}>
              <Avatar sx={{ 
                bgcolor: '#00AEEF', 
                width: 40, 
                height: 40,
                fontSize: '1.2rem'
              }}>
                🏷️
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ 
                  color: '#00AEEF', 
                  fontWeight: 700,
                  fontSize: '1.1rem'
                }}>
                  {category}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {categoryTickets} tickets • {data.length} subcategories • Avg: EGP {(categoryTotal/categoryTickets).toFixed(0)}/ticket
                </Typography>
                
                {/* Payment Methods Summary - Fixed percentage calculation */}
                <Box mt={1}>
                  <Typography variant="caption" display="block" color="textSecondary" fontWeight="600">
                    Category Payment Methods:
                  </Typography>
                  <Box display="flex" gap={0.5} mt={0.5} flexWrap="wrap">
                    {Object.entries(categoryPayments)
                      .sort(([,a], [,b]) => b - a)
                      .map(([method, amount]) => {
                        // FIXED: Calculate percentage properly
                        let percentage;
                        if (method === 'خصم' || method === 'discount') {
                          // For discounts, calculate as percentage of total revenue (what was actually charged)
                          percentage = categoryTotal > 0 ? ((amount / categoryTotal) * 100).toFixed(1) : '0.0';
                        } else {
                          // For payments, calculate as percentage of total non-discount payments
                          percentage = totalNonDiscountPayments > 0 ? ((amount / totalNonDiscountPayments) * 100).toFixed(1) : '0.0';
                        }
                        
                        return (
                          <Chip 
                            key={method}
                            label={`${method}: EGP ${parseFloat(amount).toFixed(0)} (${percentage}%)`}
                            size="small"
                            sx={{ 
                              bgcolor: getPaymentMethodColor(method),
                              color: 'white',
                              fontSize: '0.65rem',
                              height: '22px',
                              fontWeight: 600
                            }}
                          />
                        );
                      })}
                  </Box>
                </Box>
              </Box>
            </Box>
            
            <Box display="flex" alignItems="center" gap={2}>
              <Box textAlign="right">
                <Typography variant="h5" sx={{ 
                  color: '#00AEEF', 
                  fontWeight: 800,
                  lineHeight: 1
                }}>
                  EGP {categoryTotal.toFixed(2)}
                </Typography>
                <Chip 
                  label={`${categoryTickets} tickets`}
                  size="small"
                  sx={{ 
                    bgcolor: '#00AEEF20',
                    color: '#00AEEF',
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
          
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <Box mt={2}>
              {/* Category-level payment breakdown - Fixed percentage calculation */}
              <Paper sx={{ 
                p: 2, 
                mb: 2, 
                bgcolor: 'rgba(0, 174, 239, 0.05)', 
                borderRadius: 2,
                border: '1px solid #00AEEF30'
              }}>
                <Typography variant="subtitle2" fontWeight="600" color="#00AEEF" mb={1}>
                  💳 {category} Category Payment Breakdown
                </Typography>
                <Grid container spacing={1}>
                  {Object.entries(categoryPayments)
                    .sort(([,a], [,b]) => b - a)
                    .map(([method, amount]) => {
                      // FIXED: Calculate percentage properly for each payment method
                      let percentage;
                      if (method === 'خصم' || method === 'discount') {
                        // For discounts, show as percentage of revenue
                        percentage = categoryTotal > 0 ? ((amount / categoryTotal) * 100).toFixed(1) : '0.0';
                      } else {
                        // For payments, show as percentage of total payments (excluding discounts)
                        percentage = totalNonDiscountPayments > 0 ? ((amount / totalNonDiscountPayments) * 100).toFixed(1) : '0.0';
                      }
                      
                      return (
                        <Grid item xs={6} sm={4} md={3} key={method}>
                          <Box textAlign="center" p={1}>
                            <Typography variant="body2" fontWeight="600" color={getPaymentMethodColor(method)}>
                              {method}
                            </Typography>
                            <Typography variant="h6" color="text.primary">
                              EGP {amount.toFixed(0)}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {percentage}%
                            </Typography>
                          </Box>
                        </Grid>
                      );
                    })}
                </Grid>
              </Paper>

              {/* Subcategory details - NO individual payment methods shown */}
              <Typography variant="subtitle2" fontWeight="600" color="#00AEEF" mb={1}>
                📂 Subcategories Details
              </Typography>
              <Grid container spacing={1.5}>
                {data.map((item, index) => (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <Paper sx={{ 
                      p: 1.5, 
                      bgcolor: 'rgba(255,255,255,0.8)', 
                      borderRadius: 2,
                      border: '1px solid #00AEEF30',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        bgcolor: 'rgba(255,255,255,0.95)',
                        transform: 'scale(1.02)'
                      }
                    }}>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <Typography variant="subtitle2" fontWeight="600" color="#00AEEF">
                          {item.subcategory}
                        </Typography>
                        <Chip 
                          label={`${item.tickets_sold} tickets`}
                          size="small"
                          sx={{ 
                            bgcolor: '#00AEEF',
                            color: 'white',
                            fontSize: '0.65rem',
                            height: '20px'
                          }}
                        />
                      </Box>
                      
                      <Typography variant="h6" fontWeight="bold" color="text.primary">
                        EGP {parseFloat(item.category_revenue).toFixed(2)}
                      </Typography>
                      <Typography variant="caption" color="textSecondary" display="block">
                        Unit Price: EGP {parseFloat(item.unit_price).toFixed(2)} • {((parseFloat(item.category_revenue)/categoryTotal)*100).toFixed(1)}% of category
                      </Typography>
                      
                      <Box mt={1}>
                        <Typography variant="caption" display="block" color="textSecondary">
                          First Sale: {new Date(item.first_sale).toLocaleDateString()}
                        </Typography>
                        <Typography variant="caption" display="block" color="textSecondary">
                          Last Sale: {new Date(item.last_sale).toLocaleDateString()}
                        </Typography>
                        <Typography variant="caption" display="block" color="textSecondary">
                          Orders: {item.orders_count} • Avg: {(parseFloat(item.tickets_sold) / parseInt(item.orders_count)).toFixed(1)} tickets/order
                        </Typography>
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

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100%">
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (!categorySalesData || categorySalesData.categories.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100%" flexDirection="column">
        <Typography variant="h6" color="textSecondary" mb={1}>📊</Typography>
        <Typography variant="body1" color="textSecondary">
          No category sales data available for the selected period
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      {/* Filter and Export Controls */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} gap={2}>
        <Box display="flex" alignItems="center" gap={2}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Filter by Category</InputLabel>
            <Select
              value={selectedCategoryFilter}
              label="Filter by Category"
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              startAdornment={<FilterListIcon sx={{ mr: 1, color: '#00AEEF' }} />}
            >
              <MenuItem value="all">🏷️ All Categories</MenuItem>
              {availableCategories.map(category => (
                <MenuItem key={category} value={category}>
                  📂 {category}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          {selectedCategoryFilter !== 'all' && (
            <Chip 
              label={`Showing: ${selectedCategoryFilter}`}
              onDelete={() => setSelectedCategoryFilter('all')}
              color="primary"
              sx={{ bgcolor: '#00AEEF', color: 'white' }}
            />
          )}
        </Box>

        <Button
          variant="contained"
          onClick={exportCategorySalesCSV}
          startIcon={<TrendingUpIcon />}
          sx={{
            background: "linear-gradient(45deg, #00AEEF 30%, #007EA7 90%)",
            boxShadow: "0 3px 5px 2px rgba(0,174,239,.3)",
            '&:hover': {
              background: "linear-gradient(45deg, #007EA7 30%, #005577 90%)",
            }
          }}
        >
          📊 Export CSV
        </Button>
      </Box>

      {/* Display filtered categories */}
      {Object.entries(
        filteredCategoriesData.reduce((acc, item) => {
          if (!acc[item.category]) {
            acc[item.category] = [];
          }
          acc[item.category].push(item);
          return acc;
        }, {})
      ).map(([category, items]) => (
        <CategorySalesCard 
          key={category} 
          category={category} 
          data={items}
        />
      ))}
    </Box>
  );
};

export default CategorySalesReport;