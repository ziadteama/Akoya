import React, { useState, useEffect } from "react";
import {
  Box, Paper, Typography, Button, IconButton, TextField, Table, 
  TableBody, TableCell, TableContainer, TableHead, TableRow, 
  Switch, FormControlLabel, Grid, CircularProgress,
  Chip, Divider
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
// Remove config import
// import config from '../../../config';
import { notify, confirmToast } from '../utils/toast';

const AdminCategories = () => {
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

  const baseUrl = window.runtimeConfig?.apiBaseUrl;
          return order.indexOf(a.subcategory) - order.indexOf(b.subcategory);
        });
      });
      
      setCategories(grouped);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setError('Failed to fetch ticket categories. Please try again.');
      notify.error('Failed to fetch ticket categories. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle editing ticket price
  const handleEditPrice = (id, value) => {
    setCategories(prev => {
      const updated = { ...prev };

  const baseUrl = window.runtimeConfig?.apiBaseUrl;
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
      const token = localStorage.getItem('authToken');

  const baseUrl = window.runtimeConfig?.apiBaseUrl;
      
      await axios.patch(`${baseUrl}/api/tickets/update-price`, 
        { tickets: [{ id, price }] },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setEditing(prev => ({ ...prev, [id]: false }));
      
      notify.success('Price updated successfully');
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

  return (
    <Box>
      {/* Header and Controls */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center', 
        mb: 3 
      }}>
        <Typography variant="h5" fontWeight="bold">
          Ticket Categories Management
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FormControlLabel
            control={
              <Switch 
                checked={!showArchived}
                onChange={(e) => setShowArchived(!e.target.checked)}
              />
            }
            label={!showArchived ? "Active Categories" : "Archived Categories"}
          />
          
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchCategories}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Categories Table */}
      <Paper sx={{ width: '100%', overflow: 'hidden', borderRadius: 2, mb: 4 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="error">{error}</Typography>
            <Button
              variant="outlined"
              onClick={fetchCategories}
              sx={{ mt: 2 }}
            >
              Retry
            </Button>
          </Box>
        ) : Object.keys(categories).length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography>No categories found</Typography>
          </Box>
        ) : (
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
                            <Typography fontWeight="medium">${parseFloat(ticket.price).toFixed(2)}</Typography>
                          )}
                        </TableCell>
                        
                        <TableCell align="center">
                          {editing[ticket.id] ? (
                            <IconButton
                              color="primary"
                              onClick={() => handleSave(ticket.id, ticket.price)}
                            >
                              <SaveIcon />
                            </IconButton>
                          ) : (
                            <IconButton
                              color="info"
                              onClick={() => setEditing({...editing, [ticket.id]: true})}
                            >
                              <EditIcon />
                            </IconButton>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Add New Category Section */}
      <Paper sx={{ p: 3, borderRadius: 2 }}>
        <Typography variant="h6" fontWeight="bold" mb={2}>
          Add New Category
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              label="Category Name"
              fullWidth
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Description"
              fullWidth
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
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
            />
          </Grid>
          
          <Grid item xs={12}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddCategory}
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
