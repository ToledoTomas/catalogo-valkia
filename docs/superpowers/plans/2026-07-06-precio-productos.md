# Precio en productos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar un campo `price` (entero, ARS) a los productos, obligatorio en altas nuevas, y reflejarlo en las cards del catálogo y en el panel de administración (alta, edición, listado).

**Architecture:** Se agrega la columna `price Int @default(0)` en Prisma (el default permite migrar productos existentes sin fallar; la obligatoriedad real la fuerza Zod en la API). El precio fluye por las capas existentes: schema → validación Zod → controllers → respuesta uniforme `{ success, data }` → islas React del cliente. La UI formatea con `toLocaleString('es-AR')`.

**Tech Stack:** Prisma (PostgreSQL), Express + TypeScript + Zod (server), Astro + islas React + Tailwind 4 (client).

> **Sobre testing:** este repo no tiene suite de tests ni linter. La verificación de cada tarea es: `npm run build` en `server/` (corre el typecheck de `tsc`), `npm run build` en `client/` cuando aplica, y chequeos manuales de UI descritos en cada tarea. No se crean archivos de test porque no hay framework configurado; no se debe introducir uno para esta feature.

> **Prerrequisito de entorno:** la Task 2 (migración) requiere la base de datos levantada (local: Docker en `:5434`, backend en `:3001`). Si la DB no está disponible al momento de ejecutar, dejar el resto de las tareas de código listas y correr la Task 2 cuando la DB esté arriba. Ninguna otra tarea depende de que la migración ya haya corrido, salvo la verificación end-to-end final (Task 10).

---

### Task 1: Agregar `price` al schema de Prisma

**Files:**
- Modify: `server/prisma/schema.prisma:17-30` (modelo `Product`)

- [ ] **Step 1: Agregar el campo `price` al modelo `Product`**

En `server/prisma/schema.prisma`, dentro del bloque `model Product`, agregar la línea `price` justo después de `description`. El bloque queda así:

```prisma
model Product {
  id          String   @id @default(uuid())
  name        String
  description String
  price       Int      @default(0)
  category    Category @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  categoryId  String
  sizes       String[]
  colors      String[]
  images      Images[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("products")
}
```

- [ ] **Step 2: Commit**

```bash
git add server/prisma/schema.prisma
git commit -m "feat(server): agregar campo price al modelo Product"
```

---

### Task 2: Migración + regenerar cliente Prisma

**Files:**
- Create: `server/prisma/migrations/<timestamp>_add_product_price/migration.sql` (lo genera Prisma)
- Modify: `server/generated/prisma/**` (regenerado, está commiteado)

> **Requiere la DB levantada.** Ver prerrequisito de entorno arriba.

- [ ] **Step 1: Crear y aplicar la migración**

Desde `server/`:

```bash
npm run db:migrate -- --name add_product_price
```

Expected: Prisma crea la carpeta de migración, agrega la columna `price` (con default 0 para las filas existentes) y aplica sin errores. Si pide confirmar, aceptar.

- [ ] **Step 2: Regenerar el cliente Prisma**

Desde `server/`:

```bash
npm run db:generate
```

Expected: `✔ Generated Prisma Client` en `server/generated/prisma`.

- [ ] **Step 3: Verificar que el tipo generado incluye `price`**

Run: `grep -r "price" server/generated/prisma/index.d.ts | head`
Expected: aparecen referencias a `price: number` en el tipo `Product`.

- [ ] **Step 4: Commit**

```bash
git add server/prisma/migrations server/generated/prisma
git commit -m "feat(server): migracion y cliente Prisma con campo price"
```

---

### Task 3: Validación Zod y tipos del server

**Files:**
- Modify: `server/src/utils/validation.ts:4-11` (`createProductSchema`)
- Modify: `server/src/types/index.ts:2-13` (interface `Product`), `:69-76` (`CreateProductRequest`)

- [ ] **Step 1: Agregar `price` a `createProductSchema`**

En `server/src/utils/validation.ts`, dentro de `createProductSchema`, agregar el campo `price` después de `description`:

