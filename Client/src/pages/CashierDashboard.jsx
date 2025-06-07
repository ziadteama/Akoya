import React, { useState, useEffect } from "react";
import { Box } from "@mui/material";
import CashierSellingPanel from "../components/CashierSellingPanel";
import TopBar from "../components/TopBar";

const CashierDashboard = () => {
  return (
    <Box sx={{ 
      width: "100vw", 
      height: "100vh", 
      backgroundColor: "#f8f9fa",
      display: "flex",
      flexDirection: "column"
    }}>
      {/* Use the shared TopBar component */}
      <TopBar />

      {/* Main Content - Selling Panel */}
      <Box sx={{ 
        flex: 1,
        overflow: "auto"
      }}>
        <CashierSellingPanel />
      </Box>
    </Box>
  );
};

export default CashierDashboard;
