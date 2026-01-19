import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class VercelService {
  private readonly logger = new Logger(VercelService.name);
  private readonly vercelToken: string;
  private readonly vercelProjectId: string;
  private readonly baseDomain: string;

  constructor(private configService: ConfigService) {
    this.vercelToken = this.configService.get<string>('VERCEL_TOKEN');
    this.vercelProjectId = this.configService.get<string>('VERCEL_PROJECT_ID');
    this.baseDomain = this.configService.get<string>('BASE_DOMAIN', 'qhatupe.com');
  }

  /**
   * Crea un subdominio en Vercel
   * @param username - El username del seller (ejemplo: "mitienda")
   * @returns El subdominio creado (ejemplo: "mitienda.qhatupe.com")
   */
  async createSubdomain(username: string): Promise<string> {
    const safeUsername = this.normalizeSubdomain(username);
    const subdomain = `${safeUsername}.${this.baseDomain}`;

    try {

      const response = await fetch(
        `https://api.vercel.com/v10/projects/${this.vercelProjectId}/domains`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.vercelToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: subdomain,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        // Si el dominio ya existe, no es un error crítico
        if (data.error?.code === 'domain_already_in_use') {
          return subdomain;
        }

        this.logger.error('Error creando subdominio:', data);
        throw new InternalServerErrorException(
          `Error al crear subdominio: ${data.error?.message || 'Error desconocido'}`
        );
      }

      return subdomain;

    } catch (error) {
      this.logger.error('Error en createSubdomain:', error);
      throw new InternalServerErrorException(
        'No se pudo crear el subdominio. Intenta nuevamente.'
      );
    }
  }

  private normalizeSubdomain(username: string): string {
    return username
      .toLowerCase()
      .normalize('NFD')                 // elimina acentos
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9-]/g, '-')      // todo lo raro → guion
      .replace(/-+/g, '-')              // múltiples guiones → uno
      .replace(/^-|-$/g, '');           // no empezar/terminar con guion
  }

  /**
   * Elimina un subdominio de Vercel
   * @param username - El username del seller
   */
  async deleteSubdomain(username: string): Promise<void> {
    const subdomain = `${username}.${this.baseDomain}`;

    try {
      this.logger.log(`🗑️ Eliminando subdominio: ${subdomain}`);

      const response = await fetch(
        `https://api.vercel.com/v9/projects/${this.vercelProjectId}/domains/${subdomain}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${this.vercelToken}`,
          },
        }
      );

      if (!response.ok && response.status !== 404) {
        const data = await response.json();
        this.logger.error('Error eliminando subdominio:', data);
        throw new InternalServerErrorException('Error al eliminar subdominio');
      }


    } catch (error) {
      this.logger.error('Error en deleteSubdomain:', error);
      // No lanzar error para no bloquear otras operaciones
    }
  }

  /**
   * Verifica si un subdominio existe
   * @param username - El username del seller
   */
  async subdomainExists(username: string): Promise<boolean> {
    const subdomain = `${username}.${this.baseDomain}`;

    try {
      const response = await fetch(
        `https://api.vercel.com/v9/projects/${this.vercelProjectId}/domains/${subdomain}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${this.vercelToken}`,
          },
        }
      );

      return response.ok;

    } catch (error) {
      this.logger.error('Error verificando subdominio:', error);
      return false;
    }
  }
}