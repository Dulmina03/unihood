import { Injectable, Inject, SetMetadata, UnauthorizedException, ForbiddenException, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { IdentityProvider, PermissionService } from '@unihood/contracts';
import { IDENTITY_PROVIDER, PERMISSION_SERVICE } from './tokens';
export type RequiredPermission = {action: 'suggest' | 'manage' | 'publishMap' | 'setPrice' | 'confirmVacancy' | 'manageMedia' | 'manageContact' | 'operateReports'; propertyParam?: string};
export const RequirePermission = (permission: RequiredPermission) => SetMetadata('unihood:permission', permission);
@Injectable()
export class ProtectedBoundaryGuard implements CanActivate {
  constructor(@Inject(IDENTITY_PROVIDER) private readonly identity: IdentityProvider, @Inject(PERMISSION_SERVICE) private readonly permissions: PermissionService, private readonly reflector: Reflector) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const required = this.reflector.getAllAndOverride<RequiredPermission>('unihood:permission', [context.getHandler(), context.getClass()]);
    if (!required && ['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return true;
    const actor = await this.identity.resolveRequestActor(request);
    if (actor.authStatus === 'GUEST') throw new UnauthorizedException();
    // Even configured synthetic owners cannot access an unannotated mutation.
    if (!required) throw new ForbiddenException();
    const id = request.params?.[required.propertyParam ?? 'boardingId'];
    const allowed = required.action === 'suggest' ? await this.permissions.canSuggestPlace(actor)
      : required.action === 'operateReports' ? await this.permissions.canOperateReports(actor)
      : typeof id !== 'string' ? false
      : required.action === 'manage' ? await this.permissions.canManageProperty(actor, id)
      : required.action === 'publishMap' ? await this.permissions.canPublishExactBoardingLocation(actor, id)
      : required.action === 'setPrice' ? await this.permissions.canSetOfficialPrice(actor, id)
      : required.action === 'manageMedia' ? await this.permissions.canManageMedia(actor,id)
      : required.action === 'manageContact' ? await this.permissions.canManageContact(actor,id)
      : required.action === 'confirmVacancy' ? await this.permissions.canConfirmVacancy(actor, id) : false;
    if (!allowed) throw new ForbiddenException();
    return true;
  }
}
