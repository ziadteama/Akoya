import React from "react";
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import {
  QrCodeScanner,
  Category,
  LunchDining,
  PointOfSale,
} from "@mui/icons-material";
import { Link, useLocation } from "react-router-dom";

const CashierSidebar = () => {
  const location = useLocation();

  const menuItems = [
    { text: "Sell Tickets", icon: <PointOfSale />, path: `/cashier`, id: "sell" },
    { text: "Scan Tickets", icon: <QrCodeScanner />, path: `/cashier/scan`, id: "scan" },
    { text: "Manage Categories", icon: <Category />, path: `/cashier/categories`, id: "categories" },
    { text: "Manage Meals", icon: <LunchDining />, path: `/cashier/meals`, id: "meals" },
  ];

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: "250px",
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: "250px",
          background: "#F0F9FF",
          color: "#007EA7",
          boxSizing: "border-box",
        },
      }}
    >
      <List>
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;

          return (
            <ListItem
              button
              key={item.text}
              component={Link}
              to={item.path}
              sx={{
                color: isActive ? "#fff" : "#007EA7",
                backgroundColor: isActive ? "#00AEEF" : "transparent",
                fontWeight: isActive ? "bold" : "normal",
                "&:hover": {
                  backgroundColor: "#00C2CB",
                  color: "#fff",
                },
              }}
            >
              <ListItemIcon sx={{ color: isActive ? "#fff" : "#007EA7" }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItem>
          );
        })}
      </List>
    </Drawer>
  );
};

export default CashierSidebar;
