import React from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Grid,
  Divider,
  Chip,
  Paper,
  IconButton,
  Button,
} from "@mui/material";
import { Add, Remove } from "@mui/icons-material";

const TicketSelectorPanel = ({
  types,
  selectedCategories,
  ticketCounts,
  onTicketCountChange,
  compact = false,
}) => {
  // Subcategory mapping from English to Arabic
  const subcategoryMapping = {
    // Children subcategories
    child: "طفل",
    kid: "طفل",
    kids: "أطفال",
    children: "أطفال",
    toddler: "طفل صغير",
    baby: "رضيع",
    grand: "",

    // Adult subcategories
    adult: "كبير",
    adults: "بالغين",
    grown: "بالغ",
    grownup: "بالغ",
    man: "رجل",
    woman: "امرأة",
    male: "ذكر",
    female: "أنثى",

    // Senior subcategories
    senior: "كبير السن",
    seniors: "كبار السن",
    elderly: "مسن",
    elder: "كبير",
    old: "كبير السن",
    aged: "مسن",

    // Common ticket types
    daily: "يومي",
    weekly: "أسبوعي",
    monthly: "شهري",
    yearly: "سنوي",
    single: "مفرد",
    family: "عائلي",
    group: "جماعي",
    vip: "كبار الشخصيات",
    premium: "مميز",
    standard: "عادي",
    basic: "أساسي",
  };

  // Category mapping (keep this for category chips)
  const categoryMapping = {
    child: "اطفال",
    kid: "اطفال",
    kids: "اطفال",
    children: "اطفال",
    toddler: "اطفال",
    baby: "اطفال",
    infant: "اطفال",
    adult: "كبار",
    adults: "كبار",
    grown: "كبار",
    grownup: "كبار",
    senior: "جدود",
    seniors: "جدود",
    elderly: "جدود",
    elder: "جدود",
    old: "جدود",
    aged: "جدود",
  };

  // Function to translate category to Arabic
  const translateCategory = (category) => {
    if (!category) return category;
    const lowerCategory = category.toLowerCase().trim();
    return categoryMapping[lowerCategory] || category;
  };

  // Function to translate subcategory to Arabic
  const translateSubcategory = (subcategory) => {
    if (!subcategory) return subcategory;
    const lowerSubcategory = subcategory.toLowerCase().trim();
    const translated =
      subcategoryMapping[lowerSubcategory] || subcategory;
    console.log(
      `TicketSelector - Translating subcategory: "${subcategory}" -> "${translated}"`
    );
    return translated;
  };

  // Helper functions for quantity controls
  const handleIncrement = (typeId) => {
    const currentCount = parseInt(ticketCounts[typeId] || 0);
    onTicketCountChange(typeId, (currentCount + 1).toString());
  };

  const handleDecrement = (typeId) => {
    const currentCount = parseInt(ticketCounts[typeId] || 0);
    if (currentCount > 0) {
      onTicketCountChange(typeId, (currentCount - 1).toString());
    }
  };

  const handleDirectInput = (typeId, value) => {
    const numValue = parseInt(value) || 0;
    if (numValue >= 0) {
      onTicketCountChange(typeId, value);
    }
  };

  // Filter types based on selected categories and valid prices
  const filteredTypes = types
    .filter((t) => {
      // Check if category is selected AND price is valid
      const hasValidPrice = Number(t.price || 0) > 0;
      const isSelectedCategory = selectedCategories.includes(t.category);
      
      return isSelectedCategory && hasValidPrice;
    })
    .map((type) => ({
      ...type,
      price: Number(type.price || 0),
      displayCategory: translateCategory(type.originalCategory || type.category),
      displaySubcategory: translateSubcategory(type.subcategory),
    }));

  if (filteredTypes.length === 0) {
    return (
      <Paper sx={{ 
        p: compact ? 1.5 : 3, 
        bgcolor: "#E0F7FF", 
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center"
      }}>
        <Typography variant={compact ? "h6" : "h5"} sx={{ color: "#00AEEF", mb: 2 }}>
          🎟️ Ticket Selection
        </Typography>
        <Box 
          p={3} 
          bgcolor="#f5f5f5" 
          borderRadius={2}
          textAlign="center"
          sx={{ maxWidth: "300px" }}
        >
          <Typography variant="body1" color="textSecondary">
            Select a category from the left panel to see available tickets.
          </Typography>
        </Box>
      </Paper>
    );
  }

  // Group tickets by display category
  const groupedTypes = filteredTypes.reduce((grouped, type) => {
    const displayCategory = type.displayCategory;
    if (!grouped[displayCategory]) {
      grouped[displayCategory] = [];
    }
    grouped[displayCategory].push(type);
    return grouped;
  }, {});

  return (
    <Paper sx={{ 
      p: compact ? 1 : 2, 
      bgcolor: "#E0F7FF", 
      height: "90%",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden"  // Prevent container overflow
    }}>
      <Typography 
        variant={compact ? "subtitle2" : "h5"}  // Smaller text in compact
        sx={{ 
          color: "#00AEEF",
          mb: compact ? 0.5 : 2,  // Much less margin in compact
          textAlign: "center",
          fontWeight: 600,
          flexShrink: 0,
          fontSize: compact ? "0.9rem" : "1.5rem"  // Explicit font size control
        }}
      >
        🎟️ Ticket Selection
      </Typography>

      <Box
        sx={{ 
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          minHeight: 0,
          pr: compact ? 0.5 : 1,  // Less padding in compact
          pb: compact ? 1 : 3,    // Less bottom padding in compact
        }}
      >
        {Object.keys(groupedTypes).map((displayCategory, categoryIndex) => (
          <Box key={displayCategory} mb={compact ? 1 : 3}>  {/* Much less margin in compact */}
            <Chip
              label={displayCategory}
              size="small"  // Always small in compact mode
              sx={{
                mb: compact ? 0.5 : 1.5,  // Less margin in compact
                bgcolor: "#00AEEF",
                color: "white",
                fontFamily: '"Segoe UI", Tahoma, Arial, sans-serif',
                fontSize: compact ? "0.75rem" : "1rem",  // Smaller in compact
                fontWeight: "bold",
                height: compact ? "24px" : "40px"  // Much smaller in compact
              }}
            />
            
            <Grid container spacing={compact ? 0.5 : 1.5}>  {/* Tighter spacing in compact */}
              {groupedTypes[displayCategory].map((type) => {
                const currentCount = parseInt(ticketCounts[type.id] || 0);
                
                return (
                  <Grid item xs={12} key={type.id}>
                    <Card 
                      variant="outlined" 
                      sx={{ 
                        bgcolor: currentCount > 0 ? "#f0f9ff" : "white",
                        border: currentCount > 0 ? "2px solid #00AEEF" : "1px solid #e0e0e0",
                        transition: "all 0.2s ease",
                        "&:hover": {
                          boxShadow: "0 2px 8px rgba(0,174,239,0.1)",
                          transform: "translateY(-1px)"
                        }
                      }}
                    >
                      <CardContent sx={{ 
                        py: compact ? 1 : 2.5,  // Much less padding in compact
                        px: compact ? 1.5 : 3,
                        "&:last-child": { pb: compact ? 1 : 2.5 }
                      }}>
                        {/* Ticket Information - More compact */}
                        <Box mb={compact ? 1 : 2}>  {/* Less margin in compact */}
                          <Typography
                            variant={compact ? "body2" : "h5"}  // Much smaller in compact
                            fontWeight="bold"
                            sx={{
                              color: "#007EA7",
                              fontFamily: '"Segoe UI", Tahoma, Arial, sans-serif',
                              mb: compact ? 0.5 : 1,  // Less margin in compact
                              fontSize: compact ? "0.9rem" : "1.5rem"  // Explicit size control
                            }}
                          >
                            {type.displaySubcategory}
                          </Typography>
                          
                          <Typography
                            variant={compact ? "body2" : "h5"}  // Much smaller in compact
                            fontWeight="bold"
                            color="#00AEEF"
                            sx={{ 
                              mb: compact ? 0.5 : 1,  // Less margin in compact
                              fontSize: compact ? "0.85rem" : "1.5rem"  // Explicit size control
                            }}
                          >
                            EGP {type.price.toFixed(0)}
                          </Typography>
                          
                          {type.description && (
                            <Typography
                              variant="caption"  // Smaller in compact
                              color="textSecondary"
                              sx={{ 
                                mb: compact ? 0.5 : 1,
                                fontSize: compact ? "0.7rem" : "0.875rem"
                              }}
                            >
                              {type.description}
                            </Typography>
                          )}
                        </Box>

                        {/* Quantity Controls - More compact */}
                        <Box 
                          display="flex" 
                          alignItems="center" 
                          justifyContent="space-between"
                          sx={{
                            bgcolor: "#f8f9fa",
                            p: compact ? 1 : 1.5,  // Less padding in compact
                            borderRadius: 2,
                            border: "1px solid #e9ecef"
                          }}
                        >
                          <Typography 
                            variant={compact ? "caption" : "body1"} 
                            fontWeight="medium"
                            sx={{ fontSize: compact ? "0.75rem" : "1rem" }}
                          >
                            Qty:
                          </Typography>
                          
                          <Box display="flex" alignItems="center" gap={compact ? 0.5 : 1}>
                            <IconButton
                              onClick={() => handleDecrement(type.id)}
                              disabled={currentCount <= 0}
                              size="small"  // Always small in compact
                              sx={{
                                bgcolor: currentCount > 0 ? "#ff6b6b" : "#e9ecef",
                                color: "white",
                                width: compact ? "28px" : "36px",  // Smaller in compact
                                height: compact ? "28px" : "36px",
                                "&:hover": {
                                  bgcolor: currentCount > 0 ? "#fa5252" : "#e9ecef",
                                },
                                "&:disabled": {
                                  bgcolor: "#e9ecef",
                                  color: "#adb5bd"
                                }
                              }}
                            >
                              <Remove fontSize="small" />
                            </IconButton>
                            
                            <TextField
                              type="number"
                              size="small"
                              inputProps={{ 
                                min: 0,
                                style: { 
                                  textAlign: "center",
                                  fontSize: compact ? "0.8rem" : "1.1rem",
                                  fontWeight: "bold",
                                  padding: compact ? "2px" : "4px"
                                }
                              }}
                              value={currentCount}
                              onChange={(e) => handleDirectInput(type.id, e.target.value)}
                              sx={{ 
                                width: compact ? "50px" : "80px",  // Much smaller in compact
                                '& .MuiOutlinedInput-root': {
                                  height: compact ? "32px" : "48px"  // Smaller in compact
                                }
                              }}
                            />
                            
                            <IconButton
                              onClick={() => handleIncrement(type.id)}
                              size="small"  // Always small in compact
                              sx={{
                                bgcolor: "#51cf66",
                                color: "white",
                                width: compact ? "28px" : "36px",  // Smaller in compact
                                height: compact ? "28px" : "36px",
                                "&:hover": {
                                  bgcolor: "#40c057",
                                }
                              }}
                            >
                              <Add fontSize="small" />
                            </IconButton>
                          </Box>
                        </Box>

                        {/* Subtotal - More compact */}
                        {currentCount > 0 && (
                          <Box 
                            mt={compact ? 1 : 1.5}  // Less margin in compact
                            p={compact ? 0.5 : 1}   // Less padding in compact
                            bgcolor="#e3f2fd" 
                            borderRadius={1}
                            textAlign="center"
                          >
                            <Typography 
                              variant={compact ? "caption" : "body1"}  // Smaller in compact
                              fontWeight="bold" 
                              color="#1976d2"
                              sx={{ fontSize: compact ? "0.75rem" : "1rem" }}
                            >
                              Subtotal: EGP {(currentCount * type.price).toFixed(0)}
                            </Typography>
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
            
            {/* Divider - More compact */}
            {categoryIndex < Object.keys(groupedTypes).length - 1 && (
              <Divider sx={{ 
                mt: compact ? 1 : 3,  // Much less margin in compact
                mb: compact ? 0.5 : 1,
                borderColor: "#00AEEF",
                borderWidth: "1px"
              }} />
            )}
          </Box>
        ))}
      </Box>
    </Paper>
  );
};

export default TicketSelectorPanel;
