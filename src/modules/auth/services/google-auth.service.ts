import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';

export interface GoogleUser {
  googleId: string;
  email: string;
  fullName: string;
  picture?: string;
  emailVerified: boolean;
}

@Injectable()
export class GoogleAuthService {
  private client: OAuth2Client;

  constructor(private config: ConfigService) {
    const clientId = this.config.get<string>('google.clientId');
    this.client = new OAuth2Client(clientId);
  }

  /**
   * Verifica el token de Google y extrae los datos del usuario
   */
  async verifyIdToken(idToken: string): Promise<GoogleUser> {
    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: this.config.get<string>('google.clientId'),
      });

      const payload = ticket.getPayload();

      if (!payload) {
        throw new UnauthorizedException('Token de Google inválido');
      }

      // Valida que el email esté verificado
      if (!payload.email_verified) {
        throw new UnauthorizedException('El email de Google no está verificado');
      }

      return {
        googleId: payload.sub, // ID único de Google
        email: payload.email!,
        fullName: payload.name || payload.email!.split('@')[0],
        picture: payload.picture,
        emailVerified: payload.email_verified!,
      };
    } catch (error) {
      console.error('Error verificando token de Google:', error);
      throw new UnauthorizedException('Token de Google inválido o expirado');
    }
  }
}