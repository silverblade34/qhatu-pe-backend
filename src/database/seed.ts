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
    await prisma.category.deleteMany();
    await prisma.user.deleteMany();
    console.log('Database cleaned');
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

  // 2. Crear categorías
  const categories = await Promise.all([
    prisma.category.create({
      data: {
        name: 'Ropa',
        slug: 'ropa',
        description: 'Prendas de vestir',
        icon: '👕',
      },
    }),
    prisma.category.create({
      data: {
        name: 'Tecnología',
        slug: 'tecnologia',
        description: 'Dispositivos electrónicos',
        icon: '💻',
      },
    }),
    prisma.category.create({
      data: {
        name: 'Hogar',
        slug: 'hogar',
        description: 'Artículos para el hogar',
        icon: '🏠',
      },
    }),
    prisma.category.create({
      data: {
        name: 'Alimentos',
        slug: 'alimentos',
        description: 'Comida y bebidas',
        icon: '🍕',
      },
    }),
    prisma.category.create({
      data: {
        name: 'Accesorios',
        slug: 'accesorios',
        description: 'Complementos y accesorios',
        icon: '👜',
      },
    }),
  ]);

  console.log(`Created ${categories.length} categories`);

  // 3. Crear usuarios vendedores de prueba
  const hashedPassword = await bcrypt.hash('Password123!', 10);

  const user1 = await prisma.user.create({
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
          banner: 'https://via.placeholder.com/1200x400',
          isActive: true,
          badges: ['VERIFICADO', 'TOP_SELLER'],
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

  console.log(`Created 1 seller user`);

  // ... resto del seed (productos, órdenes, etc.)

  console.log('Seed completed successfully!');
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
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });