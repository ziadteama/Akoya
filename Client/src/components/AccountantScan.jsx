import React, { useState, useEffect, useRef } from "react";
import {
  Box, Typography, TextField, Button, Paper, 
  ToggleButtonGroup, ToggleButton, List, ListItem, ListItemText, IconButton, Dialog, DialogTitle,
  Tooltip, Chip, Tabs, Tab, Card, CardContent, Grid, Divider
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ClearAllIcon from "@mui/icons-material/ClearAll";
import SearchIcon from "@mui/icons-material/Search";
import ReceiptIcon from "@mui/icons-material/Receipt";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import axios from "axios";
import CheckoutPanel from "./CheckoutPanel";
import TicketCategoryPanel from "./TicketCategoryPanel";
// Remove config // Remove config import
// import
// import config from '../../../config';
import ErrorBoundary from './ErrorBoundary';
import { notify, confirmToast } from '../utils/toast';

const beep = () => window.navigator.vibrate?.(150);

const AccountantScan = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [mode, setMode] = useState("assign");
  const [input, setInput] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [ticketIds, setTicketIds] = useState([]);
  const [ticketDetails, setTicketDetails] = useState([]);
  const [types, setTypes] = useState([]);
  const [ticketCounts, setTicketCounts] = useState({});
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const listEndRef = useRef(null);

  // Add state for validate tab
  const [validateInput, setValidateInput] = useState("");
  const [validatedTicket, setValidatedTicket] = useState(null);
  const [validationHistory, setValidationHistory] = useState([]);

  // Add a loading state
  const [loading, setLoading] = useState(false);

  const baseUrl = window.runtimeConfig?.apiBaseUrl;

  // Replace showMessage with notify
  const showMessage = (text, type = "info") => {
    if (type === "success") notify.success(text);
    else if (type === "error") {
      notify.error(text);
      beep();
    }
    else if (type === "warning") notify.warning(text);
    else notify.info(text);
  };

  const handleRangeAdd = async () => {
    if (!baseUrl) {
      notify.error("API configuration not available");
      return;
    }

    const start = parseInt(from);
    const end = parseInt(to);
    if (isNaN(start) || isNaN(end) || start > end) {
      notify.error("Invalid range");
      return;
    }

    if (end - start > 100) {
      notify.error("Range too large (max 100 tickets at once)");
      return;
    }

    setLoading(true);
    const newIds = [];
    for (let id = start; id <= end; id++) {
      if (!ticketIds.includes(id)) {
        newIds.push(id);
      }
    }

    if (newIds.length === 0) {
      notify.warning("No new IDs in this range");
      setLoading(false);
      return;
    }

    try {
      const responses = await Promise.all(
        newIds.map(id => axios.get(`${baseUrl}/api/tickets/ticket/${id}`))
      );
      
      // Track invalid tickets for better error reporting
      const invalidTickets = [];
      const alreadyAssignedTickets = [];
      
      const validDetails = responses.map((r, index) => {
        const data = r.data;
        // Check validity conditions
        if (!data.valid) {
          invalidTickets.push(data.id || newIds[index]);
          return null;
        }
        
        if (mode === "assign" && data.status !== "available") {
          invalidTickets.push(data.id);
          return null;
        }
        
        if (mode === "assign" && data.ticket_type_id !== null) {
          alreadyAssignedTickets.push(data.id);
          return null;
        }
        
        if (mode === "sell" && data.status !== "available") {
          invalidTickets.push(data.id);
          return null;
        }
        
        return data;
      }).filter(Boolean); // Filter out null values

      // Show specific errors
      if (invalidTickets.length > 0) {
        notify.warning(`${invalidTickets.length} invalid or unavailable tickets: ${invalidTickets.slice(0, 5).join(', ')}${invalidTickets.length > 5 ? '...' : ''}`);
      }
      
      if (alreadyAssignedTickets.length > 0) {
        notify.warning(`${alreadyAssignedTickets.length} tickets already have assigned types: ${alreadyAssignedTickets.slice(0, 5).join(', ')}${alreadyAssignedTickets.length > 5 ? '...' : ''}`);
      }

      if (validDetails.length > 0) {
        setTicketIds(prev => [...prev, ...validDetails.map(t => t.id)]);
        setTicketDetails(prev => [...prev, ...validDetails]);
        notify.success(`${validDetails.length} tickets added successfully!`);
        setTimeout(() => listEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      } else {
        notify.error("No valid tickets found in this range");
      }
    } catch (e) {
      notify.error("One or more ticket fetches failed");
    } finally {
      setLoading(false);
    }
  };

  // Handle removing a single ticket
  const handleRemoveTicket = (id) => {
    setTicketIds(prev => prev.filter(ticketId => ticketId !== id));
    setTicketDetails(prev => prev.filter(ticket => ticket.id !== id));
    notify.info("Ticket removed");
  };

  // Handle clearing all tickets
  const handleClearAll = () => {
    confirmToast("Are you sure you want to clear all tickets?", () => {
      setTicketIds([]);
      setTicketDetails([]);
      setTicketCounts({});
      notify.info("All tickets cleared");
    });
  };

  // Update the handleAddTicketId function to check for assigned tickets
  const handleAddTicketId = async () => {
    if (!baseUrl) {
      notify.error("API configuration not available");
      return;
    }

    const id = parseInt(input.trim(), 10);
    if (!id || isNaN(id)) return;

    if (ticketIds.includes(id)) {
      notify.warning("Already added");
      return;
    }

    try {
      const { data } = await axios.get(`${baseUrl}/api/tickets/ticket/${id}`);
      // Log the response to check if price is included
      console.log("Ticket data from API:", data);
      
      if (!data.valid) {
        notify.error("Ticket is invalid");
        return;
      }

      // Check if the ticket is already sold
      if (data.status === 'sold') {
        notify.error("This ticket has already been sold");
        return;
      }

      // For sell mode, ensure the ticket has an assigned type
      if (mode === "sell" && data.ticket_type_id === null) {
        notify.error("Cannot sell unassigned tickets. Please assign a ticket type first.");
        return;
      }

      if ((mode === "assign" && (data.status !== "available" || data.ticket_type_id !== null)) ||
          (mode === "sell" && data.status !== "available")) {
        notify.error("Ticket is not available for this operation");
        return;
      }

      setTicketIds(prev => [...prev, id]);
      setTicketDetails(prev => [...prev, data]);
      notify.success("Ticket added!");
      setInput("");
    } catch (err) {
      console.error("Error adding ticket:", err);
      notify.error("Ticket not found or server error");
    }
  };

  // Update the handleValidateTicket function to prevent errors
  const handleValidateTicket = async () => {
    if (!baseUrl) {
      notify.error("API configuration not available");
      return;
    }

    const id = parseInt(validateInput.trim(), 10);
    if (!id || isNaN(id)) {
      notify.warning("Please enter a valid ticket ID");
      return;
    }

    try {
      setLoading(true);
      
      const { data } = await axios.get(`${baseUrl}/api/tickets/ticket/${id}`);
      console.log("Validation data:", data);
      
      // Check if data exists before proceeding
      if (!data) {
        notify.error("Ticket not found");
        setValidatedTicket(null);
        return;
      }
      
      // Add timestamp to track when validation was done
      const enrichedData = {
        ...data,
        validated_at: new Date().toISOString(),
        // Add fallback values for required fields to prevent null/undefined errors
        price: Number(data.price || 0),
        status: data.status || 'unknown',
        created_at: data.created_at || new Date().toISOString(),
        category: data.category || '',
        subcategory: data.subcategory || '',
        valid: typeof data.valid === 'boolean' ? data.valid : null
      };
      
      setValidatedTicket(enrichedData);
      
      // Add to history (keep last 10 validations)
      setValidationHistory(prev => {
        const filtered = prev.filter(t => t.id !== enrichedData.id);
        return [enrichedData, ...filtered].slice(0, 10);
      });
      
      setValidateInput("");
      
      if (data.valid === false) {
        notify.warning("This ticket is invalid or has been tampered with");
      } else if (data.status === 'sold') {
        notify.warning("This ticket has already been sold");
      } else {
        notify.success("Ticket validated successfully");
      }
    } catch (err) {
      console.error("Error validating ticket:", err);
      notify.error("Failed to validate ticket");
      setValidatedTicket(null);
    } finally {
      setLoading(false);
    }
  };

  const handleManualCount = (typeId, value) => {
    const parsed = parseInt(value);
    const total = Object.entries(ticketCounts).reduce((sum, [id, count]) => id !== String(typeId) ? sum + Number(count) : sum, 0);
    if (!isNaN(parsed) && parsed >= 0 && total + parsed <= ticketIds.length) {
      setTicketCounts({ ...ticketCounts, [typeId]: parsed });
    } else {
      notify.error("Assigned total exceeds available tickets");
    }
  };

  const handleIncrement = (typeId) => {
    const current = parseInt(ticketCounts[typeId] || 0);
    const totalAssigned = Object.values(ticketCounts).reduce((sum, v) => sum + parseInt(v || 0), 0);
    if (totalAssigned >= ticketIds.length) {
      notify.error("Assigned count exceeds number of added tickets");
      return;
    }
    setTicketCounts({ ...ticketCounts, [typeId]: current + 1 });
  };

  const handleAssign = async () => {
    if (!baseUrl) {
      notify.error("API configuration not available");
      return;
    }

    const totalAssigned = Object.values(ticketCounts).reduce((sum, v) => sum + parseInt(v || 0), 0);
    if (totalAssigned !== ticketIds.length) {
      notify.error("Assigned count must match number of added ticket IDs");
      return;
    }

    const assignments = [];
    let index = 0;
    for (const [typeId, count] of Object.entries(ticketCounts)) {
      for (let i = 0; i < count; i++) {
        assignments.push({ id: ticketIds[index], ticket_type_id: parseInt(typeId) });
        index++;
      }
    }

    try {
      await axios.patch(`${baseUrl}/api/tickets/tickets/assign-types`, { assignments });
      notify.success("Tickets assigned!");
      setTicketIds([]);
      setTicketDetails([]);
      setTicketCounts({});
      setSelectorOpen(false);
    } catch (e) {
      notify.error("Assignment failed");
    }
  };

  const handleSell = () => setCheckoutOpen(true);

  const handleCheckoutSubmit = async (checkoutData) => {
    if (!baseUrl) {
      notify.error("API configuration not available");
      return;
    }

    try {
      // Extract payment information from the checkout data passed from CheckoutPanel
      const payments = checkoutData.payments || [];
      
      // Create the payload with the data from CheckoutPanel
      const payload = {
        ticket_ids: ticketIds,
        user_id: parseInt(localStorage.getItem('userId') || '1', 10),
        description: checkoutData.description || '',
        payments: payments.filter(p => p.method !== 'discount' && p.amount > 0)
      };
      
      // Add meals if present
      if (Array.isArray(checkoutData.meals) && checkoutData.meals.length > 0) {
        payload.meals = checkoutData.meals;
      }
      
      console.log('Sending checkout payload:', payload);
      
      // Ensure we have valid data
      if (!Array.isArray(payload.ticket_ids) || payload.ticket_ids.length === 0) {
        throw new Error("No tickets selected");
      }
      
      if (!Array.isArray(payload.payments) || payload.payments.length === 0) {
        throw new Error("No payment methods selected");
      }
      
      const response = await axios.put(
        `${baseUrl}/api/tickets/checkout-existing`, 
        payload
      );
      
      setCheckoutOpen(false);
      setTicketIds([]);
      setTicketDetails([]);
      notify.success(`Tickets sold successfully! Order #${response.data.order_id || 'Created'}`);
    } catch (error) {
      console.error("Checkout error:", error);
      notify.error(`Failed to process checkout: ${error.message || 'Unknown error'}`);
    }
  };

  useEffect(() => {
    if (!baseUrl) return;
    
    axios.get(`${baseUrl}/api/tickets/ticket-types?archived=false`)
      .then((res) => Array.isArray(res.data) && setTypes(res.data))
      .catch(() => notify.error("Failed to fetch ticket types"));
  }, [baseUrl]);

  const groupedTypes = types.reduce((acc, type) => {
    if (!acc[type.category]) acc[type.category] = [];
    acc[type.category].push(type);
    return acc;
  }, {});

  // Add this new function to handle mode changes
  const handleModeChange = (e, val) => {
    if (val) {
      // Close checkout panel when switching modes
      if (val !== mode && checkoutOpen) {
        setCheckoutOpen(false);
      }
      setMode(val);
    }
  };

  // Handle tab changes
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Add this useEffect to show checkout panel automatically in sell mode
  useEffect(() => {
    if (mode === "sell" && ticketIds.length > 0 && !checkoutOpen) {
      setCheckoutOpen(true);
    }
  }, [ticketIds.length, mode]); // Don't include checkoutOpen in dependencies

  // Render ticket status badge
  const renderStatusBadge = (status) => {
    if (!status) return null;
    
    let color = "default";
    let icon = null;
    
    switch(status.toLowerCase()) {
      case "available":
        color = "success";
        icon = <CheckCircleIcon fontSize="small" />;
        break;
      case "sold":
        color = "error";
        icon = <CancelIcon fontSize="small" />;
        break;
      default:
        color = "default";
    }
    
    return (
      <Chip 
        icon={icon}
        label={(status || "UNKNOWN").toUpperCase()} 
        color={color}
        size="small"
        sx={{ textTransform: 'capitalize' }}
      />
    );
  };

  return (
    <ErrorBoundary>
      <Box p={3}>
        <Typography variant="h4" mb={2}>Manage Tickets</Typography>
        
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange} 
          indicatorColor="primary"
          textColor="primary"
          sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab icon={<ReceiptIcon />} label="Assign & Sell" />
          <Tab icon={<SearchIcon />} label="Validate Tickets" />
        </Tabs>

        {/* Tab 1: Assign & Sell */}
        {activeTab === 0 && (
          <>
            <ToggleButtonGroup
              value={mode}
              exclusive
              onChange={handleModeChange}
              sx={{ mb: 2 }}
            >
              <ToggleButton value="assign">Assign Ticket Types</ToggleButton>
              <ToggleButton value="sell">Sell Tickets</ToggleButton>
            </ToggleButtonGroup>

            <TextField
              label="Enter Ticket ID"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddTicketId()}
              fullWidth
              sx={{ mb: 1 }}
            />

            {mode === "assign" && (
              <Box display="flex" gap={2} mb={2}>
                <TextField label="From ID" value={from} onChange={(e) => setFrom(e.target.value)} fullWidth />
                <TextField label="To ID" value={to} onChange={(e) => setTo(e.target.value)} fullWidth />
                <Button 
                  variant="outlined" 
                  onClick={handleRangeAdd} 
                  disabled={loading}
                >
                  {loading ? "Loading..." : "Add Range"}
                </Button>
              </Box>
            )}

            <Paper sx={{ p: 2, mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="h6">
                  Ticket IDs: {ticketIds.length}
                </Typography>
                {ticketIds.length > 0 && (
                  <Tooltip title="Clear all tickets">
                    <IconButton color="error" onClick={handleClearAll}>
                      <ClearAllIcon />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
              
              <List>
                {ticketDetails.map((ticket) => (
                  <ListItem
                    key={ticket.id}
                    secondaryAction={
                      <IconButton edge="end" aria-label="delete" onClick={() => handleRemoveTicket(ticket.id)}>
                        <DeleteIcon />
                      </IconButton>
                    }
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <span>Ticket ID: {ticket.id}</span>
                          <Chip 
                            label={ticket.category && ticket.subcategory ? `${ticket.category} / ${ticket.subcategory}` : 'Unassigned'} 
                            size="small"
                            color={ticket.category ? 'primary' : 'default'}
                            variant={ticket.category ? 'filled' : 'outlined'}
                          />
                        </Box>
                      }
                      secondary={`Created At: ${new Date(ticket.created_at).toLocaleString()}`}
                    />
                  </ListItem>
                ))}
                <div ref={listEndRef}></div>
              </List>
              
              {ticketIds.length > 0 && (
                <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                  {mode === "assign" ? (
                    <Button
                      variant="contained"
                      color="primary"
                      fullWidth
                      onClick={() => setSelectorOpen(true)}
                    >
                      Assign Ticket Types
                    </Button>
                  ) : null /* No button in sell mode */}
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={handleClearAll}
                    fullWidth={mode === "sell"} // Make full width in sell mode
                  >
                    Clear All
                  </Button>
                </Box>
              )}
            </Paper>

            <Dialog open={selectorOpen} onClose={() => setSelectorOpen(false)} fullWidth maxWidth="md">
              <DialogTitle>Assign Ticket Counts by Category</DialogTitle>
              <Box p={3}>
                {Object.entries(groupedTypes).map(([category, subtypes]) => (
                  <Box key={category} sx={{ mb: 2 }}>
                    <Typography variant="h6" gutterBottom>{category}</Typography>
                    {subtypes.map((type) => (
                      <Paper key={type.id} sx={{ mb: 1, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography>{type.subcategory}</Typography>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Button variant="outlined" onClick={() => handleIncrement(type.id)}>+</Button>
                          <TextField
                            size="small"
                            type="number"
                            value={ticketCounts[type.id] || 0}
                            onChange={(e) => handleManualCount(type.id, e.target.value)}
                            sx={{ width: 60 }}
                          />
                        </Box>
                      </Paper>
                    ))}
                  </Box>
                ))}
                <Button
                  variant="contained"
                  onClick={handleAssign}
                  disabled={ticketIds.length === 0}
                  sx={{ mt: 2 }}
                >
                  Confirm Assignment
                </Button>
              </Box>
            </Dialog>

            {checkoutOpen && (
              <CheckoutPanel
                ticketCounts={
                  mode === "sell"
                    ? ticketIds.reduce((acc, id) => {
                        acc[id] = 1;
                        return acc;
                      }, {})
                    : ticketDetails.reduce((acc, t) => {
                        const typeId = t.ticket_type_id;
                        if (typeId) {
                          acc[typeId] = (acc[typeId] || 0) + 1;
                        }
                        return acc;
                      }, {})
                }
                types={
                  mode === "sell"
                    ? ticketIds.map(id => {
                        const detail = ticketDetails.find(td => td.id === id) || {};
                        const price = Number(detail.price || 0);
                        console.log(`Setting up ticket ${id} with exact price:`, price);
                        
                        return {
                          id: id,
                          ticketId: id,
                          category: detail.category || "Ticket",
                          subcategory: detail.subcategory || `ID: ${id}`,
                          price
                        };
                      })
                    : types.filter(t => 
                        ticketDetails.some(td => td.ticket_type_id === t.id)
                      ).map(t => ({
                        ...t,
                        price: Number(t.price || 0)
                      }))
                }
                onCheckout={handleCheckoutSubmit}
                onClear={() => {
                  setCheckoutOpen(false);
                  notify.info("Checkout canceled");
                }}
                mode="existing"
                ticketIds={ticketIds} 
                ticketDetails={ticketDetails.map(detail => ({
                  ...detail,
                  price: Number(detail.price || 0) // Ensure price is a number
                }))}
              />
            )}
          </>
        )}

        {/* Tab 2: Ticket Validation */}
        {activeTab === 1 && (
          <Box>
            <Box display="flex" gap={2} mb={3}>
              <TextField
                label="Enter Ticket ID to Validate"
                value={validateInput}
                onChange={(e) => setValidateInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleValidateTicket()}
                fullWidth
              />
              <Button 
                variant="contained" 
                onClick={handleValidateTicket}
                disabled={loading}
                startIcon={<SearchIcon />}
                sx={{ px: 4 }}
              >
                {loading ? "Loading..." : "Validate"}
              </Button>
            </Box>

            {validatedTicket && (
              <Card elevation={3} sx={{ mb: 3, overflow: 'visible' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Typography variant="h5" gutterBottom>
                      Ticket #{validatedTicket.id}
                    </Typography>
                    {validatedTicket.status && renderStatusBadge(validatedTicket.status)}
                  </Box>
                  
                  <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" color="text.secondary">Ticket Type</Typography>
                      <Typography variant="body1" sx={{ mb: 1 }}>
                        {validatedTicket.category && validatedTicket.subcategory 
                          ? `${validatedTicket.category} - ${validatedTicket.subcategory}` 
                          : <span style={{ color: 'orange' }}>Unassigned</span>}
                      </Typography>
                      
                      <Typography variant="subtitle2" color="text.secondary">Price</Typography>
                      <Typography variant="body1" sx={{ mb: 1 }}>
                        {validatedTicket.price || validatedTicket.price === 0 
                          ? `EGP ${Number(validatedTicket.price).toFixed(2)}` 
                          : '-'}
                      </Typography>
                      
                      <Typography variant="subtitle2" color="text.secondary">Created At</Typography>
                      <Typography variant="body1" sx={{ mb: 1 }}>
                        {validatedTicket.created_at 
                          ? new Date(validatedTicket.created_at).toLocaleString() 
                          : 'N/A'}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      {validatedTicket.status === 'sold' && (
                        <>
                          <Typography variant="subtitle2" color="text.secondary">Sold At</Typography>
                          <Typography variant="body1" sx={{ mb: 1 }}>
                            {validatedTicket.sold_at 
                              ? new Date(validatedTicket.sold_at).toLocaleString() 
                              : '-'}
                          </Typography>
                          
                          <Typography variant="subtitle2" color="text.secondary">Order ID</Typography>
                          <Typography variant="body1" sx={{ mb: 1 }}>
                            {validatedTicket.order_id || 'N/A'}
                          </Typography>
                          
                          <Typography variant="subtitle2" color="text.secondary">Sold By</Typography>
                          <Typography variant="body1" sx={{ mb: 1 }}>
                            {validatedTicket.sold_by_name || validatedTicket.sold_by || 'Unknown'}
                          </Typography>
                        </>
                      )}
                      
                      <Typography variant="subtitle2" color="text.secondary">Validated At</Typography>
                      <Typography variant="body1" sx={{ mb: 1 }}>
                        {validatedTicket.validated_at 
                          ? new Date(validatedTicket.validated_at).toLocaleString() 
                          : new Date().toLocaleString()}
                      </Typography>
                    </Grid>
                  </Grid>
                  
                  {validatedTicket.valid === false && (
                    <Box sx={{ mt: 2, p: 1, bgcolor: '#ffebee', borderRadius: 1 }}>
                      <Typography color="error">
                        This ticket is invalid or has been tampered with.
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            )}
            
            {validationHistory.length > 0 && (
              <Box sx={{ mt: 4 }}>
                <Typography variant="h6" gutterBottom>Recent Validations</Typography>
                <Divider sx={{ mb: 2 }} />
                
                <Grid container spacing={2}>
                  {validationHistory.map((ticket) => (
                    <Grid item xs={12} md={6} key={`${ticket.id}-${ticket.validated_at || Date.now()}`}>
                      <Paper 
                        sx={{ 
                          p: 2, 
                          display: 'flex', 
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          cursor: 'pointer',
                          '&:hover': { bgcolor: 'rgba(0,0,0,0.04)' }
                        }}
                        onClick={() => setValidatedTicket(ticket)}
                      >
                        <Box>
                          <Typography variant="subtitle1">Ticket #{ticket.id}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {ticket.validated_at 
                              ? new Date(ticket.validated_at).toLocaleString() 
                              : new Date().toLocaleString()}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                          {ticket.status && renderStatusBadge(ticket.status)}
                          {ticket.category && (
                            <Typography variant="caption" sx={{ mt: 1 }}>
                              {ticket.category}{ticket.subcategory ? ` / ${ticket.subcategory}` : ''}
                            </Typography>
                          )}
                        </Box>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}
          </Box>
        )}
      </Box>
    </ErrorBoundary>
  );
};

export default AccountantScan;

