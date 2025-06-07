import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  InputAdornment,
  IconButton,
  CircularProgress
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
// Removed WavesIcon import
// import WavesIcon from "@mui/icons-material/Waves";
// Import the Akoya logo
import AkoyaLogo from '../assets/Akoya logo RGB-1.png';
// Remove config import
import { notify } from '../utils/toast';

const SignIn = () => {
  // State management
  const [formData, setFormData] = useState({
    username: "",
    password: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverStatus, setServerStatus] = useState(true); // Assume server is up initially
  
  const navigate = useNavigate();
  const baseUrl = window.runtimeConfig?.apiBaseUrl;

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Toggle password visibility
  const handleTogglePassword = () => {
    setShowPassword(!showPassword);
  };

  // Form submission
  const handleLogin = async (e) => {
    e.preventDefault();
    
    // Check if baseUrl is available
    if (!baseUrl) {
      notify.error("API configuration not available");
      return;
    }
    
    // Basic validation
    if (!formData.username.trim() || !formData.password) {
      notify.error("Username and password are required");
      return;
    }
    
    setLoading(true);

    try {
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      const response = await fetch(`${baseUrl}/api/users/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
        }),
        signal: controller.signal,
        // These options can help with CORS issues
        credentials: "include",
        mode: "cors"
      });
      
      // Clear the timeout
      clearTimeout(timeoutId);
      // Server is responding if we got here
      setServerStatus(true);

      // Handle HTTP error responses
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Invalid username or password");
        } else if (response.status === 500) {
          throw new Error("Server error. Please try again later");
        } else {
          const errorData = await response.json().catch(() => null);
          throw new Error(errorData?.message || `Error: ${response.status}`);
        }
      }

      const data = await response.json();

      // Store user data in localStorage
      if (data && data.role) {
        localStorage.setItem("userRole", data.role);
        localStorage.setItem("userName", data.name);
        localStorage.setItem("userId", data.id);
        
        // Store the authentication token if it exists
        if (data.token) {
          localStorage.setItem("authToken", data.token);
        }
        
        // Show success message
        notify.success(`Welcome back, ${data.name}!`);
        
        // Redirect to the appropriate dashboard
        redirectToDashboard(data.role);
      } else {
        notify.error(data.message || "Invalid credentials");
      }
    } catch (error) {
      console.error("Login error:", error);
      
      // Provide more specific error messages based on the error type
      if (error.name === "AbortError") {
        notify.error("Request timed out. Please try again.");
        setServerStatus(false);
      } else if (error.name === "TypeError" && error.message.includes("Failed to fetch")) {
        notify.error("Cannot connect to server. Please ensure the server is running.");
        setServerStatus(false);
      } else {
        notify.error(error.message || "Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Navigation based on role
  const redirectToDashboard = (role) => {
    switch (role) {
      case "admin":
        navigate("/admin"); // Redirect admin to admin dashboard
        break;
      case "accountant":
        navigate("/accountant");
        break;
      case "cashier":
        navigate("/cashier");
        break;
      default:
        notify.error("Unauthorized role");
    }
  };

  return (
    <Box
      sx={{
        height: "100vh",
        width: "100vw",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #005884 0%, #007EA7 50%, #00B4D8 100%)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Water-themed decorative elements */}
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "100%",
          opacity: 0.1,
          backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.3) 2px, transparent 3px)`,
          backgroundSize: "50px 50px",
        }}
      />
      
      {/* Wave decorations */}
      <Box
        sx={{
          position: "absolute",
          bottom: -10,
          left: 0,
          right: 0,
          height: "120px",
          opacity: 0.3,
          background: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 120' preserveAspectRatio='none'%3E%3Cpath d='M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z' opacity='.25' fill='%23FFFFFF'%3E%3C/path%3E%3Cpath d='M0,0V15.81C13,36.92,27.64,56.86,47.69,72.05,99.41,111.27,165,111,224.58,91.58c31.15-10.15,60.09-26.07,89.67-39.8,40.92-19,84.73-46,130.83-49.67,36.26-2.85,70.9,9.42,98.6,31.56,31.77,25.39,62.32,62,103.63,73,40.44,10.79,81.35-6.69,119.13-24.28s75.16-39,116.92-43.05c59.73-5.85,113.28,22.88,168.9,38.84,30.2,8.66,59,6.17,87.09-7.5,22.43-10.89,48-26.93,60.65-49.24V0Z' opacity='.5' fill='%23FFFFFF'%3E%3C/path%3E%3Cpath d='M0,0V5.63C149.93,59,314.09,71.32,475.83,42.57c43-7.64,84.23-20.12,127.61-26.46,59-8.63,112.48,12.24,165.56,35.4C827.93,77.22,886,95.24,951.2,90c86.53-7,172.46-45.71,248.8-84.81V0Z' fill='%23FFFFFF'%3E%3C/path%3E%3C/svg%3E\")",
          backgroundSize: "cover",
          transform: "rotate(180deg)",
        }}
      />
      
      {/* Second wave decoration */}
      <Box
        sx={{
          position: "absolute",
          bottom: -5,
          left: 0,
          right: 0,
          height: "100px",
          opacity: 0.4,
          background: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 120' preserveAspectRatio='none'%3E%3Cpath d='M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z' fill='%23FFFFFF'%3E%3C/path%3E%3C/svg%3E\")",
          backgroundSize: "cover",
          transform: "rotate(180deg)",
        }}
      />

      <Paper 
        elevation={12}
        sx={{
          p: 4,
          width: "100%",
          maxWidth: "450px",
          borderRadius: 3,
          backgroundColor: "rgba(255, 255, 255, 0.9)",
          backdropFilter: "blur(10px)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
          zIndex: 10,
          mx: 3,
          border: "1px solid rgba(255, 255, 255, 0.5)"
        }}
      >
        <Box 
          sx={{ 
            display: "flex", 
            flexDirection: "column", 
            alignItems: "center",
            mb: 3 // Keep this margin to maintain spacing between logo and form fields
          }}
        >
          {/* Clean logo without circle background */}
          <Box
            component="img"
            src={AkoyaLogo}
            alt="Akoya Logo"
            sx={{
              width: '320px', // Further increased from 280px for better visibility 
              height: 'auto',
              mb: 0, // No bottom margin needed since we're removing the text
              mt: 2, // Slightly increased top margin for better vertical centering
              objectFit: 'contain',
            }}
          />
        </Box>
        
        {!serverStatus && (
          <Box 
            sx={{
              py: 1.5,
              px: 2,
              mb: 2,
              borderRadius: 2,
              bgcolor: "rgba(255, 152, 0, 0.1)",
              border: "1px solid rgba(255, 152, 0, 0.3)",
              color: "warning.dark",
              fontSize: "0.9rem",
              textAlign: "center"
            }}
          >
            Server connection issue. Please ensure the server is running.
          </Box>
        )}
        
        <Box component="form" onSubmit={handleLogin} noValidate>
          <TextField
            margin="normal"
            required
            fullWidth
            id="username"
            label="Username"
            name="username"
            autoComplete="username"
            autoFocus
            value={formData.username}
            onChange={handleChange}
            disabled={loading}
            sx={{ 
              mb: 2,
              "& .MuiOutlinedInput-root": {
                backgroundColor: "rgba(255, 255, 255, 0.8)",
                "&:hover .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#00AEEF"
                },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#00AEEF"
                }
              }
            }}
          />
          
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            type={showPassword ? "text" : "password"}
            id="password"
            autoComplete="current-password"
            value={formData.password}
            onChange={handleChange}
            disabled={loading}
            sx={{ 
              mb: 3,
              "& .MuiOutlinedInput-root": {
                backgroundColor: "rgba(255, 255, 255, 0.8)",
                "&:hover .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#00AEEF"
                },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#00AEEF"
                }
              }
            }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={handleTogglePassword}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          
          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={loading}
            sx={{ 
              py: 1.5, 
              backgroundColor: "#00AEEF",
              fontWeight: "bold",
              fontSize: "1rem",
              boxShadow: "0 4px 10px rgba(0, 174, 239, 0.3)",
              "&:hover": {
                backgroundColor: "#0099CC",
              },
              "&:disabled": {
                backgroundColor: "#B3E0F2",
              }
            }}
          >
            {loading ? <CircularProgress size={24} /> : "Sign In"}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default SignIn;
