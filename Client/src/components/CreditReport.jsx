import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Avatar,
  Chip,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Collapse,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Pagination,
  Alert
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  AccountBalance as AccountBalanceIcon,
  History as HistoryIcon,
  TrendingDown as DebtIcon,
  TrendingUp as SurplusIcon,
  FilterList as FilterListIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import axios from 'axios';
import { notify } from '../utils/toast';
import { saveAs } from 'file-saver';

const CreditReport = ({
  selectedDate,
  fromDate,
  toDate,
  useRange,
  formatApiDate,
  loading,
  setLoading,
  error,
  setError,
  creditReportData,
  setCreditReportData
}) => {
  const [selectedAccountFilter, setSelectedAccountFilter] = useState('all');
  const [expandedAccounts, setExpandedAccounts] = useState({});
  const [transactionsDialog, setTransactionsDialog] = useState({ open: false, accountId: null, accountName: '' });
  const [transactions, setTransactions] = useState([]);
  const [transactionsPage, setTransactionsPage] = useState(1);
  const [transactionsPagination, setTransactionsPagination] = useState({});
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  // FIX: Use the same pattern as UsersManagement
  const baseUrl = window.runtimeConfig?.apiBaseUrl;

  const fetchCreditReportData = async () => {
    if (!baseUrl) {
      setError('API base URL not configured');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setError('Authentication required');
        return;
      }

      let url;
      if (useRange && fromDate && toDate) {
        url = `${baseUrl}/api/credit/report?from=${formatApiDate(fromDate)}&to=${formatApiDate(toDate)}`;
      } else if (selectedDate) {
        url = `${baseUrl}/api/credit/report?date=${formatApiDate(selectedDate)}`;
      } else {
        setError('Please select a date or date range');
        return;
      }

      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setCreditReportData(response.data);
    } catch (error) {
      console.error('Error fetching credit report:', error);
      setError(error.response?.data?.error || 'Failed to fetch credit report');
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async (accountId, page = 1) => {
    if (!baseUrl) return;

    setLoadingTransactions(true);

    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      let url = `${baseUrl}/api/credit/transactions/${accountId}?page=${page}&limit=10`;

      if (useRange && fromDate && toDate) {
        url += `&from=${formatApiDate(fromDate)}&to=${formatApiDate(toDate)}`;
      } else if (selectedDate) {
        url += `&date=${formatApiDate(selectedDate)}`;
      }

      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setTransactions(response.data.transactions || []);
      setTransactionsPagination(response.data.pagination || {});
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoadingTransactions(false);
    }
  };

  // Fetch credit report data
  const fetchCreditReport = useCallback(async () => {
    if (!baseUrl) {
      setError("API configuration not available");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = useRange
        ? { startDate: formatApiDate(fromDate), endDate: formatApiDate(toDate) }
        : { date: formatApiDate(selectedDate) };

      const response = await axios.get(`${baseUrl}/api/credits/credit-report`, { params });

      setCreditReportData(response.data);
      notify.success("Credit report loaded successfully");
    } catch (error) {
      console.error("Error fetching credit report:", error);
      const errorMessage = "Failed to fetch credit report. Please try again.";
      setError(errorMessage);
      notify.error(errorMessage);
      setCreditReportData(null);
    } finally {
      setLoading(false);
    }
  }, [baseUrl, useRange, fromDate, toDate, selectedDate, formatApiDate, setLoading, setError, setCreditReportData]);

  // Fetch credit transactions for specific account
  const fetchCreditTransactions = async (accountId, page = 1) => {
    if (!baseUrl) return;

    setLoadingTransactions(true);

    try {
      const params = {
        page,
        limit: 20,
        ...(useRange
          ? { startDate: formatApiDate(fromDate), endDate: formatApiDate(toDate) }
          : { date: formatApiDate(selectedDate) }
        )
      };

      // FIX: Change from /api/credit/ to /api/credits/
      const response = await axios.get(`${baseUrl}/api/credits/${accountId}/transactions`, { params });

      setTransactions(response.data.transactions);
      setTransactionsPagination(response.data.pagination);
    } catch (error) {
      console.error("Error fetching credit transactions:", error);
      notify.error("Failed to fetch credit transactions");
    } finally {
      setLoadingTransactions(false);
    }
  };

  // Simplified useEffect to handle fetching logic
  useEffect(() => {
    let isMounted = true;

    const timer = setTimeout(() => {
      if (isMounted && !creditReportData) {
        fetchCreditReport();
      }
    }, 1000);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [selectedDate, fromDate, toDate, useRange]);

  const toggleAccountExpansion = (accountId) => {
    setExpandedAccounts(prev => ({
      ...prev,
      [accountId]: !prev[accountId]
    }));
  };

  const openTransactionsDialog = (accountId, accountName) => {
    setTransactionsDialog({
      open: true,
      accountId,
      accountName  // This was missing
    });
    setTransactionsPage(1);
    fetchCreditTransactions(accountId, 1);
  };

  const closeTransactionsDialog = () => {
    setTransactionsDialog({ open: false, accountId: null, accountName: '' });
    setTransactions([]);
    setTransactionsPagination({});
    setTransactionsPage(1);
  };

  const handleTransactionsPageChange = (event, newPage) => {
    setTransactionsPage(newPage);
    fetchCreditTransactions(transactionsDialog.accountId, newPage);
  };

  const getAccountStatus = (balance) => {
    if (balance > 0) return { type: 'surplus', icon: '💰', color: '#4CAF50' };
    if (balance < 0) return { type: 'debt', icon: '⚠️', color: '#f44336' };
    return { type: 'neutral', icon: '⚖️', color: '#757575' };
  };

  const getTransactionTypeIcon = (type) => {
    const icons = {
      'ticket_sale': '🎟️',
      'manual_adjustment': '✏️',
      'initial_balance': '🏦',
      'refund': '↩️',
      'payment': '💳'
    };
    return icons[type] || '📝';
  };

  const exportCreditCSV = () => {
    if (!creditReportData || !creditReportData.accounts) {
      notify.warning("No credit report data to export");
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


    const formatDisplayDate = (date) => {
      return new Date(date).toLocaleDateString();
    };

    let csvContent = "\uFEFF";
    csvContent += useRange
      ? `Credit Report from ${formatDisplayDate(fromDate)} to ${formatDisplayDate(toDate)}\r\n\r\n`
      : `Credit Report for ${formatDisplayDate(selectedDate)}\r\n\r\n`;

    // Summary section
    csvContent += `SUMMARY\r\n`;
    csvContent += `Total Credit Accounts,${creditReportData.summary?.total_accounts || creditReportData.accounts.length}\r\n`;
    csvContent += `Total Credit Transactions,${creditReportData.summary?.total_transactions || 0}\r\n`;
    csvContent += `Total Credit Used (EGP),${creditReportData.summary?.total_credit_used?.toFixed(2) || '0.00'}\r\n`;
    csvContent += `Total Current Balance (EGP),${creditReportData.summary?.total_current_balance?.toFixed(2) || '0.00'}\r\n`;
    csvContent += `\r\n`;

    // Account details header
    csvContent += `CREDIT ACCOUNT BREAKDOWN\r\n`;
    csvContent += `Account Name,Current Balance (EGP),Credit Used (EGP),Transactions Count,Status,Linked Categories\r\n`;

    // Process each account - FIX: Use correct property names
    creditReportData.accounts.forEach(account => {
      // FIX: Handle multiple linked categories by separating them with semicolons
      const linkedCategoriesText = account.linked_categories && account.linked_categories.length > 0
        ? account.linked_categories.join('; ') // Use semicolon separator and join directly since it's already an array of strings
        : 'None';

      const status = getAccountStatus(account.balance); // Use account.balance not account.current_balance
      const statusText = status.type === 'debt' ? 'IN DEBT' : status.type === 'surplus' ? 'SURPLUS' : 'NEUTRAL';

      csvContent += `${escapeCSV(account.name)},${account.balance.toFixed(2)},${(account.credit_used_in_period || 0).toFixed(2)},${account.transactions_in_period || 0},${escapeCSV(statusText)},${escapeCSV(linkedCategoriesText)}\r\n`;
    });

    // Transaction details if available
    // Replace the CSV transaction export section (around line 250) with this corrected version:

    // Transaction details if available
    const hasTransactions = creditReportData.accounts.some(acc => acc.recent_transactions && acc.recent_transactions.length > 0);
    if (hasTransactions) {
      csvContent += `\r\nRECENT TRANSACTIONS BREAKDOWN\r\n`;
      csvContent += `Account Name,Transaction Date,Amount (EGP),Type,Description\r\n`;

      creditReportData.accounts.forEach(account => {
        if (account.recent_transactions && account.recent_transactions.length > 0) {
          account.recent_transactions.forEach(transaction => {
            const transactionDate = new Date(transaction.created_at).toLocaleDateString();
            const transactionType = transaction.transaction_type ? transaction.transaction_type.replace('_', ' ') : 'N/A';
            const amount = parseFloat(transaction.amount || 0); // FIX: Parse amount as float
            csvContent += `${escapeCSV(account.name)},${transactionDate},${amount.toFixed(2)},${escapeCSV(transactionType)},${escapeCSV(transaction.description || 'Credit transaction')}\r\n`;
          });
        }
      });
    }

    const filename = useRange
      ? `Credit_Report_${formatApiDate(fromDate)}_to_${formatApiDate(toDate)}.csv`
      : `Credit_Report_${formatApiDate(selectedDate)}.csv`;

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, filename);
    notify.success("Credit Report CSV exported successfully!");
  };

  // Filter accounts based on selection
  const filteredAccounts = creditReportData?.accounts?.filter(account => {
    if (selectedAccountFilter === 'all') return true;
    if (selectedAccountFilter === 'debt') return account.balance < 0;
    if (selectedAccountFilter === 'surplus') return account.balance > 0;
    if (selectedAccountFilter === 'neutral') return account.balance === 0;
    return account.id === selectedAccountFilter;
  }) || [];

  const availableAccounts = creditReportData?.accounts?.map(account => ({
    id: account.id,
    name: account.name
  })) || [];

  if (!creditReportData) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <Typography variant="h6" color="textSecondary">
          {loading ? 'Loading Credit Report...' : 'No credit data available'}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      {/* Header with filters and export */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} gap={2}>
        <Box display="flex" alignItems="center" gap={2}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Filter by Account</InputLabel>
            <Select
              value={selectedAccountFilter}
              label="Filter by Account"
              onChange={(e) => setSelectedAccountFilter(e.target.value)}
              startAdornment={<FilterListIcon sx={{ mr: 1, color: '#00AEEF' }} />}
            >
              <MenuItem value="all">💳 All Accounts</MenuItem>
              <MenuItem value="surplus">💰 Surplus Accounts</MenuItem>
              <MenuItem value="debt">⚠️ Accounts in Debt</MenuItem>
              <MenuItem value="neutral">⚖️ Neutral Balance</MenuItem>
              {availableAccounts.map(account => (
                <MenuItem key={account.id} value={account.id}>
                  🏦 {account.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {selectedAccountFilter !== 'all' && (
            <Chip
              label={`Showing: ${selectedAccountFilter === 'surplus' ? 'Surplus Accounts' :
                selectedAccountFilter === 'debt' ? 'Debt Accounts' :
                  selectedAccountFilter === 'neutral' ? 'Neutral Balance' :
                    availableAccounts.find(a => a.id === selectedAccountFilter)?.name || 'Unknown'
                }`}
              onDelete={() => setSelectedAccountFilter('all')}
              color="primary"
              sx={{ bgcolor: '#00AEEF', color: 'white' }}
            />
          )}
        </Box>

        <Button
          variant="contained"
          onClick={exportCreditCSV}
          startIcon={<DownloadIcon />}
          sx={{
            background: "linear-gradient(45deg, #00AEEF 30%, #007EA7 90%)",
            boxShadow: "0 3px 5px 2px rgba(0,174,239,.3)",
            '&:hover': {
              background: "linear-gradient(45deg, #007EA7 30%, #005577 90%)",
            }
          }}
        >
          💳 Export CSV
        </Button>
      </Box>

      {/* Credit Accounts Cards */}
      {filteredAccounts.map((account) => {
        const status = getAccountStatus(account.balance);
        const isExpanded = expandedAccounts[account.id];

        return (
          <Card key={account.id} sx={{
            mb: 2,
            background: account.balance < 0
              ? 'linear-gradient(135deg, #ffebee 0%, #ffffff 50%)'
              : account.balance > 0
                ? 'linear-gradient(135deg, #e8f5e8 0%, #ffffff 50%)'
                : 'linear-gradient(135deg, #f5f5f5 0%, #ffffff 50%)',
            border: `2px solid ${status.color}`,
            borderRadius: 3,
            overflow: 'hidden',
            transition: 'all 0.3s ease',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: `0 8px 25px ${status.color}30`
            }
          }}>
            <CardContent sx={{ p: 2 }}>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                sx={{ cursor: 'pointer' }}
                onClick={() => toggleAccountExpansion(account.id)}
              >
                <Box display="flex" alignItems="center" gap={1.5}>
                  <Avatar sx={{
                    bgcolor: status.color,
                    width: 50,
                    height: 50,
                    fontSize: '1.5rem'
                  }}>
                    {status.icon}
                  </Avatar>
                  <Box>
                    <Typography variant="h6" sx={{
                      color: status.color,
                      fontWeight: 700,
                      fontSize: '1.2rem'
                    }}>
                      {account.name}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {account.linked_categories.length} categories • {account.transactions_in_period} transactions in period
                    </Typography>

                    {/* Linked Categories */}
                    <Box mt={1} display="flex" gap={0.5} flexWrap="wrap">
                      {account.linked_categories.map((category, index) => (
                        <Chip
                          key={index}
                          label={category}
                          size="small"
                          sx={{
                            bgcolor: '#00AEEF20',
                            color: '#00AEEF',
                            fontSize: '0.7rem',
                            height: '20px'
                          }}
                        />
                      ))}
                      {account.linked_categories.length === 0 && (
                        <Chip
                          label="No categories linked"
                          size="small"
                          sx={{
                            bgcolor: '#ffcc0220',
                            color: '#f57c00',
                            fontSize: '0.7rem',
                            height: '20px'
                          }}
                        />
                      )}
                    </Box>
                  </Box>
                </Box>

                <Box display="flex" alignItems="center" gap={2}>
                  <Box textAlign="right">
                    <Typography variant="h4" sx={{
                      color: status.color,
                      fontWeight: 800,
                      lineHeight: 1
                    }}>
                      EGP {Math.abs(account.balance).toFixed(2)}
                    </Typography>
                    <Chip
                      label={status.type === 'debt' ? 'IN DEBT' : status.type === 'surplus' ? 'SURPLUS' : 'NEUTRAL'}
                      size="small"
                      sx={{
                        bgcolor: status.color,
                        color: 'white',
                        fontWeight: 600,
                        fontSize: '0.7rem'
                      }}
                    />
                    {account.credit_used_in_period > 0 && (
                      <Typography variant="caption" display="block" color="textSecondary" mt={0.5}>
                        Used: EGP {account.credit_used_in_period.toFixed(2)} (period)
                      </Typography>
                    )}
                  </Box>
                  <IconButton size="small">
                    {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </IconButton>
                </Box>
              </Box>

              <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                <Box mt={2}>
                  {/* Account Details Section */}
                  <Paper sx={{
                    p: 2,
                    mb: 2,
                    bgcolor: 'rgba(0, 174, 239, 0.05)',
                    borderRadius: 2,
                    border: '1px solid #00AEEF30'
                  }}>
                    <Typography variant="subtitle2" fontWeight="600" color="#00AEEF" mb={2}>
                      💳 Account Details
                    </Typography>

                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6} md={3}>
                        <Box textAlign="center" p={1}>
                          <Typography variant="body2" fontWeight="600" color={status.color}>
                            Current Balance
                          </Typography>
                          <Typography variant="h5" color="text.primary" fontWeight="bold">
                            EGP {account.balance.toFixed(2)}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {account.balance < 0 ? 'Owes money' : account.balance > 0 ? 'Has credit' : 'Balanced'}
                          </Typography>
                        </Box>
                      </Grid>

                      <Grid item xs={12} sm={6} md={3}>
                        <Box textAlign="center" p={1}>
                          <Typography variant="body2" fontWeight="600" color="#FF9800">
                            Credit Used (Period)
                          </Typography>
                          <Typography variant="h5" color="text.primary" fontWeight="bold">
                            EGP {account.credit_used_in_period.toFixed(2)}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {useRange ? 'Date range' : 'Selected date'}
                          </Typography>
                        </Box>
                      </Grid>

                      <Grid item xs={12} sm={6} md={3}>
                        <Box textAlign="center" p={1}>
                          <Typography variant="body2" fontWeight="600" color="#9C27B0">
                            Transactions (Period)
                          </Typography>
                          <Typography variant="h5" color="text.primary" fontWeight="bold">
                            {account.transactions_in_period}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            Transaction count
                          </Typography>
                        </Box>
                      </Grid>

                      <Grid item xs={12} sm={6} md={3}>
                        <Box textAlign="center" p={1}>
                          <Typography variant="body2" fontWeight="600" color="#4CAF50">
                            Linked Categories
                          </Typography>
                          <Typography variant="h5" color="text.primary" fontWeight="bold">
                            {account.linked_categories.length}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            Active links
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </Paper>

                  {/* Action Buttons */}
                  <Box display="flex" gap={2} justifyContent="center">
                    <Button
                      variant="outlined"
                      startIcon={<HistoryIcon />}
                      onClick={() => openTransactionsDialog(account.id, account.name)}
                      sx={{
                        borderColor: '#00AEEF',
                        color: '#00AEEF',
                        '&:hover': {
                          borderColor: '#007EA7',
                          backgroundColor: '#E0F7FF',
                        }
                      }}
                    >
                      View Transaction History
                    </Button>
                  </Box>
                </Box>
              </Collapse>
            </CardContent>
          </Card>
        );
      })}

      {filteredAccounts.length === 0 && (
        <Alert severity="info" sx={{ mt: 2 }}>
          No credit accounts found matching the selected filter.
        </Alert>
      )}

      {/* Transaction History Dialog */}
      <Dialog
        open={transactionsDialog.open}
        onClose={closeTransactionsDialog}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          📝 Transaction History - {transactionsDialog.accountName}
        </DialogTitle>
        <DialogContent>
          {loadingTransactions ? (
            <Box display="flex" justifyContent="center" p={3}>
              <Typography>Loading transactions...</Typography>
            </Box>
          ) : (
            <>
              <TableContainer component={Paper} sx={{ mt: 1 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell align="right">Amount</TableCell>
                      <TableCell>Order #</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {transactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>
                          {new Date(transaction.created_at).toLocaleDateString()}
                          <br />
                          <Typography variant="caption" color="textSecondary">
                            {new Date(transaction.created_at).toLocaleTimeString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <span>{getTransactionTypeIcon(transaction.transaction_type)}</span>
                            <Typography variant="body2">
                              {transaction.transaction_type.replace('_', ' ')}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {transaction.description || 'No description'}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography
                            variant="body2"
                            color={parseFloat(transaction.amount || 0) >= 0 ? 'success.main' : 'error.main'}
                            fontWeight="bold"
                          >
                            {parseFloat(transaction.amount || 0) >= 0 ? '+' : ''}EGP {parseFloat(transaction.amount || 0).toFixed(2)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {transaction.order_number ? (
                            <Chip
                              label={`#${transaction.order_number}`}
                              size="small"
                              variant="outlined"
                            />
                          ) : (
                            <Typography variant="caption" color="textSecondary">
                              No order
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {transactionsPagination.totalPages > 1 && (
                <Box display="flex" justifyContent="center" mt={2}>
                  <Pagination
                    count={transactionsPagination.totalPages}
                    page={transactionsPage}
                    onChange={handleTransactionsPageChange}
                    color="primary"
                  />
                </Box>
              )}

              {transactions.length === 0 && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  No transactions found for the selected period.
                </Alert>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeTransactionsDialog}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CreditReport;