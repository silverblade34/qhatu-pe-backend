import { createAvatar } from '@dicebear/core';
import * as adventurer from '@dicebear/adventurer';
import * as avataaars from '@dicebear/avataaars';
import * as bottts from '@dicebear/bottts';
import * as lorelei from '@dicebear/lorelei';
import * as personas from '@dicebear/personas';
import * as shapes from '@dicebear/shapes';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// Configuración de MinIO
const s3Client = new S3Client({
  endpoint: process.env.S3_ENDPOINT || 'http://147.182.161.84:9000',
  region: process.env.S3_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || 'yachay',
    secretAccessKey: process.env.S3_SECRET_KEY || 'Yachay8*',
  },
  forcePathStyle: true,
});

const BUCKET_NAME = 'avatars';
const PUBLIC_URL = process.env.S3_PUBLIC_URL || 'https://api.minio.s3.maquiadev.com';

// Estilos disponibles - FIX: Importar correctamente
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
  'Alex', 'Sam', 'Jordan', 'Taylor', 'Morgan',
  'Casey', 'Riley', 'Quinn', 'Avery', 'Dakota',
  'Skyler', 'Sage', 'River', 'Phoenix', 'Rowan',
  'Blake', 'Charlie', 'Drew', 'Finley', 'Harper',
];

const backgroundColors = [
  '6366f1', 'ec4899', '8b5cf6', 'f59e0b', 
  '10b981', '06b6d4', 'ef4444', '14b8a6',
];

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
    ACL: 'public-read',
  });

  await s3Client.send(command);
  return `${PUBLIC_URL}/${BUCKET_NAME}/${filename}`;
}

async function generateAndUploadAvatars(): Promise<GeneratedAvatar[]> {
  const allAvatars: GeneratedAvatar[] = [];
  let count = 0;

  console.log('🎨 Iniciando generación de avatares...\n');

  for (const [styleName, styleCollection] of Object.entries(styles)) {
    console.log(`📦 Procesando estilo: ${styleName}`);
    
    for (const seed of seeds) {
      for (const bgColor of backgroundColors) {
        // FIX: Crear avatar correctamente
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
    ACL: 'public-read',
  });

  await s3Client.send(command);
  
  console.log('\n📋 Catálogo guardado en MinIO');
  console.log(`URL: ${PUBLIC_URL}/${BUCKET_NAME}/catalog.json`);
}

async function main() {
  try {
    const avatars = await generateAndUploadAvatars();
    await saveCatalog(avatars);
    
    console.log('\n✅ Proceso completado exitosamente');
  } catch (error) {
    console.error('❌ Error en el proceso:', error);
    process.exit(1);
  }
}

main();