import React from "react";
import { Box } from "@mui/material";
import CashierSellingPanel from "./CashierSellingPanel";

const CashierDashboard = () => {
  return (
    <Box sx={{ 
      width: "100vw", 
      height: "100vh", 
      backgroundColor: "#f8f9fa",
      overflow: "auto"
    }}>
      <CashierSellingPanel />
    </Box>
  );
};

export default CashierDashboard;