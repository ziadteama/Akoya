import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { CircularProgress, Box, Typography, Paper, Button } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';

const ProtectedRoute = ({ children, adminOnly = false, allowedRoles = [] }) => {
  const { user, loading, isAdmin, isAuthenticated } = useAuth();
  const location = useLocation();

  // Show loading while checking auth
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated()) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  // Check admin access
  if (adminOnly && !isAdmin()) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        bgcolor="grey.100"
        p={2}
      >
        <Paper elevation={3} sx={{ p: 4, textAlign: 'center', maxWidth: 400 }}>
          <LockIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
          <Typography variant="h5" gutterBottom color="error">
            Access Denied
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            You don't have admin privileges to access this page.
          </Typography>
          <Button 
            variant="contained" 
            onClick={() => {
              // Redirect based on role
              if (user.role === 'cashier') {
                window.location.href = '/cashier';
              } else if (user.role === 'accountant') {
                window.location.href = '/accountant';
              } else {
                window.location.href = '/signin';
              }
            }}
          >
            Go to Dashboard
          </Button>
        </Paper>
      </Box>
    );
  }

  // Check specific roles if provided
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        bgcolor="grey.100"
        p={2}
      >
        <Paper elevation={3} sx={{ p: 4, textAlign: 'center', maxWidth: 400 }}>
          <LockIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
          <Typography variant="h5" gutterBottom color="error">
            Insufficient Permissions
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Your role ({user.role}) doesn't have access to this page.
          </Typography>
          <Button 
            variant="contained" 
            onClick={() => window.history.back()}
          >
            Go Back
          </Button>
        </Paper>
      </Box>
    );
  }

  return children;
};

export default ProtectedRoute;