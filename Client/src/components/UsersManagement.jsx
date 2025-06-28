import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Button, 
  TextField, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Chip,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  CardActions,
  useMediaQuery,
  useTheme,
  Grid,
  Divider,
  Stack
} from '@mui/material';
import axios from 'axios';

// Icons
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import KeyIcon from '@mui/icons-material/Key';
import PersonIcon from '@mui/icons-material/Person';

const UsersManagement = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(isMobile ? 5 : 10);
  
  // Dialog states
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openPasswordDialog, setOpenPasswordDialog] = useState(false);
  
  // Form states
  const [formUser, setFormUser] = useState({
    name: '',
    username: '',
    password: '',
    role: 'cashier'
  });
  
  const [selectedUser, setSelectedUser] = useState(null);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  // Notification
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Update rows per page when screen size changes
  useEffect(() => {
    setRowsPerPage(isMobile ? 5 : 10);
    setPage(0);
  }, [isMobile]);

  // Fetch users on component mount
  useEffect(() => {
    fetchUsers();
  }, []);

  // Update the fetchUsers function to handle 403 errors specifically
  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Get JWT token from localStorage - use authToken instead of token
      const token = localStorage.getItem('authToken');
      const baseUrl = window.runtimeConfig?.apiBaseUrl;
      
      if (!token) {
        setError('You must be logged in to access this page.');
        setLoading(false);
        return;
      }
      
      const response = await axios.get(`${baseUrl}/api/users/all`, {
        headers: { 
          Authorization: `Bearer ${token}` 
        }
      });
      
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
      
      if (error.response) {
        // Handle specific status codes
        if (error.response.status === 401) {
          setError('Your session has expired. Please log in again.');
          localStorage.removeItem('authToken'); // Clear invalid token
        } else if (error.response.status === 403) {
          setError('You do not have permission to access the user management system.');
        } else {
          setError(`Error: ${error.response.data.message || 'Failed to fetch users.'}`);
        }
      } else if (error.request) {
        setError('No response received from server. Please check your connection.');
      } else {
        setError('Failed to fetch users. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle pagination
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Handle search
  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
    setPage(0);
  };

  const filteredUsers = users.filter((user) => {
    return (
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // Form handlers
  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormUser(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (event) => {
    const { name, value } = event.target;
    setPasswordForm(prev => ({ ...prev, [name]: value }));
  };

  // Dialog handlers
  const handleOpenAddDialog = () => {
    setFormUser({
      name: '',
      username: '',
      password: '',
      role: 'cashier'
    });
    setOpenAddDialog(true);
  };

  const handleOpenEditDialog = (user) => {
    setSelectedUser(user);
    setFormUser({
      name: user.name,
      username: user.username,
      role: user.role,
      password: '' // We don't populate password for security
    });
    setOpenEditDialog(true);
  };

  const handleOpenDeleteDialog = (user) => {
    setSelectedUser(user);
    setOpenDeleteDialog(true);
  };

  const handleOpenPasswordDialog = (user) => {
    setSelectedUser(user);
    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setOpenPasswordDialog(true);
  };

  const handleCloseDialogs = () => {
    setOpenAddDialog(false);
    setOpenEditDialog(false);
    setOpenDeleteDialog(false);
    setOpenPasswordDialog(false);
  };

  // API actions
  const handleAddUser = async () => {
    if (!formUser.name || !formUser.username || !formUser.password || !formUser.role) {
      showNotification('Please fill in all fields', 'error');
      return;
    }
    
    try {
      const token = localStorage.getItem('authToken');
      const baseUrl = window.runtimeConfig?.apiBaseUrl;
      
      if (!token) {
        showNotification('Authentication required. Please log in again.', 'error');
        return;
      }
      
      await axios.post(
        `${baseUrl}/api/users/register`, 
        formUser,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      handleCloseDialogs();
      showNotification('User created successfully', 'success');
      await fetchUsers();
    } catch (error) {
      console.error('Error creating user:', error);
      showNotification(error.response?.data?.message || 'Failed to create user', 'error');
    }
  };

  const handleEditUser = async () => {
    if (!formUser.name || !formUser.role) {
      showNotification('Name and role are required', 'error');
      return;
    }
    
    try {
      const token = localStorage.getItem('authToken');
      const baseUrl = window.runtimeConfig?.apiBaseUrl;
      
      if (!token) {
        showNotification('Authentication required. Please log in again.', 'error');
        return;
      }
      
      const payload = {
        name: formUser.name,
        role: formUser.role
      };
      
      // Only include password if it was provided (for password update)
      if (formUser.password) {
        payload.password = formUser.password;
      }
      
      await axios.put(
        `${baseUrl}/api/users/${selectedUser.id}`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      handleCloseDialogs();
      showNotification('User updated successfully', 'success');
      await fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      showNotification(error.response?.data?.message || 'Failed to update user', 'error');
    }
  };

  const handleDeleteUser = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const baseUrl = window.runtimeConfig?.apiBaseUrl;
      
      if (!token) {
        showNotification('Authentication required. Please log in again.', 'error');
        return;
      }
      
      await axios.delete(`${baseUrl}/api/users/${selectedUser.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      handleCloseDialogs();
      showNotification('User deleted successfully', 'success');
      await fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      showNotification(error.response?.data?.message || 'Failed to delete user', 'error');
    }
  };

  const handleChangePassword = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      showNotification('Current and new passwords are required', 'error');
      return;
    }
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showNotification('New passwords do not match', 'error');
      return;
    }
    
    try {
      const token = localStorage.getItem('authToken');
      const baseUrl = window.runtimeConfig?.apiBaseUrl;
      
      if (!token) {
        showNotification('Authentication required. Please log in again.', 'error');
        return;
      }
      
      await axios.post(
        `${baseUrl}/api/users/${selectedUser.id}/change-password`,
        {
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      handleCloseDialogs();
      showNotification('Password changed successfully', 'success');
    } catch (error) {
      console.error('Error changing password:', error);
      showNotification(error.response?.data?.message || 'Failed to change password', 'error');
    }
  };

  // Notification handler
  const showNotification = (message, severity) => {
    setNotification({
      open: true,
      message,
      severity
    });
  };

  const handleCloseNotification = () => {
    setNotification(prev => ({ ...prev, open: false }));
  };

  // Render role badge
  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return (
          <Chip 
            icon={<AdminPanelSettingsIcon fontSize="small" />}
            label="Admin" 
            color="error"
            size={isMobile ? "small" : "medium"}
            sx={{ fontWeight: 'medium' }}
          />
        );
      case 'accountant':
        return (
          <Chip 
            icon={<AccountBalanceIcon fontSize="small" />}
            label="Accountant" 
            color="primary"
            size={isMobile ? "small" : "medium"}
            sx={{ fontWeight: 'medium' }}
          />
        );
      case 'cashier':
        return (
          <Chip 
            icon={<PointOfSaleIcon fontSize="small" />}
            label="Cashier" 
            color="success"
            size={isMobile ? "small" : "medium"}
            sx={{ fontWeight: 'medium' }}
          />
        );
      default:
        return (
          <Chip 
            label={role}
            size={isMobile ? "small" : "medium"}
          />
        );
    }
  };

  // Mobile Card Component
  const UserCard = ({ user }) => (
    <Card sx={{ 
      mb: 2, 
      borderRadius: 2,
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      transition: 'all 0.3s ease',
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
      }
    }}>
      <CardContent sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Box sx={{ 
            backgroundColor: '#f5f5f5', 
            borderRadius: '50%', 
            p: 1, 
            mr: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <PersonIcon color="primary" />
          </Box>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 0.5 }}>
              {user.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              @{user.username}
            </Typography>
          </Box>
          {getRoleBadge(user.role)}
        </Box>
      </CardContent>
      <CardActions sx={{ pt: 0, justifyContent: 'flex-end' }}>
        <IconButton
          size="small"
          color="primary"
          onClick={() => handleOpenEditDialog(user)}
          sx={{ 
            backgroundColor: '#f0f9ff',
            '&:hover': { backgroundColor: '#e0f2fe' }
          }}
        >
          <EditIcon fontSize="small" />
        </IconButton>
        <IconButton
          size="small"
          color="primary"
          onClick={() => handleOpenPasswordDialog(user)}
          sx={{ 
            backgroundColor: '#f0f9ff',
            '&:hover': { backgroundColor: '#e0f2fe' }
          }}
        >
          <KeyIcon fontSize="small" />
        </IconButton>
        <IconButton
          size="small"
          color="error"
          onClick={() => handleOpenDeleteDialog(user)}
          sx={{ 
            backgroundColor: '#fef2f2',
            '&:hover': { backgroundColor: '#fee2e2' }
          }}
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      </CardActions>
    </Card>
  );

  return (
    <Box sx={{ p: isMobile ? 1 : 0 }}>
      {/* Header Section */}
      <Box sx={{ 
        mb: 3, 
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: isMobile ? 'stretch' : 'center',
        gap: isMobile ? 2 : 0
      }}>
        <TextField
          placeholder="Search users..."
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={handleSearchChange}
          sx={{ 
            width: isMobile ? '100%' : 300,
            order: isMobile ? 2 : 1
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleOpenAddDialog}
          fullWidth={isSmallMobile}
          size={isMobile ? "medium" : "large"}
          sx={{ 
            order: isMobile ? 1 : 2,
            borderRadius: 2
          }}
        >
          Add User
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={isMobile ? 40 : 60} />
        </Box>
      ) : error ? (
        <Paper sx={{ 
          p: isMobile ? 2 : 3, 
          textAlign: 'center', 
          borderRadius: 2 
        }}>
          <Typography color="error" variant={isMobile ? "body1" : "h6"}>
            {error}
          </Typography>
          <Button
            variant="outlined"
            onClick={fetchUsers}
            sx={{ mt: 2 }}
            size={isMobile ? "small" : "medium"}
          >
            Retry
          </Button>
        </Paper>
      ) : (
        <>
          {/* Mobile Card View */}
          {isMobile ? (
            <Box>
              {filteredUsers
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((user) => (
                  <UserCard key={user.id} user={user} />
                ))}
              
              {/* Mobile Pagination */}
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                mt: 2,
                flexWrap: 'wrap',
                gap: 1
              }}>
                <Typography variant="caption" sx={{ 
                  alignSelf: 'center', 
                  mr: 1,
                  color: 'text.secondary'
                }}>
                  {`${page * rowsPerPage + 1}-${Math.min((page + 1) * rowsPerPage, filteredUsers.length)} of ${filteredUsers.length}`}
                </Typography>
                <Button
                  size="small"
                  disabled={page === 0}
                  onClick={(e) => handleChangePage(e, page - 1)}
                  variant="outlined"
                >
                  Previous
                </Button>
                <Button
                  size="small"
                  disabled={page >= Math.ceil(filteredUsers.length / rowsPerPage) - 1}
                  onClick={(e) => handleChangePage(e, page + 1)}
                  variant="outlined"
                >
                  Next
                </Button>
              </Box>
            </Box>
          ) : (
            /* Desktop Table View */
            <Paper sx={{ width: '100%', overflow: 'hidden', borderRadius: 2 }}>
              <TableContainer sx={{ maxHeight: 'calc(100vh - 300px)' }}>
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Username</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Role</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }} align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredUsers
                      .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                      .map((user) => (
                        <TableRow key={user.id} hover>
                          <TableCell>{user.name}</TableCell>
                          <TableCell>{user.username}</TableCell>
                          <TableCell>{getRoleBadge(user.role)}</TableCell>
                          <TableCell align="center">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleOpenEditDialog(user)}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleOpenPasswordDialog(user)}
                            >
                              <KeyIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleOpenDeleteDialog(user)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                rowsPerPageOptions={[5, 10, 25]}
                component="div"
                count={filteredUsers.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
              />
            </Paper>
          )}
        </>
      )}

      {/* Responsive Add User Dialog */}
      <Dialog 
        open={openAddDialog} 
        onClose={handleCloseDialogs} 
        maxWidth="sm" 
        fullWidth
        fullScreen={isSmallMobile}
      >
        <DialogTitle sx={{ 
          fontWeight: 'bold',
          fontSize: isMobile ? '1.2rem' : '1.5rem'
        }}>
          Add New User
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: isMobile ? 1.5 : 2, 
            pt: 1 
          }}>
            <TextField
              label="Name"
              name="name"
              value={formUser.name}
              onChange={handleInputChange}
              fullWidth
              required
              size={isMobile ? "small" : "medium"}
            />
            <TextField
              label="Username"
              name="username"
              value={formUser.username}
              onChange={handleInputChange}
              fullWidth
              required
              size={isMobile ? "small" : "medium"}
            />
            <TextField
              label="Password"
              name="password"
              type="password"
              value={formUser.password}
              onChange={handleInputChange}
              fullWidth
              required
              size={isMobile ? "small" : "medium"}
            />
            <FormControl fullWidth required size={isMobile ? "small" : "medium"}>
              <InputLabel>Role</InputLabel>
              <Select
                name="role"
                value={formUser.role}
                onChange={handleInputChange}
                label="Role"
              >
                <MenuItem value="admin">Admin</MenuItem>
                <MenuItem value="accountant">Accountant</MenuItem>
                <MenuItem value="cashier">Cashier</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions sx={{ 
          p: isMobile ? 2 : 1,
          flexDirection: isSmallMobile ? 'column' : 'row',
          gap: isSmallMobile ? 1 : 0
        }}>
          <Button 
            onClick={handleCloseDialogs}
            fullWidth={isSmallMobile}
            size={isMobile ? "medium" : "large"}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleAddUser} 
            variant="contained" 
            color="primary"
            fullWidth={isSmallMobile}
            size={isMobile ? "medium" : "large"}
          >
            Add User
          </Button>
        </DialogActions>
      </Dialog>

      {/* Responsive Edit User Dialog */}
      <Dialog 
        open={openEditDialog} 
        onClose={handleCloseDialogs} 
        maxWidth="sm" 
        fullWidth
        fullScreen={isSmallMobile}
      >
        <DialogTitle sx={{ 
          fontWeight: 'bold',
          fontSize: isMobile ? '1.2rem' : '1.5rem'
        }}>
          Edit User
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: isMobile ? 1.5 : 2, 
            pt: 1 
          }}>
            <TextField
              label="Name"
              name="name"
              value={formUser.name}
              onChange={handleInputChange}
              fullWidth
              required
              size={isMobile ? "small" : "medium"}
            />
            <TextField
              label="Username"
              name="username"
              value={formUser.username}
              onChange={handleInputChange}
              disabled
              fullWidth
              size={isMobile ? "small" : "medium"}
            />
            <FormControl fullWidth required size={isMobile ? "small" : "medium"}>
              <InputLabel>Role</InputLabel>
              <Select
                name="role"
                value={formUser.role}
                onChange={handleInputChange}
                label="Role"
              >
                <MenuItem value="admin">Admin</MenuItem>
                <MenuItem value="accountant">Accountant</MenuItem>
                <MenuItem value="cashier">Cashier</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="New Password (leave blank to keep current)"
              name="password"
              type="password"
              value={formUser.password}
              onChange={handleInputChange}
              fullWidth
              helperText="Only fill this if you want to change the password"
              size={isMobile ? "small" : "medium"}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ 
          p: isMobile ? 2 : 1,
          flexDirection: isSmallMobile ? 'column' : 'row',
          gap: isSmallMobile ? 1 : 0
        }}>
          <Button 
            onClick={handleCloseDialogs}
            fullWidth={isSmallMobile}
            size={isMobile ? "medium" : "large"}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleEditUser} 
            variant="contained" 
            color="primary"
            fullWidth={isSmallMobile}
            size={isMobile ? "medium" : "large"}
          >
            Update User
          </Button>
        </DialogActions>
      </Dialog>

      {/* Responsive Delete User Dialog */}
      <Dialog 
        open={openDeleteDialog} 
        onClose={handleCloseDialogs}
        fullScreen={isSmallMobile}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ 
          fontWeight: 'bold',
          fontSize: isMobile ? '1.2rem' : '1.5rem'
        }}>
          Confirm Delete
        </DialogTitle>
        <DialogContent>
          <Typography variant={isMobile ? "body1" : "body1"}>
            Are you sure you want to delete the user <strong>{selectedUser?.name}</strong>? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ 
          p: isMobile ? 2 : 1,
          flexDirection: isSmallMobile ? 'column' : 'row',
          gap: isSmallMobile ? 1 : 0
        }}>
          <Button 
            onClick={handleCloseDialogs}
            fullWidth={isSmallMobile}
            size={isMobile ? "medium" : "large"}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteUser} 
            variant="contained" 
            color="error"
            fullWidth={isSmallMobile}
            size={isMobile ? "medium" : "large"}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Responsive Change Password Dialog */}
      <Dialog 
        open={openPasswordDialog} 
        onClose={handleCloseDialogs} 
        maxWidth="sm" 
        fullWidth
        fullScreen={isSmallMobile}
      >
        <DialogTitle sx={{ 
          fontWeight: 'bold',
          fontSize: isMobile ? '1.2rem' : '1.5rem'
        }}>
          Change Password
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant={isMobile ? "body2" : "subtitle2"} sx={{ mb: 2 }}>
            Change password for: <strong>{selectedUser?.name}</strong>
          </Typography>
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: isMobile ? 1.5 : 2 
          }}>
            <TextField
              label="Current Password"
              name="currentPassword"
              type="password"
              value={passwordForm.currentPassword}
              onChange={handlePasswordChange}
              fullWidth
              required
              size={isMobile ? "small" : "medium"}
            />
            <TextField
              label="New Password"
              name="newPassword"
              type="password"
              value={passwordForm.newPassword}
              onChange={handlePasswordChange}
              fullWidth
              required
              size={isMobile ? "small" : "medium"}
            />
            <TextField
              label="Confirm New Password"
              name="confirmPassword"
              type="password"
              value={passwordForm.confirmPassword}
              onChange={handlePasswordChange}
              fullWidth
              required
              size={isMobile ? "small" : "medium"}
              error={passwordForm.newPassword !== passwordForm.confirmPassword && passwordForm.confirmPassword !== ''}
              helperText={
                passwordForm.newPassword !== passwordForm.confirmPassword && 
                passwordForm.confirmPassword !== '' ? 
                'Passwords do not match' : ''
              }
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ 
          p: isMobile ? 2 : 1,
          flexDirection: isSmallMobile ? 'column' : 'row',
          gap: isSmallMobile ? 1 : 0
        }}>
          <Button 
            onClick={handleCloseDialogs}
            fullWidth={isSmallMobile}
            size={isMobile ? "medium" : "large"}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleChangePassword} 
            variant="contained" 
            color="primary"
            fullWidth={isSmallMobile}
            size={isMobile ? "medium" : "large"}
            disabled={
              !passwordForm.currentPassword || 
              !passwordForm.newPassword ||
              passwordForm.newPassword !== passwordForm.confirmPassword
            }
          >
            Change Password
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notification */}
      <Snackbar 
        open={notification.open} 
        autoHideDuration={5000} 
        onClose={handleCloseNotification}
        anchorOrigin={{ 
          vertical: 'top', 
          horizontal: isMobile ? 'center' : 'right' 
        }}
      >
        <Alert 
          onClose={handleCloseNotification} 
          severity={notification.severity} 
          variant="filled"
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default UsersManagement;