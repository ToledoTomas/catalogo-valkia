import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../index';

// Extender la interfaz Request para incluir el usuario
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
      };
    }
  }
}

export const authenticateToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({ 
      success: false, 
      error: 'Token de acceso requerido' 
    });
    return;
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET no está configurado');
    }

    const decoded = jwt.verify(token, secret) as { id: string; email: string };
    
    // Verificar que el admin existe en la base de datos
    const admin = await prisma.admin.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true }
    });

    if (!admin) {
      res.status(401).json({ 
        success: false, 
        error: 'Token inválido' 
      });
      return;
    }

    req.user = admin;
    next();
  } catch (error) {
    res.status(403).json({ 
      success: false, 
      error: 'Token inválido o expirado' 
    });
    return;
  }
};

export const generateToken = (payload: { id: string; email: string }): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET no está configurado');
  }
  
  return jwt.sign(payload, secret, { expiresIn: '24h' });
}; 