# <img src="https://nestjs.com/img/logo-small.svg" alt="NestJS Logo" width="48" align="center" /> QhatuPE — Backend API

> **Motor API REST de alto rendimiento y arquitectura robusta para la gestión de catálogos e-commerce conversacionales.**
> Edificado sobre NestJS, TypeScript, Prisma ORM, WebSockets, y servicios en la nube para garantizar una experiencia en tiempo real y escalable.

---

## 🏗️ Descripción General y Arquitectura

El backend de **QhatuPE** es una API estructurada bajo principios de diseño de software empresarial, utilizando la inyección de dependencias modular de **NestJS** y tipado estricto en **TypeScript**. La plataforma está diseñada para soportar picos masivos de tráfico provenientes de lives de redes sociales (TikTok/Instagram) mediante caching agresivo, colas y notificaciones asíncronas bidireccionales en tiempo real.

---

## 🚀 Capacidades y Módulos de Ingeniería

El núcleo de la API abarca soluciones de alto nivel para resaltar capacidades de arquitectura y desarrollo de sistemas distribuidos:

### 🎮 1. Eventos en Tiempo Real (Live Sales & WebSockets)
- **Canales Bidireccionales:** Implementado con `@nestjs/websockets` y **Socket.io** para emitir alertas instantáneas a los vendedores cuando un cliente realiza un pedido.
- **Cupones de Live Dinámicos:** Los vendedores pueden activar cupones temporizados en vivo que se reflejan al instante en la tienda de todos los usuarios conectados sin recargar la web.

### 🖼️ 2. Pipeline de Procesamiento de Imágenes Avanzado
- **Conversión de Formatos Móviles:** Integración con `heic-convert` para transformar automáticamente fotografías tomadas con dispositivos iOS (HEIC/HEIF) directamente en el servidor.
- **Optimización Dinámica con Sharp:** Procesamiento asíncrono y redimensionado de imágenes mediante **Sharp**, reduciendo pesos de carga y optimizando resoluciones para la web (WebP/JPEG) antes de subirlas al almacenamiento.
- **Almacenamiento Seguro (AWS S3):** Carga y almacenamiento en la nube usando presigned URLs para cargas seguras directamente desde el cliente.

### ⚡ 3. Estrategia de Caching & Rate Limiting (Redis)
- **Cache Manager y Redis:** Caching de alto rendimiento para endpoints de lectura frecuente (catálogos de productos públicos y configuraciones de tiendas) reduciendo la latencia de respuesta a menos de 10ms.
- **Limitación de Peticiones:** Protección del servidor contra ataques de denegación de servicio (DoS) o fuerza bruta mediante limitadores de tasa integrados y respaldados en memoria caché.

### 🔐 4. Autenticación Robusta y Modular
- **Estrategias con Passport:** Implementación de flujos mixtos que abarcan:
  - **Estrategia Local:** Registro y acceso tradicional usando contraseñas de alta seguridad encriptadas mediante `bcrypt`.
  - **Estrategia JWT:** Generación y validación de tokens JSON Web para mantener sesiones seguras y stateless.
  - **Estrategia Google OAuth:** Autenticación fluida con Google Auth Library y Passport-Google-OAuth20.
- **Flujos de Recuperación:** Servicios de reestablecimiento de contraseña mediante hashes firmados con tiempos de expiración controlados.

### ✉️ 5. Notificaciones Transaccionales Multi-proveedor
- **AWS SES & Resend:** Integración flexible con Amazon Simple Email Service (SES) y la plataforma **Resend** para despachar correos transaccionales rápidos de confirmación de registro, facturación y estados de pedidos.
- **Generador de Avatares Dinámicos:** Módulo interactivo conectado con la biblioteca de **DiceBear Core**, permitiendo autogenerar avatares vectoriales SVG personalizados basados en las iniciales o perfiles de los usuarios registrados.

### 🗃️ 6. Capa de Datos Relacionales (Prisma ORM & PostgreSQL)
- **Modelamiento de Datos:** Base de datos relacional PostgreSQL gestionada elegantemente con **Prisma ORM**, garantizando transacciones seguras (ACID) y consultas optimizadas.
- **Indexación Inteligente:** Índices colocados estratégicamente en columnas críticas (`store_id`, `email`, `user_id`, `order_index`) descritos en `schema.sql` para maximizar el rendimiento.
- **Control de Semillas (Seeders):** Scripts automatizados para poblar base de datos iniciales en desarrollo y producción (`seed:categories`, `seed:plans`, `seed:all`).

---

