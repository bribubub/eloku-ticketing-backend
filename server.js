
import 'dotenv/config'; 
import express from 'express';
import cors from 'cors';

import './src/config/db.js'; 

import ticketRoutes from './src/routes/ticketRoutes.js';

const app = express();  

app.use(cors());
app.use(express.json()); 

app.use('/api/TICKETING_API', ticketRoutes);


const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Backend jalan di port ${PORT}`);
});