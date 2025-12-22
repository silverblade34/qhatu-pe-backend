import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { InsufficientPermissionsException } from '../http-exception/custom-exception';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) { }

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      throw new InsufficientPermissionsException(requiredRoles.join(', '));
    }

    console.log('Usuario del token:', user);
    console.log('Rol del usuario:', user.role);
    console.log('Roles requeridos:', requiredRoles);

    if (!requiredRoles.includes(user.role)) {
      throw new InsufficientPermissionsException(requiredRoles.join(', '));
    }

    return true;
  }
}