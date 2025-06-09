import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  IconButton,
  Tooltip,
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  AccountBalance,
  Visibility,
  Edit
} from '@mui/icons-material';
import axios from 'axios';
import { notify } from '../../utils/toast';

const CreditAccountsPanel = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [newAccount, setNewAccount] = useState({
    name: '',
    description: '',
    initialBalance: 0
  });

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
      notify.error('Failed to fetch credit accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    if (!newAccount.name.trim()) {
      notify.error('Account name is required');
      return;
    }

    try {
      await axios.post(`${baseUrl}/api/credits`, newAccount);
      notify.success('✅ Credit account created successfully');
      setOpenDialog(false);
      setNewAccount({ name: '', description: '', initialBalance: 0 });
      fetchCreditAccounts();
    } catch (error) {
      console.error('Error creating credit account:', error);
      const message = error.response?.data?.error || 'Failed to create credit account';
      notify.error(message);
    }
  };

  const formatBalance = (balance) => {
    const num = parseFloat(balance);
    const formatted = `EGP ${Math.abs(num).toFixed(2)}`;
    return num < 0 ? `-${formatted}` : formatted;
  };

  const getBalanceColor = (balance) => {
    const num = parseFloat(balance);
    if (num > 0) return 'success';
    if (num < 0) return 'error';
    return 'default';
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

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">
          💰 Credit Accounts Overview
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
        >
          Create New Account
        </Button>
      </Box>

      {accounts.length === 0 ? (
        <Alert severity="info">
          No credit accounts found. Create your first credit account to get started.
        </Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Account Name</TableCell>
                <TableCell>Balance</TableCell>
                <TableCell>Linked Categories</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {accounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell>
                    <Box display="flex" alignItems="center">
                      <AccountBalance sx={{ mr: 1, color: 'primary.main' }} />
                      <Typography variant="subtitle2">
                        {account.name}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={formatBalance(account.balance)}
                      color={getBalanceColor(account.balance)}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Box display="flex" flexWrap="wrap" gap={0.5}>
                      {account.linked_categories && account.linked_categories.length > 0 ? (
                        account.linked_categories.map((category) => (
                          <Chip
                            key={category}
                            label={category}
                            size="small"
                            color="info"
                            variant="outlined"
                          />
                        ))
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          No categories linked
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {account.description || 'No description'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">
                      {new Date(account.created_at).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="View Transactions">
                      <IconButton size="small">
                        <Visibility />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit Account">
                      <IconButton size="small">
                        <Edit />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Create Account Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center">
            <AddIcon sx={{ mr: 1 }} />
            Create New Credit Account
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} pt={1}>
            <TextField
              label="Account Name"
              value={newAccount.name}
              onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
              placeholder="e.g., Adults Credit Account"
              required
              fullWidth
            />
            <TextField
              label="Description"
              value={newAccount.description}
              onChange={(e) => setNewAccount({ ...newAccount, description: e.target.value })}
              placeholder="Optional description"
              multiline
              rows={2}
              fullWidth
            />
            <TextField
              label="Initial Balance"
              type="number"
              value={newAccount.initialBalance}
              onChange={(e) => setNewAccount({ ...newAccount, initialBalance: parseFloat(e.target.value) || 0 })}
              placeholder="0.00"
              InputProps={{
                startAdornment: <Typography sx={{ mr: 1 }}>EGP</Typography>
              }}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateAccount}
            variant="contained"
            disabled={!newAccount.name.trim()}
          >
            Create Account
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CreditAccountsPanel;