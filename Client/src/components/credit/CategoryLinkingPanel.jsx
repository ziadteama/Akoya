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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Grid,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  CircularProgress
} from '@mui/material';
import {
  Link as LinkIcon,
  LinkOff as UnlinkIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Category as CategoryIcon,
  AccountBalance
} from '@mui/icons-material';
import axios from 'axios';
import { notify } from '../../utils/toast';

const CategoryLinkingPanel = () => {
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [linkedCategories, setLinkedCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openLinkDialog, setOpenLinkDialog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('');
  const [processing, setProcessing] = useState(false);

  const baseUrl = window.runtimeConfig?.apiBaseUrl;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [accountsRes, categoriesRes, linkedRes] = await Promise.all([
        axios.get(`${baseUrl}/api/credits`),
        axios.get(`${baseUrl}/api/credits/categories/available`),
        axios.get(`${baseUrl}/api/credits/categories/linked`)
      ]);

      setAccounts(accountsRes.data);
      setCategories(categoriesRes.data);
      setLinkedCategories(linkedRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      notify.error('❌ Failed to fetch categories and accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleLinkCategory = async () => {
    if (!selectedCategory || !selectedAccount) {
      notify.error('⚠️ Please select both category and credit account');
      return;
    }

    try {
      setProcessing(true);
      await axios.post(`${baseUrl}/api/credits/link-category`, {
        categoryName: selectedCategory,
        creditAccountId: selectedAccount
      });

      notify.success('✅ Category linked to credit account successfully!');
      setOpenLinkDialog(false);
      setSelectedCategory('');
      setSelectedAccount('');
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Error linking category:', error);
      const message = error.response?.data?.error || 'Failed to link category';
      notify.error(`❌ ${message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleUnlinkCategory = async (categoryName, creditAccountId) => {
    try {
      await axios.delete(`${baseUrl}/api/credits/unlink-category`, {
        data: {
          categoryName: categoryName,
          creditAccountId: creditAccountId
        }
      });

      notify.success('✅ Category unlinked successfully!');
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Error unlinking category:', error);
      const message = error.response?.data?.error || 'Failed to unlink category';
      notify.error(`❌ ${message}`);
    }
  };

  const getUnlinkedCategories = () => {
    const linkedCategoryNames = linkedCategories.map(link => link.category_name);
    return categories.filter(category => !linkedCategoryNames.includes(category));
  };

  const formatBalance = (balance) => {
    const num = parseFloat(balance) || 0;
    return `EGP ${num.toFixed(2)}`;
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
          Loading categories and accounts...
        </Typography>
      </Box>
    );
  }

  const unlinkedCategories = getUnlinkedCategories();

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        🔗 Category Linking Management
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Link ticket categories to credit accounts for automatic credit deduction during sales
      </Typography>

      <Grid container spacing={3} sx={{ mt: 1 }}>
        {/* Link New Category */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                ➕ Link New Category
              </Typography>
              
              {unlinkedCategories.length === 0 ? (
                <Alert severity="info">
                  🎉 All categories are already linked to credit accounts!
                </Alert>
              ) : (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setOpenLinkDialog(true)}
                  fullWidth
                  sx={{
                    backgroundColor: '#00AEEF',
                    '&:hover': {
                      backgroundColor: '#007EA7'
                    }
                  }}
                >
                  Link Category to Account
                </Button>
              )}

              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  📊 Summary:
                </Typography>
                <Box display="flex" flexDirection="column" gap={1}>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2">Total Categories:</Typography>
                    <Chip label={categories.length} size="small" color="info" />
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2">Linked:</Typography>
                    <Chip label={linkedCategories.length} size="small" color="success" />
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2">Unlinked:</Typography>
                    <Chip label={unlinkedCategories.length} size="small" color="warning" />
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Current Links */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              🔗 Current Category Links
            </Typography>

            {linkedCategories.length === 0 ? (
              <Alert severity="info">
                📝 No categories are currently linked to credit accounts. Link categories to enable automatic credit deduction.
              </Alert>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Category</strong></TableCell>
                      <TableCell><strong>Credit Account</strong></TableCell>
                      <TableCell><strong>Account Balance</strong></TableCell>
                      <TableCell align="center"><strong>Actions</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {linkedCategories.map((link, index) => (
                      <TableRow key={index} sx={{ '&:hover': { backgroundColor: '#f5f5f5' } }}>
                        <TableCell>
                          <Box display="flex" alignItems="center">
                            <CategoryIcon sx={{ mr: 1, color: 'primary.main' }} />
                            <Chip
                              label={link.category_name}
                              size="small"
                              color="info"
                              variant="outlined"
                            />
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center">
                            <AccountBalance sx={{ mr: 1, color: 'primary.main' }} />
                            <Typography variant="body2">
                              {link.credit_account_name}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={formatBalance(link.balance)}
                            color={getBalanceColor(link.balance)}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="Unlink Category">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleUnlinkCategory(link.category_name, link.credit_account_id)}
                            >
                              <UnlinkIcon />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Unlinked Categories Display */}
      {unlinkedCategories.length > 0 && (
        <Paper sx={{ p: 2, mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            ⚠️ Unlinked Categories
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            These categories are not linked to any credit account and will require manual payment:
          </Typography>
          <Box display="flex" flexWrap="wrap" gap={1} mt={1}>
            {unlinkedCategories.map((category) => (
              <Chip
                key={category}
                label={category}
                color="warning"
                variant="outlined"
                icon={<CategoryIcon />}
              />
            ))}
          </Box>
        </Paper>
      )}

      {/* Link Category Dialog */}
      <Dialog open={openLinkDialog} onClose={() => setOpenLinkDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center">
            <LinkIcon sx={{ mr: 1, color: '#00AEEF' }} />
            Link Category to Credit Account
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={3} pt={1}>
            <Alert severity="info">
              Once linked, tickets from this category will automatically deduct from the selected credit account during sales.
            </Alert>

            <FormControl fullWidth>
              <InputLabel>Select Category</InputLabel>
              <Select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                label="Select Category"
              >
                {unlinkedCategories.map((category) => (
                  <MenuItem key={category} value={category}>
                    <Box display="flex" alignItems="center">
                      <CategoryIcon sx={{ mr: 1, color: 'primary.main' }} />
                      {category}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

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

            {selectedCategory && selectedAccount && (
              <Alert severity="success">
                <Typography variant="subtitle2">
                  Ready to Link:
                </Typography>
                <Typography variant="body2">
                  Category "{selectedCategory}" → {accounts.find(acc => acc.id == selectedAccount)?.name}
                </Typography>
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setOpenLinkDialog(false);
              setSelectedCategory('');
              setSelectedAccount('');
            }}
            variant="outlined"
          >
            Cancel
          </Button>
          <Button
            onClick={handleLinkCategory}
            variant="contained"
            disabled={processing || !selectedCategory || !selectedAccount}
            sx={{
              backgroundColor: '#00AEEF',
              '&:hover': {
                backgroundColor: '#007EA7'
              }
            }}
          >
            {processing ? <CircularProgress size={20} /> : 'Link Category'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CategoryLinkingPanel;