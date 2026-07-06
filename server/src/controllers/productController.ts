import { Request, Response } from 'express';
import { prisma } from '../index';
import { validateDataSafe, createProductSchema, updateProductSchema, paginationSchema, productFiltersSchema } from '../utils/validation';
import { ApiResponse, PaginatedResponse, Product } from '../types';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';

// Configuración de multer para archivos en memoria
const storage = multer.memoryStorage();
export const upload = multer({ storage });

// Sube un buffer a Cloudinary y devuelve la secure_url (versión promisificada)
function uploadToCloudinary(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: 'image' },
      (error, result) => {
        if (error || !result) {
          reject(error || new Error('Cloudinary no devolvió resultado'));
          return;
        }
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
}

export const getAllProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validar parámetros de paginación y filtros
    const paginationResult = validateDataSafe(paginationSchema, req.query);
    const filtersResult = validateDataSafe(productFiltersSchema, req.query);

    if (!paginationResult.success) {
      res.status(400).json({ success: false, error: paginationResult.error });
      return;
    }

    // Si no se especifica limit, devolver todos los productos
    let limit = paginationResult.data.limit;
    let page = paginationResult.data.page;
    if (!('limit' in req.query)) {
      limit = undefined;
      page = 1;
    }
    page = page || 1;
    const skip = limit ? (page - 1) * limit : undefined;

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

    const totalPages = limit ? Math.ceil(total / limit) : 1;

    const response: PaginatedResponse<Product> = {
      success: true,
      data: products,
      pagination: {
        page: page || 1,
        limit: limit || total,
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
          price: productData.price,
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

export const uploadProductImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId } = req.body;
    const file = req.file as Express.Multer.File;
    if (!productId) {
      res.status(400).json({ success: false, error: 'Falta productId' });
      return;
    }
    if (!file) {
      res.status(400).json({ success: false, error: 'No se envió archivo' });
      return;
    }
    // Subir a Cloudinary
    const uploadResult = await cloudinary.uploader.upload_stream({ resource_type: 'image' }, async (error, result) => {
      if (error || !result) {
        res.status(500).json({ success: false, error: 'Error subiendo a Cloudinary' });
        return;
      }
      // Guardar en la base de datos
      const image = await prisma.images.create({
        data: {
          url: result.secure_url,
          productId
        }
      });
      res.status(201).json({ success: true, url: image.url, image });
    });
    // Escribir el buffer del archivo en el stream
    uploadResult.end(file.buffer);
  } catch (error) {
    console.error('Error uploading product image:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}; 

export const createProductWithImage = async (req: Request, res: Response) => {
  try {
    const { name, description, price, categoryId, sizes, colors } = req.body;
    const file = req.file as Express.Multer.File;

    if (!file) {
      return res.status(400).json({ success: false, error: 'No se envió imagen' });
    }

    // Sube la imagen a Cloudinary
    cloudinary.uploader.upload_stream({ resource_type: 'image' }, async (error, result) => {
      if (error || !result) {
        return res.status(500).json({ success: false, error: 'Error subiendo a Cloudinary' });
      }

      // Crea el producto y asocia la imagen
      const product = await prisma.product.create({
        data: {
          name,
          description,
          price: parseInt(price, 10) || 0,
          categoryId,
          sizes: typeof sizes === 'string' ? JSON.parse(sizes) : sizes,
          colors: typeof colors === 'string' ? JSON.parse(colors) : colors,
          images: {
            create: [{ url: result.secure_url }]
          }
        },
        include: { images: true, category: true }
      });

      res.status(201).json({ success: true, data: product });
    }).end(file.buffer);

  } catch (error) {
    console.error('Error creating product with image:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

export const createProductWithImages = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, price, categoryId } = req.body;
    const files = (req.files as Express.Multer.File[]) || [];

    // sizes/colors llegan como JSON string (o array); normalizar a string[]
    const parseArray = (val: unknown): string[] => {
      if (Array.isArray(val)) return val as string[];
      if (typeof val === 'string') {
        try {
          const parsed = JSON.parse(val);
          return Array.isArray(parsed) ? parsed : (val ? [val] : []);
        } catch {
          return val ? [val] : [];
        }
      }
      return [];
    };
    const sizes = parseArray(req.body.sizes);
    const colors = parseArray(req.body.colors);

    // Validar campos de texto (las imágenes son archivos, no URLs)
    const validation = validateDataSafe(createProductSchema.omit({ images: true }), {
      name,
      description,
      price,
      categoryId,
      sizes,
      colors
    });
    if (!validation.success) {
      res.status(400).json({ success: false, error: validation.error });
      return;
    }

    if (files.length === 0) {
      res.status(400).json({ success: false, error: 'Se requiere al menos una imagen' });
      return;
    }

    // Verificar que la categoría existe
    const category = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) {
      res.status(400).json({ success: false, error: 'Categoría no encontrada' });
      return;
    }

    // Subir todas las imágenes a Cloudinary
    const urls = await Promise.all(files.map((f) => uploadToCloudinary(f.buffer)));

    // Crear producto + imágenes en una transacción
    const product = await prisma.$transaction(async (tx) => {
      return tx.product.create({
        data: {
          name: validation.data.name,
          description: validation.data.description,
          price: validation.data.price,
          categoryId: validation.data.categoryId,
          sizes: validation.data.sizes,
          colors: validation.data.colors,
          images: { create: urls.map((url) => ({ url })) }
        },
        include: { category: true, images: true }
      });
    });

    res.status(201).json({
      success: true,
      data: product,
      message: 'Producto creado exitosamente'
    });
  } catch (error) {
    console.error('Error creating product with images:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

export const addProductImages = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const files = (req.files as Express.Multer.File[]) || [];

    if (files.length === 0) {
      res.status(400).json({ success: false, error: 'No se enviaron imágenes' });
      return;
    }

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Producto no encontrado' });
      return;
    }

    const urls = await Promise.all(files.map((f) => uploadToCloudinary(f.buffer)));

    await prisma.images.createMany({
      data: urls.map((url) => ({ url, productId: id }))
    });

    const product = await prisma.product.findUnique({
      where: { id },
      include: { category: true, images: true }
    });

    res.status(201).json({
      success: true,
      data: product,
      message: 'Imágenes agregadas exitosamente'
    });
  } catch (error) {
    console.error('Error adding product images:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

export const deleteProductImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { imageId } = req.params;

    const image = await prisma.images.findUnique({ where: { id: imageId } });
    if (!image) {
      res.status(404).json({ success: false, error: 'Imagen no encontrada' });
      return;
    }

    await prisma.images.delete({ where: { id: imageId } });

    res.json({ success: true, message: 'Imagen eliminada exitosamente' });
  } catch (error) {
    console.error('Error deleting product image:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};