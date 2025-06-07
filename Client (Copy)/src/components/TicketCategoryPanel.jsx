import React, { useMemo } from "react";
import {
  Box, Typography, List, ListItem, ListItemText, Chip, Paper
} from "@mui/material";

const TicketCategoryPanel = ({ types, selectedCategories, onSelectCategory, onRemoveCategory, compact = false }) => {
  // Extract unique categories and track their ticket counts and price ranges
  const categories = useMemo(() => {
    const categoriesMap = {};
    
    types.forEach(type => {
      if (!categoriesMap[type.category]) {
        categoriesMap[type.category] = {
          name: type.category,
          count: 0,
          minPrice: Infinity,
          maxPrice: -Infinity
        };
      }
      
      categoriesMap[type.category].count += 1;
      
      // Ensure price is a number for comparison
      const price = Number(type.price || 0);
      
      if (price < categoriesMap[type.category].minPrice) {
        categoriesMap[type.category].minPrice = price;
      }
      
      if (price > categoriesMap[type.category].maxPrice) {
        categoriesMap[type.category].maxPrice = price;
      }
    });
    
    return Object.values(categoriesMap);
  }, [types]);

  return (
    <Paper sx={{ 
      p: compact ? 1 : 2, 
      bgcolor: "#E0F7FF", 
      height: "100%",
      display: "flex",
      flexDirection: "column",
      maxHeight: "80vh", // Ensure it fits within the viewport
      display: "flex",
      flexDirection: "column",
      overflowY: "auto", // ✅ Add overflow to the main container
      overflowX: "hidden", // Prevent horizontal scroll
    }}>
      <Typography 
        variant={compact ? "subtitle1" : "h5"} 
        sx={{ 
          color: "#00AEEF", 
          mb: compact ? 1 : 2,
          textAlign: "center",
          fontWeight: 600
        }}
      >
       📋 باكدج 
      </Typography>
      
      {selectedCategories.length > 0 && (
        <Box mb={1}>
          <Typography variant="caption" gutterBottom color="textSecondary">
            Selected:
          </Typography>
          <Box display="flex" flexWrap="wrap" gap={0.5}>
            {selectedCategories.map((cat) => (
              <Chip
                key={cat}
                label={cat}
                onDelete={() => onRemoveCategory(cat)}
                size="small"
                sx={{ 
                  bgcolor: "#00AEEF", 
                  color: "white", 
                  fontSize: "0.7rem",
                  height: "24px"  // Consistent height
                }}
              />
            ))}
          </Box>
        </Box>
      )}
      
      <List sx={{ 
        flex: 1,
        overflowY: "auto",
        p: 0
      }}>
        {categories.length === 0 ? (
          <Typography align="center" color="textSecondary" sx={{ p: 2 }}>
            No categories available
          </Typography>
        ) : (
          categories.map((cat) => (
            <ListItem
              button
              key={cat.name}
              onClick={() => onSelectCategory(cat.name)}
              disabled={selectedCategories.includes(cat.name)}
              dense
              sx={{
                bgcolor: selectedCategories.includes(cat.name) ? "rgba(0, 174, 239, 0.1)" : "white",
                mb: 0.5,
                borderRadius: 1,
                py: 1,  // More vertical padding for better clickability
                "&:hover": {
                  bgcolor: "rgba(0, 174, 239, 0.2)",
                },
              }}
            >
              <ListItemText
                primary={cat.name}
                secondary={
                  <Box>
                    <Typography variant="caption" display="block">
                      {cat.count} types
                    </Typography>
                    <Typography variant="caption" color="primary">
                      EGP {cat.minPrice.toFixed(0)}-{cat.maxPrice.toFixed(0)}
                    </Typography>
                  </Box>
                }
                primaryTypographyProps={{ 
                  variant: 'body2',
                  fontWeight: 'medium'
                }}
              />
            </ListItem>
          ))
        )}
      </List>
    </Paper>
  );
};

export default TicketCategoryPanel;
