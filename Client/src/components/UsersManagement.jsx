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
  CircularProgress
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
// Remove config import
// import config from '../../../config';

const UsersManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
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
          localStorage.removeItem('token'); // Clear invalid token
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

  const baseUrl = window.runtimeConfig?.apiBaseUrl; // FIXED: using authToken
      
      if (!token) {
        showNotification('Authentication required. Please log in again.', 'error');
        return;
      }
      
      await axios.post(
        `http://${baseUrl}/api/users/register`, 
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

  const baseUrl = window.runtimeConfig?.apiBaseUrl; // FIXED: using authToken
      
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

  const baseUrl = window.runtimeConfig?.apiBaseUrl; // FIXED: using authToken
      
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

  const baseUrl = window.runtimeConfig?.apiBaseUrl; // FIXED: using authToken
      
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
            size="small"
            sx={{ fontWeight: 'medium' }}
          />
        );
      case 'accountant':
        return (
          <Chip 
            icon={<AccountBalanceIcon fontSize="small" />}
            label="Accountant" 
            color="primary"
            size="small" 
            sx={{ fontWeight: 'medium' }}
          />
        );
      case 'cashier':
        return (
          <Chip 
            icon={<PointOfSaleIcon fontSize="small" />}
            label="Cashier" 
            color="success"
            size="small"
            sx={{ fontWeight: 'medium' }}
          />
        );
      default:
        return (
          <Chip 
            label={role}
            size="small"
          />
        );
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between' }}>
        <TextField
          placeholder="Search users..."
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={handleSearchChange}
          sx={{ width: 300 }}
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
        >
          Add User
        </Button>
      </Box>

      <Paper sx={{ width: '100%', overflow: 'hidden', borderRadius: 2 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="error">{error}</Typography>
            <Button
              variant="outlined"
              onClick={fetchUsers}
              sx={{ mt: 2 }}
            >
              Retry
            </Button>
          </Box>
        ) : (
          <>
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
          </>
        )}
      </Paper>

      {/* Add User Dialog */}
      <Dialog open={openAddDialog} onClose={handleCloseDialogs} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Add New User</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Name"
              name="name"
              value={formUser.name}
              onChange={handleInputChange}
              fullWidth
              required
            />
            <TextField
              label="Username"
              name="username"
              value={formUser.username}
              onChange={handleInputChange}
              fullWidth
              required
            />
            <TextField
              label="Password"
              name="password"
              type="password"
              value={formUser.password}
              onChange={handleInputChange}
              fullWidth
              required
            />
            <FormControl fullWidth required>
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
        <DialogActions>
          <Button onClick={handleCloseDialogs}>Cancel</Button>
          <Button onClick={handleAddUser} variant="contained" color="primary">
            Add User
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={openEditDialog} onClose={handleCloseDialogs} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Edit User</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Name"
              name="name"
              value={formUser.name}
              onChange={handleInputChange}
              fullWidth
              required
            />
            <TextField
              label="Username"
              name="username"
              value={formUser.username}
              onChange={handleInputChange}
              disabled
              fullWidth
            />
            <FormControl fullWidth required>
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
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialogs}>Cancel</Button>
          <Button onClick={handleEditUser} variant="contained" color="primary">
            Update User
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={openDeleteDialog} onClose={handleCloseDialogs}>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the user <strong>{selectedUser?.name}</strong>? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialogs}>Cancel</Button>
          <Button onClick={handleDeleteUser} variant="contained" color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={openPasswordDialog} onClose={handleCloseDialogs} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Change Password</DialogTitle>
        <DialogContent dividers>
          <Typography variant="subtitle2" sx={{ mb: 2 }}>
            Change password for: <strong>{selectedUser?.name}</strong>
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Current Password"
              name="currentPassword"
              type="password"
              value={passwordForm.currentPassword}
              onChange={handlePasswordChange}
              fullWidth
              required
            />
            <TextField
              label="New Password"
              name="newPassword"
              type="password"
              value={passwordForm.newPassword}
              onChange={handlePasswordChange}
              fullWidth
              required
            />
            <TextField
              label="Confirm New Password"
              name="confirmPassword"
              type="password"
              value={passwordForm.confirmPassword}
              onChange={handlePasswordChange}
              fullWidth
              required
              error={passwordForm.newPassword !== passwordForm.confirmPassword && passwordForm.confirmPassword !== ''}
              helperText={
                passwordForm.newPassword !== passwordForm.confirmPassword && 
                passwordForm.confirmPassword !== '' ? 
                'Passwords do not match' : ''
              }
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialogs}>Cancel</Button>
          <Button 
            onClick={handleChangePassword} 
            variant="contained" 
            color="primary"
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
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
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
