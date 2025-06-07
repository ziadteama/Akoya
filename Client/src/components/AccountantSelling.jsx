import React from "react";
import { Box } from "@mui/material";
import CashierSellingPanel from "./CashierSellingPanel";

const AccountantSelling = () => {
  return (
    <Box sx={{ 
      width: "100%",
      height: "100vh",
      backgroundColor: "#f8f9fa"
    }}>
      <CashierSellingPanel />
    </Box>
  );
};

export default AccountantSelling;