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
  CircularProgress,
  useMediaQuery,
  useTheme
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
// Import the Akoya logo
import AkoyaLogo from '../assets/Akoya logo RGB-1.png';
import { notify } from '../utils/toast';

const SignIn = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isExtraSmall = useMediaQuery(theme.breakpoints.down(400));

  // State management
  const [formData, setFormData] = useState({
    username: "",
    password: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverStatus, setServerStatus] = useState(true);
  
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
    
    if (!baseUrl) {
      notify.error("API configuration not available");
      return;
    }
    
    if (!formData.username.trim() || !formData.password) {
      notify.error("Username and password are required");
      return;
    }
    
    setLoading(true);

    try {
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
        credentials: "include",
        mode: "cors"
      });
      
      clearTimeout(timeoutId);
      setServerStatus(true);

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

      if (data && data.role) {
        localStorage.setItem("userRole", data.role);
        localStorage.setItem("userName", data.name);
        localStorage.setItem("userId", data.id);
        
        if (data.token) {
          localStorage.setItem("authToken", data.token);
        }
        
        notify.success(`Welcome back, ${data.name}!`);
        redirectToDashboard(data.role);
      } else {
        notify.error(data.message || "Invalid credentials");
      }
    } catch (error) {
      console.error("Login error:", error);
      
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
        navigate("/admin");
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
        // Responsive padding
        p: { xs: 1, sm: 2, md: 3 }
      }}
    >
      {/* Water-themed decorative elements - Hide on very small screens */}
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "100%",
          opacity: { xs: 0.05, sm: 0.1 }, // Less opacity on mobile
          backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.3) 2px, transparent 3px)`,
          backgroundSize: { xs: "30px 30px", sm: "40px 40px", md: "50px 50px" }, // Smaller pattern on mobile
        }}
      />
      
      {/* Wave decorations - Adjust height for mobile */}
      <Box
        sx={{
          position: "absolute",
          bottom: -10,
          left: 0,
          right: 0,
          height: { xs: "60px", sm: "80px", md: "120px" }, // Responsive height
          opacity: { xs: 0.2, sm: 0.3 }, // Less opacity on mobile
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
          height: { xs: "50px", sm: "70px", md: "100px" }, // Responsive height
          opacity: { xs: 0.3, sm: 0.4 }, // Less opacity on mobile
          background: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 120' preserveAspectRatio='none'%3E%3Cpath d='M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z' fill='%23FFFFFF'%3E%3C/path%3E%3C/svg%3E\")",
          backgroundSize: "cover",
          transform: "rotate(180deg)",
        }}
      />

      <Paper 
        elevation={isMobile ? 8 : 12} // Less elevation on mobile for performance
        sx={{
          p: { xs: 2, sm: 3, md: 4 }, // Responsive padding
          width: "100%",
          maxWidth: { 
            xs: "100%", // Full width on extra small screens
            sm: "400px", 
            md: "450px" 
          },
          // Responsive margin
          mx: { xs: 0, sm: 2, md: 3 },
          // Responsive border radius
          borderRadius: { xs: 0, sm: 2, md: 3 },
          backgroundColor: "rgba(255, 255, 255, 0.9)",
          backdropFilter: "blur(10px)",
          boxShadow: {
            xs: "0 4px 16px rgba(0, 0, 0, 0.1)", // Lighter shadow on mobile
            sm: "0 6px 24px rgba(0, 0, 0, 0.1)",
            md: "0 8px 32px rgba(0, 0, 0, 0.1)"
          },
          zIndex: 10,
          border: "1px solid rgba(255, 255, 255, 0.5)",
          // Responsive height behavior
          minHeight: { xs: "100vh", sm: "auto" }, // Full height on mobile
          display: "flex",
          flexDirection: "column",
          justifyContent: { xs: "center", sm: "flex-start" } // Center content on mobile
        }}
      >
        <Box 
          sx={{ 
            display: "flex", 
            flexDirection: "column", 
            alignItems: "center",
            mb: { xs: 2, sm: 3 }, // Responsive margin
            // Responsive logo container
            pt: { xs: 2, sm: 0 } // Add top padding on mobile
          }}
        >
          {/* Responsive logo */}
          <Box
            component="img"
            src={AkoyaLogo}
            alt="Akoya Logo"
            sx={{
              width: { 
                xs: isExtraSmall ? '240px' : '280px', // Extra small for very narrow screens
                sm: '300px',
                md: '320px'
              },
              height: 'auto',
              mb: { xs: 1, sm: 2 }, // Responsive margin
              mt: { xs: 0, sm: 1, md: 2 }, // Responsive top margin
              objectFit: 'contain',
              // Ensure logo doesn't overflow on small screens
              maxWidth: '100%'
            }}
          />
        </Box>
        
        {/* Server status warning - responsive */}
        {!serverStatus && (
          <Box 
            sx={{
              py: { xs: 1, sm: 1.5 }, // Responsive padding
              px: { xs: 1.5, sm: 2 },
              mb: { xs: 1.5, sm: 2 },
              borderRadius: { xs: 1, sm: 2 }, // Responsive border radius
              bgcolor: "rgba(255, 152, 0, 0.1)",
              border: "1px solid rgba(255, 152, 0, 0.3)",
              color: "warning.dark",
              fontSize: { xs: "0.8rem", sm: "0.9rem" }, // Responsive font size
              textAlign: "center"
            }}
          >
            Server connection issue. Please ensure the server is running.
          </Box>
        )}
        
        <Box component="form" onSubmit={handleLogin} noValidate sx={{ flex: 1 }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="username"
            label="Username"
            name="username"
            autoComplete="username"
            autoFocus={!isMobile} // Don't autofocus on mobile to prevent keyboard popup
            value={formData.username}
            onChange={handleChange}
            disabled={loading}
            size={isSmallMobile ? "small" : "medium"} // Smaller size on mobile
            sx={{ 
              mb: { xs: 1.5, sm: 2 }, // Responsive margin
              "& .MuiOutlinedInput-root": {
                backgroundColor: "rgba(255, 255, 255, 0.8)",
                fontSize: { xs: "0.9rem", sm: "1rem" }, // Responsive font size
                "&:hover .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#00AEEF"
                },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#00AEEF"
                }
              },
              "& .MuiInputLabel-root": {
                fontSize: { xs: "0.9rem", sm: "1rem" } // Responsive label size
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
            size={isSmallMobile ? "small" : "medium"} // Smaller size on mobile
            sx={{ 
              mb: { xs: 2, sm: 3 }, // Responsive margin
              "& .MuiOutlinedInput-root": {
                backgroundColor: "rgba(255, 255, 255, 0.8)",
                fontSize: { xs: "0.9rem", sm: "1rem" }, // Responsive font size
                "&:hover .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#00AEEF"
                },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#00AEEF"
                }
              },
              "& .MuiInputLabel-root": {
                fontSize: { xs: "0.9rem", sm: "1rem" } // Responsive label size
              }
            }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={handleTogglePassword}
                    edge="end"
                    size={isSmallMobile ? "small" : "medium"} // Responsive icon button
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
            size={isSmallMobile ? "medium" : "large"} // Responsive button size
            sx={{ 
              py: { xs: 1.2, sm: 1.5 }, // Responsive padding
              backgroundColor: "#00AEEF",
              fontWeight: "bold",
              fontSize: { xs: "0.9rem", sm: "1rem" }, // Responsive font size
              boxShadow: "0 4px 10px rgba(0, 174, 239, 0.3)",
              "&:hover": {
                backgroundColor: "#0099CC",
              },
              "&:disabled": {
                backgroundColor: "#B3E0F2",
              },
              // Add bottom margin on mobile for spacing from screen edge
              mb: { xs: 2, sm: 0 }
            }}
          >
            {loading ? (
              <CircularProgress 
                size={isSmallMobile ? 20 : 24} 
                sx={{ color: 'white' }}
              />
            ) : (
              "Sign In"
            )}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default SignIn;