```typescript
export const createProductSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100, 'El nombre es muy largo'),
  description: z.string().min(1, 'La descripción es requerida').max(1000, 'La descripción es muy larga'),
  price: z.coerce.number({ invalid_type_error: 'El precio debe ser un número' }).int('El precio debe ser un número entero').nonnegative('El precio no puede ser negativo'),
  categoryId: z.string().uuid('ID de categoría inválido'),
  sizes: z.array(z.string()).min(1, 'Al menos un tamaño es requerido'),
  colors: z.array(z.string()).min(1, 'Al menos un color es requerido'),
  images: z.array(z.string().url('URL de imagen inválida')).optional()
});
```

Nota: `z.coerce.number()` convierte el string del form-data (ej: `"12500"`) a número. `updateProductSchema` es `createProductSchema.partial()`, así que hereda `price` como opcional sin cambios adicionales.

- [ ] **Step 2: Agregar `price` a los tipos**

En `server/src/types/index.ts`, agregar `price: number;` a la interface `Product` (después de `description`):

```typescript
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
```

Y a `CreateProductRequest` (después de `description`):

```typescript
export interface CreateProductRequest {
  name: string;
  description: string;
  price: number;
  categoryId: string;
  sizes: string[];
  colors: string[];
  images?: string[];
}
```

- [ ] **Step 3: Verificar typecheck**

Run (desde `server/`): `npm run build`
Expected: compila sin errores. (Es esperable que aún NO haya cambios en los controllers; el `create` de `createProduct` todavía no usa `price` pero eso no rompe la compilación.)

- [ ] **Step 4: Commit**

```bash
git add server/src/utils/validation.ts server/src/types/index.ts
git commit -m "feat(server): validacion Zod y tipos para price"
```

---

### Task 4: Persistir `price` en los controllers

**Files:**
- Modify: `server/src/controllers/productController.ts` — `createProduct` (~línea 157-164), `createProductWithImages` (~línea 383-397 y 415-427), `createProductWithImage` (~línea 328 y 342-352)

> `updateProduct` NO necesita cambios: pasa `updateData as any` completo al `prisma.product.update`, así que `price` fluye automáticamente cuando viene en el body.

- [ ] **Step 1: Agregar `price` en `createProduct`**

En `server/src/controllers/productController.ts`, en la función `createProduct`, dentro de `tx.product.create`, agregar `price` al `data`:

```typescript
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
```

- [ ] **Step 2: Agregar `price` en `createProductWithImages`**

En la misma función, primero incluir `price` en el objeto que se valida. Localizar el bloque `const validation = validateDataSafe(createProductSchema.omit({ images: true }), {...})` y agregar `price`:

```typescript
    const validation = validateDataSafe(createProductSchema.omit({ images: true }), {
      name,
      description,
      price: req.body.price,
      categoryId,
      sizes,
      colors
    });
```

Luego, en el `tx.product.create` de esa función, agregar `price` al `data`:

```typescript
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
```

- [ ] **Step 3: Agregar `price` en `createProductWithImage` (legacy single-image)**

En la función `createProductWithImage`, extraer `price` del body y parsearlo a entero en el `create`. Cambiar la desestructuración y el `data`:

```typescript
    const { name, description, price, categoryId, sizes, colors } = req.body;
```

y en el `prisma.product.create`:

```typescript
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
```

- [ ] **Step 4: Verificar typecheck**

Run (desde `server/`): `npm run build`
Expected: compila sin errores.

- [ ] **Step 5: Commit**

```bash
git add server/src/controllers/productController.ts
git commit -m "feat(server): persistir price al crear productos"
```

---

### Task 5: Precio en el seed inicial

**Files:**
- Modify: `server/scripts/init.js:71-93` (array `products`)

- [ ] **Step 1: Agregar `price` a los productos de ejemplo**

En `server/scripts/init.js`, agregar el campo `price` a cada objeto del array `products`:

