import React, { useState } from "react";
import AccountantSidebar from "../components/AccountantSidebar";
import AccountantTopBar from "../components/TopBar";
import { Outlet } from "react-router-dom";
import { Box } from "@mui/material";

const AccountantDashboard = () => {
  return (
    <Box sx={{ display: "flex", height: "100vh", overflow: "hidden", backgroundColor: "#F0F9FF" }}>
      {/* Sidebar - now closable */}
      <AccountantSidebar />

      {/* Main Area */}
      <Box sx={{ 
        flexGrow: 1, 
        display: "flex", 
        flexDirection: "column", 
        width: "100%",
        transition: "margin 225ms cubic-bezier(0.4, 0, 0.6, 1) 0ms"
      }}>
        <AccountantTopBar />

        <Box sx={{ flex: 1, overflowY: "auto", px: 3, py: 2 }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default AccountantDashboard;