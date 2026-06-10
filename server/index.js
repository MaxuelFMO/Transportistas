import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initializeDatabase } from './init_db.js';
import TransportController from './controllers/TransportController.js';

dotenv.config();
initializeDatabase();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// API Routes
app.get('/api/dashboard', TransportController.getDashboardData);
app.post('/api/request', TransportController.submitRequest);
app.get('/api/settings', TransportController.getSettings);
app.post('/api/settings', TransportController.updateSettings);
app.post('/api/vehicles/reset', TransportController.resetVehicle);

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
