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
import { useAuth } from '../contexts/AuthContext';

const SignIn = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isExtraSmall = useMediaQuery(theme.breakpoints.down(450));

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
  const { login } = useAuth();

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
        login({
          id: data.id,
          token: data.token,
          role: data.role,
          name: data.name
        });
        
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
        minHeight: "100vh",
        minHeight: "100dvh", // Dynamic viewport height for mobile browsers
        width: "100vw",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #005884 0%, #007EA7 50%, #00B4D8 100%)",
        position: "relative",
        overflow: "hidden",
        p: { xs: 0, sm: 2, md: 3 }, // No padding on mobile for full screen
        // Prevent overscroll bounce on iOS
        WebkitOverflowScrolling: "touch",
      }}
    >
      {/* Water-themed decorative elements - Simplified for mobile */}
      {!isExtraSmall && (
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "100%",
            opacity: { xs: 0.03, sm: 0.08, md: 0.1 },
            backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.3) 2px, transparent 3px)`,
            backgroundSize: { xs: "25px 25px", sm: "35px 35px", md: "50px 50px" },
          }}
        />
      )}
      
      {/* Wave decorations - Hide on very small screens for performance */}
      {!isSmallMobile && (
        <>
          <Box
            sx={{
              position: "absolute",
              bottom: -10,
              left: 0,
              right: 0,
              height: { xs: "40px", sm: "60px", md: "120px" },
              opacity: { xs: 0.15, sm: 0.25, md: 0.3 },
              background: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 120' preserveAspectRatio='none'%3E%3Cpath d='M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z' opacity='.25' fill='%23FFFFFF'%3E%3C/path%3E%3Cpath d='M0,0V15.81C13,36.92,27.64,56.86,47.69,72.05,99.41,111.27,165,111,224.58,91.58c31.15-10.15,60.09-26.07,89.67-39.8,40.92-19,84.73-46,130.83-49.67,36.26-2.85,70.9,9.42,98.6,31.56,31.77,25.39,62.32,62,103.63,73,40.44,10.79,81.35-6.69,119.13-24.28s75.16-39,116.92-43.05c59.73-5.85,113.28,22.88,168.9,38.84,30.2,8.66,59,6.17,87.09-7.5,22.43-10.89,48-26.93,60.65-49.24V0Z' opacity='.5' fill='%23FFFFFF'%3E%3C/path%3E%3Cpath d='M0,0V5.63C149.93,59,314.09,71.32,475.83,42.57c43-7.64,84.23-20.12,127.61-26.46,59-8.63,112.48,12.24,165.56,35.4C827.93,77.22,886,95.24,951.2,90c86.53-7,172.46-45.71,248.8-84.81V0Z' fill='%23FFFFFF'%3E%3C/path%3E%3C/svg%3E\")",
              backgroundSize: "cover",
              transform: "rotate(180deg)",
            }}
          />
          
          <Box
            sx={{
              position: "absolute",
              bottom: -5,
              left: 0,
              right: 0,
              height: { xs: "30px", sm: "50px", md: "100px" },
              opacity: { xs: 0.2, sm: 0.3, md: 0.4 },
              background: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 120' preserveAspectRatio='none'%3E%3Cpath d='M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z' fill='%23FFFFFF'%3E%3C/path%3E%3C/svg%3E\")",
              backgroundSize: "cover",
              transform: "rotate(180deg)",
            }}
          />
        </>
      )}

      <Paper 
        elevation={isMobile ? 0 : 12} // No elevation on mobile for flat design
        sx={{
          p: { 
            xs: 3, // Consistent padding on mobile
            sm: 4, 
            md: 5 
          },
          width: "100%",
          maxWidth: { 
            xs: "100%", // Full width on mobile
            sm: "420px", 
            md: "480px" 
          },
          mx: { xs: 0, sm: 2, md: 3 },
          borderRadius: { xs: 0, sm: 3, md: 4 }, // No border radius on mobile
          backgroundColor: { 
            xs: "rgba(255, 255, 255, 0.95)", // More opaque on mobile
            sm: "rgba(255, 255, 255, 0.9)" 
          },
          backdropFilter: "blur(10px)",
          boxShadow: {
            xs: "none", // No shadow on mobile
            sm: "0 8px 32px rgba(0, 0, 0, 0.1)",
            md: "0 12px 40px rgba(0, 0, 0, 0.12)"
          },
          zIndex: 10,
          border: { 
            xs: "none", // No border on mobile
            sm: "1px solid rgba(255, 255, 255, 0.5)" 
          },
          minHeight: { 
            xs: "100vh", // Full height on mobile
            xs: "100dvh", // Dynamic viewport height
            sm: "auto" 
          },
          display: "flex",
          flexDirection: "column",
          justifyContent: "center", // Always center content
          // Safe area insets for devices with notches
          paddingTop: { xs: "max(1.5rem, env(safe-area-inset-top))", sm: "1.5rem" },
          paddingBottom: { xs: "max(1.5rem, env(safe-area-inset-bottom))", sm: "1.5rem" },
        }}
      >
        {/* Logo section - Optimized for mobile */}
        <Box 
          sx={{ 
            display: "flex", 
            flexDirection: "column", 
            alignItems: "center",
            mb: { xs: 3, sm: 4 },
            // Add subtle animation
            animation: "fadeInUp 0.6s ease-out",
            "@keyframes fadeInUp": {
              "0%": {
                opacity: 0,
                transform: "translateY(20px)"
              },
              "100%": {
                opacity: 1,
                transform: "translateY(0)"
              }
            }
          }}
        >
          <Box
            component="img"
            src={AkoyaLogo}
            alt="Akoya Water Park"
            sx={{
              width: { 
                xs: isExtraSmall ? '200px' : '260px', 
                sm: '300px',
                md: '340px'
              },
              height: 'auto',
              mb: { xs: 2, sm: 3 },
              objectFit: 'contain',
              maxWidth: 'calc(100% - 2rem)', // Ensure it doesn't touch edges
              // Add subtle drop shadow
              filter: "drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1))",
            }}
          />
        </Box>
        
        {/* Server status warning - Mobile optimized */}
        {!serverStatus && (
          <Box 
            sx={{
              py: { xs: 1.5, sm: 2 },
              px: { xs: 2, sm: 2.5 },
              mb: { xs: 2, sm: 3 },
              borderRadius: { xs: 2, sm: 3 },
              bgcolor: "rgba(255, 152, 0, 0.1)",
              border: "1px solid rgba(255, 152, 0, 0.3)",
              color: "warning.dark",
              fontSize: { xs: "0.85rem", sm: "0.9rem" },
              textAlign: "center",
              fontWeight: 500,
              // Add subtle animation
              animation: "slideIn 0.3s ease-out",
              "@keyframes slideIn": {
                "0%": { opacity: 0, transform: "translateY(-10px)" },
                "100%": { opacity: 1, transform: "translateY(0)" }
              }
            }}
          >
            ⚠️ Server connection issue. Please ensure the server is running.
          </Box>
        )}
        
        {/* Form section - Mobile optimized */}
        <Box 
          component="form" 
          onSubmit={handleLogin} 
          noValidate 
          sx={{ 
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: { xs: 2, sm: 2.5 }
          }}
        >
          <TextField
            margin="none" // Remove default margin, use gap instead
            required
            fullWidth
            id="username"
            label="Username"
            name="username"
            autoComplete="username"
            autoFocus={!isMobile}
            value={formData.username}
            onChange={handleChange}
            disabled={loading}
            variant="outlined"
            sx={{ 
              "& .MuiOutlinedInput-root": {
                backgroundColor: "rgba(255, 255, 255, 0.8)",
                fontSize: { xs: "1rem", sm: "1.1rem" }, // Larger text on mobile
                height: { xs: "56px", sm: "60px" }, // Taller inputs on mobile for easier tapping
                "&:hover .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#00AEEF"
                },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#00AEEF",
                  borderWidth: "2px"
                }
              },
              "& .MuiInputLabel-root": {
                fontSize: { xs: "1rem", sm: "1.1rem" },
                "&.Mui-focused": {
                  color: "#00AEEF"
                }
              }
            }}
          />
          
          <TextField
            margin="none"
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
            variant="outlined"
            sx={{ 
              "& .MuiOutlinedInput-root": {
                backgroundColor: "rgba(255, 255, 255, 0.8)",
                fontSize: { xs: "1rem", sm: "1.1rem" },
                height: { xs: "56px", sm: "60px" },
                "&:hover .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#00AEEF"
                },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#00AEEF",
                  borderWidth: "2px"
                }
              },
              "& .MuiInputLabel-root": {
                fontSize: { xs: "1rem", sm: "1.1rem" },
                "&.Mui-focused": {
                  color: "#00AEEF"
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
                    size="large" // Larger touch target
                    sx={{
                      p: { xs: 1.5, sm: 1 }, // Larger padding on mobile
                      color: "#666"
                    }}
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
              mt: { xs: 1, sm: 2 }, // Extra top margin
              py: { xs: 1.8, sm: 2 }, // Taller button on mobile
              backgroundColor: "#00AEEF",
              fontWeight: "bold",
              fontSize: { xs: "1.1rem", sm: "1.2rem" }, // Larger text on mobile
              borderRadius: { xs: 3, sm: 2 }, // More rounded on mobile
              boxShadow: "0 6px 16px rgba(0, 174, 239, 0.3)",
              textTransform: "none", // Don't uppercase text
              transition: "all 0.2s ease-in-out",
              // Better touch feedback
              "&:active": {
                transform: "scale(0.98)",
              },
              "&:hover": {
                backgroundColor: "#0099CC",
                boxShadow: "0 8px 20px rgba(0, 174, 239, 0.4)",
              },
              "&:disabled": {
                backgroundColor: "#B3E0F2",
                color: "#666",
              },
              // Ensure button is accessible on mobile
              minHeight: { xs: "52px", sm: "48px" }
            }}
          >
            {loading ? (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <CircularProgress 
                  size={24} 
                  sx={{ color: 'white' }}
                />
                <Typography variant="inherit" sx={{ fontSize: { xs: "1rem", sm: "1.1rem" } }}>
                  Signing In...
                </Typography>
              </Box>
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