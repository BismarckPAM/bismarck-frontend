import { resourceClient } from './client';
import type { Resource } from '../types/resource';

/**
 * Fetches all privileged access target resources.
 * Endpoint: GET /api/resources
 */
export const getResourcesApi = async (): Promise<Resource[]> => {
  const response = await resourceClient.get<Resource[]>('/api/resources');
  if (!Array.isArray(response.data)) {
    throw new Error('Unexpected response from Resource Service: expected an array of resources');
  }
  return response.data;
};