```javascript
      const products = [
        {
          name: 'Camiseta Básica',
          description: 'Camiseta de algodón 100% con diseño minimalista',
          price: 15000,
          categoryId: ropaCategory.id,
          sizes: ['S', 'M', 'L', 'XL'],
          colors: ['Blanco', 'Negro', 'Gris'],
          images: [
            'https://example.com/camiseta-basica-1.jpg',
            'https://example.com/camiseta-basica-2.jpg'
          ]
        },
        {
          name: 'Jeans Clásicos',
          description: 'Jeans de alta calidad con corte clásico',
          price: 38000,
          categoryId: ropaCategory.id,
          sizes: ['28', '30', '32', '34', '36'],
          colors: ['Azul', 'Negro'],
          images: [
            'https://example.com/jeans-clasicos-1.jpg'
          ]
        }
      ];
```

- [ ] **Step 2: Commit**

```bash
git add server/scripts/init.js
git commit -m "feat(server): price en productos de ejemplo del seed"
```

---

### Task 6: Input de precio en el alta (`ProductForm.jsx`)

**Files:**
- Modify: `client/src/components/admin/ProductForm.jsx`

- [ ] **Step 1: Agregar estado `price`**

En `ProductForm.jsx`, agregar el estado junto a los otros (después de `const [description, setDescription] = useState('');`):

```javascript
  const [price, setPrice] = useState('');
```

- [ ] **Step 2: Validar y enviar `price`**

En `handleSubmit`, agregar la validación después de la de `categoryId` y antes de la de `sizes`:

```javascript
    if (!price || Number(price) <= 0) return setError('Ingresá un precio válido');
```

Y agregar el campo al `FormData` (después de `fd.append('description', description);`):

```javascript
      fd.append('price', String(price));
```

Además, en el reset posterior al alta exitosa (donde se hace `setName('')`, etc.), agregar:

```javascript
      setPrice('');
```

- [ ] **Step 3: Agregar el input al formulario**

En el JSX, después del bloque `<div>` de "Descripción" y antes del bloque de "Categoría", agregar:

```jsx
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Precio (ARS)</label>
        <input
          type="number"
          min="0"
          step="1"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          required
          placeholder="Ej: 15000"
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
```

- [ ] **Step 4: Verificar build del client**

Run (desde `client/`): `npm run build`
Expected: build de Astro sin errores.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/admin/ProductForm.jsx
git commit -m "feat(client): input de precio en el alta de productos"
```

---

### Task 7: Input de precio en la edición (`ProductEdit.jsx`)

**Files:**
- Modify: `client/src/components/admin/ProductEdit.jsx`

- [ ] **Step 1: Agregar estado `price`**

En `ProductEdit.jsx`, agregar el estado (después de `const [description, setDescription] = useState('');`):

```javascript
  const [price, setPrice] = useState('');
```

- [ ] **Step 2: Cargar el precio del producto**

En `loadProduct`, donde se setean los campos (`setName(p.name)`, etc.), agregar:

```javascript
      setPrice(p.price ?? '');
```

- [ ] **Step 3: Validar y enviar `price` en el PUT**

En `saveFields`, agregar la validación después de la de `categoryId`:

```javascript
    if (!price || Number(price) <= 0) return setError('Ingresá un precio válido');
```

Y agregar `price: Number(price)` al body del PUT:

```javascript
      const res = await apiFetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, price: Number(price), categoryId, sizes, colors })
      });
