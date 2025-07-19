import { Request, Response } from 'express';
import { prisma } from '../index';
import { validateDataSafe, createCategorySchema, updateCategorySchema } from '../utils/validation';
import { ApiResponse, Category } from '../types';

export const getAllCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: { products: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    const response: ApiResponse<Category[]> = {
      success: true,
      data: categories
    };

    res.json(response);
  } catch (error) {
    console.error('Error getting categories:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

export const getCategoryById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        products: {
          include: {
            images: true
          }
        },
        _count: {
          select: { products: true }
        }
      }
    });

    if (!category) {
      res.status(404).json({ success: false, error: 'Categoría no encontrada' });
      return;
    }

    const response: ApiResponse<Category> = {
      success: true,
      data: category
    };

    res.json(response);
  } catch (error) {
    console.error('Error getting category:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

export const createCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const validationResult = validateDataSafe(createCategorySchema, req.body);

    if (!validationResult.success) {
      res.status(400).json({ success: false, error: validationResult.error });
      return;
    }

    const { name } = validationResult.data as { name: string };

    // Verificar que la categoría no existe
    const existingCategory = await prisma.category.findUnique({
      where: { name }
    });

    if (existingCategory) {
      res.status(400).json({ success: false, error: 'Ya existe una categoría con ese nombre' });
      return;
    }

    const category = await prisma.category.create({
      data: { name },
      include: {
        _count: {
          select: { products: true }
        }
      }
    });

    const response: ApiResponse<Category> = {
      success: true,
      data: category,
      message: 'Categoría creada exitosamente'
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

export const updateCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const validationResult = validateDataSafe(updateCategorySchema, req.body);

    if (!validationResult.success) {
      res.status(400).json({ success: false, error: validationResult.error });
      return;
    }

    const updateData = validationResult.data as any;

    // Verificar que la categoría existe
    const existingCategory = await prisma.category.findUnique({
      where: { id }
    });

    if (!existingCategory) {
      res.status(404).json({ success: false, error: 'Categoría no encontrada' });
      return;
    }

    // Verificar que el nuevo nombre no existe en otra categoría
    if (updateData.name && updateData.name !== existingCategory.name) {
      const categoryWithSameName = await prisma.category.findUnique({
        where: { name: updateData.name }
      });

      if (categoryWithSameName) {
        res.status(400).json({ success: false, error: 'Ya existe una categoría con ese nombre' });
      return;
      }
    }

    const category = await prisma.category.update({
      where: { id },
      data: updateData as any,
      include: {
        _count: {
          select: { products: true }
        }
      }
    });

    const response: ApiResponse<Category> = {
      success: true,
      data: category,
      message: 'Categoría actualizada exitosamente'
    };

    res.json(response);
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

export const deleteCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Verificar que la categoría existe
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true }
        }
      }
    });

    if (!category) {
      res.status(404).json({ success: false, error: 'Categoría no encontrada' });
      return;
    }

    // Verificar que no hay productos en esta categoría
    if (category._count.products > 0) {
      res.status(400).json({ 
        success: false, 
        error: 'No se puede eliminar una categoría que tiene productos asociados' 
      });
      return;
    }

    await prisma.category.delete({
      where: { id }
    });

    const response: ApiResponse = {
      success: true,
      message: 'Categoría eliminada exitosamente'
    };

    res.json(response);
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}; 