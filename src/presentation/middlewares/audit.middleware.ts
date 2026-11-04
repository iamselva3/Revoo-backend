import { Request } from 'express';
import { AuditLogModel } from '../../infrastructure/database/models/AuditLog.js';

export interface AuditParams {
  req: Request;
  actorType: 'ADMIN' | 'CUSTOMER' | 'SYSTEM';
  actorId?: string;
  actorEmail?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  diff?: Record<string, any>;
}

export async function logAuditEvent(params: AuditParams): Promise<void> {
  try {
    const ipAddress = (params.req.headers['x-forwarded-for'] as string) || params.req.socket.remoteAddress || '';
    const userAgent = params.req.headers['user-agent'] || '';

    await AuditLogModel.create({
      actorType: params.actorType,
      actorId: params.actorId,
      actorEmail: params.actorEmail,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      diff: params.diff,
      ipAddress: Array.isArray(ipAddress) ? ipAddress[0] : ipAddress,
      userAgent,
    });
  } catch (err) {
    console.error('[AuditLog] Failed to record audit log:', err);
  }
}

