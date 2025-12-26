import { createAvatar } from '@dicebear/core';
import * as adventurer from '@dicebear/adventurer';
import * as avataaars from '@dicebear/avataaars';
import * as bottts from '@dicebear/bottts';
import * as lorelei from '@dicebear/lorelei';
import * as personas from '@dicebear/personas';
import * as shapes from '@dicebear/shapes';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

// Configuración de Cloudflare R2
const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY!,
    secretAccessKey: process.env.R2_SECRET_KEY!,
  },
  forcePathStyle: false, // R2 no requiere path style
});

const BUCKET_NAME = process.env.R2_BUCKET_AVATARS || 'qhatupe-avatars';
const PUBLIC_URL = process.env.R2_PUBLIC_URL_AVATARS || 'https://cdn.qhatupe.com';

// Estilos disponibles
const styles = {
  adventurer: adventurer,
  avataaars: avataaars,
  bottts: bottts,
  lorelei: lorelei,
  personas: personas,
  shapes: shapes,
};

const styleMetadata = {
  adventurer: {
    name: 'Adventurer',
    description: 'Avatar de aventurero estilo cartoon',
    recommended: 'Para perfiles dinámicos y juveniles',
  },
  avataaars: {
    name: 'Avataaars',
    description: 'Personaje cartoon estilo diseño moderno',
    recommended: 'Para clientes y usuarios casuales',
  },
  bottts: {
    name: 'Bottts',
    description: 'Robot cute y divertido',
    recommended: 'Para cuentas tech o gaming',
  },
  lorelei: {
    name: 'Lorelei',
    description: 'Avatar femenino ilustrado minimalista',
    recommended: 'Para perfiles femeninos',
  },
  personas: {
    name: 'Personas',
    description: 'Avatar realista de personas',
    recommended: 'Para perfiles profesionales',
  },
  shapes: {
    name: 'Shapes',
    description: 'Formas geométricas abstractas',
    recommended: 'Para cuentas minimalistas',
  },
};

// Seeds para generar variedad
const seeds = [
  'Alex', 'Sam', 'Taylor', 'Jordan', 'Morgan',
  'Riley', 'Avery', 'Blake',
]; // 8

const backgroundColors = [
  '6366f1', 'ec4899', '10b981', 'f59e0b',
]; // 4

interface GeneratedAvatar {
  id: string;
  style: string;
  seed: string;
  url: string;
  backgroundColor: string;
}

async function uploadAvatar(svg: string, filename: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: filename,
    Body: Buffer.from(svg),
    ContentType: 'image/svg+xml',
    // R2 no usa ACL de la misma forma que S3
  });

  await s3Client.send(command);

  // Retornar URL pública
  return `${PUBLIC_URL}/${filename}`;
}

async function generateAndUploadAvatars(): Promise<GeneratedAvatar[]> {
  const allAvatars: GeneratedAvatar[] = [];
  let count = 0;

  console.log('🎨 Iniciando generación de avatares para R2...\n');

  for (const [styleName, styleCollection] of Object.entries(styles)) {
    console.log(`📦 Procesando estilo: ${styleName}`);

    for (const seed of seeds) {
      for (const bgColor of backgroundColors) {
        const avatar = createAvatar(styleCollection as any, {
          seed: `${seed}-${bgColor}`,
          size: 200,
        });

        const svg = avatar.toString();
        const filename = `${styleName}/${seed.toLowerCase()}-${bgColor}.svg`;

        try {
          const url = await uploadAvatar(svg, filename);

          allAvatars.push({
            id: `${styleName}-${seed.toLowerCase()}-${bgColor}`,
            style: styleName,
            seed,
            url,
            backgroundColor: bgColor,
          });

          count++;

          if (count % 10 === 0) {
            console.log(`   ✅ ${count} avatares generados...`);
          }
        } catch (error) {
          console.error(`   ❌ Error subiendo ${filename}:`, error.message);
        }
      }
    }

    console.log(`✨ Completado: ${styleName}\n`);
  }

  console.log(`\n🎉 Total de avatares generados: ${allAvatars.length}`);
  return allAvatars;
}

async function saveCatalog(avatars: GeneratedAvatar[]) {
  const catalog = {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    totalAvatars: avatars.length,
    styles: Object.keys(styles).map(style => ({
      id: style,
      ...styleMetadata[style],
      count: avatars.filter(a => a.style === style).length,
    })),
    avatars,
  };

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: 'catalog.json',
    Body: JSON.stringify(catalog, null, 2),
    ContentType: 'application/json',
  });

  await s3Client.send(command);

  console.log('\n📋 Catálogo guardado en R2');
  console.log(`URL: ${PUBLIC_URL}/catalog.json`);
}

async function main() {
  console.log('🚀 Configuración:');
  console.log(`   Endpoint: ${process.env.R2_ENDPOINT}`);
  console.log(`   Bucket: ${BUCKET_NAME}`);
  console.log(`   Public URL: ${PUBLIC_URL}\n`);

  try {
    const avatars = await generateAndUploadAvatars();
    await saveCatalog(avatars);

    console.log('\n✅ Proceso completado exitosamente');
    console.log(`\n📊 Resumen:`);
    console.log(`   Total avatares: ${avatars.length}`);
    console.log(`   Estilos: ${Object.keys(styles).length}`);
    console.log(`   URL catálogo: ${PUBLIC_URL}/catalog.json`);
  } catch (error) {
    console.error('❌ Error en el proceso:', error);
    process.exit(1);
  }
}

main();