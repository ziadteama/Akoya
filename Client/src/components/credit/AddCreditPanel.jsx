import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Grid,
  Alert,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  AccountBalance,
  TrendingUp,
  TrendingDown
} from '@mui/icons-material';
import axios from 'axios';
import { notify } from '../../utils/toast';

const AddCreditPanel = () => {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [transactionType, setTransactionType] = useState('add'); // 'add' or 'subtract'
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(false);

  const baseUrl = window.runtimeConfig?.apiBaseUrl;

  useEffect(() => {
    fetchCreditAccounts();
  }, []);

  const fetchCreditAccounts = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${baseUrl}/api/credits`);
      setAccounts(data);
    } catch (error) {
      console.error('Error fetching credit accounts:', error);
      notify.error('❌ Failed to fetch credit accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedAccount) {
      notify.error('⚠️ Please select a credit account');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      notify.error('⚠️ Please enter a valid amount greater than 0');
      return;
    }

    // Description is now optional - no validation needed

    setConfirmDialog(true);
  };

  const confirmTransaction = async () => {
    try {
      setProcessing(true);
      setConfirmDialog(false);

      const adjustmentAmount = transactionType === 'add' 
        ? parseFloat(amount) 
        : -parseFloat(amount);

      // Auto-generate description if empty
      const transactionDescription = description.trim() || 
        `Manual ${transactionType === 'add' ? 'credit addition' : 'credit deduction'} of EGP ${amount}`;

      const response = await axios.post(`${baseUrl}/api/credits/${selectedAccount}/adjust`, {
        amount: adjustmentAmount,
        description: transactionDescription,
        transactionType: transactionType === 'add' ? 'manual_add' : 'manual_subtract'
      });

      const { previousBalance, newBalance } = response.data;
      
      // FIX: Convert to numbers before using toFixed
      const prevBal = parseFloat(previousBalance) || 0;
      const newBal = parseFloat(newBalance) || 0;
      
      notify.success(
        `✅ Successfully ${transactionType === 'add' ? 'added' : 'subtracted'} EGP ${amount}! 
         Balance: EGP ${prevBal.toFixed(2)} → EGP ${newBal.toFixed(2)}`
      );

      // Reset form
      setSelectedAccount('');
      setAmount('');
      setDescription('');
      setTransactionType('add');
      
      // Refresh accounts to show updated balances
      fetchCreditAccounts();

    } catch (error) {
      console.error('Error adjusting credit:', error);
      const message = error.response?.data?.error || 'Failed to adjust credit';
      notify.error(`❌ ${message}`);
    } finally {
      setProcessing(false);
    }
  };

  const getSelectedAccountInfo = () => {
    return accounts.find(acc => acc.id === selectedAccount);
  };

  const formatBalance = (balance) => {
    const num = parseFloat(balance) || 0; // FIX: Handle null/undefined/string values
    return `EGP ${num.toFixed(2)}`;
  };

  const getBalanceColor = (balance) => {
    const num = parseFloat(balance) || 0; // FIX: Handle null/undefined/string values
    if (num > 0) return 'success';
    if (num < 0) return 'error';
    return 'default';
  };

  const calculateNewBalance = () => {
    const account = getSelectedAccountInfo();
    if (!account || !amount) return null;
    
    const currentBalance = parseFloat(account.balance) || 0; // FIX: Handle string balance
    const adjustmentAmount = parseFloat(amount) || 0; // FIX: Handle string amount
    const newBalance = transactionType === 'add' 
      ? currentBalance + adjustmentAmount 
      : currentBalance - adjustmentAmount;
    
    return newBalance;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
        <Typography variant="body1" sx={{ ml: 2 }}>
          Loading credit accounts...
        </Typography>
      </Box>
    );
  }

  if (accounts.length === 0) {
    return (
      <Alert severity="warning">
        📝 No credit accounts found. Please create a credit account first.
      </Alert>
    );
  }

  const selectedAccountInfo = getSelectedAccountInfo();
  const newBalance = calculateNewBalance();

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        💰 Add/Subtract Credit
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Manually adjust credit account balances
      </Typography>

      <Grid container spacing={3} sx={{ mt: 1 }}>
        {/* Transaction Form */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              📝 Transaction Details
            </Typography>

            <Box display="flex" flexDirection="column" gap={3}>
              {/* Transaction Type */}
              <Box display="flex" gap={1}>
                <Button
                  variant={transactionType === 'add' ? 'contained' : 'outlined'}
                  startIcon={<AddIcon />}
                  onClick={() => setTransactionType('add')}
                  color="success"
                  fullWidth
                >
                  Add Credit
                </Button>
                <Button
                  variant={transactionType === 'subtract' ? 'contained' : 'outlined'}
                  startIcon={<RemoveIcon />}
                  onClick={() => setTransactionType('subtract')}
                  color="error"
                  fullWidth
                >
                  Subtract Credit
                </Button>
              </Box>

              {/* Account Selection */}
              <FormControl fullWidth>
                <InputLabel>Select Credit Account</InputLabel>
                <Select
                  value={selectedAccount}
                  onChange={(e) => setSelectedAccount(e.target.value)}
                  label="Select Credit Account"
                >
                  {accounts.map((account) => (
                    <MenuItem key={account.id} value={account.id}>
                      <Box display="flex" alignItems="center" width="100%">
                        <AccountBalance sx={{ mr: 1, color: 'primary.main' }} />
                        <Box flexGrow={1}>
                          <Typography variant="subtitle2">
                            {account.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Balance: {formatBalance(account.balance)}
                          </Typography>
                        </Box>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Amount */}
              <TextField
                label="Amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                InputProps={{
                  startAdornment: <Typography sx={{ mr: 1, fontWeight: 'bold' }}>EGP</Typography>
                }}
                fullWidth
                variant="outlined"
              />

              {/* Description */}
              <TextField
                label="Description (Optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter reason for this transaction (optional)"
                multiline
                rows={3}
                fullWidth
                variant="outlined"
                helperText="Leave empty for auto-generated description"
              />

              {/* Submit Button */}
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={processing || !selectedAccount || !amount} // Removed description validation
                startIcon={transactionType === 'add' ? <TrendingUp /> : <TrendingDown />}
                color={transactionType === 'add' ? 'success' : 'error'}
                size="large"
              >
                {processing ? (
                  <CircularProgress size={20} />
                ) : (
                  `${transactionType === 'add' ? 'Add' : 'Subtract'} EGP ${amount || '0.00'}`
                )}
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* Preview */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              📊 Transaction Preview
            </Typography>

            {selectedAccountInfo ? (
              <Box>
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Selected Account: {selectedAccountInfo.name}
                  </Typography>
                  <Typography variant="body2">
                    {selectedAccountInfo.description || 'No description'}
                  </Typography>
                </Alert>

                <Box display="flex" flexDirection="column" gap={2}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="body1">Current Balance:</Typography>
                    <Chip
                      label={formatBalance(selectedAccountInfo.balance)}
                      color={getBalanceColor(selectedAccountInfo.balance)}
                      variant="outlined"
                    />
                  </Box>

                  {amount && (
                    <>
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="body1">
                          {transactionType === 'add' ? 'Adding:' : 'Subtracting:'}
                        </Typography>
                        <Chip
                          label={`${transactionType === 'add' ? '+' : '-'}EGP ${amount}`}
                          color={transactionType === 'add' ? 'success' : 'error'}
                          variant="outlined"
                        />
                      </Box>

                      <Divider />

                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="h6">New Balance:</Typography>
                        <Chip
                          label={formatBalance(newBalance)}
                          color={getBalanceColor(newBalance)}
                          variant="filled"
                        />
                      </Box>

                      {newBalance < 0 && (
                        <Alert severity="warning">
                          ⚠️ Warning: This transaction will result in a negative balance!
                        </Alert>
                      )}
                    </>
                  )}

                  {/* Linked Categories */}
                  {selectedAccountInfo.linked_categories && selectedAccountInfo.linked_categories.length > 0 && (
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>
                        Linked Categories:
                      </Typography>
                      <Box display="flex" flexWrap="wrap" gap={0.5}>
                        {selectedAccountInfo.linked_categories.map((category) => (
                          <Chip
                            key={category}
                            label={category}
                            size="small"
                            color="info"
                            variant="outlined"
                          />
                        ))}
                      </Box>
                    </Box>
                  )}
                </Box>
              </Box>
            ) : (
              <Alert severity="info">
                📋 Select a credit account to see transaction preview
              </Alert>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog} onClose={() => setConfirmDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center">
            {transactionType === 'add' ? <TrendingUp sx={{ mr: 1, color: 'success.main' }} /> : <TrendingDown sx={{ mr: 1, color: 'error.main' }} />}
            Confirm {transactionType === 'add' ? 'Credit Addition' : 'Credit Deduction'}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity={transactionType === 'add' ? 'success' : 'warning'} sx={{ mb: 2 }}>
            You are about to {transactionType === 'add' ? 'add' : 'subtract'} <strong>EGP {amount}</strong> {transactionType === 'add' ? 'to' : 'from'} the account <strong>{selectedAccountInfo?.name}</strong>
          </Alert>
          
          <Box display="flex" flexDirection="column" gap={1}>
            <Typography variant="body2">
              <strong>Current Balance:</strong> {formatBalance(selectedAccountInfo?.balance || 0)}
            </Typography>
            <Typography variant="body2">
              <strong>New Balance:</strong> {formatBalance(newBalance || 0)}
            </Typography>
            <Typography variant="body2">
              <strong>Description:</strong> {description.trim() || 
                `Auto: Manual ${transactionType === 'add' ? 'credit addition' : 'credit deduction'} of EGP ${amount}`
              }
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog(false)} variant="outlined">
            Cancel
          </Button>
          <Button
            onClick={confirmTransaction}
            variant="contained"
            color={transactionType === 'add' ? 'success' : 'error'}
            disabled={processing}
          >
            {processing ? <CircularProgress size={20} /> : 'Confirm Transaction'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AddCreditPanel;