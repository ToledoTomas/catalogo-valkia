// Tipos para los modelos de Prisma
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  categoryId: string;
  sizes: string[];
  colors: string[];
  category?: Category;
  images?: Images[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Category {
  id: string;
  name: string;
  products?: Product[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Images {
  id: string;
  url: string;
  productId: string;
  product?: Product;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Admin {
  id: string;
  email: string;
  password: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Tipos para las respuestas de la API
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Tipos para autenticación
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  admin: Omit<Admin, 'password'>;
}

// Tipos para creación/actualización
export interface CreateProductRequest {
  name: string;
  description: string;
  price: number;
  categoryId: string;
  sizes: string[];
  colors: string[];
  images?: string[];
}

export interface UpdateProductRequest extends Partial<CreateProductRequest> {}

export interface CreateCategoryRequest {
  name: string;
}

export interface CreateAdminRequest {
  email: string;
  password: string;
} 