```

- [ ] **Step 4: Agregar el input al formulario**

En el JSX, después del bloque `<div>` de "Descripción" y antes del de "Categoría", agregar:

```jsx
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Precio (ARS)</label>
          <input
            type="number"
            min="0"
            step="1"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
            placeholder="Ej: 15000"
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
```

- [ ] **Step 5: Verificar build del client**

Run (desde `client/`): `npm run build`
Expected: build sin errores.

- [ ] **Step 6: Commit**

```bash
git add client/src/components/admin/ProductEdit.jsx
git commit -m "feat(client): editar precio de productos"
```

---

### Task 8: Mostrar el precio en la card pública (`Card.jsx`)

**Files:**
- Modify: `client/src/components/Card.jsx:60` (firma del componente), `:116-118` (después del título)

- [ ] **Step 1: Recibir la prop `price`**

En `Card.jsx`, agregar `price` a los props destructurados:

```javascript
export default function Card({ images = [], title, category, alt, sizes = [], colors = [], price }) {
```

- [ ] **Step 2: Mostrar el precio formateado bajo el título**

En el JSX, inmediatamente después del `<h3>` del título (el que tiene `line-clamp-2`), agregar:

```jsx
        {price != null && price !== '' && (
          <p className="text-lg font-bold text-primary-900 mb-2">
            ${Number(price).toLocaleString('es-AR')}
          </p>
        )}
```

- [ ] **Step 3: Verificar build del client**

Run (desde `client/`): `npm run build`
Expected: build sin errores.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/Card.jsx
git commit -m "feat(client): mostrar precio formateado en la card"
```

---

### Task 9: Pasar `price` a la card e incluirlo en el listado admin

**Files:**
- Modify: `client/src/components/GridCardsFilterIsland.jsx:62-69` (render de `<Card>`)
- Modify: `client/src/components/admin/ProductList.jsx:102-105` (fila del producto)

- [ ] **Step 1: Pasar `price` desde el grid del catálogo**

En `GridCardsFilterIsland.jsx`, agregar la prop `price` al `<Card>`:

```jsx
            <Card
              key={item.id}
              images={item.images}
              title={item.name}
              category={item.category.name}
              sizes={item.sizes}
              colors={item.colors}
              price={item.price}
            />
```

- [ ] **Step 2: Mostrar el precio en cada fila del listado admin**

En `ProductList.jsx`, en el bloque `<div className="flex-1 min-w-0">`, agregar el precio debajo de la categoría:

```jsx
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 truncate">{p.name}</p>
                <p className="text-sm text-gray-500">{p.category?.name}</p>
                <p className="text-sm font-semibold text-gray-700">
                  ${Number(p.price ?? 0).toLocaleString('es-AR')}
                </p>
              </div>
```

- [ ] **Step 3: Verificar build del client**

Run (desde `client/`): `npm run build`
Expected: build sin errores.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/GridCardsFilterIsland.jsx client/src/components/admin/ProductList.jsx
git commit -m "feat(client): pasar price a la card y mostrarlo en el listado admin"
```

---

### Task 10: Verificación end-to-end manual

> **Requiere DB + backend + client levantados** (DB Docker `:5434`, `cd server && npm run dev` en `:3001`, `cd client && npm run dev` en `:4321`). Si la Task 2 (migración) no corrió aún, correrla primero.

- [ ] **Step 1: Crear un producto con precio desde el panel**

Ir a `http://localhost:4321/admin`, loguearse (`admin@valkia.com` / `admin123`), crear un producto completando el nuevo campo "Precio (ARS)" con `15000`, subir una foto y guardar.
Expected: mensaje "Producto creado ✓" sin errores.

- [ ] **Step 2: Verificar el precio en el catálogo público**

Ir a `http://localhost:4321/`.
Expected: la card del producto recién creado muestra `$15.000` (con separador de miles) debajo del nombre.

- [ ] **Step 3: Verificar el precio en el listado y edición admin**

Volver a `/admin`, ir al listado de productos.
Expected: la fila muestra `$15.000`. Al entrar a "Editar", el input de precio viene precargado con `15000`. Cambiarlo a `18000`, guardar, y confirmar que la card pública ahora muestra `$18.000`.

- [ ] **Step 4: Verificar validación de precio faltante**

Intentar crear un producto dejando el precio vacío o en `0`.
Expected: se muestra el error "Ingresá un precio válido" y no se envía el alta.

- [ ] **Step 5: Actualizar el índice de memoria si corresponde**

Sin cambios de código. Si algo del entorno cambió durante la verificación (ej: la DB volvió a estar disponible), considerar actualizar las notas de memoria del proyecto.

---

## Notas de ejecución

- **Orden:** Tasks 1→5 son server, 6→9 son client, 10 es verificación. Las tareas de client (6-9) no dependen de que la migración (Task 2) haya corrido para compilar, pero sí para el test end-to-end (Task 10).
- **DB caída:** si la base no está disponible, ejecutar Tasks 1, 3, 4, 5, 6, 7, 8, 9 (todo el código), y dejar Task 2 y Task 10 pendientes hasta tener la DB arriba.
