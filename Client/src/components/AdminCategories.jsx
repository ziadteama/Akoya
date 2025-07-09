import React, { useState, useEffect } from "react";
import {
  Box, Paper, Typography, Button, IconButton, TextField, Table, 
  TableBody, TableCell, TableContainer, TableHead, TableRow, 
  Switch, FormControlLabel, Grid, CircularProgress,
  Chip, Divider, Card, CardContent, CardActions, Stack,
  useMediaQuery, useTheme
} from "@mui/material";
import axios from "axios";

// Icons
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import ArchiveIcon from '@mui/icons-material/Archive';
import UnarchiveIcon from '@mui/icons-material/Unarchive';
import RefreshIcon from '@mui/icons-material/Refresh';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import CancelIcon from '@mui/icons-material/Cancel';
import { notify, confirmToast } from '../utils/toast';

const AdminCategories = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // State for categories data
  const [categories, setCategories] = useState({});
  const [editing, setEditing] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  
  // New category form state
  const [newCategory, setNewCategory] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPrices, setNewPrices] = useState({ child: "", adult: "", grand: "" });
  
  // Save original ticket values for comparison
  const [originalTickets, setOriginalTickets] = useState({});

  // Fetch categories on component mount and when showArchived changes
  useEffect(() => {
    fetchCategories();
  }, [showArchived]);

  // Fetch categories from API
  const fetchCategories = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('authToken');
      const baseUrl = window.runtimeConfig?.apiBaseUrl;
      
      if (!token) {
        setError('Authentication required. Please log in again.');
        notify.error('Authentication required. Please log in again.');
        setLoading(false);
        return;
      }
      
      const { data } = await axios.get(`${baseUrl}/api/tickets/ticket-types`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Filter categories based on archived status
      const filtered = data.filter(ticket => ticket.archived === showArchived);
      
      // Group tickets by category
      const grouped = filtered.reduce((acc, ticket) => {
        if (!acc[ticket.category]) acc[ticket.category] = [];
        acc[ticket.category].push(ticket);
        return acc;
      }, {});
      
      // Sort subcategories in a specific order
      Object.keys(grouped).forEach((cat) => {
        grouped[cat].sort((a, b) => {
          const order = ["child", "adult", "grand"];
          return order.indexOf(a.subcategory) - order.indexOf(b.subcategory);
        });
      });
      
      // Store original tickets for comparison
      const originals = {};
      Object.values(grouped).flat().forEach(ticket => {
        originals[ticket.id] = { ...ticket };
      });
      setOriginalTickets(originals);
      
      setCategories(grouped);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setError('Failed to fetch ticket categories. Please try again.');
      notify.error('Failed to fetch ticket categories. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle starting edit mode
  const handleStartEditing = (id) => {
    // Store the original value before editing
    if (!originalTickets[id]) {
      const ticket = Object.values(categories).flat().find(t => t.id === id);
      if (ticket) {
        setOriginalTickets(prev => ({
          ...prev,
          [id]: { ...ticket }
        }));
      }
    }
    
    setEditing({...editing, [id]: true});
  };

  // Handle canceling edit
  const handleCancelEdit = (id) => {
    // Restore original value
    const originalTicket = originalTickets[id];
    if (originalTicket) {
      setCategories(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(category => {
          updated[category] = updated[category].map(ticket =>
            ticket.id === id ? { ...originalTicket } : ticket
          );
        });
        return updated;
      });
    }
    setEditing(prev => ({ ...prev, [id]: false }));
  };

  // Handle editing ticket price
  const handleEditPrice = (id, value) => {
    setCategories(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(category => {
        updated[category] = updated[category].map(ticket =>
          ticket.id === id ? { ...ticket, price: value } : ticket
        );
      });
      return updated;
    });
  };

  // Save edited ticket price
  const handleSave = async (id, price) => {
    try {
      const originalTicket = originalTickets[id];
      
      // Check if anything actually changed
      if (originalTicket && parseFloat(originalTicket.price) === parseFloat(price)) {
        // No changes detected, just exit edit mode without API call
        setEditing(prev => ({ ...prev, [id]: false }));
        notify.info('No changes detected');
        return;
      }
      
      const token = localStorage.getItem('authToken');
      const baseUrl = window.runtimeConfig?.apiBaseUrl;
      
      await axios.patch(`${baseUrl}/api/tickets/update-price`, 
        { tickets: [{ id, price }] },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setEditing(prev => ({ ...prev, [id]: false }));
      
      notify.success('Price updated successfully');
      
      // Update our stored original after successful update
      const ticket = Object.values(categories).flat().find(t => t.id === id);
      if (ticket) {
        setOriginalTickets(prev => ({
          ...prev,
          [id]: { ...ticket }
        }));
      }
      
      fetchCategories();
    } catch (error) {
      console.error('Error saving price:', error);
      notify.error('Failed to update price');
    }
  };

  // Add new category with subcategories
  const handleAddCategory = async () => {
    // Validate inputs
    if (!newCategory.trim() || !newDescription.trim() || 
        Object.values(newPrices).some(p => !p || Number(p) <= 0)) {
      notify.error('All fields are required and prices must be greater than 0');
      return;
    }
    
    try {
      const token = localStorage.getItem('authToken');
      const baseUrl = window.runtimeConfig?.apiBaseUrl;
      
      await axios.post(`${baseUrl}/api/tickets/add-type`, 
        {
          ticketTypes: ["child", "adult", "grand"].map(type => ({
            category: newCategory,
            subcategory: type,
            price: newPrices[type],
            description: newDescription,
          })),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Reset form
      setNewCategory("");
      setNewDescription("");
      setNewPrices({ child: "", adult: "", grand: "" });
      
      notify.success('Category added successfully');
      
      // Refresh categories list
      fetchCategories();
    } catch (error) {
      console.error('Error adding category:', error);
      notify.error('Failed to add category');
    }
  };

  // Toggle category archive status
  const handleToggleArchive = async (categoryName, archived) => {
    try {
      const token = localStorage.getItem('authToken');
      const baseUrl = window.runtimeConfig?.apiBaseUrl;
      
      await axios.patch(`${baseUrl}/api/tickets/archive-category`, 
        { category: categoryName, archived },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      notify.success(`${categoryName} ${archived ? 'archived' : 'unarchived'} successfully`);
      
      // Refresh categories list
      fetchCategories();
    } catch (error) {
      console.error('Error toggling archive status:', error);
      notify.error('Failed to update category archive status');
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

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      {/* Header and Controls */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: { xs: 'flex-start', sm: 'center' },
        flexDirection: { xs: 'column', sm: 'row' },
        gap: { xs: 1.5, sm: 0 },
        mb: 3 
      }}>
        <Typography variant={isMobile ? "h6" : "h5"} fontWeight="bold">
          Ticket Categories Management
        </Typography>
        
        {/* Mobile-Friendly Controls */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: { xs: 1, sm: 2 },
          flexDirection: { xs: 'row', sm: 'row' },
          width: { xs: '100%', sm: 'auto' },
          justifyContent: { xs: 'space-between', sm: 'flex-end' }
        }}>
          {/* Compact Toggle Switch */}
          <FormControlLabel
            control={
              <Switch 
                checked={!showArchived}
                onChange={(e) => setShowArchived(!e.target.checked)}
                size="small"
              />
            }
            label={
              <Typography 
                variant="body2" 
                sx={{ 
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  fontWeight: 'medium'
                }}
              >
                {!showArchived ? "Active" : "Archived"}
              </Typography>
            }
            sx={{ 
              margin: 0,
              '& .MuiFormControlLabel-label': {
                paddingLeft: { xs: 0.5, sm: 1 }
              }
            }}
          />
          
          {/* Compact Refresh Button */}
          <Button
            variant="outlined"
            startIcon={<RefreshIcon fontSize="small" />}
            onClick={fetchCategories}
            size="small"
            sx={{
              minWidth: { xs: 'auto', sm: '100px' },
              padding: { xs: '4px 8px', sm: '6px 16px' },
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
              '& .MuiButton-startIcon': {
                marginRight: { xs: 0.5, sm: 1 }
              }
            }}
          >
            {isSmallMobile ? '' : 'Refresh'}
          </Button>
        </Box>
      </Box>

      {/* Responsive Categories Display */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={isMobile ? 24 : 32} />
        </Box>
      ) : error ? (
        <Paper sx={{ p: { xs: 2, sm: 3 }, textAlign: 'center', borderRadius: 2 }}>
          <Typography color="error" variant="body2">{error}</Typography>
          <Button
            variant="outlined"
            onClick={fetchCategories}
            sx={{ mt: 2 }}
            size={isSmallMobile ? "small" : "medium"}
          >
            Retry
          </Button>
        </Paper>
      ) : Object.keys(categories).length === 0 ? (
        <Paper sx={{ p: { xs: 2, sm: 3 }, textAlign: 'center', borderRadius: 2 }}>
          <Typography variant="body2">No categories found</Typography>
        </Paper>
      ) : (
        <>
          {/* Mobile Card View */}
          {isMobile ? (
            <Box sx={{ mb: 4 }}>
              {Object.entries(categories).map(([categoryName, tickets]) => (
                <Card key={categoryName} sx={{ 
                  mb: 3, 
                  borderRadius: 2,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  borderLeft: '4px solid #00B4D8'
                }}>
                  <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                    {/* Category Header */}
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'flex-start',
                      mb: 2 
                    }}>
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <ConfirmationNumberIcon color="primary" fontSize="small" />
                          <Typography variant="subtitle1" fontWeight="bold">
                            {categoryName}
                          </Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          {tickets[0]?.description}
                        </Typography>
                      </Box>
                      
                      <Chip 
                        label={tickets[0]?.archived ? 'Archived' : 'Active'}
                        color={tickets[0]?.archived ? 'default' : 'success'}
                        size="small"
                        variant="outlined"
                      />
                    </Box>

                    {/* Subcategories */}
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                        Subcategories & Prices
                      </Typography>
                      {tickets.map((ticket) => (
                        <Box key={ticket.id} sx={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          mb: 1,
                          p: 1,
                          bgcolor: 'grey.50',
                          borderRadius: 1
                        }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip 
                              label={ticket.subcategory.charAt(0).toUpperCase() + ticket.subcategory.slice(1)}
                              size="small"
                              color={
                                ticket.subcategory === 'adult' ? 'primary' : 
                                ticket.subcategory === 'child' ? 'secondary' : 
                                'default'
                              }
                              variant="outlined"
                            />
                          </Box>
                          
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {editing[ticket.id] ? (
                              <>
                                <TextField
                                  type="number"
                                  value={ticket.price}
                                  onChange={(e) => handleEditPrice(ticket.id, e.target.value)}
                                  size="small"
                                  sx={{ width: '80px' }}
                                  inputProps={{ min: 0, step: 0.01 }}
                                />
                                <IconButton
                                  size="small"
                                  color="inherit"
                                  onClick={() => handleCancelEdit(ticket.id)}
                                  sx={{ p: 0.5 }}
                                >
                                  <CancelIcon fontSize="small" />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={() => handleSave(ticket.id, ticket.price)}
                                  sx={{ p: 0.5 }}
                                >
                                  <SaveIcon fontSize="small" />
                                </IconButton>
                              </>
                            ) : (
                              <>
                                <Typography variant="body2" fontWeight="bold" color="success.main">
                                  {formatCurrency(ticket.price)}
                                </Typography>
                                <IconButton
                                  size="small"
                                  color="info"
                                  onClick={() => handleStartEditing(ticket.id)}
                                  sx={{ p: 0.5 }}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </>
                            )}
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  </CardContent>

                  {/* Category Actions */}
                  <CardActions sx={{ 
                    px: { xs: 1.5, sm: 2 }, 
                    pb: { xs: 1.5, sm: 2 },
                    pt: 0,
                    justifyContent: 'center'
                  }}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={tickets[0]?.archived ? <UnarchiveIcon fontSize="small" /> : <ArchiveIcon fontSize="small" />}
                      color={tickets[0]?.archived ? "success" : "warning"}
                      onClick={() => {
                        const confirmMsg = tickets[0]?.archived
                          ? `This will make "${categoryName}" tickets available again. Continue?`
                          : `This will hide "${categoryName}" tickets from new orders. Continue?`;
                        
                        confirmToast(confirmMsg, () => {
                          handleToggleArchive(categoryName, !tickets[0]?.archived);
                        });
                      }}
                      fullWidth
                    >
                      {tickets[0]?.archived ? 'Restore (Make Active)' : 'Archive (Hide)'}
                    </Button>
                  </CardActions>
                </Card>
              ))}
            </Box>
          ) : (
            /* Desktop Table View */
            <Paper sx={{ width: '100%', overflow: 'hidden', borderRadius: 2, mb: 4 }}>
              <TableContainer sx={{ maxHeight: 'calc(100vh - 400px)' }}>
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>Category</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Subcategory</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Description</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }} align="right">Price</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Object.entries(categories).map(([categoryName, tickets]) => (
                      <React.Fragment key={categoryName}>
                        {tickets.map((ticket, index) => (
                          <TableRow 
                            hover
                            key={ticket.id}
                            sx={{
                              '& td': { py: 1.5 },
                              borderLeft: index === 0 ? `4px solid #00B4D8` : 'none',
                            }}
                          >
                            {index === 0 && (
                              <TableCell 
                                rowSpan={tickets.length}
                                sx={{ 
                                  verticalAlign: 'top', 
                                  pt: 2,
                                }}
                              >
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <ConfirmationNumberIcon color="primary" fontSize="small" />
                                    <Typography fontWeight="bold">{categoryName}</Typography>
                                    {ticket.archived && (
                                      <Chip label="Archived" size="small" color="default" variant="outlined" />
                                    )}
                                  </Box>
                                  
                                  {/* Archive/Unarchive Button */}
                                  <Box sx={{ marginTop: 1 }}>
                                    <Button
                                      variant="outlined"
                                      startIcon={ticket.archived ? <UnarchiveIcon /> : <ArchiveIcon />}
                                      size="small"
                                      color={ticket.archived ? "success" : "info"}
                                      sx={{ 
                                        borderRadius: 2,
                                        textTransform: 'none',
                                        px: 2,
                                        '&:hover': {
                                          backgroundColor: ticket.archived ? 'rgba(46, 125, 50, 0.08)' : 'rgba(2, 136, 209, 0.08)'
                                        }
                                      }}
                                      onClick={() => {
                                        const confirmMsg = ticket.archived
                                          ? `This will make "${categoryName}" tickets available again. Continue?`
                                          : `This will hide "${categoryName}" tickets from new orders. Continue?`;
                                        
                                        confirmToast(confirmMsg, () => {
                                          handleToggleArchive(categoryName, !ticket.archived);
                                        });
                                      }}
                                    >
                                      {ticket.archived ? (
                                        <>
                                          <span>Restore</span>
                                          <Typography variant="caption" component="span" sx={{ ml: 0.5, opacity: 0.7 }}>
                                            (Make Active)
                                          </Typography>
                                        </>
                                      ) : (
                                        <>
                                          <span>Archive</span>
                                          <Typography variant="caption" component="span" sx={{ ml: 0.5, opacity: 0.7 }}>
                                            (Hide)
                                          </Typography>
                                        </>
                                      )}
                                    </Button>
                                  </Box>
                                </Box>
                              </TableCell>
                            )}
                            
                            <TableCell>
                              <Chip 
                                label={ticket.subcategory.charAt(0).toUpperCase() + ticket.subcategory.slice(1)}
                                size="small"
                                color={
                                  ticket.subcategory === 'adult' ? 'primary' : 
                                  ticket.subcategory === 'child' ? 'secondary' : 
                                  'default'
                                }
                                variant="outlined"
                              />
                            </TableCell>
                            
                            <TableCell>
                              <Typography variant="body2">{ticket.description}</Typography>
                            </TableCell>
                            
                            <TableCell align="right">
                              {editing[ticket.id] ? (
                                <TextField
                                  type="number"
                                  value={ticket.price}
                                  onChange={(e) => handleEditPrice(ticket.id, e.target.value)}
                                  size="small"
                                  sx={{ width: '100px' }}
                                  inputProps={{ min: 0, step: 0.01 }}
                                />
                              ) : (
                                <Typography fontWeight="medium">{formatCurrency(ticket.price)}</Typography>
                              )}
                            </TableCell>
                            
                            <TableCell align="center">
                              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                                {editing[ticket.id] ? (
                                  <>
                                    <IconButton
                                      color="inherit"
                                      onClick={() => handleCancelEdit(ticket.id)}
                                      title="Cancel"
                                    >
                                      <CancelIcon />
                                    </IconButton>
                                    <IconButton
                                      color="primary"
                                      onClick={() => handleSave(ticket.id, ticket.price)}
                                      title="Save"
                                    >
                                      <SaveIcon />
                                    </IconButton>
                                  </>
                                ) : (
                                  <IconButton
                                    color="info"
                                    onClick={() => handleStartEditing(ticket.id)}
                                    title="Edit"
                                  >
                                    <EditIcon />
                                  </IconButton>
                                )}
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))}
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}
        </>
      )}

      {/* Add New Category Section */}
      <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2 }}>
        <Typography variant={isMobile ? "subtitle1" : "h6"} fontWeight="bold" mb={2}>
          Add New Category
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              label="Category Name"
              fullWidth
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              size={isSmallMobile ? "small" : "medium"}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Description"
              fullWidth
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              size={isSmallMobile ? "small" : "medium"}
            />
          </Grid>
          
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="text.secondary" mb={1}>
              Set prices for each age group:
            </Typography>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <TextField
              label="Child Price"
              fullWidth
              type="number"
              value={newPrices.child}
              onChange={(e) => setNewPrices(prev => ({ ...prev, child: e.target.value }))}
              inputProps={{ min: 0, step: 0.01 }}
              size={isSmallMobile ? "small" : "medium"}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="Adult Price"
              fullWidth
              type="number"
              value={newPrices.adult}
              onChange={(e) => setNewPrices(prev => ({ ...prev, adult: e.target.value }))}
              inputProps={{ min: 0, step: 0.01 }}
              size={isSmallMobile ? "small" : "medium"}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="Grand Price"
              fullWidth
              type="number"
              value={newPrices.grand}
              onChange={(e) => setNewPrices(prev => ({ ...prev, grand: e.target.value }))}
              inputProps={{ min: 0, step: 0.01 }}
              size={isSmallMobile ? "small" : "medium"}
            />
          </Grid>
          
          <Grid item xs={12}>
            <Button
              variant="contained"
              startIcon={<AddIcon fontSize={isSmallMobile ? "small" : "medium"} />}
              onClick={handleAddCategory}
              size={isSmallMobile ? "small" : "medium"}
              fullWidth={isSmallMobile}
            >
              Add Category
            </Button>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default AdminCategories;