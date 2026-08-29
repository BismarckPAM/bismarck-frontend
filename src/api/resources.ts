import apiClient from './client';
import type { Resource } from '../types/resource';

/**
 * Fetches all privileged access target resources.
 * Endpoint: GET /api/resources
 */
export const getResourcesApi = async (): Promise<Resource[]> => {
  const response = await apiClient.get<Resource[] | { resources?: Resource[]; data?: Resource[] }>(
    '/api/resources',
  );

  // Normalize response to always return Resource[]
  if (Array.isArray(response.data)) {
    return response.data;
  }
  if (response.data && Array.isArray(response.data.resources)) {
    return response.data.resources;
  }
  if (response.data && Array.isArray(response.data.data)) {
    return response.data.data;
  }
  return [];
};
