import { Request, Response } from 'express';
import { prisma } from '../index';
import { validateDataSafe, createProductSchema, updateProductSchema, paginationSchema, productFiltersSchema } from '../utils/validation';
import { ApiResponse, PaginatedResponse, Product } from '../types';

export const getAllProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validar parámetros de paginación y filtros
    const paginationResult = validateDataSafe(paginationSchema, req.query);
    const filtersResult = validateDataSafe(productFiltersSchema, req.query);

    if (!paginationResult.success) {
      res.status(400).json({ success: false, error: paginationResult.error });
      return;
    }

    const { page = 1, limit = 10 } = paginationResult.data;
    const skip = (page - 1) * limit;

    // Construir filtros
    const where: any = {};
    
    if (filtersResult.success) {
      const filters = filtersResult.data as any;
      if (filters.categoryId) where.categoryId = filters.categoryId;
      if (filters.search) {
        where.OR = [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } }
        ];
      }
      if (filters.sizes && filters.sizes.length > 0) {
        where.sizes = { hasSome: filters.sizes };
      }
      if (filters.colors && filters.colors.length > 0) {
        where.colors = { hasSome: filters.colors };
      }
    }

    // Obtener productos con paginación
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: true,
          images: true
        },
        skip,
        take: limit,
        orderBy: { name: 'asc' }
      }),
      prisma.product.count({ where })
    ]);

    const totalPages = Math.ceil(total / limit);

    const response: PaginatedResponse<Product> = {
      success: true,
      data: products,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Error getting products:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

export const getProductById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        images: true
      }
    });

    if (!product) {
      res.status(404).json({ success: false, error: 'Producto no encontrado' });
      return;
    }

    const response: ApiResponse<Product> = {
      success: true,
      data: product
    };

    res.json(response);
  } catch (error) {
    console.error('Error getting product:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

export const createProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const validationResult = validateDataSafe(createProductSchema, req.body);

    if (!validationResult.success) {
      res.status(400).json({ success: false, error: validationResult.error });
      return;
    }

    const productData = validationResult.data;

    // Verificar que la categoría existe
    const category = await prisma.category.findUnique({
      where: { id: productData.categoryId }
    });

    if (!category) {
      res.status(400).json({ success: false, error: 'Categoría no encontrada' });
      return;
    }

    // Crear producto con transacción para manejar imágenes
    const product = await prisma.$transaction(async (tx) => {
      const newProduct = await tx.product.create({
        data: {
          name: productData.name,
          description: productData.description,
          categoryId: productData.categoryId,
          sizes: productData.sizes,
          colors: productData.colors
        },
        include: {
          category: true,
          images: true
        }
      });

      // Crear imágenes si se proporcionan
      if (productData.images && productData.images.length > 0) {
        await tx.images.createMany({
          data: productData.images.map(url => ({
            url,
            productId: newProduct.id
          }))
        });
      }

      return tx.product.findUnique({
        where: { id: newProduct.id },
        include: {
          category: true,
          images: true
        }
      });
    });

    const response: ApiResponse<Product> = {
      success: true,
      data: product!,
      message: 'Producto creado exitosamente'
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

export const updateProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const validationResult = validateDataSafe(updateProductSchema, req.body);

    if (!validationResult.success) {
      res.status(400).json({ success: false, error: validationResult.error });
      return;
    }

    const updateData = validationResult.data;

    // Verificar que el producto existe
    const existingProduct = await prisma.product.findUnique({
      where: { id }
    });

    if (!existingProduct) {
      res.status(404).json({ success: false, error: 'Producto no encontrado' });
      return;
    }

    // Verificar categoría si se está actualizando
    if (updateData.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: updateData.categoryId }
      });

      if (!category) {
        res.status(400).json({ success: false, error: 'Categoría no encontrada' });
      return;
      }
    }

    // Actualizar producto
    const product = await prisma.product.update({
      where: { id },
      data: updateData as any,
      include: {
        category: true,
        images: true
      }
    });

    const response: ApiResponse<Product> = {
      success: true,
      data: product,
      message: 'Producto actualizado exitosamente'
    };

    res.json(response);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Verificar que el producto existe
    const product = await prisma.product.findUnique({
      where: { id }
    });

    if (!product) {
      res.status(404).json({ success: false, error: 'Producto no encontrado' });
      return;
    }

    // Eliminar producto (las imágenes se eliminarán en cascada)
    await prisma.product.delete({
      where: { id }
    });

    const response: ApiResponse = {
      success: true,
      message: 'Producto eliminado exitosamente'
    };

    res.json(response);
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}; 