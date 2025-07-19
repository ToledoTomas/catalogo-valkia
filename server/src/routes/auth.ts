import { Router } from 'express';
import {
  login,
  register,
  getProfile
} from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Rutas públicas
router.post('/login', login);
router.post('/register', register);

// Rutas protegidas
router.get('/profile', authenticateToken, getProfile);

export default router; 