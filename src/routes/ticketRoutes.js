import express from 'express';
import { 
  createTicket, 
  getAllTickets, 
  getTicketHistory, 
  updateTicket, 
  deleteTicket 
} from '../controllers/ticketController.js';

const router = express.Router();

router.post('/', createTicket);
router.get('/', getAllTickets);
router.get('/:id/history', getTicketHistory);
router.put('/:id', updateTicket);
router.delete('/:id', deleteTicket);

export default router;  