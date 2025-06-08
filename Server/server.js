import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import ticketRoutes from './routes/ticketRoutes.js';
import mealRoutes from './routes/mealRoutes.js';
import orderRoutes from "./routes/ordersRoutes.js";
import userRoutes from './routes/userRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Simplified CORS configuration for local development
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173','http://192.168.9.186:5173,'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS','PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 204
}));

// More permissive CORS for development
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  next();
});

// Parse JSON: MUST be before routes
app.use(express.json());

// Debug incoming requests
app.use((req, res, next) => {
  console.log(`${req.method} request from ${req.headers.origin || 'unknown'} to ${req.url}`);
  next();
});

// Routes
app.use('/api/tickets', ticketRoutes);
app.use('/api/meals', mealRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);

// Listen only on localhost for local development
app.listen(PORT, 'localhost', () => {
  console.log(`Server running locally at http://localhost:${PORT}`);
  console.log('CORS configured for local development');
});
