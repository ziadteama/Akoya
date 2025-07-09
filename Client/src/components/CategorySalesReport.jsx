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
  MenuItem,
  useMediaQuery,
  useTheme,
  Stack,
  Divider
} from "@mui/material";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import FilterListIcon from '@mui/icons-material/FilterList';
import CloseIcon from '@mui/icons-material/Close';
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [expandedCategories, setExpandedCategories] = useState({});
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  
  // FIX: Use consistent baseUrl pattern
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

  // FIX: Update the fetchCategorySalesReport function
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
      // FIX: Add authentication token
      const token = localStorage.getItem('authToken');
      if (!token) {
        setError('Authentication required');
        notify.error('Please log in to access this report');
        return;
      }

      const params = new URLSearchParams();
      if (useRange) {
        params.append('startDate', formatApiDate(fromDate));
        params.append('endDate', formatApiDate(toDate));
      } else {
        params.append('startDate', formatApiDate(selectedDate));
        params.append('endDate', formatApiDate(selectedDate));
      }
      params.append('groupBy', 'subcategory');
      
      // FIX: Remove the extra 'http://' and add proper authentication
      const url = `${baseUrl}/api/orders/reports/category-sales?${params}`;
      const { data } = await axios.get(url, {
        headers: { 
          Authorization: `Bearer ${token}` 
        }
      });
      
      setCategorySalesData(data);
      notify.success("Category sales report loaded successfully");
    } catch (error) {
      console.error("Error fetching category sales report:", error);
      
      // FIX: Handle authentication errors
      if (error.response?.status === 401) {
        setError('Your session has expired. Please log in again.');
        localStorage.removeItem('authToken');
        notify.error('Session expired. Please log in again.');
      } else if (error.response?.status === 403) {
        setError('You do not have permission to access this report.');
        notify.error('Access denied. Admin privileges required.');
      } else {
        const errorMessage = error.response?.data?.details || 
                            error.response?.data?.error || 
                            "Failed to fetch category sales report. Please try again.";
        setError(errorMessage);
        notify.error(errorMessage);
      }
      
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
  }, [selectedDate, fromDate, toDate, useRange, baseUrl]); // FIX: Add baseUrl to dependencies

  // FIX: Get unique categories safely
  const availableCategories = categorySalesData?.categories ? 
    [...new Set(categorySalesData.categories.map(item => item.category))] : [];

  // FIX: Filter data based on selected category safely
  const filteredCategoriesData = categorySalesData && selectedCategoryFilter !== 'all' 
    ? categorySalesData.categories.filter(item => item.category === selectedCategoryFilter)
    : categorySalesData?.categories || [];

  const getPaymentMethodColor = (method) => {
    const colors = {
      'cash': '#4CAF50',
      'نقدي': '#4CAF50',
      'visa': '#2196F3', 
      'فيزا': '#2196F3',
      'credit': '#FF9800',
      'vodafone_cash': '#E91E63',
      'فودافون كاش': '#E91E63',
      'الاهلي و مصر': '#9C27B0',
      'بنك الاهلي و مصر': '#9C27B0',
      'postponed': '#FF5722',
      'آجل': '#FF5722',
      'discount': '#795548',
      'خصم': '#795548',
      'OTHER': '#607D8B',
      'بنوك اخرى': '#607D8B'
    };
    return colors[method] || '#757575';
  };

  // FIX: Export function - handle missing data gracefully
  const exportCategorySalesCSV = () => {
    if (!categorySalesData || !categorySalesData.categories || categorySalesData.categories.length === 0) {
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

    // Summary section - FIX: Handle missing summary data
    csvContent += `SUMMARY\r\n`;
    csvContent += `Total Categories,${categorySalesData.summary?.categories_count || categorySalesData.categories.length}\r\n`;
    csvContent += `Total Tickets Sold,${categorySalesData.summary?.total_tickets_sold || 0}\r\n`;
    csvContent += `Total Revenue (EGP),${categorySalesData.summary?.total_revenue?.toFixed(2) || '0.00'}\r\n`;
    if (categorySalesData.summary?.total_payments_verification) {
      csvContent += `Total Payments Verification (EGP),${categorySalesData.summary.total_payments_verification.toFixed(2)}\r\n`;
    }
    csvContent += `\r\n`;

    // Category details header
    csvContent += `CATEGORY BREAKDOWN\r\n`;
    csvContent += `Category Name,Tickets Sold,Revenue (EGP),Subcategories Count\r\n`;

    // Process each category - FIX: Handle missing fields
    const categoryGroups = filteredCategoriesData.reduce((acc, item) => {
      const category = item.category || 'Unknown';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(item);
      return acc;
    }, {});

    Object.entries(categoryGroups).forEach(([category, items]) => {
      const categoryTotal = items.reduce((sum, item) => sum + parseFloat(item.category_revenue || 0), 0);
      const categoryTickets = items.reduce((sum, item) => sum + parseInt(item.tickets_sold || 0), 0);
      
      csvContent += `${escapeCSV(category)},${categoryTickets},${categoryTotal.toFixed(2)},${items.length}\r\n`;
    });

    // Subcategory breakdown
    csvContent += `\r\nSUBCATEGORY BREAKDOWN\r\n`;
    csvContent += `Category,Subcategory,Tickets Sold,Revenue (EGP),Unit Price (EGP)\r\n`;

    Object.entries(categoryGroups).forEach(([category, items]) => {
      items.forEach(item => {
        csvContent += `${escapeCSV(category)},${escapeCSV(item.subcategory || 'N/A')},${item.tickets_sold || 0},${parseFloat(item.category_revenue || 0).toFixed(2)},${parseFloat(item.unit_price || 0).toFixed(2)}\r\n`;
      });
    });

    const filename = useRange
      ? `Category_Sales_${formatApiDate(fromDate)}_to_${formatApiDate(toDate)}.csv`
      : `Category_Sales_${formatApiDate(selectedDate)}.csv`;

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, filename);
    notify.success("Category Sales CSV exported successfully!");
  };

  // FIX: CategorySalesCard component - handle missing data
  const CategorySalesCard = ({ category, data }) => {
    if (!data || data.length === 0) return null;

    // Calculate category total EXCLUDING discounts from revenue
    const categoryTotal = data.reduce((sum, item) => sum + parseFloat(item.category_revenue || 0), 0);
    const categoryTickets = data.reduce((sum, item) => sum + parseInt(item.tickets_sold || 0), 0);
    const isExpanded = expandedCategories[category];

    // Aggregate payment methods for the ENTIRE category - FIX: Handle missing payment_summary
    const categoryPayments = {};
    let totalNonDiscountPayments = 0;
    
    data.forEach(item => {
      if (item.payment_summary && typeof item.payment_summary === 'object') {
        Object.entries(item.payment_summary).forEach(([method, amount]) => {
          if (method && method !== 'null' && method !== 'undefined') {
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
        <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
          <Box 
            display="flex" 
            justifyContent="space-between" 
            alignItems="center" 
            sx={{ cursor: 'pointer' }}
            onClick={() => toggleCategoryExpansion(category)}
          >
            <Box display="flex" alignItems="center" gap={{ xs: 1, sm: 1.5 }}>
              <Avatar sx={{ 
                bgcolor: '#00AEEF', 
                width: { xs: 35, sm: 40 }, 
                height: { xs: 35, sm: 40 },
                fontSize: { xs: '1rem', sm: '1.2rem' }
              }}>
                🏷️
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant={isMobile ? "subtitle1" : "h6"} sx={{ 
                  color: '#00AEEF', 
                  fontWeight: 700,
                  fontSize: { xs: '1rem', sm: '1.1rem' }
                }}>
                  {category}
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{
                  fontSize: { xs: '0.75rem', sm: '0.875rem' }
                }}>
                  {categoryTickets} tickets • {data.length} subcategories 
                  {categoryTickets > 0 && !isSmallMobile && ` • Avg: EGP ${(categoryTotal/categoryTickets).toFixed(0)}/ticket`}
                </Typography>
                
                {/* Payment Methods Summary - Mobile Responsive */}
                {Object.keys(categoryPayments).length > 0 && (
                  <Box mt={1}>
                    <Typography variant="caption" display="block" color="textSecondary" fontWeight="600" sx={{
                      fontSize: { xs: '0.6rem', sm: '0.75rem' }
                    }}>
                      Category Payment Methods:
                    </Typography>
                    <Box display="flex" gap={0.5} mt={0.5} flexWrap="wrap">
                      {Object.entries(categoryPayments)
                        .sort(([,a], [,b]) => b - a)
                        .slice(0, isMobile ? 3 : 6) // Show fewer on mobile
                        .map(([method, amount]) => {
                          // Calculate percentage properly
                          let percentage;
                          if (method === 'خصم' || method === 'discount') {
                            percentage = categoryTotal > 0 ? ((amount / categoryTotal) * 100).toFixed(1) : '0.0';
                          } else {
                            percentage = totalNonDiscountPayments > 0 ? ((amount / totalNonDiscountPayments) * 100).toFixed(1) : '0.0';
                          }
                          
                          return (
                            <Chip 
                              key={method}
                              label={isSmallMobile ? 
                                `${method}: ${parseFloat(amount).toFixed(0)}` : 
                                `${method}: EGP ${parseFloat(amount).toFixed(0)} (${percentage}%)`
                              }
                              size="small"
                              sx={{ 
                                bgcolor: getPaymentMethodColor(method),
                                color: 'white',
                                fontSize: { xs: '0.55rem', sm: '0.65rem' },
                                height: { xs: '18px', sm: '22px' },
                                fontWeight: 600
                              }}
                            />
                          );
                        })}
                      {Object.keys(categoryPayments).length > (isMobile ? 3 : 6) && (
                        <Chip 
                          label={`+${Object.keys(categoryPayments).length - (isMobile ? 3 : 6)} more`}
                          size="small"
                          sx={{ 
                            bgcolor: '#f5f5f5',
                            color: '#666',
                            fontSize: { xs: '0.55rem', sm: '0.65rem' },
                            height: { xs: '18px', sm: '22px' }
                          }}
                        />
                      )}
                    </Box>
                  </Box>
                )}
              </Box>
            </Box>
            
            <Box display="flex" alignItems="center" gap={{ xs: 1, sm: 2 }}>
              <Box textAlign="right">
                <Typography variant={isMobile ? "h6" : "h5"} sx={{ 
                  color: '#00AEEF', 
                  fontWeight: 800,
                  lineHeight: 1,
                  fontSize: { xs: '1.1rem', sm: '1.5rem' }
                }}>
                  EGP {isSmallMobile ? categoryTotal.toFixed(0) : categoryTotal.toFixed(2)}
                </Typography>
                <Chip 
                  label={`${categoryTickets} tickets`}
                  size="small"
                  sx={{ 
                    bgcolor: '#00AEEF20',
                    color: '#00AEEF',
                    fontWeight: 600,
                    fontSize: { xs: '0.6rem', sm: '0.7rem' },
                    height: { xs: '18px', sm: '20px' }
                  }}
                />
              </Box>
              <IconButton size="small">
                {isExpanded ? <ExpandLessIcon fontSize={isSmallMobile ? "small" : "medium"} /> : <ExpandMoreIcon fontSize={isSmallMobile ? "small" : "medium"} />}
              </IconButton>
            </Box>
          </Box>
          
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <Box mt={2}>
              {/* Category-level payment breakdown - Mobile Responsive */}
              {Object.keys(categoryPayments).length > 0 && (
                <Paper sx={{ 
                  p: { xs: 1.5, sm: 2 }, 
                  mb: 2, 
                  bgcolor: 'rgba(0, 174, 239, 0.05)', 
                  borderRadius: 2,
                  border: '1px solid #00AEEF30'
                }}>
                  <Typography variant="subtitle2" fontWeight="600" color="#00AEEF" mb={1} sx={{
                    fontSize: { xs: '0.875rem', sm: '1rem' }
                  }}>
                    💳 {category} Category Payment Breakdown
                  </Typography>
                  <Grid container spacing={1}>
                    {Object.entries(categoryPayments)
                      .sort(([,a], [,b]) => b - a)
                      .map(([method, amount]) => {
                        // Calculate percentage properly for each payment method
                        let percentage;
                        if (method === 'خصم' || method === 'discount') {
                          percentage = categoryTotal > 0 ? ((amount / categoryTotal) * 100).toFixed(1) : '0.0';
                        } else {
                          percentage = totalNonDiscountPayments > 0 ? ((amount / totalNonDiscountPayments) * 100).toFixed(1) : '0.0';
                        }
                        
                        return (
                          <Grid item xs={6} sm={4} md={3} key={method}>
                            <Box textAlign="center" p={1}>
                              <Typography variant="body2" fontWeight="600" color={getPaymentMethodColor(method)} sx={{
                                fontSize: { xs: '0.75rem', sm: '0.875rem' }
                              }}>
                                {method}
                              </Typography>
                              <Typography variant={isMobile ? "subtitle1" : "h6"} color="text.primary" sx={{
                                fontSize: { xs: '1rem', sm: '1.25rem' }
                              }}>
                                EGP {isSmallMobile ? amount.toFixed(0) : amount.toFixed(2)}
                              </Typography>
                              <Typography variant="caption" color="textSecondary" sx={{
                                fontSize: { xs: '0.65rem', sm: '0.75rem' }
                              }}>
                                {percentage}%
                              </Typography>
                            </Box>
                          </Grid>
                        );
                      })}
                  </Grid>
                </Paper>
              )}

              {/* Subcategory details - Mobile Responsive */}
              <Typography variant="subtitle2" fontWeight="600" color="#00AEEF" mb={1} sx={{
                fontSize: { xs: '0.875rem', sm: '1rem' }
              }}>
                📂 Subcategories Details
              </Typography>
              <Grid container spacing={1.5}>
                {data.map((item, index) => (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <Paper sx={{ 
                      p: { xs: 1, sm: 1.5 }, 
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
                        <Typography variant="subtitle2" fontWeight="600" color="#00AEEF" sx={{
                          fontSize: { xs: '0.8rem', sm: '0.875rem' }
                        }}>
                          {item.subcategory || 'N/A'}
                        </Typography>
                        <Chip 
                          label={`${item.tickets_sold || 0} tickets`}
                          size="small"
                          sx={{ 
                            bgcolor: '#00AEEF',
                            color: 'white',
                            fontSize: { xs: '0.55rem', sm: '0.65rem' },
                            height: { xs: '16px', sm: '20px' }
                          }}
                        />
                      </Box>
                      
                      <Typography variant={isMobile ? "subtitle1" : "h6"} fontWeight="bold" color="text.primary" sx={{
                        fontSize: { xs: '1rem', sm: '1.25rem' }
                      }}>
                        EGP {parseFloat(item.category_revenue || 0).toFixed(isSmallMobile ? 0 : 2)}
                      </Typography>
                      <Typography variant="caption" color="textSecondary" display="block" sx={{
                        fontSize: { xs: '0.65rem', sm: '0.75rem' }
                      }}>
                        Unit Price: EGP {parseFloat(item.unit_price || 0).toFixed(isSmallMobile ? 0 : 2)} 
                        {categoryTotal > 0 && !isSmallMobile && ` • ${((parseFloat(item.category_revenue || 0)/categoryTotal)*100).toFixed(1)}% of category`}
                      </Typography>
                      
                      {/* FIX: Handle missing date fields - Mobile Responsive */}
                      {!isSmallMobile && (
                        <Box mt={1}>
                          {item.first_sale && (
                            <Typography variant="caption" display="block" color="textSecondary" sx={{
                              fontSize: { xs: '0.6rem', sm: '0.75rem' }
                            }}>
                              First Sale: {new Date(item.first_sale).toLocaleDateString()}
                            </Typography>
                          )}
                          {item.last_sale && (
                            <Typography variant="caption" display="block" color="textSecondary" sx={{
                              fontSize: { xs: '0.6rem', sm: '0.75rem' }
                            }}>
                              Last Sale: {new Date(item.last_sale).toLocaleDateString()}
                            </Typography>
                          )}
                          {item.orders_count && (
                            <Typography variant="caption" display="block" color="textSecondary" sx={{
                              fontSize: { xs: '0.6rem', sm: '0.75rem' }
                            }}>
                              Orders: {item.orders_count} 
                              {item.orders_count > 0 && ` • Avg: ${(parseFloat(item.tickets_sold || 0) / parseInt(item.orders_count)).toFixed(1)} tickets/order`}
                            </Typography>
                          )}
                        </Box>
                      )}
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
        <CircularProgress size={isMobile ? 40 : 60} />
      </Box>
    );
  }

  if (!categorySalesData || !categorySalesData.categories || categorySalesData.categories.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100%" flexDirection="column">
        <Typography variant="h6" color="textSecondary" mb={1}>📊</Typography>
        <Typography variant={isMobile ? "body2" : "body1"} color="textSecondary" textAlign="center">
          No category sales data available for the selected period
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1, sm: 2 } }}>
      {/* Filter and Export Controls - Mobile Responsive */}
      <Box 
        display="flex" 
        justifyContent="space-between" 
        alignItems={isMobile ? "flex-start" : "center"} 
        flexDirection={isMobile ? "column" : "row"}
        mb={2} 
        gap={2}
      >
        <Box display="flex" alignItems="center" gap={2} width={isMobile ? "100%" : "auto"} flexDirection={isMobile ? "column" : "row"}>
          <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 200 } }}>
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
              size={isSmallMobile ? "small" : "medium"}
              sx={{ 
                bgcolor: '#00AEEF', 
                color: 'white',
                fontSize: { xs: '0.75rem', sm: '0.875rem' }
              }}
              deleteIcon={<CloseIcon fontSize={isSmallMobile ? "small" : "medium"} />}
            />
          )}
        </Box>

        <Button
          variant="contained"
          onClick={exportCategorySalesCSV}
          startIcon={<TrendingUpIcon fontSize={isSmallMobile ? "small" : "medium"} />}
          size={isSmallMobile ? "small" : "medium"}
          fullWidth={isSmallMobile}
          sx={{
            background: "linear-gradient(45deg, #00AEEF 30%, #007EA7 90%)",
            boxShadow: "0 3px 5px 2px rgba(0,174,239,.3)",
            fontSize: { xs: '0.75rem', sm: '0.875rem' },
            '&:hover': {
              background: "linear-gradient(45deg, #007EA7 30%, #005577 90%)",
            }
          }}
        >
          {isSmallMobile ? '📊 Export' : '📊 Export CSV'}
        </Button>
      </Box>

      {/* Display filtered categories - FIX: Handle empty data */}
      {Object.entries(
        filteredCategoriesData.reduce((acc, item) => {
          const category = item.category || 'Unknown';
          if (!acc[category]) {
            acc[category] = [];
          }
          acc[category].push(item);
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