import React, { useState, useEffect } from "react";
import { Box, Grid, useMediaQuery, useTheme, Paper, Typography } from "@mui/material";
import axios from "axios";
import TicketCategoryPanel from "../components/TicketCategoryPanel";
import TicketSelectorPanel from "../components/TicketSelectorPanel";
import CheckoutPanel from "../components/CheckoutPanel";
import { notify } from '../utils/toast';

const CashierSellingPanel = () => {
  // Add theme hooks for responsive design
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));
  const isSquareScreen = useMediaQuery('(max-aspect-ratio: 4/3)');
  const isExtraSmallScreen = useMediaQuery(theme.breakpoints.down('sm')); // Add this
  
  // Define baseUrl at the top of the component
  const baseUrl = window.runtimeConfig?.apiBaseUrl;
  
  const [types, setTypes] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [ticketCounts, setTicketCounts] = useState({});

  // Update the category mapping to include all variations
  const categoryMapping = {
    'child': 'اطفال',
    'kid': 'اطفال',
    'kids': 'اطفال',
    'children': 'اطفال',
    'toddler': 'اطفال',
    'baby': 'اطفال',
    'infant': 'اطفال',
    'adult': 'كبار',
    'adults': 'كبار',
    'grown': 'كبار',
    'grownup': 'كبار',
    'senior': 'جدود',
    'seniors': 'جدود',
    'elderly': 'جدود',
    'elder': 'جدود',
    'old': 'جدود',
    'aged': 'جدود'
  };

  // Enhanced translate function with better logging
  const translateCategory = (category) => {
    if (!category) {
      console.log('No category provided to translate');
      return category;
    }
    
    const lowerCategory = category.toLowerCase().trim();
    const translated = categoryMapping[lowerCategory] || category;
    
    // Log the translation for debugging
    console.log(`CashierPanel - Translating category: "${category}" -> "${translated}"`);
    
    return translated;
  };

  // Fetch ticket types with proper price handling
  useEffect(() => {
    // Add check for baseUrl
    if (!baseUrl) {
      console.error("API base URL is not configured");
      notify.error("API configuration missing. Please refresh the page.");
      return;
    }
    
    const fetchTicketTypes = async () => {
      try {
        const { data } = await axios.get(`${baseUrl}/api/tickets/ticket-types?archived=false`);
        
        // Filter out tickets with invalid prices (0, null, undefined, or empty)
        const validTypes = data.filter(type => {
          const price = Number(type.price);
          return price > 1; // Only include tickets with price greater than 0
        });
        
        // Ensure all prices are valid numbers and translate categories
        const typesWithValidPrices = validTypes.map(type => ({
          ...type,
          price: Number(type.price),
          // Keep original category for backend compatibility
          originalCategory: type.category,
          // Add translated category for display
          category: translateCategory(type.category)
        }));
        
        console.log('Valid ticket types with prices > 0:', 
          typesWithValidPrices.slice(0, 3).map(t => ({ 
            id: t.id, 
            originalCategory: t.originalCategory,
            category: t.category, 
            subcategory: t.subcategory,
            price: t.price 
          }))
        );
        
        setTypes(typesWithValidPrices);
      } catch (error) {
        console.error("Failed to fetch ticket types:", error);
        notify.error("Failed to load ticket types");
      }
    };
    
    fetchTicketTypes();
  }, [baseUrl]);

  const handleSelectCategory = (category) => {
    if (!selectedCategories.includes(category)) {
      setSelectedCategories([...selectedCategories, category]);
    }
  };

  const handleRemoveCategory = (category) => {
    setSelectedCategories((prev) => prev.filter((c) => c !== category));
    const updatedCounts = { ...ticketCounts };

    types
      .filter((t) => t.category === category)
      .forEach((t) => delete updatedCounts[t.id]);
    setTicketCounts(updatedCounts);
  };

  const handleTicketCountChange = (typeId, value) => {
    const count = parseInt(value);

    if (count <= 0) {
      const updatedCounts = { ...ticketCounts };
      delete updatedCounts[typeId];
      setTicketCounts(updatedCounts);
    } else {
      setTicketCounts({ ...ticketCounts, [typeId]: count });
    }
  };

  const handleCheckout = async (checkoutData) => {
    // Check for baseUrl here too
    if (!baseUrl) {
      notify.error("API configuration missing. Unable to process checkout.");
      return;
    }
    
    // Convert Arabic categories back to original English for backend
    const modifiedCheckoutData = {
      ...checkoutData,
      tickets: checkoutData.tickets?.map(ticket => {
        const originalType = types.find(t => t.id === ticket.type_id);
        return {
          ...ticket,
          category: originalType?.originalCategory || ticket.category
        };
      })
    };
    
    try {
      const response = await axios.post(`${baseUrl}/api/tickets/sell`, modifiedCheckoutData);
      
      notify.success(`Order completed successfully! Order #${response.data.order_id || 'Created'}`);
      
      // Reset the component state
      setTicketCounts({});
      // Keep selected categories to improve UX
    } catch (error) {
      console.error("Checkout error:", error);
      notify.error(error.response?.data?.message || "Failed to process checkout");
    }
  };

  const handleClear = () => {
    setTicketCounts({});
  };

  return (
    <Box sx={{ 
      height: "calc(100vh - 80px)", 
      display: "flex",
      flexDirection: "column",
      backgroundColor: "#f8f9fa",
      overflow: "hidden"
    }}>
      {/* Header - More compact */}
      <Paper 
        elevation={1} 
        sx={{ 
          p: isExtraSmallScreen ? 0.25 : 0.5,  // Even smaller on mobile
          m: isExtraSmallScreen ? 0.25 : 0.5, 
          backgroundColor: "#E0F7FF",
          borderRadius: 2,
          flexShrink: 0
        }}
      >
        <Typography 
          variant="subtitle2"
          sx={{ 
            color: "#00AEEF", 
            fontWeight: 600, 
            textAlign: "center",
            fontSize: isExtraSmallScreen ? "0.8rem" : "0.9rem"  // Smaller on mobile
          }}
        >
          🎫 Ticket Sales System
        </Typography>
      </Paper>

      {/* Main Content Area */}
      <Box sx={{ 
        flex: 1, 
        p: isExtraSmallScreen ? 0.25 : 0.5,  // Smaller padding on mobile
        display: "flex",
        gap: isExtraSmallScreen ? 0.25 : 0.5,  // Smaller gap on mobile
        overflow: "hidden",
        minHeight: 0
      }}>
        {/* Extra Small Screens - Vertical Stack */}
        {isExtraSmallScreen ? (
          <Box sx={{ 
            width: "100%", 
            display: "flex", 
            flexDirection: "column",
            gap: 0.25,  // Very tight gaps for mobile
            height: "100%",
            overflow: "hidden"
          }}>
            {/* Top: Categories - More compact */}
            <Box sx={{ 
              height: "18%",  // Slightly smaller
              minHeight: "100px",  // Reduced min height
              maxHeight: "130px",  // Reduced max height
              overflow: "hidden" 
            }}>
              <TicketCategoryPanel
                types={types}
                selectedCategories={selectedCategories}
                onSelectCategory={handleSelectCategory}
                onRemoveCategory={handleRemoveCategory}
                compact={true}
              />
            </Box>
            
            {/* Middle: Ticket Selector - Takes most space */}
            <Box sx={{ 
              flex: 1,
              minHeight: "250px",  // Ensure minimum usable space
              overflow: "hidden"
            }}>
              <TicketSelectorPanel
                types={types}
                selectedCategories={selectedCategories}
                ticketCounts={ticketCounts}
                onTicketCountChange={handleTicketCountChange}
                translateCategory={translateCategory}
                compact={true}
              />
            </Box>
            
            {/* Bottom: Checkout Summary - More compact */}
            <Box sx={{ 
              height: "22%",  // Slightly smaller
              minHeight: "130px",  // Reduced min height
              maxHeight: "180px",  // Reduced max height
              overflow: "hidden" 
            }}>
              <CheckoutPanel
                ticketCounts={ticketCounts}
                types={types}
                onCheckout={handleCheckout}
                onClear={handleClear}
                mode="new"
                baseUrl={baseUrl}
                compact={true}
              />
            </Box>
          </Box>
        ) : (isSmallScreen || isSquareScreen) ? (
          /* Medium Small Screens - Horizontal Layout */
          <Box sx={{ 
            width: "100%", 
            display: "flex", 
            flexDirection: "row",
            gap: 0.5,
            height: "100%",
            overflow: "hidden"
          }}>
            {/* Left: Categories */}
            <Box sx={{ 
              width: "25%",
              minWidth: "200px",
              height: "100%", 
              overflow: "hidden" 
            }}>
              <TicketCategoryPanel
                types={types}
                selectedCategories={selectedCategories}
                onSelectCategory={handleSelectCategory}
                onRemoveCategory={handleRemoveCategory}
                compact={true}
              />
            </Box>
            
            {/* Middle: Ticket Selector */}
            <Box sx={{ 
              flex: 1,
              height: "100%",
              overflow: "hidden"
            }}>
              <TicketSelectorPanel
                types={types}
                selectedCategories={selectedCategories}
                ticketCounts={ticketCounts}
                onTicketCountChange={handleTicketCountChange}
                translateCategory={translateCategory}
                compact={true}
              />
            </Box>
            
            {/* Right: Checkout Summary */}
            <Box sx={{ 
              width: "25%",
              minWidth: "250px",
              height: "100%", 
              overflow: "hidden" 
            }}>
              <CheckoutPanel
                ticketCounts={ticketCounts}
                types={types}
                onCheckout={handleCheckout}
                onClear={handleClear}
                mode="new"
                baseUrl={baseUrl}
                compact={true}
              />
            </Box>
          </Box>
        ) : (
          /* Wide Screen Layout - Grid */
          <Grid container spacing={0.5} sx={{ height: "100%" }}>
            <Grid item xs={12} md={3} lg={2.5} sx={{ height: "100%" }}>
              <TicketCategoryPanel
                types={types}
                selectedCategories={selectedCategories}
                onSelectCategory={handleSelectCategory}
                onRemoveCategory={handleRemoveCategory}
                compact={false}
              />
            </Grid>
            <Grid item xs={12} md={6} lg={6.5} sx={{ height: "100%", overflow: "hidden" }}>
              <TicketSelectorPanel
                types={types}
                selectedCategories={selectedCategories}
                ticketCounts={ticketCounts}
                onTicketCountChange={handleTicketCountChange}
                translateCategory={translateCategory}
                compact={false}
              />
            </Grid>
            <Grid item xs={12} md={3} lg={3} sx={{ height: "100%" }}>
              <CheckoutPanel
                ticketCounts={ticketCounts}
                types={types}
                onCheckout={handleCheckout}
                onClear={handleClear}
                mode="new"
                baseUrl={baseUrl}
                compact={false}
              />
            </Grid>
          </Grid>
        )}
      </Box>
    </Box>
  );
};

export default CashierSellingPanel;

