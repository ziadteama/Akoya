import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Switch,
  FormControlLabel,
  CircularProgress,
  Divider,
  Card,
  CardContent,
  Grid,
  Fab,
  Chip,
  useMediaQuery,
  useTheme,
  Stack,
  CardActions
} from '@mui/material';
import axios from 'axios';

// Icons
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import ArchiveIcon from '@mui/icons-material/Archive';
import UnarchiveIcon from '@mui/icons-material/Unarchive';
import RefreshIcon from '@mui/icons-material/Refresh';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import CancelIcon from '@mui/icons-material/Cancel';
import { notify, confirmToast } from '../utils/toast';

const AdminMeals = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState({});
  const [showArchived, setShowArchived] = useState(false);
  
  // New meal form
  const [newMeal, setNewMeal] = useState({
    name: '',
    description: '',
    price: '',
    age_group: 'adult'
  });
  
  // Save original meal values for comparison
  const [originalMeals, setOriginalMeals] = useState({});

  // Fetch meals on component mount and when showArchived changes
  useEffect(() => {
    fetchMeals();
  }, [showArchived]);

  // Fetch meals from API
  const fetchMeals = async () => {
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
      
      const response = await axios.get(`${baseUrl}/api/meals`, { 
        params: { archived: showArchived },
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (Array.isArray(response.data)) {
        setMeals(response.data);
        
        // Store original meals for comparison
        const originals = {};
        response.data.forEach(meal => {
          originals[meal.id] = { ...meal };
        });
        setOriginalMeals(originals);
      } else {
        setError('Unexpected data format received');
        notify.error('Unexpected data format received');
        setMeals([]);
      }
    } catch (error) {
      console.error('Error fetching meals:', error);
      setError('Failed to fetch meals. Please try again.');
      notify.error('Failed to fetch meals. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle meal form input change
  const handleMealFormChange = (field, value) => {
    setNewMeal(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle starting edit mode
  const handleStartEditing = (id) => {
    // Store the original value before editing
    if (!originalMeals[id]) {
      const meal = meals.find(m => m.id === id);
      if (meal) {
        setOriginalMeals(prev => ({
          ...prev,
          [id]: { ...meal }
        }));
      }
    }
    
    setEditing({...editing, [id]: true});
  };

  // Handle canceling edit
  const handleCancelEdit = (id) => {
    // Restore original value
    const originalMeal = originalMeals[id];
    if (originalMeal) {
      setMeals(meals.map(meal => 
        meal.id === id ? { ...originalMeal } : meal
      ));
    }
    setEditing(prev => ({ ...prev, [id]: false }));
  };

  // Handle edit meal price
  const handleEditPrice = (id, value) => {
    setMeals(meals.map(meal => 
      meal.id === id ? { ...meal, price: value } : meal
    ));
  };

  // Save edited meal - add check for actual changes
  const handleSaveMeal = async (id) => {
    try {
      const mealToUpdate = meals.find(meal => meal.id === id);
      
      if (!mealToUpdate) return;
      
      // Check if anything actually changed
      const originalMeal = originalMeals[id];
      
      if (originalMeal && 
          parseFloat(originalMeal.price) === parseFloat(mealToUpdate.price)) {
        // No changes detected, just exit edit mode without API call
        setEditing(prev => ({ ...prev, [id]: false }));
        notify.info('No changes detected');
        return;
      }
      
      const token = localStorage.getItem('authToken');
      const baseUrl = window.runtimeConfig?.apiBaseUrl;
      
      await axios.put(
        `${baseUrl}/api/meals/edit`,
        {
          meals: [{
            id,
            name: mealToUpdate.name,
            description: mealToUpdate.description,
            price: mealToUpdate.price,
            age_group: mealToUpdate.age_group
          }]
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setEditing(prev => ({ ...prev, [id]: false }));
      notify.success('Meal updated successfully');
      
      // Update our stored original after successful update
      setOriginalMeals(prev => ({
        ...prev,
        [id]: { ...mealToUpdate }
      }));
      
      fetchMeals();
    } catch (error) {
      console.error('Error saving meal:', error);
      notify.error('Failed to update meal');
    }
  };

  // Add new meal
  const handleAddMeal = async () => {
    // Validate inputs
    if (!newMeal.name.trim() || !newMeal.description.trim() || !newMeal.price || Number(newMeal.price) <= 0) {
      notify.error('All fields are required and price must be greater than 0');
      return;
    }
    
    try {
      const token = localStorage.getItem('authToken');
      const baseUrl = window.runtimeConfig?.apiBaseUrl;
      
      await axios.post(
        `${baseUrl}/api/meals/add`,
        {
          meals: [{
            name: newMeal.name,
            description: newMeal.description,
            price: newMeal.price,
            age_group: newMeal.age_group
          }]
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Reset form
      setNewMeal({
        name: '',
        description: '',
        price: '',
        age_group: 'adult'
      });
      
      notify.success('Meal added successfully');
      
      // Refresh meals list
      fetchMeals();
    } catch (error) {
      console.error('Error adding meal:', error);
      notify.error('Failed to add meal');
    }
  };

  // Toggle meal archive status
  const handleToggleArchive = async (name, archived) => {
    try {
      const token = localStorage.getItem('authToken');
      const baseUrl = window.runtimeConfig?.apiBaseUrl;
      
      await axios.patch(
        `${baseUrl}/api/meals/archive`,
        { name, archived },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      notify.success(`${name} ${archived ? 'archived' : 'unarchived'} successfully`);
      
      // Refresh meals list
      fetchMeals();
    } catch (error) {
      console.error('Error toggling archive status:', error);
      notify.error('Failed to update meal archive status');
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
          Meal Management
        </Typography>
        
        {/* Mobile-Friendly Controls */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: { xs: 1, sm: 2 },
          flexDirection: { xs: 'row', sm: 'row' }, // Keep row layout even on mobile
          width: { xs: '100%', sm: 'auto' },
          justifyContent: { xs: 'space-between', sm: 'flex-end' }
        }}>
          {/* Compact Toggle Switch */}
          <FormControlLabel
            control={
              <Switch 
                checked={!showArchived}
                onChange={(e) => setShowArchived(!e.target.checked)}
                size="small" // Always small for better mobile experience
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
            onClick={fetchMeals}
            size="small" // Always small for consistency
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

      {/* Responsive Meals Display */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={isMobile ? 24 : 32} />
        </Box>
      ) : error ? (
        <Paper sx={{ p: { xs: 2, sm: 3 }, textAlign: 'center', borderRadius: 2 }}>
          <Typography color="error" variant="body2">{error}</Typography>
          <Button
            variant="outlined"
            onClick={fetchMeals}
            sx={{ mt: 2 }}
            size={isSmallMobile ? "small" : "medium"}
          >
            Retry
          </Button>
        </Paper>
      ) : meals.length === 0 ? (
        <Paper sx={{ p: { xs: 2, sm: 3 }, textAlign: 'center', borderRadius: 2 }}>
          <Typography variant="body2">No meals found</Typography>
        </Paper>
      ) : (
        <>
          {/* Mobile Card View */}
          {isMobile ? (
            <Box sx={{ mb: 4 }}>
              {meals.map((meal) => (
                <Card key={meal.id} sx={{ 
                  mb: 2, 
                  borderRadius: 2,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                  <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                    {/* Meal Header */}
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'flex-start',
                      mb: 1.5 
                    }}>
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <RestaurantIcon color="primary" fontSize="small" />
                          <Typography variant="subtitle1" fontWeight="bold" noWrap>
                            {meal.name}
                          </Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          {meal.description}
                        </Typography>
                      </Box>
                      
                      <Chip 
                        label={meal.archived ? 'Archived' : 'Active'}
                        color={meal.archived ? 'default' : 'success'}
                        size="small"
                        variant="outlined"
                      />
                    </Box>

                    {/* Price Section */}
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                        Price
                      </Typography>
                      {editing[meal.id] ? (
                        <TextField
                          type="number"
                          value={meal.price}
                          onChange={(e) => handleEditPrice(meal.id, e.target.value)}
                          size="small"
                          fullWidth
                          inputProps={{ min: 0, step: 0.01 }}
                          sx={{ maxWidth: '150px' }}
                        />
                      ) : (
                        <Typography variant="h6" fontWeight="bold" color="success.main">
                          {formatCurrency(meal.price)}
                        </Typography>
                      )}
                    </Box>
                  </CardContent>

                  {/* Action Buttons */}
                  <CardActions sx={{ 
                    px: { xs: 1.5, sm: 2 }, 
                    pb: { xs: 1.5, sm: 2 },
                    pt: 0,
                    justifyContent: 'flex-end',
                    gap: 1
                  }}>
                    {editing[meal.id] ? (
                      <>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<CancelIcon fontSize="small" />}
                          onClick={() => handleCancelEdit(meal.id)}
                          color="inherit"
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<SaveIcon fontSize="small" />}
                          onClick={() => handleSaveMeal(meal.id)}
                          color="primary"
                        >
                          Save
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<EditIcon fontSize="small" />}
                          onClick={() => handleStartEditing(meal.id)}
                          color="info"
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={meal.archived ? <UnarchiveIcon fontSize="small" /> : <ArchiveIcon fontSize="small" />}
                          onClick={() => {
                            const confirmMsg = meal.archived
                              ? `Unarchive ${meal.name}?`
                              : `Archive ${meal.name}?`;
                            
                            confirmToast(confirmMsg, () => {
                              handleToggleArchive(meal.name, !meal.archived);
                            });
                          }}
                          color={meal.archived ? "success" : "warning"}
                        >
                          {meal.archived ? 'Unarchive' : 'Archive'}
                        </Button>
                      </>
                    )}
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
                      <TableCell sx={{ fontWeight: 'bold' }}>Meal</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Description</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }} align="right">Price</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {meals.map((meal) => (
                      <TableRow 
                        hover
                        key={meal.id}
                      >
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <RestaurantIcon color="primary" fontSize="small" />
                            <Typography fontWeight="medium">{meal.name}</Typography>
                            {meal.archived && (
                              <Chip label="Archived" size="small" color="default" variant="outlined" />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{meal.description}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          {editing[meal.id] ? (
                            <TextField
                              type="number"
                              value={meal.price}
                              onChange={(e) => handleEditPrice(meal.id, e.target.value)}
                              size="small"
                              sx={{ width: '100px' }}
                              inputProps={{ min: 0, step: 0.01 }}
                            />
                          ) : (
                            <Typography fontWeight="medium">{formatCurrency(meal.price)}</Typography>
                          )}
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                            {editing[meal.id] ? (
                              <>
                                <IconButton
                                  color="inherit"
                                  onClick={() => handleCancelEdit(meal.id)}
                                  title="Cancel"
                                >
                                  <CancelIcon />
                                </IconButton>
                                <IconButton
                                  color="primary"
                                  onClick={() => handleSaveMeal(meal.id)}
                                  title="Save"
                                >
                                  <SaveIcon />
                                </IconButton>
                              </>
                            ) : (
                              <>
                                <IconButton
                                  color="info"
                                  onClick={() => handleStartEditing(meal.id)}
                                  title="Edit"
                                >
                                  <EditIcon />
                                </IconButton>
                                
                                <IconButton
                                  color={meal.archived ? "success" : "warning"}
                                  onClick={() => {
                                    const confirmMsg = meal.archived
                                      ? `Unarchive ${meal.name}?`
                                      : `Archive ${meal.name}?`;
                                    
                                    confirmToast(confirmMsg, () => {
                                      handleToggleArchive(meal.name, !meal.archived);
                                    });
                                  }}
                                  title={meal.archived ? "Unarchive" : "Archive"}
                                >
                                  {meal.archived ? <UnarchiveIcon /> : <ArchiveIcon />}
                                </IconButton>
                              </>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}
        </>
      )}

      {/* Add New Meal Section */}
      <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2 }}>
        <Typography variant={isMobile ? "subtitle1" : "h6"} fontWeight="bold" mb={2}>
          Add New Meal
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Meal Name"
              fullWidth
              value={newMeal.name}
              onChange={(e) => handleMealFormChange('name', e.target.value)}
              size={isSmallMobile ? "small" : "medium"}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Price"
              fullWidth
              type="number"
              value={newMeal.price}
              onChange={(e) => handleMealFormChange('price', e.target.value)}
              inputProps={{ min: 0, step: 0.01 }}
              size={isSmallMobile ? "small" : "medium"}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={isSmallMobile ? 2 : 3}
              value={newMeal.description}
              onChange={(e) => handleMealFormChange('description', e.target.value)}
              size={isSmallMobile ? "small" : "medium"}
            />
          </Grid>
          <Grid item xs={12}>
            <Button
              variant="contained"
              startIcon={<AddIcon fontSize={isSmallMobile ? "small" : "medium"} />}
              onClick={handleAddMeal}
              size={isSmallMobile ? "small" : "medium"}
              fullWidth={isSmallMobile}
            >
              Add Meal
            </Button>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default AdminMeals;