## 🛠️ Stack Tecnológico & Skills Clave

Este proyecto demuestra conocimientos avanzados de infraestructura, seguridad y diseño de APIs:

- **NestJS Core:** Módulos, Controladores, Servicios, Pipes de validación global y Guards de autorización.
- **Prisma Client:** Consultas complejas, relaciones jerárquicas y migraciones robustas.
- **Docker & Docker Compose:** Contenerización de la base de datos PostgreSQL, servicio Redis y la API en contenedores aislados y listos para producción.
- **Programación de Tareas (Cron Jobs):** `@nestjs/schedule` para ejecutar limpiezas de cupones vencidos y reportes automáticos de ventas en el backend.
- **Documentación Interactiva (Swagger):** Integración completa de OpenAPI mediante `@nestjs/swagger` para proporcionar un sandbox interactivo de pruebas de endpoints.
- **Compresión y Seguridad:** Implementación de `compression` Gzip/Brotli y cabeceras de protección **Helmet**.

---

## 📁 Estructura del Proyecto Backend

```bash
qhatu-pe-backend/
├── prisma/               # Archivos de base de datos relacional
│   ├── schema.prisma     # Definición del esquema de datos y relaciones de Prisma
│   └── seed.ts           # Script semilla principal para poblar tablas iniciales
├── src/                  # Directorio de código fuente principal
│   ├── common/           # Decoradores, interceptores globales y filtros de excepciones
│   ├── config/           # Configuraciones de entorno centralizadas (AWS, Redis, JWT)
│   ├── database/         # Módulo y Servicio del cliente Prisma
│   ├── health/           # Monitoreo de salud del servidor (Liveness / Readiness)
│   ├── jobs/             # Tareas programadas periódicas (Cron Jobs)
│   ├── modules/          # Módulos de lógica de negocio (19 sub-servicios)
│   │   ├── auth/         # Autenticación, JWT, Passport, Google OAuth
│   │   ├── avatar/       # Generador dinámico de avatares con Dicebear
│   │   ├── upload/       # Procesamiento de imágenes (Sharp/HEIC) y subidas a S3
│   │   ├── live-event/   # WebSocket Gateways para notificaciones en vivo
│   │   ├── redis/        # Servicio cliente Redis para caching
│   │   ├── orders/       # Lógica del ciclo de vida del pedido
│   │   └── mail/         # Integración de emails (AWS SES / Resend)
│   └── main.ts           # Punto de entrada de la aplicación, configuración de CORS, Helmet y Pipes
├── Dockerfile            # Construcción de imágenes de producción
└── docker-compose.yml    # Orquestador de desarrollo para base de datos y caché local
```

---

## 🚀 Instalación y Despliegue en Desarrollo

1. **Clonar el proyecto:**
   ```bash
   git clone https://github.com/tu-usuario/qhatu-pe-backend.git
   cd qhatu-pe-backend
   ```

2. **Instalar Dependencias:**
   ```bash
   pnpm install
   ```

3. **Configurar el entorno (`.env`):**
   Crea un archivo `.env` tomando como referencia las credenciales de conexión del servidor:
   ```env
   DATABASE_URL="postgresql://postgres:password@localhost:5432/qhatupe_db?schema=public"
   REDIS_URL="redis://localhost:6379"
   JWT_SECRET="mi_secreto_super_seguro"
   AWS_ACCESS_KEY_ID="tu_key_aws"
   AWS_SECRET_ACCESS_KEY="tu_secret_aws"
   AWS_S3_BUCKET_NAME="tu_bucket_s3"
   ```

4. **Levantar base de datos y Redis locales con Docker:**
   ```bash
   docker-compose up -d
   ```

5. **Aplicar Migraciones de Base de Datos & Poblar Datos Semilla:**
   ```bash
   pnpm prisma migrate dev
   pnpm run prisma:seed
   ```

6. **Iniciar servidor en desarrollo (Watch mode):**
   ```bash
   pnpm run start:dev
   ```
   La API estará activa en `http://localhost:8000/api` y la documentación Swagger disponible en `http://localhost:8000/api/docs`.

---

## 🧪 Pruebas Automatizadas

El backend incluye un riguroso juego de pruebas integradas:

```bash
# Pruebas unitarias y de integración
pnpm run test

# Pruebas E2E (End-to-End)
pnpm run test:e2e

# Reporte de cobertura de código
pnpm run test:cov
```

---

## 📝 Licencia

Este proyecto de backend es propietario y forma parte del ecosistema de QhatuPE. Todos los derechos reservados © 2026.
