import { useEffect, useState } from 'react';
import { getResourcesApi } from '../api/resources';
import type { Resource } from '../types/resource';

/**
 * Loads the privileged resource catalogue once and exposes a lookup.
 * Failures are tolerated: screens fall back to showing the raw resource id.
 */
export function useResources() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const data = await getResourcesApi();
        if (active) setResources(Array.isArray(data) ? data : []);
      } catch {
        if (active) setError('Unable to load the resource catalogue.');
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const resourceName = (id: string): string => {
    const match = resources.find((resource) => resource.id === id);
    return match?.name || match?.type || id;
  };

  return { resources, isLoading, error, resourceName };
}

export default useResources;
