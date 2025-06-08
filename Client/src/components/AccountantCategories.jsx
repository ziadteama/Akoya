import React, { useState, useEffect, useRef } from "react";
import {
  TextField, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Typography, Button, IconButton, Box, Fab, Switch, FormControlLabel,
  Dialog, DialogTitle, DialogContent, DialogActions
} from "@mui/material";
import { Add, Edit, Save, Cancel, ArrowDownward } from "@mui/icons-material";
import axios from "axios";
import { notify, confirmToast } from '../utils/toast';

const AccountantCategories = () => {
  const [categories, setCategories] = useState({});
  const [editing, setEditing] = useState({});
  const [newCategory, setNewCategory] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPrices, setNewPrices] = useState({ child: "", adult: "", grand: "" });
  const [showArchived, setShowArchived] = useState(false);
  
  // NEW: Enhanced editing state for category names
  const [editingCategoryNames, setEditingCategoryNames] = useState({});
  const [tempCategoryNames, setTempCategoryNames] = useState({});
  
  const bottomRef = useRef(null);
  const baseUrl = window.runtimeConfig?.apiBaseUrl;

  useEffect(() => { fetchCategories(); }, [showArchived]);

  const fetchCategories = async () => {
    if (!baseUrl) {
      notify.error("API configuration not available");
      return;
    }
    
    try {
      const { data } = await axios.get(`${baseUrl}/api/tickets/ticket-types`);
      const filtered = data.filter(ticket => ticket.archived === showArchived);
      const grouped = filtered.reduce((acc, ticket) => {
        if (!acc[ticket.category]) acc[ticket.category] = [];
        acc[ticket.category].push(ticket);
        return acc;
      }, {});
      Object.keys(grouped).forEach((cat) => {
        grouped[cat].sort((a, b) => {
          const order = ["child", "adult", "grand"];
          return order.indexOf(a.subcategory) - order.indexOf(b.subcategory);
        });
      });
      setCategories(grouped);
    } catch (err) {
      console.error("Error fetching:", err);
      notify.error("Failed to fetch categories");
    }
  };

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

  // NEW: Start editing a category (both name and prices)
  const handleStartEditing = (categoryName) => {
    // Set all tickets in this category to editing mode
    const categoryTickets = categories[categoryName] || [];
    const editingState = {};
    categoryTickets.forEach(ticket => {
      editingState[ticket.id] = true;
    });
    setEditing(prev => ({ ...prev, ...editingState }));
    
    // Set category name editing
    setEditingCategoryNames(prev => ({ ...prev, [categoryName]: true }));
    setTempCategoryNames(prev => ({ ...prev, [categoryName]: categoryName }));
  };

  // NEW: Cancel editing for a category
  const handleCancelEditing = (categoryName) => {
    // Reset prices to original values
    fetchCategories();
    
    // Remove from editing states
    const categoryTickets = categories[categoryName] || [];
    const editingState = {};
    categoryTickets.forEach(ticket => {
      editingState[ticket.id] = false;
    });
    setEditing(prev => {
      const updated = { ...prev };
      Object.keys(editingState).forEach(id => {
        delete updated[id];
      });
      return updated;
    });
    
    // Remove category name editing
    setEditingCategoryNames(prev => {
      const updated = { ...prev };
      delete updated[categoryName];
      return updated;
    });
    setTempCategoryNames(prev => {
      const updated = { ...prev };
      delete updated[categoryName];
      return updated;
    });
  };

  // NEW: Save all changes for a category (name and prices)
  const handleSaveCategory = async (categoryName) => {
    if (!baseUrl) {
      notify.error("API configuration not available");
      return;
    }

    try {
      const categoryTickets = categories[categoryName] || [];
      const newCategoryName = tempCategoryNames[categoryName]?.trim();
      const hasNameChange = newCategoryName && newCategoryName !== categoryName;
      
      // Validate new category name if changed
      if (hasNameChange) {
        if (Object.keys(categories).some(cat => 
          cat.toLowerCase() === newCategoryName.toLowerCase() && cat !== categoryName
        )) {
          notify.error("A category with this name already exists");
          return;
        }
      }
      
      // Update prices
      const priceUpdates = categoryTickets.map(ticket => ({
        id: ticket.id,
        price: parseFloat(ticket.price) || 0
      }));

      await axios.patch(`${baseUrl}/api/tickets/update-price`, {
        tickets: priceUpdates,
      });

      // Update category name if changed
      if (hasNameChange) {
        const formattedNewName = newCategoryName.charAt(0).toUpperCase() + newCategoryName.slice(1);
        
        await axios.patch(`${baseUrl}/api/tickets/rename-category`, {
          oldCategoryName: categoryName,
          newCategoryName: formattedNewName
        });
        
        notify.success(`Category updated: "${categoryName}" → "${formattedNewName}" with new prices`);
      } else {
        notify.success("Prices updated successfully");
      }

      // Reset editing states
      const editingState = {};
      categoryTickets.forEach(ticket => {
        editingState[ticket.id] = false;
      });
      setEditing(prev => {
        const updated = { ...prev };
        Object.keys(editingState).forEach(id => {
          delete updated[id];
        });
        return updated;
      });
      
      setEditingCategoryNames(prev => {
        const updated = { ...prev };
        delete updated[categoryName];
        return updated;
      });
      setTempCategoryNames(prev => {
        const updated = { ...prev };
        delete updated[categoryName];
        return updated;
      });

      // Refresh data
      fetchCategories();
      
    } catch (err) {
      console.error("Error saving category:", err);
      notify.error("Failed to save changes");
    }
  };

  const handleAddCategory = async () => {
    if (!baseUrl) {
      notify.error("API configuration not available");
      return;
    }
    
    if (!newCategory.trim() || Object.values(newPrices).some(p => !p || Number(p) <= 0)) {
      notify.warning("Category name and valid prices are required");
      return;
    }
    
    try {
      const formattedCategory = newCategory.trim().charAt(0).toUpperCase() + newCategory.trim().slice(1);
      const description = newDescription.trim() || ""; 
      
      await axios.post(`${baseUrl}/api/tickets/add-type`, {
        ticketTypes: ["child", "adult", "grand"].map(type => ({
          category: formattedCategory,
          subcategory: type,
          price: newPrices[type],
          description: description,
        })),
      });
      
      setNewCategory("");
      setNewDescription("");
      setNewPrices({ child: "", adult: "", grand: "" });
      fetchCategories();
      notify.success("New category added successfully");
    } catch (err) {
      console.error("Error adding:", err);
      notify.error("Failed to add new category");
    }
  };

  const handleToggleArchive = async (categoryName, archived) => {
    if (!baseUrl) {
      notify.error("API configuration not available");
      return;
    }
    
    confirmToast(
      `${archived ? 'Archive' : 'Unarchive'} ${categoryName}?`,
      async () => {
        try {
          await axios.patch(`${baseUrl}/api/tickets/archive-category`, {
            category: categoryName,
            archived,
          });
          notify.success(`${categoryName} ${archived ? "archived" : "unarchived"} successfully.`);
          fetchCategories();
        } catch (err) {
          console.error("Error toggling archive:", err);
          notify.error(`Failed to ${archived ? "archive" : "unarchive"} ${categoryName}`);
        }
      }
    );
  };

  const zebraColors = ["#ffffff", "#E0F9FF"];

  return (
    <>
      <Paper sx={{ padding: 3, maxWidth: 1200, margin: "auto", marginTop: 3, background: "#F0F9FF", position: "relative" }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h4" sx={{ color: "#007EA7", fontWeight: 600 }}>
            Manage Ticket Categories
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
                {["Category", "Subcategory", "Description", "Price", "Actions"].map(head => (
                  <TableCell key={head} align="center" sx={{ backgroundColor: "#00AEEF", color: "#fff", fontWeight: "bold" }}>
                    {head}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {Object.keys(categories).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">No Categories Available</TableCell>
                </TableRow>
              ) : (
                Object.entries(categories).map(([categoryName, tickets], i) => {
                  const isEditingCategory = editingCategoryNames[categoryName];
                  const hasAnyEditing = tickets.some(ticket => editing[ticket.id]);
                  
                  return (
                    <React.Fragment key={categoryName}>
                      {tickets.map((ticket, index) => (
                        <TableRow key={ticket.id} sx={{ backgroundColor: zebraColors[i % 2] }}>
                          {index === 0 && (
                            <TableCell rowSpan={tickets.length} align="center">
                              <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
                                {/* MODIFIED: Category name - editable when in edit mode */}
                                {isEditingCategory ? (
                                  <TextField
                                    value={tempCategoryNames[categoryName] || categoryName}
                                    onChange={(e) => setTempCategoryNames(prev => ({
                                      ...prev,
                                      [categoryName]: e.target.value
                                    }))}
                                    size="small"
                                    sx={{ 
                                      width: "150px",
                                      "& .MuiInputBase-input": {
                                        textAlign: "center",
                                        fontWeight: "bold",
                                        fontSize: "1.1rem",
                                        color: "#007EA7"
                                      }
                                    }}
                                    placeholder="Category name"
                                  />
                                ) : (
                                  <Typography sx={{ fontWeight: "bold", fontSize: "1.2rem", color: "#007EA7" }}>
                                    {categoryName}
                                  </Typography>
                                )}
                              
                                {/* MODIFIED: Action buttons - Edit/Save/Cancel or Archive */}
                                <Box display="flex" flexDirection="column" gap={1} alignItems="center">
                                  {hasAnyEditing ? (
                                    // Show Save/Cancel when editing
                                    <>
                                      <Button
                                        variant="contained"
                                        size="small"
                                        color="success"
                                        startIcon={<Save />}
                                        onClick={() => handleSaveCategory(categoryName)}
                                        sx={{ 
                                          minWidth: "120px",
                                          fontSize: "0.75rem"
                                        }}
                                      >
                                        Save All
                                      </Button>
                                      <Button
                                        variant="outlined"
                                        size="small"
                                        color="error"
                                        startIcon={<Cancel />}
                                        onClick={() => handleCancelEditing(categoryName)}
                                        sx={{ 
                                          minWidth: "120px",
                                          fontSize: "0.75rem"
                                        }}
                                      >
                                        Cancel
                                      </Button>
                                    </>
                                  ) : (
                                    // Show Edit/Archive when not editing
                                    <>
                                      <Button
                                        variant="outlined"
                                        size="small"
                                        color="primary"
                                        startIcon={<Edit />}
                                        onClick={() => handleStartEditing(categoryName)}
                                        sx={{ 
                                          minWidth: "120px",
                                          fontSize: "0.75rem",
                                          color: "#00AEEF",
                                          borderColor: "#00AEEF"
                                        }}
                                      >
                                        Edit
                                      </Button>
                                      
                                      <Button
                                        variant="outlined"
                                        size="small"
                                        color={ticket.archived ? "success" : "error"}
                                        onClick={() => handleToggleArchive(categoryName, !ticket.archived)}
                                        sx={{ minWidth: "120px", fontSize: "0.75rem" }}
                                      >
                                        {ticket.archived ? "Unarchive" : "Archive"}
                                      </Button>
                                    </>
                                  )}
                                </Box>
                              </Box>
                            </TableCell>
                          )}
                          <TableCell align="center">{ticket.subcategory}</TableCell>
                          <TableCell align="center">{ticket.description}</TableCell>
                          <TableCell align="center">
                            {editing[ticket.id] ? (
                              <TextField
                                type="text"
                                inputProps={{ inputMode: "numeric", pattern: "[0-9]*", min: 0 }}
                                value={ticket.price}
                                onChange={(e) => handleEditPrice(ticket.id, e.target.value)}
                                size="small"
                                sx={{ width: "100px" }}
                              />
                            ) : (
                              `${ticket.price}EGP`
                            )}
                          </TableCell>
                          <TableCell align="center">
                            {/* MODIFIED: Individual price actions removed - handled by category-level buttons */}
                            <Typography variant="body2" color="textSecondary">
                              {hasAnyEditing ? "Editing..." : "Ready"}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </React.Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Paper sx={{ padding: 3, marginTop: 3, backgroundColor: "#E4F8FC" }} ref={bottomRef}>
          <Typography variant="h6" sx={{ color: "#007EA7" }}>Add New Category</Typography>
          <TextField 
            label="Category Name" 
            fullWidth 
            sx={{ mb: 2 }} 
            value={newCategory} 
            onChange={(e) => setNewCategory(e.target.value)} 
            required
            helperText="First letter will be automatically capitalized"
          />
          <TextField 
            label="Description (Optional)" 
            fullWidth 
            sx={{ mb: 2 }} 
            value={newDescription} 
            onChange={(e) => setNewDescription(e.target.value)}
            helperText="Optional field for additional details"
          />
          <Box display="flex" gap={2} sx={{ mb: 2 }}>
            {Object.entries(newPrices).map(([type, value]) => (
              <TextField
                key={type}
                label={`${type.charAt(0).toUpperCase() + type.slice(1)} Price`}
                type="text"
                inputProps={{ inputMode: "numeric", pattern: "[0-9]*", min: 0 }}
                value={value}
                onChange={(e) => setNewPrices((prev) => ({ ...prev, [type]: e.target.value }))}
                size="small"
                sx={{ width: "120px" }}
                required
              />
            ))}
          </Box>
          <Button variant="contained" startIcon={<Add />} onClick={handleAddCategory} sx={{ backgroundColor: "#00AEEF", "&:hover": { backgroundColor: "#00C2CB" } }}>
            Add Category
          </Button>
        </Paper>

        <Fab color="primary" size="small" sx={{ position: "fixed", bottom: 24, right: 24, backgroundColor: "#00AEEF", "&:hover": { backgroundColor: "#00C2CB" } }} onClick={() => bottomRef.current?.scrollIntoView({ behavior: "smooth" })}>
          <ArrowDownward />
        </Fab>
      </Paper>
    </>
  );
};

export default AccountantCategories;
