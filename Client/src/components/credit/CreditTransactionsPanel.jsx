import React from 'react';
import { Box, Typography, Alert } from '@mui/material';

const CreditTransactionsPanel = () => {
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        📋 Transaction History
      </Typography>
      <Alert severity="info">
        View credit transaction history. Coming soon...
      </Alert>
    </Box>
  );
};

export default CreditTransactionsPanel;