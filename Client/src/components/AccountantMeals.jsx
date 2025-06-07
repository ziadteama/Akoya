// AccountantMeals.jsx
import React, { useState, useEffect, useRef } from "react";
import {
  TextField, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Typography, Button, IconButton, Box, Fab, Switch, FormControlLabel
} from "@mui/material";
import { Add, Edit, Save, ArrowDownward } from "@mui/icons-material";
import axios from "axios";
// Remove config import
import { notify, confirmToast } from '../utils/toast';

const AccountantMeals = () => {
  const [meals, setMeals] = useState([]);
  const [editing, setEditing] = useState({});
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const bottomRef = useRef(null);

  const baseUrl = window.runtimeConfig?.apiBaseUrl;

  useEffect(() => { fetchMeals(); }, [showArchived]);

  const fetchMeals = async () => {
    if (!baseUrl) {
      notify.error("API configuration not available");
      return;
    }
    
    try {
      const { data } = await axios.get(`${baseUrl}/api/meals?archived=${showArchived}`);
      setMeals(data);
    } catch (err) {
      console.error("Error fetching meals:", err);
      notify.error("Failed to fetch meals");
    }
  };

  const handleEditPrice = (id, value) => {
    setMeals(prev => prev.map(meal => meal.id === id ? { ...meal, price: value } : meal));
  };

  const handleSave = async (id, price) => {
    if (!baseUrl) {
      notify.error("API configuration not available");
      return;
    }
    
    try {
      await axios.put(`${baseUrl}/api/meals/edit`, {
        meals: [{ 
          id, 
          name: meals.find(m => m.id === id).name, 
          description: meals.find(m => m.id === id).description, 
          price, 
          age_group: meals.find(m => m.id === id).age_group 
        }]
      });
      setEditing(prev => ({ ...prev, [id]: false }));
      fetchMeals();
      notify.success("Price updated successfully");
    } catch (err) {
      console.error("Error saving:", err);
      notify.error("Failed to update price");
    }
  };

  const handleAddMeal = async () => {
    if (!baseUrl) {
      notify.error("API configuration not available");
      return;
    }
    
    // Make name and price required, but description optional
    if (!newName.trim() || !newPrice || Number(newPrice) <= 0) {
      notify.warning("Name and valid price are required");
      return;
    }

    try {
      // Use empty string if description is not provided
      const description = newDescription.trim() || "";
      
      await axios.post(`${baseUrl}/api/meals/add`, {
        meals: [{
          name: newName,
          description: description,
          price: newPrice,
          age_group: "adult"
        }]
      });
      
      setNewName("");
      setNewDescription("");
      setNewPrice("");
      fetchMeals();
      notify.success("New meal added successfully");
    } catch (err) {
      console.error("Error adding meals:", err);
      notify.error("Failed to add new meal");
    }
  };

  const handleToggleArchive = async (name, archived) => {
    if (!baseUrl) {
      notify.error("API configuration not available");
      return;
    }
    
    try {
      await axios.patch(`${baseUrl}/api/meals/archive`, { name, archived });
      notify.success(`${name} ${archived ? "archived" : "unarchived"} successfully`);
      fetchMeals();
    } catch (err) {
      console.error("Error archiving:", err);
      notify.error(`Failed to ${archived ? "archive" : "unarchive"} ${name}`);
    }
  };

  const zebraColors = ["#ffffff", "#E0F9FF"];

  return (
    <Paper sx={{ padding: 3, maxWidth: 1200, margin: "auto", marginTop: 3, background: "#F0F9FF", position: "relative" }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4" sx={{ color: "#007EA7", fontWeight: 600 }}>
          Manage Meals
        </Typography>
        <FormControlLabel
          control={<Switch checked={!showArchived} onChange={(e) => setShowArchived(!e.target.checked)} />}
          label={!showArchived ? "Showing Active" : "Showing Archived"}
        />
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              {["Name", "Age Group", "Description", "Price", "Actions"].map(head => (
                <TableCell key={head} align="center" sx={{ backgroundColor: "#00AEEF", color: "#fff", fontWeight: "bold" }}>
                  {head}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {meals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">No Meals Available</TableCell>
              </TableRow>
            ) : (
              meals.map((meal, i) => (
                <TableRow key={meal.id} sx={{ backgroundColor: zebraColors[i % 2] }}>
                  <TableCell align="center">
                    <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
                      <Typography sx={{ fontWeight: "bold", fontSize: "1.1rem", color: "#007EA7" }}>{meal.name}</Typography>
                      <Button
                        variant="outlined"
                        size="small"
                        color={meal.archived ? "success" : "error"}
                        onClick={() => {
                          confirmToast(
                            `${meal.archived ? "Unarchive" : "Archive"} ${meal.name}?`,
                            () => handleToggleArchive(meal.name, !meal.archived)
                          );
                        }}
                      >
                        {meal.archived ? "Unarchive" : "Archive"}
                      </Button>
                    </Box>
                  </TableCell>
                  <TableCell align="center">{meal.age_group}</TableCell>
                  <TableCell align="center">{meal.description || "-"}</TableCell>
                  <TableCell align="center">
                    {editing[meal.id] ? (
                      <TextField
                        type="text"
                        inputProps={{ inputMode: "numeric", pattern: "[0-9]*", min: 0 }}
                        value={meal.price}
                        onChange={(e) => handleEditPrice(meal.id, e.target.value)}
                        size="small"
                        sx={{ width: "100px" }}
                      />
                    ) : (
                      `${meal.price} EGP`
                    )}
                  </TableCell>
                  <TableCell align="center">
                    {editing[meal.id] ? (
                      <IconButton onClick={() => handleSave(meal.id, meal.price)}>
                        <Save sx={{ color: "#00AEEF" }} />
                      </IconButton>
                    ) : (
                      <IconButton onClick={() => setEditing((prev) => ({ ...prev, [meal.id]: true }))}>
                        <Edit sx={{ color: "#007EA7" }} />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Paper sx={{ padding: 3, marginTop: 3, backgroundColor: "#E4F8FC" }} ref={bottomRef}>
        <Typography variant="h6" sx={{ color: "#007EA7" }}>Add New Meal</Typography>
        <TextField 
          label="Meal Name" 
          fullWidth 
          sx={{ mb: 2 }} 
          value={newName} 
          onChange={(e) => setNewName(e.target.value)} 
          required
        />
        <TextField 
          label="Description (Optional)" 
          fullWidth 
          sx={{ mb: 2 }} 
          value={newDescription} 
          onChange={(e) => setNewDescription(e.target.value)}
          helperText="Optional field for additional details"
        />
        <TextField
          label="Price"
          fullWidth
          type="text"
          inputProps={{ inputMode: "numeric", pattern: "[0-9]*", min: 0 }}
          value={newPrice}
          onChange={(e) => setNewPrice(e.target.value)}
          sx={{ mb: 2 }}
          required
        />
        <Button variant="contained" startIcon={<Add />} onClick={handleAddMeal} sx={{ backgroundColor: "#00AEEF", "&:hover": { backgroundColor: "#00C2CB" } }}>
          Add Meal
        </Button>
      </Paper>

      <Fab color="primary" size="small" sx={{ position: "fixed", bottom: 24, right: 24, backgroundColor: "#00AEEF", "&:hover": { backgroundColor: "#00C2CB" } }} onClick={() => bottomRef.current?.scrollIntoView({ behavior: "smooth" })}>
        <ArrowDownward />
      </Fab>
    </Paper>
  );
};

export default AccountantMeals;