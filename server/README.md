# Backend - Catálogo Valkia

Backend API para el catálogo de productos Valkia construido con Express, TypeScript, Prisma y PostgreSQL.

## 🚀 Características

- **API RESTful** con Express y TypeScript
- **Base de datos** PostgreSQL con Prisma ORM
- **Autenticación JWT** para administradores
- **Validación de datos** con Zod
- **Encriptación de contraseñas** con bcrypt
- **CORS** configurado para desarrollo
- **Logging** de requests
- **Manejo de errores** centralizado

## 📋 Modelos de Base de Datos

### Product
- `id`: UUID (clave primaria)
- `name`: String (nombre del producto)
- `description`: String (descripción)
- `categoryId`: String (referencia a Category)
- `sizes`: String[] (tamaños disponibles)
- `colors`: String[] (colores disponibles)
- `images`: Relación con Images[]

### Category
- `id`: UUID (clave primaria)
- `name`: String (nombre único)
- `products`: Relación con Product[]

### Images
- `id`: UUID (clave primaria)
- `url`: String (URL de la imagen)
- `productId`: String (referencia a Product)

### Admin
- `id`: UUID (clave primaria)
- `email`: String (email único)
- `password`: String (encriptada)

## 🛠️ Instalación

1. **Clonar el repositorio**
   ```bash
   git clone <repository-url>
   cd catalogo-valkia/server
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**
   ```bash
   cp env.example .env
   ```
   
   Editar `.env` con tus configuraciones:
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/catalogo_valkia"
   JWT_SECRET="your-super-secret-jwt-key"
   PORT=3001
   ```

4. **Configurar la base de datos**
   ```bash
   # Generar cliente de Prisma
   npm run db:generate
   
   # Ejecutar migraciones
   npm run db:migrate
   
   # O sincronizar esquema (desarrollo)
   npm run db:push
   ```

5. **Iniciar el servidor**
   ```bash
   # Desarrollo
   npm run dev
   
   # Producción
   npm run build
   npm start
   ```

## 📚 Endpoints de la API

### Autenticación
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/register` - Registrar administrador
- `GET /api/auth/profile` - Obtener perfil (protegido)

### Productos
- `GET /api/products` - Listar productos (con paginación y filtros)
- `GET /api/products/:id` - Obtener producto por ID
- `POST /api/products` - Crear producto (protegido)
- `PUT /api/products/:id` - Actualizar producto (protegido)
- `DELETE /api/products/:id` - Eliminar producto (protegido)

### Categorías
- `GET /api/categories` - Listar categorías
- `GET /api/categories/:id` - Obtener categoría por ID
- `POST /api/categories` - Crear categoría (protegido)
- `PUT /api/categories/:id` - Actualizar categoría (protegido)
- `DELETE /api/categories/:id` - Eliminar categoría (protegido)

### Administración
- `GET /api/admin/dashboard` - Dashboard (protegido)

## 🔐 Autenticación

Para acceder a rutas protegidas, incluye el token JWT en el header:

```
Authorization: Bearer <token>
```

### Ejemplo de login:
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "password123"}'
```

## 📝 Scripts Disponibles

- `npm run dev` - Iniciar servidor en modo desarrollo
- `npm run build` - Compilar TypeScript
- `npm start` - Iniciar servidor en producción
- `npm run db:generate` - Generar cliente de Prisma
- `npm run db:push` - Sincronizar esquema con la base de datos
- `npm run db:migrate` - Ejecutar migraciones
- `npm run db:studio` - Abrir Prisma Studio

## 🏗️ Estructura del Proyecto

```
src/
├── controllers/     # Lógica de negocio
├── middleware/      # Middlewares personalizados
├── routes/          # Definición de rutas
├── types/           # Tipos TypeScript
├── utils/           # Utilidades y validaciones
└── index.ts         # Punto de entrada
```

## 🔧 Configuración de Desarrollo

### Variables de Entorno Requeridas

- `DATABASE_URL`: URL de conexión a PostgreSQL
- `JWT_SECRET`: Clave secreta para JWT
- `PORT`: Puerto del servidor (opcional, default: 3001)
- `NODE_ENV`: Entorno (development/production)

### Base de Datos

El proyecto usa PostgreSQL con Prisma. Asegúrate de tener:

1. PostgreSQL instalado y ejecutándose
2. Una base de datos creada
3. Las credenciales correctas en `DATABASE_URL`

## 🚀 Despliegue

1. **Compilar el proyecto**
   ```bash
   npm run build
   ```

2. **Configurar variables de entorno de producción**

3. **Ejecutar migraciones**
   ```bash
   npm run db:migrate
   ```

4. **Iniciar el servidor**
   ```bash
   npm start
   ```

## 📊 Health Check

El servidor incluye un endpoint de salud:

```bash
curl http://localhost:3001/health
```

Respuesta:
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```
