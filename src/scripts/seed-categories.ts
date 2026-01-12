// prisma/seeders/seed-categories.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedCategories() {
  console.log('🌱 Seeding categories...');

  const categories = [
    {
      name: 'Moda y Accesorios',
      description: 'Ropa, calzado, accesorios y joyería',
    },
    {
      name: 'Tecnología y Electrónica',
      description: 'Celulares, gadgets, computación y accesorios',
    },
    {
      name: 'Hogar y Decoración',
      description: 'Muebles, decoración, iluminación y menaje',
    },
    {
      name: 'Construcción y Ferretería',
      description: 'Mayólicas, herramientas, acabados y materiales',
    },
    {
      name: 'Alimentos y Bebidas',
      description: 'Comida, bebidas, snacks y productos artesanales',
    },
    {
      name: 'Belleza y Cuidado Personal',
      description: 'Maquillaje, skincare, barbería y estética',
    },
    {
      name: 'Salud y Bienestar',
      description: 'Suplementos, fitness, productos naturales',
    },
    {
      name: 'Bebés y Niños',
      description: 'Ropa, juguetes, artículos infantiles',
    },
    {
      name: 'Mascotas',
      description: 'Alimentos, accesorios y cuidado para mascotas',
    },
    {
      name: 'Vehículos y Accesorios',
      description: 'Repuestos, accesorios y productos automotrices',
    },
    {
      name: 'Papelería y Oficina',
      description: 'Útiles, impresiones y artículos de oficina',
    },
    {
      name: 'Artesanías y Hecho a Mano',
      description: 'Productos artesanales y personalizados',
    },
    {
      name: 'Servicios',
      description: 'Servicios profesionales, técnicos o digitales',
    },
    {
      name: 'Coleccionables y Cultura Geek',
      description: 'Funkos, figuras, anime, gaming y merchandising friki',
    },
    {
      name: 'Otros',
      description: 'Productos no clasificados en otras categorías',
    },
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: {
        description: category.description,
      },
      create: {
        name: category.name,
        description: category.description,
      },
    });
  }

  console.log(`✅ Created/Updated ${categories.length} categories`);
}

// Ejecutar si se llama directamente
if (require.main === module) {
  seedCategories()
    .catch((e) => {
      console.error('❌ Category seed failed:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}