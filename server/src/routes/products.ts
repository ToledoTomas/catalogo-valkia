import { Router } from 'express';
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  upload,
  uploadProductImage,
  createProductWithImage,
  createProductWithImages,
  addProductImages,
  deleteProductImage
} from '../controllers/productController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Rutas públicas
router.get('/', getAllProducts);
router.get('/:id', getProductById);

// Rutas protegidas (requieren autenticación)
router.post('/', authenticateToken, createProduct);
router.put('/:id', authenticateToken, updateProduct);

// Imágenes de un producto existente (edición)
router.post('/:id/images', authenticateToken, upload.array('images', 10), addProductImages);
router.delete('/images/:imageId', authenticateToken, deleteProductImage);

router.delete('/:id', authenticateToken, deleteProduct);

// Ruta para subir imagen de producto
router.post('/upload-image', authenticateToken, upload.single('image'), uploadProductImage);

// Ruta para crear producto con imagen en un solo paso
router.post('/with-image', authenticateToken, upload.single('image'), createProductWithImage);

// Ruta para crear producto con varias imágenes en un solo paso
router.post('/with-images', authenticateToken, upload.array('images', 10), createProductWithImages);

export default router;