import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { CreateLiveEventDto } from './dto/create-live-event.dto';

@Injectable()
export class LiveEventService {
  constructor(private prisma: PrismaService) { }

  async create(userId: string, dto: CreateLiveEventDto) {
    // Validar productos
    if (dto.featuredProductIds && dto.featuredProductIds.length > 0) {
      const products = await this.prisma.product.findMany({
        where: {
          id: { in: dto.featuredProductIds },
          userId,
          isActive: true,
        },
      });

      if (products.length !== dto.featuredProductIds.length) {
        throw new BadRequestException('Algunos productos no existen o no están activos');
      }
    }

    // Validar fechas si está programado
    if (!dto.startNow && !dto.scheduledStartAt) {
      throw new BadRequestException('Debes proporcionar fecha de inicio o activar "startNow"');
    }

    if (dto.scheduledStartAt && dto.scheduledEndAt) {
      const start = new Date(dto.scheduledStartAt);
      const end = new Date(dto.scheduledEndAt);

      if (end <= start) {
        throw new BadRequestException('La fecha de fin debe ser posterior a la fecha de inicio');
      }
    }

    // Determinar estado inicial
    const status = dto.startNow ? 'LIVE' : 'SCHEDULED';
    const startedAt = dto.startNow ? new Date() : null;

    return this.prisma.liveEvent.create({
      data: {
        userId,
        title: dto.title,
        platform: dto.platform,
        liveUrl: dto.liveUrl,
        featuredProductIds: dto.featuredProductIds || [],
        status,
        startedAt,
        scheduledStartAt: dto.scheduledStartAt ? new Date(dto.scheduledStartAt) : null,
        scheduledEndAt: dto.scheduledEndAt ? new Date(dto.scheduledEndAt) : null,
      },
    });
  }

  async getActiveByUsername(username: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });

    if (!user) throw new NotFoundException('Usuario no encontrado');

    const live = await this.prisma.liveEvent.findFirst({
      where: { userId: user.id, status: 'LIVE' },
    });

    if (!live) return null;

    const duration = live.startedAt
      ? Math.floor((Date.now() - live.startedAt.getTime()) / 1000)
      : 0;

    return { ...live, duration };
  }

  async start(id: string, userId: string) {
    const live = await this.prisma.liveEvent.findFirst({
      where: { id, userId },
    });

    if (!live) throw new NotFoundException('Live no encontrado');
    if (live.status === 'LIVE') throw new BadRequestException('Ya está en vivo');
    if (live.status === 'ENDED') throw new BadRequestException('El live ya finalizó');

    return this.prisma.liveEvent.update({
      where: { id },
      data: { status: 'LIVE', startedAt: new Date() },
    });
  }

  async end(id: string, userId: string) {
    const live = await this.prisma.liveEvent.findFirst({
      where: { id, userId, status: 'LIVE' },
    });

    if (!live) throw new NotFoundException('Live no encontrado o no está activo');

    return this.prisma.liveEvent.update({
      where: { id },
      data: {
        status: 'ENDED',
        endedAt: new Date(),
        pinnedProductId: null,
      },
    });
  }

  async pinProduct(id: string, userId: string, productId: string) {
    const live = await this.prisma.liveEvent.findFirst({
      where: { id, userId, status: 'LIVE' },
    });

    if (!live) throw new NotFoundException('Live no activo');

    // Verificar que el producto existe y pertenece al usuario
    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        userId,
        isActive: true,
      },
    });

    if (!product) {
      throw new BadRequestException('Producto no encontrado o no activo');
    }

    // Si el producto no está en featuredProductIds, agregarlo
    let updatedFeaturedIds = live.featuredProductIds;
    if (!live.featuredProductIds.includes(productId)) {
      updatedFeaturedIds = [...live.featuredProductIds, productId];
    }

    return this.prisma.liveEvent.update({
      where: { id },
      data: {
        pinnedProductId: productId,
        featuredProductIds: updatedFeaturedIds,
      },
    });
  }

  async unpinProduct(id: string, userId: string) {
    const live = await this.prisma.liveEvent.findFirst({
      where: { id, userId, status: 'LIVE' },
    });

    if (!live) throw new NotFoundException('Live no activo');

    return this.prisma.liveEvent.update({
      where: { id },
      data: { pinnedProductId: null },
    });
  }

  async findAll(userId: string) {
    const events = await this.prisma.liveEvent.findMany({
      where: { userId },
      orderBy: [
        { status: 'asc' }, // LIVE primero
        { scheduledStartAt: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    // Calcular la duración para eventos LIVE
    return events.map(event => {
      let duration = null;

      if (event.status === 'LIVE' && event.startedAt) {
        const now = new Date();
        const startedAt = new Date(event.startedAt);
        const durationMs = now.getTime() - startedAt.getTime();
        duration = Math.floor(durationMs / 1000);
      }

      return {
        ...event,
        duration,
      };
    });
  }

  async findOne(id: string, userId: string) {
    const live = await this.prisma.liveEvent.findFirst({
      where: { id, userId },
    });

    if (!live) throw new NotFoundException('Live no encontrado');

    return live;
  }

  async delete(id: string, userId: string) {
    const live = await this.prisma.liveEvent.findFirst({
      where: { id, userId },
    });

    if (!live) throw new NotFoundException('Live no encontrado');

    if (live.status === 'LIVE') {
      throw new BadRequestException('Finaliza el live antes de eliminar');
    }

    return this.prisma.liveEvent.delete({ where: { id } });
  }

  // Método para activar automáticamente lives programados (llamar desde un cron job)
  async activateScheduledLives() {
    const now = new Date();

    const scheduledLives = await this.prisma.liveEvent.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledStartAt: { lte: now },
      },
    });

    for (const live of scheduledLives) {
      await this.prisma.liveEvent.update({
        where: { id: live.id },
        data: { status: 'LIVE', startedAt: now },
      });
    }

    return { activated: scheduledLives.length };
  }

  // Método para finalizar automáticamente lives programados (llamar desde un cron job)
  async endScheduledLives() {
    const now = new Date();

    const livesToEnd = await this.prisma.liveEvent.findMany({
      where: {
        status: 'LIVE',
        scheduledEndAt: { lte: now },
      },
    });

    for (const live of livesToEnd) {
      await this.prisma.liveEvent.update({
        where: { id: live.id },
        data: {
          status: 'ENDED',
          endedAt: now,
          pinnedProductId: null,
        },
      });
    }

    return { ended: livesToEnd.length };
  }
}