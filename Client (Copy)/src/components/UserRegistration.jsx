import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Paper,
  CircularProgress
} from "@mui/material";
import PersonAddIcon from '@mui/icons-material/PersonAdd';
// Remove config import
// import config from '../../../config';
import { notify } from '../utils/toast';

const UserRegistration = () => {
  const baseUrl = window.runtimeConfig?.apiBaseUrl;
  
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    password: "",
    confirmPassword: "",
    role: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentUserRole, setCurrentUserRole] = useState("");
  const [token, setToken] = useState("");

  // Get current user role and token on component mount
  useEffect(() => {
    const role = localStorage.getItem("userRole");

    const authToken = localStorage.getItem("authToken");

    setCurrentUserRole(role || "");
    setToken(authToken || "");
    
    if (!authToken) {
      notify.warning("Authentication required. Please log out and log back in.");
    }
    
    // Check if baseUrl is available
    if (!baseUrl) {
      setError("API configuration missing. Please refresh the page.");
      notify.error("API configuration missing");
    }
  }, [baseUrl]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    
    // Clear error when user starts typing again
    if (error) setError("");
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError("Name is required");
      notify.error("Name is required");
      return false;
    }
    
    if (!formData.username.trim()) {
      setError("Username is required");
      notify.error("Username is required");
      return false;
    }
    
    // Remove this password length validation:
    /*
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      notify.error("Password must be at least 6 characters");
      return false;
    }
    */
    
    // Keep only the basic password requirement check:
    if (!formData.password.trim()) {
      setError("Password is required");
      notify.error("Password is required");
      return false;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      notify.error("Passwords do not match");
      return false;
    }
    
    if (!formData.role) {
      setError("Role is required");
      notify.error("Role is required");
      return false;
    }
    
    // Make sure accountants can't create admin accounts
    if (currentUserRole === "accountant" && formData.role === "admin") {
      setError("You don't have permission to create admin accounts");
      notify.error("You don't have permission to create admin accounts");
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    // Check if token exists
    if (!token) {
      setError("Authentication token not found. Please log in again.");
      notify.error("Authentication token not found. Please log in again.");
      return;
    }
    
    setLoading(true);
    setError("");
    
    try {
      // Use fetch instead of axios
      const response = await fetch(`${baseUrl}/api/users/register`, {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          username: formData.username,
          password: formData.password,
          role: formData.role
        })
      });
      
      if (!response.ok) {
        // Handle non-2xx responses
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error: ${response.status}`);
      }
      
      const data = await response.json();

      
      // Show success message
      notify.success("User registered successfully!");
      
      // Reset form
      setFormData({
        name: "",
        username: "",
        password: "",
        confirmPassword: "",
        role: ""
      });
    } catch (error) {
      console.error("Registration failed:", error);
      
      if (error.message.includes("Authentication")) {
        setError("Authentication error. Please log in again.");
        notify.error("Authentication error. Please log in again.");
        // Clear token as it might be invalid
        localStorage.removeItem("authToken");
      } else {
        setError(error.message || "Failed to register user. Please try again.");
        notify.error(error.message || "Failed to register user. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Function to get available roles based on current user's role
  const getAvailableRoles = () => {
    if (currentUserRole === "admin") {
      // Admins can register users with any role
      return [
        { value: "admin", label: "Admin" },
        { value: "accountant", label: "Accountant" },
        { value: "cashier", label: "Cashier" }
      ];
    } else {
      // Accountants can only register accountants and cashiers
      return [
        { value: "accountant", label: "Accountant" },
        { value: "cashier", label: "Cashier" }
      ];
    }
  };

  return (
    <Paper
      sx={{
        p: 4,
        maxWidth: 600,
        mx: "auto",
        my: 4,
        backgroundColor: "#F0F9FF",
        borderRadius: 2,
      }}
    >
      <Box display="flex" flexDirection="column" alignItems="center" mb={3}>
        <PersonAddIcon sx={{ fontSize: 40, color: "#007EA7", mb: 2 }} />
        <Typography variant="h4" sx={{ color: "#007EA7", fontWeight: 600 }}>
          Register New User
        </Typography>
      </Box>

      {!token && (
        <Box 
          sx={{
            py: 1.5,
            px: 2,
            mb: 3,
            borderRadius: 1,
            bgcolor: "rgba(255, 152, 0, 0.1)",
            border: "1px solid rgba(255, 152, 0, 0.3)",
            color: "warning.dark",
          }}
        >
          <Typography>Authentication required. Please log out and log back in.</Typography>
        </Box>
      )}

      {error && (
        <Box 
          sx={{
            py: 1.5,
            px: 2,
            mb: 3,
            borderRadius: 1,
            bgcolor: "rgba(211, 47, 47, 0.1)",
            border: "1px solid rgba(211, 47, 47, 0.3)",
            color: "error.main",
          }}
        >
          <Typography>{error}</Typography>
        </Box>
      )}

      <Box component="form" onSubmit={handleSubmit} noValidate>
        <TextField
          margin="normal"
          required
          fullWidth
          label="Full Name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          disabled={!token || loading}
          sx={{ mb: 2, backgroundColor: "#fff" }}
        />
        
        <TextField
          margin="normal"
          required
          fullWidth
          label="Username"
          name="username"
          value={formData.username}
          onChange={handleChange}
          disabled={!token || loading}
          sx={{ mb: 2, backgroundColor: "#fff" }}
        />
        
        <TextField
          margin="normal"
          required
          fullWidth
          name="password"
          label="Password"
          type="password"
          value={formData.password}
          onChange={handleChange}
          disabled={!token || loading}
          sx={{ mb: 2, backgroundColor: "#fff" }}
        />
        
        <TextField
          margin="normal"
          required
          fullWidth
          name="confirmPassword"
          label="Confirm Password"
          type="password"
          value={formData.confirmPassword}
          onChange={handleChange}
          disabled={!token || loading}
          sx={{ mb: 3, backgroundColor: "#fff" }}
        />
        
        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel id="role-label">Role</InputLabel>
          <Select
            labelId="role-label"
            name="role"
            value={formData.role}
            label="Role"
            onChange={handleChange}
            disabled={!token || loading}
            sx={{ backgroundColor: "#fff" }}
          >
            {getAvailableRoles().map(role => (
              <MenuItem key={role.value} value={role.value}>
                {role.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        <Button
          type="submit"
          fullWidth
          variant="contained"
          disabled={!token || loading}
          sx={{ 
            mt: 3, 
            mb: 2, 
            py: 1.5,
            backgroundColor: "#00AEEF",
            "&:hover": {
              backgroundColor: "#0099CC"
            }
          }}
        >
          {loading ? <CircularProgress size={24} /> : "Register User"}
        </Button>
      </Box>
    </Paper>
  );
};

export default UserRegistration;
