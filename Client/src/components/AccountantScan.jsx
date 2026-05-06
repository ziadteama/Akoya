import React, { useState, useEffect, useRef } from "react";
import {
  Box, Typography, TextField, Button, Paper, 
  ToggleButtonGroup, ToggleButton, List, ListItem, ListItemText, IconButton, Dialog, DialogTitle,
  Tooltip, Chip, Tabs, Tab, Card, CardContent, Grid, Divider, CircularProgress
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ClearAllIcon from "@mui/icons-material/ClearAll";
import SearchIcon from "@mui/icons-material/Search";
import ReceiptIcon from "@mui/icons-material/Receipt";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import SummaryIcon from "@mui/icons-material/Summarize";
import axios from "axios";
import CheckoutPanel from "./CheckoutPanel";
import TicketCategoryPanel from "./TicketCategoryPanel";
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
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0, isProcessing: false });
  const [processingStats, setProcessingStats] = useState({ valid: 0, invalid: 0, errors: 0 });
  const listEndRef = useRef(null);

  // Add state for validate tab
  const [validateInput, setValidateInput] = useState("");
  const [validatedTicket, setValidatedTicket] = useState(null);
  const [validationHistory, setValidationHistory] = useState([]);

  // Add a loading state
  const [loading, setLoading] = useState(false);

  // NEW: State for summary view toggle
  const [showSummary, setShowSummary] = useState(false);

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

  // MODIFIED: Remove 100 ticket limit
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

    const rangeSize = end - start + 1;
    
    // Show confirmation for large ranges
    if (rangeSize > 1000) {
      const confirmed = await new Promise(resolve => {
        confirmToast(
          `Processing ${rangeSize.toLocaleString()} tickets. This will be done in batches of 500. Continue?`,
          () => resolve(true),
          () => resolve(false)
        );
      });
      if (!confirmed) return;
    }

    // Initialize progress tracking
    setLoading(true);
    setBatchProgress({ current: 0, total: rangeSize, isProcessing: true });
    setProcessingStats({ valid: 0, invalid: 0, errors: 0 });

    const newIds = [];
    for (let id = start; id <= end; id++) {
      if (!ticketIds.includes(id)) {
        newIds.push(id);
      }
    }

    if (newIds.length === 0) {
      notify.warning("No new IDs in this range");
      setLoading(false);
      setBatchProgress({ current: 0, total: 0, isProcessing: false });
      return;
    }

    try {
      // ENHANCED: Process in batches of 500 with detailed progress
      const BATCH_SIZE = 500;
      const totalBatches = Math.ceil(newIds.length / BATCH_SIZE);
      let allValidDetails = [];
      let stats = { valid: 0, invalid: 0, errors: 0 };

      notify.info(`🚀 Starting batch processing: ${newIds.length} tickets in ${totalBatches} batches`);

      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const batchStart = batchIndex * BATCH_SIZE;
        const batchEnd = Math.min(batchStart + BATCH_SIZE, newIds.length);
        const currentBatch = newIds.slice(batchStart, batchEnd);
        
        // Update progress
        setBatchProgress({ 
          current: batchStart, 
          total: newIds.length, 
          isProcessing: true,
          currentBatch: batchIndex + 1,
          totalBatches: totalBatches
        });

        notify.info(`📦 Processing batch ${batchIndex + 1}/${totalBatches} (${currentBatch.length} tickets)`);

        try {
          // Create batch validation request
          const batchValidationPromises = currentBatch.map(async (id) => {
            try {
              const response = await axios.get(`${baseUrl}/api/tickets/ticket/${id}`);
              return { id, data: response.data, success: true };
            } catch (error) {
              console.warn(`Failed to fetch ticket ${id}:`, error.response?.status);
              return { id, error: error.response?.status || 'Network Error', success: false };
            }
          });

          // Wait for current batch with timeout
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Batch timeout')), 60000) // 60 second timeout per batch
          );

          const batchResults = await Promise.race([
            Promise.all(batchValidationPromises),
            timeoutPromise
          ]);

          // Process batch results
          const validDetails = [];
          
          batchResults.forEach(result => {
            if (!result.success) {
              stats.errors++;
              return;
            }

            const data = result.data;
            
            // Validate ticket data
            if (!data || !data.valid) {
              stats.invalid++;
              return;
            }
            
            if (mode === "assign" && data.status === "sold") {
              stats.invalid++;
              return;
            }
            
            if (mode === "sell" && data.status !== "available") {
              stats.invalid++;
              return;
            }
            
            if (mode === "sell" && data.ticket_type_id === null) {
              stats.invalid++;
              return;
            }
            
            stats.valid++;
            validDetails.push(data);
          });

          allValidDetails = [...allValidDetails, ...validDetails];
          
          // Update running statistics
          setProcessingStats({ ...stats });

          // Show batch completion
          const batchProgress = `✅ Batch ${batchIndex + 1}/${totalBatches} complete: +${validDetails.length} valid tickets`;
          notify.success(batchProgress);

          // Small delay between batches to prevent server overload
          if (batchIndex < totalBatches - 1) {
            await new Promise(resolve => setTimeout(resolve, 200));
          }

        } catch (batchError) {
          console.error(`Error processing batch ${batchIndex + 1}:`, batchError);
          
          if (batchError.message === 'Batch timeout') {
            notify.error(`⏰ Batch ${batchIndex + 1} timed out. Server may be overloaded.`);
          } else if (batchError.response?.status === 413) {
            notify.error(`📦 Batch ${batchIndex + 1} too large. Try smaller ranges.`);
            break;
          } else {
            notify.warning(`⚠️ Error in batch ${batchIndex + 1}, continuing...`);
          }
          
          stats.errors += currentBatch.length;
          setProcessingStats({ ...stats });
        }
      }

      // Final results
      setBatchProgress({ current: newIds.length, total: newIds.length, isProcessing: false });

      // Show comprehensive summary
      const summaryMessage = `
🎯 Processing Complete!
✅ Valid: ${stats.valid}
❌ Invalid: ${stats.invalid}
⚠️ Errors: ${stats.errors}
📊 Total Processed: ${stats.valid + stats.invalid + stats.errors}/${newIds.length}
      `.trim();

      if (allValidDetails.length > 0) {
        setTicketIds(prev => [...prev, ...allValidDetails.map(t => t.id)]);
        setTicketDetails(prev => [...prev, ...allValidDetails]);
        
        notify.success(`🎉 ${allValidDetails.length} tickets added successfully!`);
        
        // Auto-show summary for large batches
        if (allValidDetails.length > 20) {
          setShowSummary(true);
        }
      }

      if (stats.invalid > 0 || stats.errors > 0) {
        notify.warning(summaryMessage);
      }

      console.log("Batch processing summary:", stats);

    } catch (globalError) {
      console.error("Global batch processing error:", globalError);
      notify.error("❌ Batch processing failed. Please try again.");
    } finally {
      setLoading(false);
      setBatchProgress({ current: 0, total: 0, isProcessing: false });
      
      // Reset progress after 3 seconds
      setTimeout(() => {
        setProcessingStats({ valid: 0, invalid: 0, errors: 0 });
      }, 3000);
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

  // MODIFIED: Allow reassigning unsold tickets
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
      
      if (!data.valid) {
        notify.error("Ticket is invalid");
        return;
      }

      // Check if the ticket is already sold
      if (data.status === 'sold') {
        notify.error("This ticket has already been sold");
        return;
      }

      // MODIFIED: For assign mode, allow reassigning unsold tickets
      if (mode === "assign" && data.status === "sold") {
        notify.error("Cannot reassign sold tickets");
        return;
      }

      // For sell mode, ensure the ticket has an assigned type
      if (mode === "sell" && data.ticket_type_id === null) {
        notify.error("Cannot sell unassigned tickets. Please assign a ticket type first.");
        return;
      }

      if (mode === "sell" && data.status !== "available") {
        notify.error("Ticket is not available for sale");
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

  // MODIFIED: Summary calculation function
  const getTicketSummary = () => {
    const summary = {
      total: ticketIds.length,
      unassigned: 0,
      categories: {},
      statusCounts: {}
    };

    ticketDetails.forEach(ticket => {
      // Count by status
      const status = ticket.status || 'unknown';
      summary.statusCounts[status] = (summary.statusCounts[status] || 0) + 1;

      // Count by category
      if (ticket.category && ticket.subcategory) {
        const categoryKey = `${ticket.category} - ${ticket.subcategory}`;
        summary.categories[categoryKey] = (summary.categories[categoryKey] || 0) + 1;
      } else {
        summary.unassigned += 1;
      }
    });

    return summary;
  };

  // NEW: Assignment status helper function
  const getAssignmentStatus = () => {
    if (ticketDetails.length === 0) return { type: 'none', count: 0 };
    
    // Check if tickets have ticket_type_id (assigned) or not (unassigned)
    const assignedTickets = ticketDetails.filter(ticket => 
      ticket.ticket_type_id && ticket.ticket_type_id !== null
    );
    const unassignedTickets = ticketDetails.filter(ticket => 
      !ticket.ticket_type_id || ticket.ticket_type_id === null
    );
    
    console.log('Assignment Status Check:', {
      total: ticketDetails.length,
      assigned: assignedTickets.length,
      unassigned: unassignedTickets.length,
      sampleTicket: ticketDetails[0]
    });
    
    if (assignedTickets.length > 0 && unassignedTickets.length > 0) {
      return { 
        type: 'mixed', 
        assignedCount: assignedTickets.length, 
        unassignedCount: unassignedTickets.length 
      };
    } else if (assignedTickets.length > 0) {
      return { type: 'assigned', count: assignedTickets.length };
    } else if (unassignedTickets.length > 0) {
      return { type: 'unassigned', count: unassignedTickets.length };
    }
    
    return { type: 'none', count: 0 };
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
      
      if (!data) {
        notify.error("Ticket not found");
        setValidatedTicket(null);
        return;
      }
      
      const enrichedData = {
        ...data,
        validated_at: new Date().toISOString(),
        price: Number(data.price || 0),
        status: data.status || 'unknown',
        created_at: data.created_at || new Date().toISOString(),
        category: data.category || '',
        subcategory: data.subcategory || '',
        valid: typeof data.valid === 'boolean' ? data.valid : null
      };
      
      setValidatedTicket(enrichedData);
      
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

  // MODIFIED: Enhanced handleAssign function
  const handleAssign = async () => {
    if (!baseUrl) {
      notify.error("API configuration not available");
      return;
    }

    const assignmentStatus = getAssignmentStatus();
    
    // Handle unassignment
    if (assignmentStatus.type === 'assigned') {
      const confirmed = await new Promise(resolve => {
        confirmToast(
          `Are you sure you want to unassign ${assignmentStatus.count} tickets? This will remove their ticket type assignments.`,
          () => resolve(true),
          () => resolve(false)
        );
      });

      if (!confirmed) return;

      try {
        const assignedTicketIds = ticketDetails
          .filter(ticket => ticket.ticket_type_id)
          .map(ticket => ticket.id);

        const unassignments = assignedTicketIds.map(id => ({
          id: id,
          ticket_type_id: null
        }));

        await axios.patch(`${baseUrl}/api/tickets/tickets/assign-types`, { 
          assignments: unassignments 
        });
        
        notify.success(`${assignedTicketIds.length} tickets unassigned successfully!`);
        
        // Refresh ticket details to show updated status
        const updatedDetails = await Promise.all(
          ticketIds.map(async (id) => {
            try {
              const { data } = await axios.get(`${baseUrl}/api/tickets/ticket/${id}`);
              return data;
            } catch (error) {
              console.error(`Failed to refresh ticket ${id}:`, error);
              return ticketDetails.find(t => t.id === id); // Fallback to current data
            }
          })
        );
        
        setTicketDetails(updatedDetails);
        setTicketCounts({});
        setSelectorOpen(false);
        setShowSummary(false);
        
      } catch (error) {
        console.error("Unassignment error:", error);
        notify.error("Failed to unassign tickets");
      }
      return;
    }

    // Handle mixed assignment (show warning)
    if (assignmentStatus.type === 'mixed') {
      notify.warning(`You have both assigned (${assignmentStatus.assignedCount}) and unassigned (${assignmentStatus.unassignedCount}) tickets. Please clear the list and add only tickets of the same type.`);
      return;
    }

    // Handle normal assignment
    if (assignmentStatus.type === 'unassigned') {
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
        notify.success("Tickets assigned successfully!");
        setTicketIds([]);
        setTicketDetails([]);
        setTicketCounts({});
        setSelectorOpen(false);
        setShowSummary(false);
      } catch (error) {
        console.error("Assignment error:", error);
        notify.error("Assignment failed");
      }
    }
  };

  const handleSell = () => setCheckoutOpen(true);

  const handleCheckoutSubmit = async (checkoutData) => {
    if (!baseUrl) {
      notify.error("API configuration not available");
      return;
    }

    try {
      const payments = checkoutData.payments || [];
      
      const payload = {
        ticket_ids: ticketIds,
        user_id: parseInt(localStorage.getItem('userId') || '1', 10),
        description: checkoutData.description || '',
        payments: payments.filter(p => p.method !== 'discount' && p.amount > 0)
      };
      
      if (Array.isArray(checkoutData.meals) && checkoutData.meals.length > 0) {
        payload.meals = checkoutData.meals;
      }
      
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
      setShowSummary(false);
      notify.success(`Tickets sold successfully! Order #${response.data.order_id || 'Created'}`);
    } catch (error) {
      console.error("Checkout error:", error);
      notify.error(`Failed to process checkout: ${error.message || 'Unknown error'}`);
    }
  };

  useEffect(() => {
    if (!baseUrl) return;
    
    axios.get(`${baseUrl}/api/tickets/ticket-types`)
      .then((res) => Array.isArray(res.data) && setTypes(res.data))
      .catch(() => notify.error("Failed to fetch ticket types"));
  }, [baseUrl]);

  const groupedTypes = types.reduce((acc, type) => {
    if (!acc[type.category]) acc[type.category] = [];
    acc[type.category].push(type);
    return acc;
  }, {});

  const handleModeChange = (e, val) => {
    if (val) {
      if (val !== mode && checkoutOpen) {
        setCheckoutOpen(false);
      }
      setMode(val);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  useEffect(() => {
    if (mode === "sell" && ticketIds.length > 0 && !checkoutOpen) {
      setCheckoutOpen(true);
    }
  }, [ticketIds.length, mode]);

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

  // NEW: Render summary view
  const renderSummaryView = () => {
    const summary = getTicketSummary();
    
    return (
      <Card elevation={2} sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SummaryIcon color="primary" />
              Ticket Summary
            </Typography>
            <Button 
              variant="outlined" 
              size="small"
              onClick={() => setShowSummary(false)}
            >
              Show Details
            </Button>
          </Box>
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#e3f2fd' }}>
                <Typography variant="h4" color="primary">{summary.total}</Typography>
                <Typography variant="subtitle2">Total Tickets</Typography>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={9}>
              <Typography variant="subtitle1" gutterBottom>Categories:</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                {Object.entries(summary.categories).map(([category, count]) => (
                  <Chip 
                    key={category}
                    label={`${category}: ${count}`}
                    color="primary"
                    variant="outlined"
                  />
                ))}
                {summary.unassigned > 0 && (
                  <Chip 
                    label={`Unassigned: ${summary.unassigned}`}
                    color="warning"
                    variant="outlined"
                  />
                )}
              </Box>
              
              <Typography variant="subtitle1" gutterBottom>Status:</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {Object.entries(summary.statusCounts).map(([status, count]) => (
                  <Chip 
                    key={status}
                    label={`${status}: ${count}`}
                    color={status === 'available' ? 'success' : 'default'}
                    variant="outlined"
                  />
                ))}
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    );
  };

  // NEW: Render batch progress indicator
  const renderBatchProgress = () => {
    if (!batchProgress.isProcessing && batchProgress.total === 0) return null;

    const progressPercentage = batchProgress.total > 0 
      ? Math.round((batchProgress.current / batchProgress.total) * 100) 
      : 0;

    return (
      <Card elevation={3} sx={{ mb: 2, border: '2px solid #2196f3' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Typography variant="h6" color="primary">
              🔄 Batch Processing
            </Typography>
            {batchProgress.isProcessing && (
              <Chip 
                label="PROCESSING" 
                color="primary" 
                variant="filled"
                sx={{ fontWeight: 'bold' }}
              />
            )}
          </Box>

          {/* Progress Bar */}
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2">
                Progress: {batchProgress.current.toLocaleString()} / {batchProgress.total.toLocaleString()} tickets
              </Typography>
              <Typography variant="body2" fontWeight="bold">
                {progressPercentage}%
              </Typography>
            </Box>
            
            <Box sx={{ 
              width: '100%', 
              height: 10, 
              backgroundColor: '#e0e0e0', 
              borderRadius: 5,
              overflow: 'hidden'
            }}>
              <Box sx={{
                width: `${progressPercentage}%`,
                height: '100%',
                backgroundColor: batchProgress.isProcessing ? '#2196f3' : '#4caf50',
                transition: 'width 0.3s ease-in-out'
              }} />
            </Box>
          </Box>

          {/* Batch Info */}
          {batchProgress.currentBatch && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              📦 Current Batch: {batchProgress.currentBatch} / {batchProgress.totalBatches}
            </Typography>
          )}

          {/* Statistics */}
          <Grid container spacing={2}>
            <Grid item xs={4}>
              <Paper sx={{ p: 1, textAlign: 'center', bgcolor: '#e8f5e8' }}>
                <Typography variant="h6" color="success.main">
                  {processingStats.valid.toLocaleString()}
                </Typography>
                <Typography variant="caption">Valid</Typography>
              </Paper>
            </Grid>
            <Grid item xs={4}>
              <Paper sx={{ p: 1, textAlign: 'center', bgcolor: '#fff3e0' }}>
                <Typography variant="h6" color="warning.main">
                  {processingStats.invalid.toLocaleString()}
                </Typography>
                <Typography variant="caption">Invalid</Typography>
              </Paper>
            </Grid>
            <Grid item xs={4}>
              <Paper sx={{ p: 1, textAlign: 'center', bgcolor: '#ffebee' }}>
                <Typography variant="h6" color="error.main">
                  {processingStats.errors.toLocaleString()}
                </Typography>
                <Typography variant="caption">Errors</Typography>
              </Paper>
            </Grid>
          </Grid>

          {batchProgress.isProcessing && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <CircularProgress size={24} />
              <Typography variant="body2" sx={{ ml: 1 }}>
                Processing batch...
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
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
              disabled={batchProgress.isProcessing}
            />

            {mode === "assign" && (
              <Box display="flex" gap={2} mb={2}>
                <TextField 
                  label="From ID" 
                  value={from} 
                  onChange={(e) => setFrom(e.target.value)} 
                  fullWidth 
                  disabled={batchProgress.isProcessing}
                />
                <TextField 
                  label="To ID" 
                  value={to} 
                  onChange={(e) => setTo(e.target.value)} 
                  fullWidth 
                  disabled={batchProgress.isProcessing}
                />
                <Button 
                  variant="outlined" 
                  onClick={handleRangeAdd} 
                  disabled={loading || batchProgress.isProcessing}
                  sx={{ minWidth: 120 }}
                >
                  {batchProgress.isProcessing ? "Processing..." : loading ? "Loading..." : "Add Range"}
                </Button>
              </Box>
            )}

            {/* NEW: Batch Progress Indicator */}
            {renderBatchProgress()}

            <Paper sx={{ p: 2, mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="h6">
                  Ticket IDs: {ticketIds.length}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {ticketIds.length > 5 && (
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<SummaryIcon />}
                      onClick={() => setShowSummary(!showSummary)}
                    >
                      {showSummary ? "Show Details" : "Show Summary"}
                    </Button>
                  )}
                  {ticketIds.length > 0 && (
                    <Tooltip title="Clear all tickets">
                      <IconButton color="error" onClick={handleClearAll}>
                        <ClearAllIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              </Box>
              
              {/* MODIFIED: Show summary or detailed list */}
              {showSummary ? (
                renderSummaryView()
              ) : (
                <List sx={{ maxHeight: 400, overflow: 'auto' }}>
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
                            {renderStatusBadge(ticket.status)}
                          </Box>
                        }
                        secondary={`Created At: ${new Date(ticket.created_at).toLocaleString()}`}
                      />
                    </ListItem>
                  ))}
                  <div ref={listEndRef}></div>
                </List>
              )}
              
              {ticketIds.length > 0 && (
                <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                  {mode === "assign" ? (
                    (() => {
                      const assignmentStatus = getAssignmentStatus();
                      let buttonText = "Assign Ticket Types";
                      let buttonColor = "primary";
                      let buttonAction = () => setSelectorOpen(true);
                      
                      if (assignmentStatus.type === 'assigned') {
                        buttonText = `Unassign ${assignmentStatus.count} Tickets`;
                        buttonColor = "warning";
                        buttonAction = handleAssign; // Direct unassignment
                      } else if (assignmentStatus.type === 'mixed') {
                        buttonText = `Mixed Assignment (${assignmentStatus.assignedCount} assigned, ${assignmentStatus.unassignedCount} unassigned)`;
                        buttonColor = "error";
                        buttonAction = () => notify.warning("Please clear the list and add only tickets of the same assignment status");
                      } else if (assignmentStatus.type === 'unassigned') {
                        buttonText = `Assign ${assignmentStatus.count} Tickets`;
                        buttonColor = "primary";
                        buttonAction = () => setSelectorOpen(true);
                      }
                      
                      return (
                        <Button
                          variant="contained"
                          color={buttonColor}
                          fullWidth
                          onClick={buttonAction}
                          disabled={assignmentStatus.type === 'none'}
                          sx={{
                            '&.MuiButton-containedWarning': {
                              backgroundColor: '#ff9800',
                              '&:hover': {
                                backgroundColor: '#f57c00',
                              }
                            }
                          }}
                        >
                          {buttonText}
                        </Button>
                      );
                    })()
                  ) : null}
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={handleClearAll}
                    fullWidth={mode === "sell"}
                  >
                    Clear All
                  </Button>
                </Box>
              )}
            </Paper>

            {/* MODIFIED: Dynamic Dialog title and content */}
            <Dialog open={selectorOpen} onClose={() => setSelectorOpen(false)} fullWidth maxWidth="md">
              <DialogTitle>
                {(() => {
                  const assignmentStatus = getAssignmentStatus();
                  if (assignmentStatus.type === 'assigned') {
                    return `Unassign ${assignmentStatus.count} Tickets`;
                  } else {
                    return `Assign Ticket Counts by Category (${ticketIds.length} tickets total)`;
                  }
                })()}
              </DialogTitle>
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
                  Confirm Assignment ({Object.values(ticketCounts).reduce((sum, v) => sum + parseInt(v || 0), 0)} / {ticketIds.length})
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
                  price: Number(detail.price || 0)
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

