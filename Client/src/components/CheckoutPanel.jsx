﻿import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Box,
  Typography,
  Button,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  IconButton,
} from "@mui/material";
import { ToggleButton, ToggleButtonGroup } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import PrintIcon from '@mui/icons-material/Print';
import axios from "axios";
import { notify } from "../utils/toast";

const CheckoutPanel = ({ ticketCounts, types, onCheckout, onClear, mode = "new", ticketIds = [], ticketDetails = [] }) => {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [mealCounts, setMealCounts] = useState({});
  const [meals, setMeals] = useState([]);
  const [selectedMealId, setSelectedMealId] = useState("");
  const [customMealQty, setCustomMealQty] = useState(1);

  const [selectedMethods, setSelectedMethods] = useState([]);
  const [amounts, setAmounts] = useState({ 
    'الاهلي و مصر': 0,
    'OTHER': 0,
    'cash': 0, 
    'vodafone_cash': 0, 
    'postponed': 0,
    'discount': 0 
  });

  const [cashierName, setCashierName] = useState('');

  const baseUrl = window.runtimeConfig?.apiBaseUrl;

  const getAmount = (method) => amounts[method] || 0;

  const setAmount = (method, value) =>
    setAmounts((prev) => ({ ...prev, [method]: Number(value) }));

  // Normalize data to prevent errors
  const normalizedTicketCounts = ticketCounts || {};
  const normalizedTypes = types || [];
  const normalizedTicketIds = Array.isArray(ticketIds) ? ticketIds : [];
  const normalizedTicketDetails = Array.isArray(ticketDetails) ? ticketDetails : [];

  // Fetch meals data
  useEffect(() => {
    if (!baseUrl) return;
    
    const fetchMeals = async () => {
      try {
        const response = await axios.get(`${baseUrl}/api/meals?archived=false`);
        console.log("Meals data fetched:", response.data.slice(0, 2));
        setMeals(response.data.map(meal => ({
          ...meal,
          price: Number(meal.price || 0)
        })));
      } catch (error) {
        console.error("Failed to fetch meals:", error);
        notify.error("Failed to load meals data");
      }
    };
    
    fetchMeals();
  }, [baseUrl]);

  // Get cashier name on component mount
  useEffect(() => {
    const name = localStorage.getItem("userName") || "Unknown Cashier";
    setCashierName(name);
  }, []);

  // Determine selected tickets based on mode
  const selected = useMemo(() => {
    try {
      if (mode === "existing" && normalizedTicketIds.length > 0) {
        return normalizedTicketIds.map(id => {
          const matchingDetail = normalizedTicketDetails.find(td => td && td.id === id) || {};
          
          return {
            id,
            category: matchingDetail.category || "Ticket",
            subcategory: matchingDetail.subcategory || `ID: ${id}`,
            price: Number(matchingDetail.price || 0)
          };
        });
      } else {
        return normalizedTypes.filter(t => 
          t && typeof t === 'object' && t.id && 
          Number(normalizedTicketCounts[t.id] || 0) > 0
        );
      }
    } catch (error) {
      console.error("Error in selected calculation:", error);
      return [];
    }
  }, [mode, normalizedTicketIds, normalizedTicketDetails, normalizedTypes, normalizedTicketCounts]);

  // Calculate ticket total
  const ticketTotal = useMemo(() => {
    try {
      if (mode === "existing" && Array.isArray(selected)) {
        return selected.reduce((sum, ticket) => {
          if (!ticket || typeof ticket !== 'object') return sum;
          const price = Number(ticket.price || 0);
          return sum + price;
        }, 0);
      } else if (Array.isArray(selected)) {
        return selected.reduce((sum, ticket) => {
          if (!ticket || typeof ticket !== 'object') return sum;
          const count = Number(normalizedTicketCounts[ticket.id] || 0);
          const price = Number(ticket.price || 0);
          return sum + (count * price);
        }, 0);
      }
      return 0;
    } catch (error) {
      console.error("Error calculating ticket total:", error);
      return 0;
    }
  }, [mode, selected, normalizedTicketCounts]);

  // Calculate meal total
  const mealTotal = useMemo(() => {
    try {
      return Object.entries(mealCounts).reduce((sum, [mealId, quantity]) => {
        const meal = meals.find(m => m.id === parseInt(mealId));
        if (!meal) return sum;
        
        const price = Number(meal.price || 0);
        const qty = Number(quantity || 0);
        
        return sum + (price * qty);
      }, 0);
    } catch (error) {
      console.error("Error calculating meal total:", error);
      return 0;
    }
  }, [mealCounts, meals]);

  // Get discount amount
  const discountAmount = Number(amounts.discount || 0);

  // Calculate final total
  const finalTotal = useMemo(() => {
    const subtotal = ticketTotal + mealTotal;
    const total = Math.max(0, subtotal - discountAmount);
    return total;
  }, [ticketTotal, mealTotal, discountAmount]);

  // Check if there are any items
  const hasItems = selected.length > 0 || Object.values(mealCounts).some(qty => qty > 0);

  // Set full amount if exactly one payment method is selected (excluding discount)
  useEffect(() => {
    const paymentMethods = selectedMethods.filter(m => m !== 'discount');
    
    if (paymentMethods.length === 1 && finalTotal > 0) {
      const method = paymentMethods[0];
      setAmounts(prev => ({
        ...prev,
        [method]: finalTotal
      }));
    }
  }, [selectedMethods, finalTotal]);

  // Reset payment amounts when multiple methods are selected
  useEffect(() => {
    const paymentMethods = selectedMethods.filter(m => m !== 'discount');
    
    if (paymentMethods.length > 1) {
      setAmounts(prev => {
        const updated = { ...prev };
        paymentMethods.forEach(method => {
          updated[method] = 0;
        });
        return updated;
      });
    }
  }, [selectedMethods]);

  // Calculate entered total and remaining amount
  const enteredTotal = useMemo(() => {
    const paymentTotal = selectedMethods
      .filter(method => method !== 'discount')
      .reduce((sum, method) => sum + getAmount(method), 0);
    
    return paymentTotal;
  }, [selectedMethods, amounts]);

  const remaining = finalTotal - enteredTotal;

  // Handle adding a meal
  const handleAddMeal = () => {
    if (!selectedMealId || customMealQty <= 0) return;
    
    const mealId = parseInt(selectedMealId);
    const meal = meals.find(m => m.id === mealId);
    
    if (meal) {
      setMealCounts(prev => ({
        ...prev,
        [mealId]: (prev[mealId] || 0) + Number(customMealQty)
      }));
    }
    
    setCustomMealQty(1);
    setSelectedMealId("");
  };

  // Handle removing a meal
  const handleRemoveMeal = (mealId) => {
    setMealCounts(prev => {
      const updated = { ...prev };
      delete updated[mealId];
      return updated;
    });
  };

  const handleSubmit = () => {
    setOpen(true);
  };

  // Handle checkout confirmation
  const handleConfirm = async () => {
    try {
      const user_id = parseInt(localStorage.getItem("userId"), 10);
      if (!user_id || isNaN(user_id)) {
        notify.error("Missing or invalid user ID");
        return;
      }

      // Calculate total paid for display purposes
      const totalPaid = selectedMethods
        .filter(method => method !== 'discount')
        .reduce((sum, method) => sum + getAmount(method), 0);

      // MODIFIED: Structure payments data - handle overpayment for any scenario
      const payments = [];
      const paymentMethods = selectedMethods.filter(method => method !== 'discount' && getAmount(method) > 0);
      
      // Calculate if there's overpayment
      const isOverpaid = totalPaid > finalTotal;
      
      if (isOverpaid) {
        // There's overpayment - adjust payments to match required total
        let remainingTotal = finalTotal;
        
        // Sort payment methods to handle cash last (if present)
        const sortedMethods = paymentMethods.sort((a, b) => {
          if (a === 'cash') return 1; // Cash goes last
          if (b === 'cash') return -1; // Cash goes last
          return 0;
        });
        
        sortedMethods.forEach((method, index) => {
          const actualAmount = getAmount(method);
          
          if (index === sortedMethods.length - 1) {
            // Last payment method gets whatever is remaining
            const amountToSend = Math.max(0, remainingTotal);
            if (amountToSend > 0) {
              payments.push({
                method,
                amount: parseFloat(amountToSend.toFixed(2))
              });
            }
          } else {
            // Non-last payment methods get their full amount or remaining total (whichever is smaller)
            const amountToSend = Math.min(actualAmount, remainingTotal);
            if (amountToSend > 0) {
              payments.push({
                method,
                amount: parseFloat(amountToSend.toFixed(2))
              });
              remainingTotal -= amountToSend;
            }
          }
        });
      } else {
        // No overpayment - send actual amounts
        paymentMethods.forEach(method => {
          payments.push({
            method,
            amount: parseFloat(getAmount(method).toFixed(2))
          });
        });
      }

      // Add discount as a separate payment if present
      if (discountAmount > 0) {
        payments.push({
          method: "discount",
          amount: parseFloat(discountAmount.toFixed(2))
        });
      }

      // Create the appropriate payload based on mode
      let payload = {
        user_id,
        description: description.trim(),
        payments,
        total_amount: finalTotal, // Always send the correct required total
        gross_total: ticketTotal + mealTotal
      };
      
      if (mode === "existing") {
        payload.ticket_ids = normalizedTicketIds;
      } else {
        payload.tickets = selected.map((t) => ({
          ticket_type_id: parseInt(t.id, 10),
          quantity: parseInt(normalizedTicketCounts[t.id], 10)
        }));
      }

      // Add meals if present
      if (Object.keys(mealCounts).length > 0) {
        payload.meals = Object.entries(mealCounts).map(([meal_id, quantity]) => {
          const meal = meals.find((m) => m.id === parseInt(meal_id));
          return {
            meal_id: parseInt(meal_id),
            quantity: parseInt(quantity, 10),
            price_at_order: meal?.price || 0
          };
        });
      }

      console.log("Submitting payload:", payload);
      console.log("Actual amounts paid (for display):", {
        totalPaid,
        changeAmount: Math.max(0, totalPaid - finalTotal),
        paymentBreakdown: selectedMethods
          .filter(method => method !== 'discount' && getAmount(method) > 0)
          .map(method => ({ method, actualAmount: getAmount(method) }))
      });

      // Call onCheckout - backend will receive correct total
      await onCheckout(payload);
      
      // Close dialog
      setOpen(false);
      
      // Reset the component state
      setDescription("");
      setSelectedMethods([]);
      setAmounts({ 
        'الاهلي و مصر': 0, 
        'OTHER': 0, 
        'cash': 0, 
        'vodafone_cash': 0, 
        'postponed': 0, 
        'discount': 0 
      });
      setMealCounts({});
      
      // Show success message with change info if applicable
      let successMessage = "✅ Checkout successful! Opening print windows...";
      if (totalPaid > finalTotal) {
        const changeAmount = totalPaid - finalTotal;
        successMessage = `✅ Checkout successful! Change: EGP ${changeAmount.toFixed(2)} - Opening print windows...`;
      }
      
      notify.success(successMessage, {
        duration: 4000
      });
      
      // Start the print process with change info
      setTimeout(() => {
        openTwoPrintWindows(totalPaid);
      }, 500);
      
    } catch (error) {
      console.error("Checkout error:", error);
      notify.error("Error processing checkout");
    }
  };

  // Open exactly 2 print windows simultaneously
  const openTwoPrintWindows = (actualTotalPaid = null) => {
    const receiptData = buildReceiptData(actualTotalPaid);
    
    notify.info("📄 Opening two print windows...", { duration: 2000 });
    
    const printWindow1 = openSinglePrintWindow(receiptData, 'Copy 1');
    
    setTimeout(() => {
      const printWindow2 = openSinglePrintWindow(receiptData, 'Copy 2');
      
      setTimeout(() => {
        notify.success("📄📄 Both receipt copies have been sent to printer!", {
          duration: 3000
        });
      }, 2000);
    }, 300);
  };

  // Minimal print window function
  const openSinglePrintWindow = (receiptData, copyLabel) => {
    const receiptHTML = generateReceiptHTML(receiptData, copyLabel);
    
    const printWindow = window.open('', '_blank', 'width=1,height=1,left=0,top=0,scrollbars=no,menubar=no,toolbar=no,location=no,status=no,resizable=no');
    
    if (!printWindow) {
      notify.error(`Print window blocked for ${copyLabel}. Please allow popups.`);
      return null;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${copyLabel}</title>
          <meta charset="UTF-8">
          <style>
            @page { 
              size: 80mm auto; 
              margin: 0; 
            }
            body { 
              margin: 0; 
              padding: 3mm; 
              font-family: 'Courier New', monospace; 
              font-size: 10pt; 
              background: white; 
              color: black; 
              visibility: hidden;
            }
            @media print {
              body { 
                visibility: visible;
              }
            }
          </style>
        </head>
        <body>
          ${receiptHTML}
          <script>
            let hasPrinted = false;
            
            window.onload = function() {
              if (!hasPrinted) {
                hasPrinted = true;
                window.moveTo(0, 0);
                window.resizeTo(1, 1);
                window.focus();
                
                setTimeout(function() {
                  window.print();
                }, 100);
                
                setTimeout(function() { 
                  if (!window.closed) {
                    window.close(); 
                  }
                }, 2000);
              }
            };
            
            window.onafterprint = function() {
              window.close();
            };
            
            window.onfocus = function() {
              setTimeout(function() {
                if (!window.closed) {
                  window.close();
                }
              }, 1000);
            };
            
            setTimeout(function() {
              if (!window.closed) {
                window.close();
              }
            }, 5000);
          </script>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    notify.info(`📄 ${copyLabel} print dialog opening...`, { duration: 1000 });
    return printWindow;
  };

  // MODIFIED: Build receipt data with simple change calculation
  const buildReceiptData = (actualTotalPaid = null) => {
    // Use passed totalPaid or calculate from current state
    const totalPaid = actualTotalPaid || selectedMethods
      .filter(method => method !== 'discount')
      .reduce((sum, method) => sum + getAmount(method), 0);
      
    const changeAmount = totalPaid > finalTotal ? totalPaid - finalTotal : 0;

    return {
      header: {
        title: 'AKOYA WATER PARK',
        timestamp: new Date().toLocaleString(),
        cashier: cashierName,
        orderId: `#${new Date().getTime().toString().slice(-6)}`
      },
      description: description.trim(),
      items: {
        tickets: selected.map(t => ({
          name: `${t.category} - ${t.subcategory}`,
          quantity: mode === "new" ? normalizedTicketCounts[t.id] : 1,
          price: t.price,
          total: mode === "new" ? (normalizedTicketCounts[t.id] * t.price) : t.price
        })),
        meals: Object.entries(mealCounts).map(([id, qty]) => {
          const meal = meals.find(m => m.id === parseInt(id));
          return {
            name: meal?.name || 'Unknown Meal',
            quantity: qty,
            price: meal?.price || 0,
            total: (meal?.price || 0) * qty
          };
        })
      },
      totals: {
        ticketTotal,
        mealTotal,
        discountAmount,
        finalTotal,
        totalPaid, // Actual amount paid by customer
        changeAmount // Change amount for display
      },
      payments: selectedMethods
        .filter(method => method !== 'discount' && getAmount(method) > 0)
        .map(method => ({
          method: getPaymentMethodDisplayName(method),
          amount: getAmount(method) // Show actual amounts paid on receipt
        }))
    };
  };

  // Helper function for payment method display names
  const getPaymentMethodDisplayName = (method) => {
    switch(method) {
      case 'vodafone_cash': return 'VODAFONE CASH';
      default: return method.toUpperCase();
    }
  };

  // Validate discount function
  const validateDiscount = (value) => {
    const inputValue = value === '' ? 0 : Number(value);
    const subtotal = ticketTotal + mealTotal;
    const validDiscount = Math.min(Math.max(0, inputValue), subtotal);
    return validDiscount;
  };

  // MODIFIED: renderPaymentField function - only allow overpayment for cash
  const renderPaymentField = (method) => {
    const isOnlyPaymentMethod = selectedMethods.filter(m => m !== 'discount').length === 1;
    const currentAmount = getAmount(method);
    const isCashMethod = method === 'cash';
    
    // Only cash can exceed the total
    const maxAmount = isCashMethod ? undefined : finalTotal;
    const displayValue = currentAmount === 0 && !isOnlyPaymentMethod ? "" : currentAmount.toString();
    const placeholderValue = isOnlyPaymentMethod ? `${finalTotal.toFixed(2)}${isCashMethod ? ' (or more)' : ''}` : "";
    
    const getMethodLabel = (method) => {
      switch(method) {
        case 'vodafone_cash': return 'VODAFONE CASH';
        default: return method.toUpperCase();
      }
    };
    
    return (
      <TextField
        key={method}
        label={getMethodLabel(method)}
        type="number"
        inputProps={{ 
          step: "any", 
          min: 0,
          max: maxAmount // Only restrict non-cash methods
        }}
        value={displayValue}
        placeholder={placeholderValue}
        onChange={(e) => {
          const inputValue = e.target.value === '' ? 0 : Number(e.target.value);
          const validValue = Math.max(0, inputValue);
          
          // For non-cash methods, limit to final total
          if (!isCashMethod && validValue > finalTotal) {
            setAmount(method, finalTotal);
          } else {
            setAmount(method, validValue);
          }
        }}
        disabled={false}
        fullWidth
        sx={{ flexBasis: "calc(50% - 8px)", flexGrow: 1, mb: 1 }}
        helperText={isCashMethod && isOnlyPaymentMethod ? "Cash can exceed total for change" : ""}
      />
    );
  };

  // MODIFIED: generateReceiptHTML with simple paid/change format
  const generateReceiptHTML = (data, copyLabel = '') => {
    return `
      <div style="width: 74mm; font-family: 'Courier New', monospace; font-size: 11pt; line-height: 1.3; font-weight: bold;">
        <div style="text-align: center; margin-bottom: 5mm;">
          <div style="font-weight: 900; font-size: 16pt; margin-bottom: 2mm; letter-spacing: 1px;">${data.header.title}</div>
          <div style="font-size: 10pt; margin-bottom: 1mm; font-weight: bold;">${data.header.timestamp}</div>
          <div style="font-size: 10pt; margin-bottom: 1mm; font-weight: bold;">Cashier: ${data.header.cashier}</div>
          <div style="font-size: 10pt; margin-bottom: 1mm; font-weight: bold;">Order ID: ${data.header.orderId}</div>
          ${copyLabel ? `<div style="font-size: 9pt; font-weight: 900; color: #333; margin-top: 2mm; border: 2px solid #333; padding: 3px; background: #f0f0f0;">[${copyLabel}]</div>` : ''}
        </div>
        
        <div style="border-top: 2px dashed black; margin: 3mm 0;"></div>
        
        <div style="font-weight: 900; margin: 3mm 0 2mm 0; font-size: 12pt; text-decoration: underline;">ORDER ITEMS</div>
        
        ${data.items.tickets && data.items.tickets.length > 0 ? data.items.tickets.map(ticket => `
          <div style="display: flex; justify-content: space-between; margin-bottom: 2mm; font-size: 10pt; font-weight: bold; padding: 1mm 0; border-bottom: 1px dotted #666;">
            <span style="flex: 1; padding-right: 3mm;">${ticket.name}${ticket.quantity > 1 ? ` × ${ticket.quantity}` : ''}</span>
            <span style="white-space: nowrap; font-weight: 900;">EGP ${(ticket.total || 0).toFixed(2)}</span>
          </div>
        `).join('') : ''}
        
        ${data.items.meals && data.items.meals.length > 0 ? data.items.meals.map(meal => `
          <div style="display: flex; justify-content: space-between; margin-bottom: 2mm; font-size: 10pt; font-weight: bold; padding: 1mm 0; border-bottom: 1px dotted #666;">
            <span style="flex: 1; padding-right: 3mm;">${meal.name} × ${meal.quantity}</span>
            <span style="white-space: nowrap; font-weight: 900;">EGP ${(meal.total || 0).toFixed(2)}</span>
          </div>
        `).join('') : ''}
        
        <div style="border-top: 2px dashed black; margin: 3mm 0;"></div>
        
        ${data.totals.ticketTotal > 0 ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 2mm; font-size: 10pt; font-weight: bold;">
            <span>Tickets Subtotal:</span><span style="font-weight: 900;">EGP ${data.totals.ticketTotal.toFixed(2)}</span>
          </div>
        ` : ''}
        
        ${data.totals.mealTotal > 0 ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 2mm; font-size: 10pt; font-weight: bold;">
            <span>Meals Subtotal:</span><span style="font-weight: 900;">EGP ${data.totals.mealTotal.toFixed(2)}</span>
          </div>
        ` : ''}
        
        ${data.totals.discountAmount > 0 ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 2mm; font-size: 10pt; font-weight: bold; color: #d32f2f;">
            <span>Discount Applied:</span><span style="font-weight: 900;">-EGP ${data.totals.discountAmount.toFixed(2)}</span>
          </div>
        ` : ''}
        
        <div style="border-top: 3px solid black; margin: 3mm 0;"></div>
        
        <div style="display: flex; justify-content: space-between; font-weight: 900; margin-top: 3mm; font-size: 14pt; background: #f0f0f0; padding: 2mm; border: 2px solid black;">
          <span>TOTAL:</span><span>EGP ${data.totals.finalTotal.toFixed(2)}</span>
        </div>
        
        <div style="border-top: 2px dashed black; margin: 3mm 0;"></div>
        
        <div style="font-weight: 900; margin: 3mm 0 2mm 0; font-size: 12pt; text-decoration: underline;">PAYMENT DETAILS</div>
        
        ${data.payments && data.payments.length > 0 ? data.payments.map(payment => `
          <div style="display: flex; justify-content: space-between; margin-bottom: 2mm; font-size: 10pt; font-weight: bold; padding: 1mm; background: #f8f8f8; border: 1px solid #ddd;">
            <span style="font-weight: bold;">${payment.method}:</span><span style="font-weight: 900;">EGP ${payment.amount.toFixed(2)}</span>
          </div>
        `).join('') : ''}
        
        ${data.totals.totalPaid > data.totals.finalTotal ? `
          <div style="margin: 2mm 0; font-size: 11pt; font-weight: bold;">
            <div style="display: flex; justify-content: space-between; padding: 1mm; background: #f0f0f0;">
              <span>Paid:</span><span>EGP ${data.totals.totalPaid.toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 1mm; background: #ffe6e6; color: #d32f2f;">
              <span>Change:</span><span>EGP ${data.totals.changeAmount.toFixed(2)}</span>
            </div>
          </div>
        ` : ''}
        
        <div style="border-top: 2px dashed black; margin: 3mm 0;"></div>
        
        <div style="text-align: center; margin-top: 4mm; font-size: 10pt; font-weight: bold;">
          <div style="margin-bottom: 1mm;">Thank you for visiting</div>
          <div style="margin-bottom: 1mm; font-weight: 900;">Akoya Water Park!</div>
          <div style="font-size: 11pt; font-weight: 900;">Have a wonderful day! 🌊</div>
        </div>
        
        ${data.description && data.description.trim() ? `
          <div style="border-top: 2px dashed black; margin: 3mm 0;"></div>
          <div style="margin: 3mm 0;">
            <div style="font-weight: 900; margin-bottom: 2mm; font-size: 11pt; text-decoration: underline; text-align: center;">ORDER NOTES:</div>
            <div style="font-size: 10pt; font-weight: bold; background: #f8f8f8; padding: 2mm; border: 1px solid #ccc; border-radius: 2px; word-wrap: break-word; text-align: center; font-style: italic;">${data.description}</div>
          </div>
        ` : ''}
      </div>
    `;
  };

  return (
    <>
      <Box mt={2} p={3} border="1px solid #00AEEF" borderRadius={2} bgcolor="#E0F7FF">
        <Typography variant="h6" sx={{ color: "#00AEEF", mb: 2 }}>🧾 Order Summary</Typography>

        {/* Tickets section */}
        {selected.length > 0 && (
          <>
            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>Tickets:</Typography>
            {selected.map((t) => (
              <Typography key={t.id} variant="body2" sx={{ mb: 0.5 }}>
                {t.category} - {t.subcategory} {mode === "new" ? `× ${normalizedTicketCounts[t.id]}` : ""} = EGP{" "}
                {mode === "new" 
                  ? (normalizedTicketCounts[t.id] * t.price).toFixed(2)
                  : t.price.toFixed(2)
                }
              </Typography>
            ))}
            <Divider sx={{ my: 1.5 }} />
          </>
        )}

        {/* Meals section */}
        <Box mt={2}>
          <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>Add Meals:</Typography>
          <FormControl fullWidth size="small" sx={{ mb: 1 }}>
            <InputLabel>Select Meal</InputLabel>
            <Select
              value={selectedMealId}
              label="Select Meal"
              onChange={(e) => setSelectedMealId(e.target.value)}
            >
              {meals.map((m) => (
                <MenuItem key={m.id} value={m.id}>
                  {m.name} — EGP {m.price.toFixed(2)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Box display="flex" alignItems="center" mt={1} gap={2}>
            <TextField
              type="number"
              label="Quantity"
              size="small"
              inputProps={{ min: 1 }}
              value={customMealQty}
              onChange={(e) => setCustomMealQty(Math.max(1, parseInt(e.target.value) || 1))}
              sx={{ width: "30%" }}
            />
            <Button variant="outlined" onClick={handleAddMeal} sx={{ flexGrow: 1 }}>
              Add Meal
            </Button>
          </Box>

          <Box mt={2}>
            {Object.keys(mealCounts).length > 0 && (
              <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>Selected Meals:</Typography>
            )}
            {Object.entries(mealCounts).map(([id, qty]) => {
              const meal = meals.find((m) => m.id === parseInt(id));
              if (!meal) return null;
              
              return (
                <Box key={id} display="flex" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                  <Typography variant="body2">
                    {meal.name} × {qty} = EGP {(meal.price * qty).toFixed(2)}
                  </Typography>
                  <IconButton 
                    onClick={() => handleRemoveMeal(id)} 
                    color="error" 
                    size="small"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              );
            })}
          </Box>
        </Box>

        {!hasItems && (
          <Typography sx={{ color: "gray", mt: 2, fontStyle: "italic" }}>
            No tickets or meals selected yet.
          </Typography>
        )}

        <Divider sx={{ my: 2 }} />
        
        {/* Totals section */}
        <Box sx={{ mb: 2 }}>
          {ticketTotal > 0 && (
            <Typography variant="body2" sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Tickets:</span>
              <span>EGP {ticketTotal.toFixed(2)}</span>
            </Typography>
          )}
          
          {mealTotal > 0 && (
            <Typography variant="body2" sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Meals:</span>
              <span>EGP {mealTotal.toFixed(2)}</span>
            </Typography>
          )}
          
          {discountAmount > 0 && (
            <Typography variant="body2" color="error" sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Discount:</span>
              <span>-EGP {discountAmount.toFixed(2)}</span>
            </Typography>
          )}
          
          <Typography variant="h6" sx={{ fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', mt: 1 }}>
            <span>Final Total:</span>
            <span>EGP {finalTotal.toFixed(2)}</span>
          </Typography>
        </Box>

        <Box mt={2} display="flex" gap={2}>
          <Button
            variant="contained"
            fullWidth
            onClick={handleSubmit}
            disabled={!hasItems}
            sx={{ bgcolor: "#00AEEF", "&:hover": { bgcolor: "#0097d6" } }}
          >
            Checkout
          </Button>
          <Button 
            variant="outlined" 
            fullWidth 
            color="error" 
            onClick={onClear}
            sx={{ borderColor: "#f44336", color: "#f44336" }}
          >
            Clear
          </Button>
        </Box>
      </Box>

      {/* Checkout Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md"
        sx={{
          '& .MuiToggleButton-root': {
            fontFamily: '"Segoe UI", Tahoma, Arial, sans-serif',
            fontSize: '0.875rem'
          }
        }}
      >
        <DialogTitle sx={{ bgcolor: "#E0F7FF", color: "#00AEEF" }}>
          Confirm Checkout
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <TextField
            label="Add Description"
            fullWidth
            margin="normal"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            multiline
            minRows={3}
          />
          
          <Typography variant="subtitle1" sx={{ mt: 3, fontWeight: "bold", color: "#00AEEF" }}>
            💳 Select Payment Method(s)
          </Typography>

          <ToggleButtonGroup
            value={selectedMethods}
            onChange={(_, newMethods) => setSelectedMethods(newMethods)}
            aria-label="payment methods"
            color="primary"
            sx={{ mt: 1, display: "flex", flexWrap: "wrap" }}
          >
            <ToggleButton 
              value="الاهلي و مصر" 
              aria-label="visa_bank"
              sx={{ flex: "1 0 auto", minWidth: "120px" }}
            >
              الاهلي و مصر
            </ToggleButton>
            
            <ToggleButton 
              value="OTHER" 
              aria-label="visa_other"
              sx={{ flex: "1 0 auto", minWidth: "100px" }}
            >
              OTHER
            </ToggleButton>
            
            <ToggleButton 
              value="cash" 
              aria-label="cash"
              sx={{ flex: "1 0 auto", minWidth: "100px" }}
            >
              CASH
            </ToggleButton>
            
            <ToggleButton 
              value="vodafone_cash" 
              aria-label="vodafone_cash"
              sx={{ flex: "1 0 auto", minWidth: "100px" }}
            >
              VODAFONE CASH
            </ToggleButton>
            
            <ToggleButton 
              value="postponed" 
              aria-label="postponed"
              sx={{ flex: "1 0 auto", minWidth: "100px" }}
            >
              POSTPONED
            </ToggleButton>
            
            <ToggleButton 
              value="discount" 
              aria-label="discount"
              sx={{ flex: "1 0 auto", minWidth: "100px" }}
            >
              DISCOUNT
            </ToggleButton>
          </ToggleButtonGroup>
          
          {/* Discount field if selected */}
          {selectedMethods.includes('discount') && (
            <TextField
              label="Discount Amount"
              type="number"
              inputProps={{ 
                step: "any", 
                min: 0,
                max: ticketTotal + mealTotal
              }}
              value={getAmount('discount')}
              onChange={(e) => {
                const validDiscount = validateDiscount(e.target.value);
                setAmount('discount', validDiscount);
              }}
              fullWidth
              sx={{ mt: 2, mb: 1 }}
              helperText={`Enter discount amount (max: EGP ${(ticketTotal + mealTotal).toFixed(2)})`}
            />
          )}
          
          {/* Payment fields */}
          <Box display="flex" gap={2} mt={2} flexWrap="wrap">
            {selectedMethods
              .filter(method => method !== 'discount')
              .map((method) => renderPaymentField(method))}
          </Box>

          <Typography 
            sx={{ mt: 2 }} 
            color={Math.abs(remaining) < 0.01 ? "green" : remaining > 0 ? "red" : "orange"}
            variant="subtitle1"
            fontWeight="bold"
          >
            {remaining > 0.01 ? 'Remaining:' : remaining < -0.01 ? 'Overpaid (Change):' : 'Payment Complete:'} EGP {Math.abs(remaining).toFixed(2)}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            onClick={handleConfirm}
            variant="contained"
            disabled={!hasItems || remaining > 0.01}
            sx={{ bgcolor: "#00AEEF" }}
          >
            {remaining < -0.01 ? 'Confirm with Change' : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default CheckoutPanel;

