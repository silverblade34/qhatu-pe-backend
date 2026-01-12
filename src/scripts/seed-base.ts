// prisma/seed.ts
import { PrismaClient, Plan } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed - 20 Sellers...');

  // ============================================
  // LIMPIAR DATOS EXISTENTES
  // ============================================
  console.log('🧹 Cleaning existing data...');

  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.review.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.banner.deleteMany();
  await prisma.socialLink.deleteMany();
  await prisma.storeProfile.deleteMany();
  await prisma.productCategory.deleteMany();

  // Eliminar usuarios excepto admin
  await prisma.user.deleteMany({
    where: {
      role: { not: 'ADMIN' }
    }
  });

  console.log('✅ Database cleaned');

  // ============================================
  // VERIFICAR/CREAR ADMIN
  // ============================================
  let admin = await prisma.user.findUnique({
    where: { email: 'admin@qhatu.pe' },
  });

  if (!admin) {
    const hashedAdminPassword = await bcrypt.hash('Admin123!', 10);
    admin = await prisma.user.create({
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
    console.log('✅ Created admin user');
  } else {
    console.log('✅ Admin user already exists');
  }

  // ============================================
  // OBTENER CATEGORÍAS EXISTENTES
  // ============================================
  const categories = await prisma.category.findMany();
  console.log(`📁 Found ${categories.length} categories`);

  if (categories.length === 0) {
    console.error('❌ No categories found. Please run seed-categories first.');
    return;
  }

  // ============================================
  // DATOS DE VENDEDORES
  // ============================================
  const hashedPassword = await bcrypt.hash('Password123!', 10);

  const sellersData = [
    {
      email: 'moda@boutique.pe',
      username: 'boutique_moda',
      fullName: 'Sofia Boutique',
      phone: '+51987654321',
      plan: Plan.PREMIUM,
      store: {
        storeName: 'Boutique Sofia',
        bio: '👗 Moda femenina exclusiva | Envíos a todo Lima 🚚',
        categoryName: 'Moda y Accesorios',
        badges: ['VERIFICADO', 'TOP_SELLER'],
        socialLinks: [
          { platform: 'INSTAGRAM', url: 'https://instagram.com/boutique_sofia' },
          { platform: 'TIKTOK', url: 'https://tiktok.com/@boutique_sofia' }
        ]
      },
      products: [
        { name: 'Vestido Casual Primavera', price: 89.90, stock: 25 },
        { name: 'Blusa Elegante Seda', price: 69.90, stock: 30 },
        { name: 'Falda Midi Plisada', price: 59.90, stock: 20 }
      ]
    },
    {
      email: 'tech@gadgets.pe',
      username: 'tech_gadgets',
      fullName: 'Carlos Tech Store',
      phone: '+51976543210',
      plan: Plan.PRO,
      store: {
        storeName: 'Tech Gadgets Perú',
        bio: '📱 Tecnología de última generación | Garantía oficial ✅',
        categoryName: 'Tecnología y Electrónica',
        badges: ['VERIFICADO'],
        socialLinks: [
          { platform: 'FACEBOOK', url: 'https://facebook.com/techgadgets' },
          { platform: 'WHATSAPP', url: 'https://wa.me/51976543210' }
        ]
      },
      products: [
        { name: 'Auriculares Bluetooth Pro', price: 149.90, stock: 40 },
        { name: 'Smartwatch Series 5', price: 299.90, stock: 15 },
        { name: 'Power Bank 20000mAh', price: 79.90, stock: 50 }
      ]
    },
    {
      email: 'hogar@deco.pe',
      username: 'hogar_deco',
      fullName: 'María Decoración',
      phone: '+51965432109',
      plan: Plan.BASIC,
      store: {
        storeName: 'Hogar & Deco',
        bio: '🏠 Transforma tu hogar con estilo | Decoración moderna',
        categoryName: 'Hogar y Decoración',
        badges: [],
        socialLinks: [
          { platform: 'INSTAGRAM', url: 'https://instagram.com/hogar_deco' }
        ]
      },
      products: [
        { name: 'Cojín Decorativo Velvet', price: 34.90, stock: 60 },
        { name: 'Lámpara Mesa Moderna', price: 89.90, stock: 20 },
        { name: 'Espejo Redondo Dorado', price: 119.90, stock: 15 }
      ]
    },
    {
      email: 'ferreteria@construye.pe',
      username: 'ferreteria_total',
      fullName: 'Roberto Ferretería',
      phone: '+51954321098',
      plan: Plan.PRO,
      store: {
        storeName: 'Ferretería Total',
        bio: '🔨 Todo para construcción | Precios mayoristas',
        categoryName: 'Construcción y Ferretería',
        badges: ['VERIFICADO'],
        socialLinks: [
          { platform: 'WHATSAPP', url: 'https://wa.me/51954321098' }
        ]
      },
      products: [
        { name: 'Mayólica Blanco Brillante', price: 24.90, stock: 100 },
        { name: 'Taladro Percutor 600W', price: 189.90, stock: 12 },
        { name: 'Set Herramientas 50 pzs', price: 159.90, stock: 25 }
      ]
    },
    {
      email: 'alimentos@naturales.pe',
      username: 'naturales_pe',
      fullName: 'Ana Alimentos Naturales',
      phone: '+51943210987',
      plan: Plan.PREMIUM,
      store: {
        storeName: 'Naturales Perú',
        bio: '🌿 Alimentos orgánicos y saludables | 100% natural',
        categoryName: 'Alimentos y Bebidas',
        badges: ['VERIFICADO', 'ECO_FRIENDLY'],
        socialLinks: [
          { platform: 'INSTAGRAM', url: 'https://instagram.com/naturales_pe' },
          { platform: 'FACEBOOK', url: 'https://facebook.com/naturalespe' }
        ]
      },
      products: [
        { name: 'Quinoa Orgánica 500g', price: 18.90, stock: 80 },
        { name: 'Miel de Abeja Pura 250g', price: 24.90, stock: 50 },
        { name: 'Mix Frutos Secos 200g', price: 15.90, stock: 100 }
      ]
    },
    {
      email: 'belleza@makeup.pe',
      username: 'makeup_studio',
      fullName: 'Valentina Beauty',
      phone: '+51932109876',
      plan: Plan.PRO,
      store: {
        storeName: 'Makeup Studio',
        bio: '💄 Productos de belleza importados | Calidad garantizada',
        categoryName: 'Belleza y Cuidado Personal',
        badges: ['VERIFICADO', 'PREMIUM_QUALITY'],
        socialLinks: [
          { platform: 'INSTAGRAM', url: 'https://instagram.com/makeup_studio' },
          { platform: 'TIKTOK', url: 'https://tiktok.com/@makeup_studio' }
        ]
      },
      products: [
        { name: 'Set Brochas Profesional', price: 89.90, stock: 35 },
        { name: 'Paleta Sombras Neutras', price: 69.90, stock: 40 },
        { name: 'Labial Mate Larga Duración', price: 39.90, stock: 60 }
      ]
    },
    {
      email: 'fitness@gym.pe',
      username: 'fitness_store',
      fullName: 'Diego Fitness',
      phone: '+51921098765',
      plan: Plan.BASIC,
      store: {
        storeName: 'Fitness Store',
        bio: '💪 Suplementos y accesorios deportivos | Resultados reales',
        categoryName: 'Salud y Bienestar',
        badges: [],
        socialLinks: [
          { platform: 'INSTAGRAM', url: 'https://instagram.com/fitness_store' }
        ]
      },
      products: [
        { name: 'Proteína Whey 2kg', price: 149.90, stock: 30 },
        { name: 'Creatina Monohidrato 300g', price: 79.90, stock: 45 },
        { name: 'Shaker Premium 600ml', price: 24.90, stock: 70 }
      ]
    },
    {
      email: 'bebes@kids.pe',
      username: 'kids_world',
      fullName: 'Patricia Kids',
      phone: '+51910987654',
      plan: Plan.PRO,
      store: {
        storeName: 'Kids World',
        bio: '👶 Todo para tu bebé | Productos seguros y certificados',
        categoryName: 'Bebés y Niños',
        badges: ['VERIFICADO'],
        socialLinks: [
          { platform: 'FACEBOOK', url: 'https://facebook.com/kidsworld' },
          { platform: 'WHATSAPP', url: 'https://wa.me/51910987654' }
        ]
      },
      products: [
        { name: 'Pañales Ecológicos Pack 40', price: 39.90, stock: 100 },
        { name: 'Biberón Anticólico 260ml', price: 29.90, stock: 60 },
        { name: 'Juguete Didáctico Madera', price: 49.90, stock: 40 }
      ]
    },
    {
      email: 'mascotas@pet.pe',
      username: 'pet_lovers',
      fullName: 'Luis Mascotas',
      phone: '+51909876543',
      plan: Plan.PREMIUM,
      store: {
        storeName: 'Pet Lovers',
        bio: '🐕 Productos premium para mascotas | Amor animal 🐈',
        categoryName: 'Mascotas',
        badges: ['VERIFICADO', 'PET_FRIENDLY'],
        socialLinks: [
          { platform: 'INSTAGRAM', url: 'https://instagram.com/pet_lovers' },
          { platform: 'TIKTOK', url: 'https://tiktok.com/@pet_lovers' }
        ]
      },
      products: [
        { name: 'Alimento Premium Perros 15kg', price: 189.90, stock: 40 },
        { name: 'Cama Suave Gatos', price: 79.90, stock: 25 },
        { name: 'Juguete Interactivo', price: 34.90, stock: 50 }
      ]
    },
    {
      email: 'autos@repuestos.pe',
      username: 'auto_parts',
      fullName: 'Fernando Repuestos',
      phone: '+51998765432',
      plan: Plan.BASIC,
      store: {
        storeName: 'Auto Parts Perú',
        bio: '🚗 Repuestos originales y alternativos | Envíos rápidos',
        categoryName: 'Vehículos y Accesorios',
        badges: [],
        socialLinks: [
          { platform: 'WHATSAPP', url: 'https://wa.me/51998765432' }
        ]
      },
      products: [
        { name: 'Aceite Motor Sintético 5W30', price: 89.90, stock: 60 },
        { name: 'Filtro Aire Universal', price: 24.90, stock: 80 },
        { name: 'Limpiaparabrisas Premium', price: 34.90, stock: 70 }
      ]
    },
    {
      email: 'papeleria@office.pe',
      username: 'office_supply',
      fullName: 'Carmen Papelería',
      phone: '+51987654321',
      plan: Plan.PRO,
      store: {
        storeName: 'Office Supply',
        bio: '📚 Útiles escolares y de oficina | Mejores precios',
        categoryName: 'Papelería y Oficina',
        badges: ['VERIFICADO'],
        socialLinks: [
          { platform: 'FACEBOOK', url: 'https://facebook.com/officesupply' }
        ]
      },
      products: [
        { name: 'Cuaderno Universitario x5', price: 19.90, stock: 120 },
        { name: 'Set Lapiceros 12 colores', price: 14.90, stock: 90 },
        { name: 'Archivador Palanca A4', price: 12.90, stock: 100 }
      ]
    },
    {
      email: 'artesania@hecho.pe',
      username: 'arte_mano',
      fullName: 'Rosa Artesanía',
      phone: '+51976543219',
      plan: Plan.BASIC,
      store: {
        storeName: 'Arte a Mano',
        bio: '🎨 Artesanías peruanas únicas | Hecho con amor',
        categoryName: 'Artesanías y Hecho a Mano',
        badges: ['ARTESANAL'],
        socialLinks: [
          { platform: 'INSTAGRAM', url: 'https://instagram.com/arte_mano' }
        ]
      },
      products: [
        { name: 'Tapiz Andino Hecho a Mano', price: 159.90, stock: 12 },
        { name: 'Cerámica Chulucanas', price: 89.90, stock: 18 },
        { name: 'Collar Semillas Tagua', price: 49.90, stock: 25 }
      ]
    },
    {
      email: 'friki@geek.pe',
      username: 'friki_store',
      fullName: 'Miguel Geek',
      phone: '+51965432198',
      plan: Plan.PREMIUM,
      store: {
        storeName: 'Friki Store',
        bio: '🎮 Funkos, anime, gaming | Paraíso geek',
        categoryName: 'Coleccionables y Cultura Geek',
        badges: ['VERIFICADO', 'COLLECTOR'],
        socialLinks: [
          { platform: 'INSTAGRAM', url: 'https://instagram.com/friki_store' },
          { platform: 'TIKTOK', url: 'https://tiktok.com/@friki_store' },
          { platform: 'FACEBOOK', url: 'https://facebook.com/frikistore' }
        ]
      },
      products: [
        { name: 'Funko Pop Naruto', price: 79.90, stock: 30 },
        { name: 'Figura Goku Super Saiyan', price: 149.90, stock: 15 },
        { name: 'Póster Anime A3', price: 24.90, stock: 50 }
      ]
    },
    {
      email: 'zapatos@calzado.pe',
      username: 'zapatos_moda',
      fullName: 'Andrea Calzado',
      phone: '+51954321987',
      plan: Plan.PRO,
      store: {
        storeName: 'Zapatos & Moda',
        bio: '👠 Calzado de tendencia | Comodidad y estilo',
        categoryName: 'Moda y Accesorios',
        badges: ['VERIFICADO'],
        socialLinks: [
          { platform: 'INSTAGRAM', url: 'https://instagram.com/zapatos_moda' }
        ]
      },
      products: [
        { name: 'Zapatillas Urbanas Blancas', price: 129.90, stock: 40 },
        { name: 'Botas Cuero Mujer', price: 189.90, stock: 20 },
        { name: 'Sandalias Verano', price: 69.90, stock: 35 }
      ]
    },
    {
      email: 'libros@leer.pe',
      username: 'libreria_central',
      fullName: 'Ricardo Libros',
      phone: '+51943219876',
      plan: Plan.BASIC,
      store: {
        storeName: 'Librería Central',
        bio: '📖 Libros nuevos y usados | Cultura al alcance de todos',
        categoryName: 'Papelería y Oficina',
        badges: [],
        socialLinks: [
          { platform: 'FACEBOOK', url: 'https://facebook.com/libreriacentral' }
        ]
      },
      products: [
        { name: 'Libro Best Seller Ficción', price: 49.90, stock: 30 },
        { name: 'Novela Clásica Literatura', price: 39.90, stock: 25 },
        { name: 'Libro Autoayuda Popular', price: 44.90, stock: 35 }
      ]
    },
    {
      email: 'joyeria@oro.pe',
      username: 'joyeria_luna',
      fullName: 'Lucia Joyería',
      phone: '+51932198765',
      plan: Plan.PREMIUM,
      store: {
        storeName: 'Joyería Luna',
        bio: '💎 Joyas de plata 925 | Diseños exclusivos',
        categoryName: 'Moda y Accesorios',
        badges: ['VERIFICADO', 'PREMIUM_QUALITY'],
        socialLinks: [
          { platform: 'INSTAGRAM', url: 'https://instagram.com/joyeria_luna' },
          { platform: 'FACEBOOK', url: 'https://facebook.com/joyerialuna' }
        ]
      },
      products: [
        { name: 'Anillo Plata 925 Zirconia', price: 89.90, stock: 20 },
        { name: 'Collar Corazón Plata', price: 129.90, stock: 15 },
        { name: 'Aretes Colgantes Elegantes', price: 79.90, stock: 25 }
      ]
    },
    {
      email: 'plantas@verde.pe',
      username: 'plantas_verde',
      fullName: 'Jorge Plantas',
      phone: '+51921987654',
      plan: Plan.BASIC,
      store: {
        storeName: 'Plantas Verde',
        bio: '🌱 Plantas ornamentales y suculentas | Verde en casa',
        categoryName: 'Hogar y Decoración',
        badges: ['ECO_FRIENDLY'],
        socialLinks: [
          { platform: 'INSTAGRAM', url: 'https://instagram.com/plantas_verde' }
        ]
      },
      products: [
        { name: 'Suculenta Variada Maceta', price: 19.90, stock: 80 },
        { name: 'Planta Monstera 30cm', price: 49.90, stock: 30 },
        { name: 'Cactus Mini Decorativo', price: 14.90, stock: 100 }
      ]
    },
    {
      email: 'cafe@gourmet.pe',
      username: 'cafe_gourmet',
      fullName: 'Alberto Café',
      phone: '+51910987654',
      plan: Plan.PRO,
      store: {
        storeName: 'Café Gourmet Perú',
        bio: '☕ Café peruano de altura | Grano seleccionado',
        categoryName: 'Alimentos y Bebidas',
        badges: ['VERIFICADO', 'PRODUCTO_NACIONAL'],
        socialLinks: [
          { platform: 'INSTAGRAM', url: 'https://instagram.com/cafe_gourmet' },
          { platform: 'WHATSAPP', url: 'https://wa.me/51910987654' }
        ]
      },
      products: [
        { name: 'Café Tostado Molido 250g', price: 29.90, stock: 60 },
        { name: 'Café en Grano Premium 500g', price: 54.90, stock: 40 },
        { name: 'Café Instantáneo Orgánico', price: 19.90, stock: 70 }
      ]
    },
    {
      email: 'electrohogar@tienda.pe',
      username: 'electrohogar',
      fullName: 'Sandra Electrodomésticos',
      phone: '+51909876543',
      plan: Plan.PRO,
      store: {
        storeName: 'Electrohogar',
        bio: '⚡ Electrodomésticos para tu hogar | Garantía oficial',
        categoryName: 'Hogar y Decoración',
        badges: ['VERIFICADO'],
        socialLinks: [
          { platform: 'FACEBOOK', url: 'https://facebook.com/electrohogar' },
          { platform: 'WHATSAPP', url: 'https://wa.me/51909876543' }
        ]
      },
      products: [
        { name: 'Licuadora 600W 3 Velocidades', price: 129.90, stock: 25 },
        { name: 'Plancha Vapor 1800W', price: 89.90, stock: 30 },
        { name: 'Ventilador Torre 3 Aspas', price: 179.90, stock: 15 }
      ]
    },
    {
      email: 'deportes@sport.pe',
      username: 'deportes_pro',
      fullName: 'Gustavo Deportes',
      phone: '+51998765432',
      plan: Plan.PREMIUM,
      store: {
        storeName: 'Deportes Pro',
        bio: '⚽ Artículos deportivos profesionales | Todo deporte',
        categoryName: 'Salud y Bienestar',
        badges: ['VERIFICADO', 'DEPORTE_PRO'],
        socialLinks: [
          { platform: 'INSTAGRAM', url: 'https://instagram.com/deportes_pro' },
          { platform: 'TIKTOK', url: 'https://tiktok.com/@deportes_pro' }
        ]
      },
      products: [
        { name: 'Balón Fútbol Profesional', price: 89.90, stock: 35 },
        { name: 'Pesas Mancuernas 5kg Par', price: 79.90, stock: 40 },
        { name: 'Colchoneta Yoga Premium', price: 69.90, stock: 45 }
      ]
    }
  ];

  // ============================================
  // CREAR VENDEDORES CON DATOS COMPLETOS
  // ============================================
  console.log('\n👥 Creating 20 sellers with complete data...\n');

  for (const sellerData of sellersData) {
    // Buscar categoría
    const category = categories.find(c => c.name === sellerData.store.categoryName);

    if (!category) {
      console.log(`⚠️  Category not found: ${sellerData.store.categoryName}, skipping...`);
      continue;
    }

    // Crear usuario vendedor
    const seller = await prisma.user.create({
      data: {
        email: sellerData.email,
        username: sellerData.username,
        password: hashedPassword,
        fullName: sellerData.fullName,
        phone: sellerData.phone,
        plan: sellerData.plan,
        role: 'SELLER',
        isVerified: true,
      },
    });

    // Crear perfil de tienda
    const storeProfile = await prisma.storeProfile.create({
      data: {
        userId: seller.id,
        storeName: sellerData.store.storeName,
        bio: sellerData.store.bio,
        phone: sellerData.phone,
        logo: `https://api.dicebear.com/7.x/initials/svg?seed=${sellerData.fullName.replace(' ', '')}`,
        isActive: true,
        badges: sellerData.store.badges,
        categoryId: category.id,
      },
    });

    // Crear social links
    for (const link of sellerData.store.socialLinks) {
      await prisma.socialLink.create({
        data: {
          storeProfileId: storeProfile.id,
          platform: link.platform,
          url: link.url,
          order: sellerData.store.socialLinks.indexOf(link),
        },
      });
    }

    // Crear categoría de productos
    const productCategory = await prisma.productCategory.create({
      data: {
        userId: seller.id,
        name: 'General',
        slug: 'general',
        description: 'Productos generales',
        icon: '📦',
        order: 0,
      },
    });

    // Crear productos
    for (const productData of sellerData.products) {
      const product = await prisma.product.create({
        data: {
          userId: seller.id,
          name: productData.name,
          description: `${productData.name} de alta calidad. Producto disponible para entrega inmediata.`,
          price: productData.price,
          stock: productData.stock,
          categoryId: productCategory.id,
          slug: productData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
          isActive: true,
          isFeatured: Math.random() > 0.7,
        },
      });

      // Crear imagen del producto
      await prisma.productImage.create({
        data: {
          productId: product.id,
          url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500',
          altText: `${product.name} - Imagen principal`,
          order: 0,
          isPrimary: true,
        },
      });

      // Crear variantes (tallas o colores)
      const variants = ['S', 'M', 'L'];
      for (const size of variants) {
        await prisma.productVariant.create({
          data: {
            productId: product.id,
            name: `Talla ${size}`,
            sku: `${product.slug}-${size}`.toUpperCase(),
            stock: Math.floor(productData.stock / 3),
            attributes: { size },
          },
        });
      }
    }

    // Crear cupón de descuento
    await prisma.coupon.create({
      data: {
        userId: seller.id,
        code: `${sellerData.username.toUpperCase()}10`,
        discountType: 'PERCENTAGE',
        discountValue: 10,
        minPurchase: 50,
        maxDiscount: 30,
        usageLimit: 100,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
        status: 'ACTIVE',
      },
    });

    // Crear banner promocional
    await prisma.banner.create({
      data: {
        storeProfileId: storeProfile.id,
        title: `¡Ofertas especiales en ${sellerData.store.storeName}!`,
        description: 'No te pierdas nuestras promociones',
        imageDesktop: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1920',
        imageMobile: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=750',
        type: 'PROMOTIONAL',
        isActive: true,
        order: 0,
      },
    });

    console.log(`✅ Created seller: ${sellerData.store.storeName} (@${sellerData.username}) - Plan: ${sellerData.plan}`);
  }

  console.log('\n🎉 Seed completed successfully!\n');
  console.log('CREDENCIALES:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('👤 ADMIN:');
  console.log('   Email: admin@qhatu.pe');
  console.log('   Password: Admin123!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('👥 VENDEDORES (20):');
  console.log('   Password para todos: Password123!');
  console.log('');
  console.log('   Emails de vendedores:');
  sellersData.forEach((s, i) => {
    console.log(`   ${i + 1}. ${s.email} - ${s.store.storeName} (${s.plan})`);
  });
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n📊 Resumen:');
  console.log(`   - 20 vendedores creados`);
  console.log(`   - 60 productos totales (3 por vendedor)`);
  console.log(`   - 180 variantes de productos`);
  console.log(`   - 20 cupones de descuento`);
  console.log(`   - 20 banners promocionales`);
  console.log(`   - Planes: BASIC, PRO y PREMIUM`);
  console.log('\n💡 Para ejecutar: npx tsx prisma/seed.ts');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });