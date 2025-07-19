import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Todas las rutas de admin requieren autenticación
router.use(authenticateToken);

// Ruta de ejemplo para dashboard
router.get('/dashboard', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      message: 'Dashboard del administrador',
      user: req.user
    }
  });
});

export default router; 