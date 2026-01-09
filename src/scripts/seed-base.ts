import { PrismaClient, Plan } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Limpiar datos existentes (solo en desarrollo)
  if (process.env.NODE_ENV === 'development') {
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.coupon.deleteMany();
    await prisma.review.deleteMany();
    await prisma.productImage.deleteMany();
    await prisma.productVariant.deleteMany();
    await prisma.product.deleteMany();
    await prisma.socialLink.deleteMany();
    await prisma.storeProfile.deleteMany();
    await prisma.productCategory.deleteMany();
    await prisma.category.deleteMany();
    await prisma.user.deleteMany();
    console.log('Database cleaned');
  }

  // NO limpiar datos - Solo verificar si ya existen
  const existingAdmin = await prisma.user.findUnique({
    where: { email: 'admin@qhatu.pe' },
  });

  if (existingAdmin) {
    console.log('⚠️  Admin user already exists, skipping seed...');
    console.log('💡 If you want to reset the database, run: npx prisma migrate reset');
    return;
  }

  // 1. Crear ADMIN
  const hashedAdminPassword = await bcrypt.hash('Admin123!', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@qhatu.pe',
      username: 'admin',
      password: hashedAdminPassword,
      fullName: 'Administrador Qhatu',
      phone: '+51900000000',
      plan: 'PREMIUM',
      role: 'ADMIN',
      isVerified: true,
    },
  });

  console.log('Created admin user:', {
    email: 'admin@qhatu.pe',
    password: 'Admin123!',
  });

  // 2. Crear categorías principales
  const categories = await Promise.all([
    prisma.category.create({
      data: {
        name: 'Ropa',
        description: 'Prendas de vestir',
      },
    }),
    prisma.category.create({
      data: {
        name: 'Tecnología',
        description: 'Dispositivos electrónicos',
      },
    }),
    prisma.category.create({
      data: {
        name: 'Hogar',
        description: 'Artículos para el hogar',
      },
    }),
    prisma.category.create({
      data: {
        name: 'Alimentos',
        description: 'Comida y bebidas',
      },
    }),
    prisma.category.create({
      data: {
        name: 'Accesorios',
        description: 'Complementos y accesorios',
      },
    }),
  ]);

  console.log(`Created ${categories.length} categories`);

  // 3. Crear usuario vendedor de prueba
  const hashedPassword = await bcrypt.hash('Password123!', 10);

  const seller = await prisma.user.create({
    data: {
      email: 'juan@example.com',
      username: 'juanitoropa',
      password: hashedPassword,
      fullName: 'Juan Pérez',
      phone: '+51999888777',
      plan: Plan.PRO,
      role: 'SELLER',
      isVerified: true,
      storeProfile: {
        create: {
          storeName: 'Ropa Moda Perú',
          bio: 'Las mejores prendas al mejor precio 🔥',
          phone: '+51999888777',
          logo: 'https://api.dicebear.com/7.x/initials/svg?seed=JuanPerez',
          isActive: true,
          badges: ['VERIFICADO', 'TOP_SELLER'],
          categoryId: categories[0].id, // Ropa
          socialLinks: {
            create: [
              {
                platform: 'INSTAGRAM',
                url: 'https://instagram.com/ropamoda_pe',
              },
              {
                platform: 'WHATSAPP',
                url: 'https://wa.me/51999888777',
              },
            ],
          },
        },
      },
    },
  });

  console.log(`Created seller user`);

  // 4. Crear usuarios clientes para reseñas
  const customers = await Promise.all([
    prisma.user.create({
      data: {
        email: 'maria@example.com',
        username: 'mariagomez',
        password: hashedPassword,
        fullName: 'María Gómez',
        phone: '+51988777666',
        plan: Plan.BASIC,
        role: 'CUSTOMER',
        isVerified: true,
      },
    }),
    prisma.user.create({
      data: {
        email: 'carlos@example.com',
        username: 'carlosrodriguez',
        password: hashedPassword,
        fullName: 'Carlos Rodríguez',
        phone: '+51977666555',
        plan: Plan.BASIC,
        role: 'CUSTOMER',
        isVerified: true,
      },
    }),
    prisma.user.create({
      data: {
        email: 'ana@example.com',
        username: 'anamartinez',
        password: hashedPassword,
        fullName: 'Ana Martínez',
        phone: '+51966555444',
        plan: Plan.BASIC,
        role: 'CUSTOMER',
        isVerified: true,
      },
    }),
    prisma.user.create({
      data: {
        email: 'luis@example.com',
        username: 'luisfernandez',
        password: hashedPassword,
        fullName: 'Luis Fernández',
        phone: '+51955444333',
        plan: Plan.BASIC,
        role: 'CUSTOMER',
        isVerified: true,
      },
    }),
    prisma.user.create({
      data: {
        email: 'sofia@example.com',
        username: 'sofialopez',
        password: hashedPassword,
        fullName: 'Sofía López',
        phone: '+51944333222',
        plan: Plan.BASIC,
        role: 'CUSTOMER',
        isVerified: true,
      },
    }),
  ]);

  console.log(`Created ${customers.length} customer users`);

  // 5. Crear categorías de productos para el vendedor
  const productCategories = await Promise.all([
    prisma.productCategory.create({
      data: {
        userId: seller.id,
        name: 'Polos',
        slug: 'polos',
        description: 'Polos casuales y deportivos',
        icon: '👕',
        order: 1,
      },
    }),
    prisma.productCategory.create({
      data: {
        userId: seller.id,
        name: 'Pantalones',
        slug: 'pantalones',
        description: 'Pantalones y jeans',
        icon: '👖',
        order: 2,
      },
    }),
    prisma.productCategory.create({
      data: {
        userId: seller.id,
        name: 'Zapatillas',
        slug: 'zapatillas',
        description: 'Calzado deportivo',
        icon: '👟',
        order: 3,
      },
    }),
    prisma.productCategory.create({
      data: {
        userId: seller.id,
        name: 'Casacas',
        slug: 'casacas',
        description: 'Casacas y chompas',
        icon: '🧥',
        order: 4,
      },
    }),
  ]);

  console.log(`Created ${productCategories.length} product categories`);

  // 6. Crear productos de ropa
  const productsData = [
    {
      name: 'Polo Básico Negro',
      description: 'Polo de algodón 100%, corte clásico, ideal para uso diario. Disponible en varias tallas.',
      price: 29.90,
      stock: 50,
      categoryId: productCategories[0].id,
      slug: 'polo-basico-negro',
      isActive: true,
      isFeatured: true,
      images: [
        'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500',
        'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=500',
      ],
      variants: [
        { name: 'S - Negro', size: 'S', color: 'Negro', stock: 15 },
        { name: 'M - Negro', size: 'M', color: 'Negro', stock: 20 },
        { name: 'L - Negro', size: 'L', color: 'Negro', stock: 15 },
      ],
    },
    {
      name: 'Polo Oversize Blanco',
      description: 'Polo oversized de algodón premium, estilo urbano moderno. Perfecto para un look relajado.',
      price: 39.90,
      stock: 40,
      categoryId: productCategories[0].id,
      slug: 'polo-oversize-blanco',
      isActive: true,
      images: [
        'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=500',
        'https://images.unsplash.com/photo-1622445275463-afa2ab738c34?w=500',
      ],
      variants: [
        { name: 'M - Blanco', size: 'M', color: 'Blanco', stock: 15 },
        { name: 'L - Blanco', size: 'L', color: 'Blanco', stock: 15 },
        { name: 'XL - Blanco', size: 'XL', color: 'Blanco', stock: 10 },
      ],
    },
    {
      name: 'Jean Slim Fit Azul',
      description: 'Jean de mezclilla con corte slim fit, diseño moderno y cómodo. Material resistente y duradero.',
      price: 89.90,
      stock: 30,
      categoryId: productCategories[1].id,
      slug: 'jean-slim-fit-azul',
      isActive: true,
      isFlashSale: true,
      images: [
        'https://images.unsplash.com/photo-1542272604-787c3835535d?w=500',
        'https://images.unsplash.com/photo-1604176354204-9268737828e4?w=500',
      ],
      variants: [
        { name: '30 - Azul', size: '30', color: 'Azul', stock: 10 },
        { name: '32 - Azul', size: '32', color: 'Azul', stock: 12 },
        { name: '34 - Azul', size: '34', color: 'Azul', stock: 8 },
      ],
    },
    {
      name: 'Pantalón Cargo Beige',
      description: 'Pantalón cargo con múltiples bolsillos, estilo militar urbano. Tela resistente y cómoda.',
      price: 79.90,
      stock: 25,
      categoryId: productCategories[1].id,
      slug: 'pantalon-cargo-beige',
      isActive: true,
      images: [
        'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=500',
        'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=500',
      ],
      variants: [
        { name: 'M - Beige', size: 'M', color: 'Beige', stock: 10 },
        { name: 'L - Beige', size: 'L', color: 'Beige', stock: 15 },
      ],
    },
    {
      name: 'Zapatillas Deportivas Blancas',
      description: 'Zapatillas deportivas de suela acolchada, ideales para running y uso casual. Diseño versátil.',
      price: 149.90,
      stock: 35,
      categoryId: productCategories[2].id,
      slug: 'zapatillas-deportivas-blancas',
      isActive: true,
      isFeatured: true,
      images: [
        'https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?w=500',
        'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=500',
      ],
      variants: [
        { name: '40 - Blanco', size: '40', color: 'Blanco', stock: 8 },
        { name: '41 - Blanco', size: '41', color: 'Blanco', stock: 12 },
        { name: '42 - Blanco', size: '42', color: 'Blanco', stock: 10 },
        { name: '43 - Blanco', size: '43', color: 'Blanco', stock: 5 },
      ],
    },
    {
      name: 'Zapatillas Urbanas Negras',
      description: 'Zapatillas de estilo urbano con diseño minimalista. Comodidad garantizada para todo el día.',
      price: 129.90,
      stock: 28,
      categoryId: productCategories[2].id,
      slug: 'zapatillas-urbanas-negras',
      isActive: true,
      images: [
        'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500',
        'https://images.unsplash.com/photo-1605348532760-6753d2c43329?w=500',
      ],
      variants: [
        { name: '39 - Negro', size: '39', color: 'Negro', stock: 6 },
        { name: '40 - Negro', size: '40', color: 'Negro', stock: 10 },
        { name: '41 - Negro', size: '41', color: 'Negro', stock: 12 },
      ],
    },
    {
      name: 'Casaca Jean Azul',
      description: 'Casaca de mezclilla clásica, perfecta para el clima de Lima. Diseño atemporal y versátil.',
      price: 119.90,
      stock: 20,
      categoryId: productCategories[3].id,
      slug: 'casaca-jean-azul',
      isActive: true,
      images: [
        'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500',
        'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=500',
      ],
      variants: [
        { name: 'S - Azul', size: 'S', color: 'Azul', stock: 5 },
        { name: 'M - Azul', size: 'M', color: 'Azul', stock: 8 },
        { name: 'L - Azul', size: 'L', color: 'Azul', stock: 7 },
      ],
    },
    {
      name: 'Chompa con Capucha Gris',
      description: 'Chompa canguro con capucha, interior afelpado. Perfecta para las noches frías de invierno.',
      price: 79.90,
      stock: 45,
      categoryId: productCategories[3].id,
      slug: 'chompa-capucha-gris',
      isActive: true,
      isFeatured: true,
      images: [
        'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=500',
        'https://images.unsplash.com/photo-1620799140188-3b2a02fd9a77?w=500',
      ],
      variants: [
        { name: 'M - Gris', size: 'M', color: 'Gris', stock: 15 },
        { name: 'L - Gris', size: 'L', color: 'Gris', stock: 18 },
        { name: 'XL - Gris', size: 'XL', color: 'Gris', stock: 12 },
      ],
    },
    {
      name: 'Polo Rayas Marinero',
      description: 'Polo de rayas estilo marinero, 100% algodón. Diseño clásico y elegante casual.',
      price: 44.90,
      stock: 32,
      categoryId: productCategories[0].id,
      slug: 'polo-rayas-marinero',
      isActive: true,
      images: [
        'https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=500',
        'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=500',
      ],
      variants: [
        { name: 'S - Blanco/Azul', size: 'S', color: 'Blanco/Azul', stock: 10 },
        { name: 'M - Blanco/Azul', size: 'M', color: 'Blanco/Azul', stock: 12 },
        { name: 'L - Blanco/Azul', size: 'L', color: 'Blanco/Azul', stock: 10 },
      ],
    },
    {
      name: 'Short Deportivo Negro',
      description: 'Short deportivo de tela ligera y transpirable. Ideal para entrenamientos y actividades físicas.',
      price: 34.90,
      stock: 38,
      categoryId: productCategories[1].id,
      slug: 'short-deportivo-negro',
      isActive: true,
      images: [
        'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=500',
        'https://images.unsplash.com/photo-1519689680058-324335c77eba?w=500',
      ],
      variants: [
        { name: 'S - Negro', size: 'S', color: 'Negro', stock: 12 },
        { name: 'M - Negro', size: 'M', color: 'Negro', stock: 14 },
        { name: 'L - Negro', size: 'L', color: 'Negro', stock: 12 },
      ],
    },
  ];

  const createdProducts = [];

  // Crear productos con sus imágenes y variantes
  for (const productData of productsData) {
    const { images, variants, ...productInfo } = productData;

    const product = await prisma.product.create({
      data: {
        ...productInfo,
        userId: seller.id,
      },
    });

    // Crear imágenes del producto
    for (let i = 0; i < images.length; i++) {
      await prisma.productImage.create({
        data: {
          productId: product.id,
          url: images[i],
          altText: `${product.name} - Imagen ${i + 1}`,
          order: i,
          isPrimary: i === 0,
        },
      });
    }

    // Crear variantes del producto
    for (const variant of variants) {
      await prisma.productVariant.create({
        data: {
          productId: product.id,
          name: variant.name,
          sku: `${product.slug}-${variant.size}-${variant.color}`
            .toUpperCase()
            .replace(/\s/g, '-')
            .replace(/\//g, '-'),
          stock: variant.stock,
          attributes: {
            size: variant.size,
            color: variant.color,
          },
        },
      });
    }

    createdProducts.push(product);
    console.log(`Created product: ${product.name}`);
  }

  console.log(`✅ Created ${createdProducts.length} products with images and variants`);

  // 7. Crear reseñas para productos y vendedor
  const reviews = [
    {
      productId: createdProducts[0].id,
      customerId: customers[0].id,
      rating: 5,
      comment: '¡Excelente calidad! El polo es muy cómodo y la tela se siente premium. Totalmente recomendado.',
    },
    {
      productId: createdProducts[0].id,
      customerId: customers[1].id,
      rating: 4,
      comment: 'Buena compra, aunque la talla quedó un poco ajustada. El material es de buena calidad.',
    },
    {
      productId: createdProducts[2].id,
      customerId: customers[2].id,
      rating: 5,
      comment: 'El jean es perfecto, muy buen fit y la tela es resistente. Llegó rápido y bien empacado.',
    },
    {
      productId: createdProducts[4].id,
      customerId: customers[3].id,
      rating: 5,
      comment: 'Las zapatillas son super cómodas, perfectas para todo el día. El envío fue rapidísimo.',
    },
    {
      productId: createdProducts[4].id,
      customerId: customers[0].id,
      rating: 4,
      comment: 'Muy buenas zapatillas, solo que esperaba que fueran un poco más blancas. Pero en general están bien.',
    },
    {
      productId: createdProducts[7].id,
      customerId: customers[4].id,
      rating: 5,
      comment: 'La chompa es exactamente lo que buscaba. Muy abrigadora y el material es de calidad.',
    },
    {
      productId: createdProducts[1].id,
      customerId: customers[2].id,
      rating: 5,
      comment: 'Me encantó el polo oversize, el corte es perfecto y la tela es suave. Compraré más colores.',
    },
    {
      productId: createdProducts[6].id,
      customerId: customers[1].id,
      rating: 4,
      comment: 'Bonita casaca, aunque es un poco gruesa para Lima. Pero para el invierno está perfecta.',
    },
    // Reseñas generales al vendedor (sin producto específico)
    {
      productId: null,
      customerId: customers[0].id,
      rating: 5,
      comment: 'Excelente vendedor, responde rápido y el envío fue super rápido. Muy recomendado.',
    },
    {
      productId: null,
      customerId: customers[3].id,
      rating: 5,
      comment: 'Primera vez que compro aquí y todo perfecto. La atención fue excelente y los productos de calidad.',
    },
    {
      productId: null,
      customerId: customers[4].id,
      rating: 4,
      comment: 'Buena tienda, productos de calidad. Solo mejoraría los tiempos de respuesta en WhatsApp.',
    },
  ];

  for (const reviewData of reviews) {
    await prisma.review.create({
      data: {
        ...reviewData,
        sellerId: seller.id,
      },
    });
  }

  console.log(`✅ Created ${reviews.length} reviews`);

  console.log('');
  console.log('🎉 Seed completed successfully!');
  console.log('');
  console.log('CREDENCIALES:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('👤 ADMIN:');
  console.log('   Email: admin@qhatu.pe');
  console.log('   Password: Admin123!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('👤 VENDEDOR:');
  console.log('   Email: juan@example.com');
  console.log('   Password: Password123!');
  console.log('   Tienda: Ropa Moda Perú');
  console.log('   Productos: 10 productos de ropa');
  console.log('   Reseñas: 11 reseñas (8 productos + 3 tienda)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('👥 CLIENTES (para testing):');
  console.log('   maria@example.com');
  console.log('   carlos@example.com');
  console.log('   ana@example.com');
  console.log('   luis@example.com');
  console.log('   sofia@example.com');
  console.log('   Password: Password123! (todos)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('💡 Para resetear la base de datos usa:');
  console.log('   npx prisma migrate reset');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });