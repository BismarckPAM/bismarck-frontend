import type { Resource } from '../types/resource';

/** Human-readable resource text that never loses the stable backend identity. */
export function getResourceLabel(resource: Resource): string {
  const name = resource.name?.trim();
  if (name) return name;
  const descriptor = [resource.type, resource.environment].filter(Boolean).join(' · ');
  return descriptor || resource.id;
}

export function getResourceOptionLabel(resource: Resource): string {
  return [resource.type, resource.environment, getResourceLabel(resource)]
    .filter(Boolean)
    .join(' · ');
}
