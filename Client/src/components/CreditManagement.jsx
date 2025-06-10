import React, { useState } from 'react';
import {
  Box,
  Paper,
  Tabs,
  Tab,
  Typography,
  Container
} from '@mui/material';
import {
  AccountBalance,
  History,
  Link as LinkIcon,
  Add as AddIcon
} from '@mui/icons-material';

// Import the sub-components we'll create
import CreditAccountsPanel from './credit/CreditAccountsPanel';
import CreditTransactionsPanel from './credit/CreditTransactionsPanel';
import CategoryLinkingPanel from './credit/CategoryLinkingPanel';
import AddCreditPanel from './credit/AddCreditPanel';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`credit-tabpanel-${index}`}
      aria-labelledby={`credit-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const CreditManagement = () => {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 3 }}>
       

        <Paper sx={{ mt: 3 }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs 
              value={tabValue} 
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons="auto"
            >
              <Tab 
                icon={<AccountBalance />} 
                label="Credit Accounts" 
                id="credit-tab-0"
                aria-controls="credit-tabpanel-0"
              />
              <Tab 
                icon={<AddIcon />} 
                label="Add/Subtract Credit" 
                id="credit-tab-1"
                aria-controls="credit-tabpanel-1"
              />
              <Tab 
                icon={<LinkIcon />} 
                label="Category Linking" 
                id="credit-tab-2"
                aria-controls="credit-tabpanel-2"
              />
              <Tab 
                icon={<History />} 
                label="Transaction History" 
                id="credit-tab-3"
                aria-controls="credit-tabpanel-3"
              />
            </Tabs>
          </Box>

          <TabPanel value={tabValue} index={0}>
            <CreditAccountsPanel />
          </TabPanel>
          
          <TabPanel value={tabValue} index={1}>
            <AddCreditPanel />
          </TabPanel>
          
          <TabPanel value={tabValue} index={2}>
            <CategoryLinkingPanel />
          </TabPanel>
          
          <TabPanel value={tabValue} index={3}>
            <CreditTransactionsPanel />
          </TabPanel>
        </Paper>
      </Box>
    </Container>
  );
};

export default CreditManagement;