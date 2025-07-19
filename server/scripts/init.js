const { PrismaClient } = require('../generated/prisma');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Iniciando configuración de la base de datos...');

  try {
    // Crear categorías de ejemplo
    console.log('📂 Creando categorías de ejemplo...');
    
    const categories = [
      { name: 'Ropa' },
      { name: 'Calzado' },
      { name: 'Accesorios' },
      { name: 'Deportes' }
    ];

    for (const category of categories) {
      const existingCategory = await prisma.category.findUnique({
        where: { name: category.name }
      });

      if (!existingCategory) {
        await prisma.category.create({
          data: category
        });
        console.log(`✅ Categoría "${category.name}" creada`);
      } else {
        console.log(`ℹ️  Categoría "${category.name}" ya existe`);
      }
    }

    // Crear admin inicial
    console.log('👤 Creando administrador inicial...');
    
    const adminEmail = 'admin@valkia.com';
    const adminPassword = 'admin123';

    const existingAdmin = await prisma.admin.findUnique({
      where: { email: adminEmail }
    });

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      
      await prisma.admin.create({
        data: {
          email: adminEmail,
          password: hashedPassword
        }
      });
      
      console.log('✅ Administrador inicial creado');
      console.log(`📧 Email: ${adminEmail}`);
      console.log(`🔑 Contraseña: ${adminPassword}`);
      console.log('⚠️  IMPORTANTE: Cambia la contraseña después del primer inicio de sesión');
    } else {
      console.log('ℹ️  Administrador inicial ya existe');
    }

    // Crear productos de ejemplo
    console.log('📦 Creando productos de ejemplo...');
    
    const ropaCategory = await prisma.category.findUnique({
      where: { name: 'Ropa' }
    });

    if (ropaCategory) {
      const products = [
        {
          name: 'Camiseta Básica',
          description: 'Camiseta de algodón 100% con diseño minimalista',
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
          categoryId: ropaCategory.id,
          sizes: ['28', '30', '32', '34', '36'],
          colors: ['Azul', 'Negro'],
          images: [
            'https://example.com/jeans-clasicos-1.jpg'
          ]
        }
      ];

      for (const productData of products) {
        const existingProduct = await prisma.product.findFirst({
          where: { name: productData.name }
        });

        if (!existingProduct) {
          const { images, ...productInfo } = productData;
          
          const product = await prisma.product.create({
            data: {
              ...productInfo,
              images: {
                create: images.map(url => ({ url }))
              }
            }
          });
          
          console.log(`✅ Producto "${product.name}" creado`);
        } else {
          console.log(`ℹ️  Producto "${productData.name}" ya existe`);
        }
      }
    }

    console.log('🎉 Configuración completada exitosamente!');
    console.log('\n📊 Resumen:');
    console.log('- Categorías creadas');
    console.log('- Administrador inicial configurado');
    console.log('- Productos de ejemplo agregados');
    console.log('\n🚀 Puedes iniciar el servidor con: npm run dev');

  } catch (error) {
    console.error('❌ Error durante la configuración:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 