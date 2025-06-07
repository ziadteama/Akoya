import React, { useState } from "react";
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Box,
  Divider,
  Tooltip
} from "@mui/material";
import {
  Event,
  QrCodeScanner,
  Category,
  Download,
  LunchDining,
  PointOfSale,
  PersonAdd,
  ChevronLeft,
  ChevronRight,
  Menu
} from "@mui/icons-material";
import { Link, useLocation } from "react-router-dom";

const AccountantSidebar = ({ excludeRoutes = [], includeRoutes = [], basePath = "/accountant" }) => {
  const location = useLocation();
  const [open, setOpen] = useState(true);

  const toggleDrawer = () => {
    setOpen(!open);
  };

  // Core accountant menu items
  const allMenuItems = [
    { text: "Reports", icon: <Event />, path: `${basePath}/accountant-reports`, id: "reports" },
    { text: "Scan Tickets", icon: <QrCodeScanner />, path: `${basePath}/accountant-scan`, id: "scan" },
    { text: "Manage Categories", icon: <Category />, path: `${basePath}/accountant-categories`, id: "categories" },
    { text: "Manage Meals", icon: <LunchDining />, path: `${basePath}/accountant-meals`, id: "meals" },
    { text: "Sell Tickets", icon: <PointOfSale />, path: `${basePath}/sell-tickets`, id: "sell" },
    { text: "Register User", icon: <PersonAdd />, path: `${basePath}/register-user`, id: "register" },
  ];

  // Extra menu items that can be used in other dashboards
  const additionalRoutes = [
    { text: "Sales History", icon: <Download />, path: `/cashier/history`, id: "history" },
  ];

  // Start with base menu items
  let menuItems = [...allMenuItems];

  // Exclude specific items
  if (excludeRoutes && excludeRoutes.length > 0) {
    menuItems = menuItems.filter(item => !excludeRoutes.includes(item.id));
  }

  // Include additional routes
  if (includeRoutes && includeRoutes.length > 0) {
    const includedItems = additionalRoutes.filter(item => includeRoutes.includes(item.id));
    menuItems = [...menuItems, ...includedItems];
  }

  const drawerWidth = open ? 250 : 65;

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: drawerWidth,
          background: "#F0F9FF",
          color: "#007EA7",
          boxSizing: "border-box",
          transition: "width 225ms cubic-bezier(0.4, 0, 0.6, 1) 0ms",
          overflowX: "hidden"
        },
      }}
    >
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: open ? 'flex-end' : 'center',
        padding: '8px'
      }}>
        <IconButton onClick={toggleDrawer}>
          {open ? <ChevronLeft /> : <Menu />}
        </IconButton>
      </Box>
      <Divider />

      <List>
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;

          return (
            <Tooltip 
              title={!open ? item.text : ""} 
              placement="right"
              key={item.text}
            >
              <ListItem
                button
                component={Link}
                to={item.path}
                sx={{
                  minHeight: 48,
                  px: 2.5,
                  color: isActive ? "#fff" : "#007EA7",
                  backgroundColor: isActive ? "#00AEEF" : "transparent",
                  fontWeight: isActive ? "bold" : "normal",
                  "&:hover": {
                    backgroundColor: "#00C2CB",
                    color: "#fff",
                  },
                  justifyContent: open ? 'initial' : 'center',
                }}
              >
                <ListItemIcon 
                  sx={{ 
                    color: isActive ? "#fff" : "#007EA7",
                    minWidth: 0,
                    mr: open ? 3 : 'auto',
                    justifyContent: 'center',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                {open && <ListItemText primary={item.text} />}
              </ListItem>
            </Tooltip>
          );
        })}
      </List>
    </Drawer>
  );
};

export default AccountantSidebar;
