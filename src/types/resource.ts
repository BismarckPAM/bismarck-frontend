export type ResourceCriticality = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface Resource {
  id: string;
  name: string;
  type: string;
  environment: string;
  criticality: ResourceCriticality | string;
  description?: string;
  status?: string;
  ipAddress?: string;
  hostname?: string;
  port?: number;
  owner?: string;
  isActive?: boolean;
  azureVmName?: string;
  azureResourceGroup?: string;
  azureResourceId?: string;
  osType?: string;
  publicHost?: string;
  createdAt?: string;
}
