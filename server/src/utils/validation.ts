import { z } from 'zod';

// Esquemas de validación para productos
export const createProductSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100, 'El nombre es muy largo'),
  description: z.string().min(1, 'La descripción es requerida').max(1000, 'La descripción es muy larga'),
  categoryId: z.string().uuid('ID de categoría inválido'),
  sizes: z.array(z.string()).min(1, 'Al menos un tamaño es requerido'),
  colors: z.array(z.string()).min(1, 'Al menos un color es requerido'),
  images: z.array(z.string().url('URL de imagen inválida')).optional()
});

export const updateProductSchema = createProductSchema.partial();

// Esquemas de validación para categorías
export const createCategorySchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(50, 'El nombre es muy largo')
});

export const updateCategorySchema = createCategorySchema.partial();

// Esquemas de validación para administradores
export const createAdminSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres')
});

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es requerida')
});

// Esquemas de validación para paginación
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10)
});

// Esquemas de validación para filtros
export const productFiltersSchema = z.object({
  categoryId: z.string().uuid().optional(),
  search: z.string().optional(),
  sizes: z.array(z.string()).optional(),
  colors: z.array(z.string()).optional()
});

// Función helper para validar datos
export const validateData = <T>(schema: z.ZodSchema<T>, data: unknown): T => {
  return schema.parse(data);
};

// Función helper para validar datos de forma segura
export const validateDataSafe = <T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } => {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0]?.message || 'Datos inválidos' };
    }
    return { success: false, error: 'Error de validación' };
  }
}; 