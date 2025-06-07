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
  Chip
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
// Remove config import
// import config from '../../../config';
import { notify, confirmToast } from '../utils/toast';

const AdminMeals = () => {
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
    age_group: 'adult' // Keep the default value but will hide the input
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

  const baseUrl = window.runtimeConfig?.apiBaseUrl;
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

  const baseUrl = window.runtimeConfig?.apiBaseUrl;
      if (meal) {
        setOriginalMeals(prev => ({
          ...prev,
          [id]: { ...meal }
        }));
      }
    }
    
    setEditing({...editing, [id]: true});
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
    <Box>
      {/* Header and Controls */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center', 
        mb: 3 
      }}>
        <Typography variant="h5" fontWeight="bold">
          Meal Management
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FormControlLabel
            control={
              <Switch 
                checked={!showArchived}
                onChange={(e) => setShowArchived(!e.target.checked)}
              />
            }
            label={!showArchived ? "Active Meals" : "Archived Meals"}
          />
          
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchMeals}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Meals Table */}
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
              onClick={fetchMeals}
              sx={{ mt: 2 }}
            >
              Retry
            </Button>
          </Box>
        ) : meals.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography>No meals found</Typography>
          </Box>
        ) : (
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
                          <IconButton
                            color="primary"
                            onClick={() => handleSaveMeal(meal.id)}
                          >
                            <SaveIcon />
                          </IconButton>
                        ) : (
                          <IconButton
                            color="info"
                            onClick={() => handleStartEditing(meal.id)}
                          >
                            <EditIcon />
                          </IconButton>
                        )}
                        
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
                        >
                          {meal.archived ? <UnarchiveIcon /> : <ArchiveIcon />}
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Add New Meal Section */}
      <Paper sx={{ p: 3, borderRadius: 2 }}>
        <Typography variant="h6" fontWeight="bold" mb={2}>
          Add New Meal
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              label="Meal Name"
              fullWidth
              value={newMeal.name}
              onChange={(e) => handleMealFormChange('name', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Price"
              fullWidth
              type="number"
              value={newMeal.price}
              onChange={(e) => handleMealFormChange('price', e.target.value)}
              inputProps={{ min: 0, step: 0.01 }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={2}
              value={newMeal.description}
              onChange={(e) => handleMealFormChange('description', e.target.value)}
            />
          </Grid>
          <Grid item xs={12}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddMeal}
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
