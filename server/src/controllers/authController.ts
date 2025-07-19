import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../index';
import { validateDataSafe, loginSchema, createAdminSchema } from '../utils/validation';
import { generateToken } from '../middleware/auth';
import { ApiResponse, LoginResponse } from '../types';

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const validationResult = validateDataSafe(loginSchema, req.body);

    if (!validationResult.success) {
      res.status(400).json({ success: false, error: validationResult.error });
      return;
    }

    const { email, password } = validationResult.data as { email: string; password: string };

    // Buscar admin por email
    const admin = await prisma.admin.findUnique({
      where: { email }
    });

    if (!admin) {
      res.status(401).json({ 
        success: false, 
        error: 'Credenciales inválidas' 
      });
      return;
    }

    // Verificar contraseña
    const isPasswordValid = await bcrypt.compare(password, admin.password);

    if (!isPasswordValid) {
      res.status(401).json({ 
        success: false, 
        error: 'Credenciales inválidas' 
      });
      return;
    }

    // Generar token
    const token = generateToken({ id: admin.id, email: admin.email });

    const response: ApiResponse<LoginResponse> = {
      success: true,
      data: {
        token,
        admin: {
          id: admin.id,
          email: admin.email
        }
      },
      message: 'Inicio de sesión exitoso'
    };

    res.json(response);
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const validationResult = validateDataSafe(createAdminSchema, req.body);

    if (!validationResult.success) {
      res.status(400).json({ success: false, error: validationResult.error });
      return;
    }

    const { email, password } = validationResult.data as { email: string; password: string };

    // Verificar que el admin no existe
    const existingAdmin = await prisma.admin.findUnique({
      where: { email }
    });

    if (existingAdmin) {
      res.status(400).json({ 
        success: false, 
        error: 'Ya existe un administrador con ese email' 
      });
      return;
    }

    // Encriptar contraseña
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Crear admin
    const admin = await prisma.admin.create({
      data: {
        email,
        password: hashedPassword
      },
      select: {
        id: true,
        email: true
      }
    });

    const response: ApiResponse = {
      success: true,
      data: admin,
      message: 'Administrador creado exitosamente'
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Error during registration:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ 
        success: false, 
        error: 'No autorizado' 
      });
      return;
    }

    const admin = await prisma.admin.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true
      }
    });

    if (!admin) {
      res.status(404).json({ 
        success: false, 
        error: 'Administrador no encontrado' 
      });
      return;
    }

    const response: ApiResponse = {
      success: true,
      data: admin
    };

    res.json(response);
  } catch (error) {
    console.error('Error getting profile:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}; 