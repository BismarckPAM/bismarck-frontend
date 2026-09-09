import React, { useState, useEffect, useCallback } from 'react';
import {
  Server,
  Database,
  Cloud,
  Layers,
  Search,
  RotateCw,
  AlertTriangle,
  FolderX,
  Flame,
  Globe,
  Radio,
  CheckCircle,
} from 'lucide-react';
import type { Resource } from '../types/resource';
import { getResourcesApi } from '../api/resources';

export const Resources: React.FC = () => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedEnv, setSelectedEnv] = useState<string>('ALL');
  const [selectedCriticality, setSelectedCriticality] = useState<string>('ALL');

  const fetchResources = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getResourcesApi();
      setResources(data);
    } catch {
      setError('Unable to load privileged resources. Please check your connection or try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchResources();
  }, [fetchResources]);

  // Extract unique environments for dropdown
  const uniqueEnvironments = Array.from(
    new Set(resources.map((r) => r.environment).filter(Boolean)),
  );

  // Client-side filtering
  const filteredResources = resources.filter((res) => {
    const matchesSearch =
      res.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      res.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      res.environment.toLowerCase().includes(searchQuery.toLowerCase()) ||
      res.criticality.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (res.description && res.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (res.ipAddress && res.ipAddress.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesEnv = selectedEnv === 'ALL' || res.environment === selectedEnv;
    const matchesCriticality =
      selectedCriticality === 'ALL' ||
      res.criticality.toUpperCase() === selectedCriticality.toUpperCase();

    return matchesSearch && matchesEnv && matchesCriticality;
  });

  const criticalCount = resources.filter((r) => r.criticality?.toUpperCase() === 'CRITICAL').length;

  const prodCount = resources.filter((r) => r.environment?.toUpperCase() === 'PRODUCTION').length;

  const getCriticalityBadge = (criticality: string) => {
    const upper = criticality?.toUpperCase();
    switch (upper) {
      case 'CRITICAL':
        return (
          <span className="criticality-badge critical" data-testid="criticality-badge-critical">
            <Flame size={12} className="critical-flame" aria-hidden="true" />
            <span>CRITICAL</span>
          </span>
        );
      case 'HIGH':
        return (
          <span className="criticality-badge high" data-testid="criticality-badge-high">
            <span>HIGH</span>
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="criticality-badge medium" data-testid="criticality-badge-medium">
            <span>MEDIUM</span>
          </span>
        );
      case 'LOW':
        return (
          <span className="criticality-badge low" data-testid="criticality-badge-low">
            <span>LOW</span>
          </span>
        );
      default:
        return (
          <span className="criticality-badge default">
            <span>{criticality}</span>
          </span>
        );
    }
  };

  const getEnvironmentBadge = (environment: string) => {
    const upper = environment?.toUpperCase();
    switch (upper) {
      case 'PRODUCTION':
        return <span className="env-badge production">Production</span>;
      case 'STAGING':
        return <span className="env-badge staging">Staging</span>;
      case 'DEVELOPMENT':
      case 'DEV':
        return <span className="env-badge development">Development</span>;
      default:
        return <span className="env-badge default">{environment}</span>;
    }
  };

  const getResourceIcon = (type: string) => {
    const lower = type?.toLowerCase();
    if (lower.includes('db') || lower.includes('database') || lower.includes('sql')) {
      return <Database size={18} />;
    }
    if (lower.includes('cloud') || lower.includes('aws') || lower.includes('azure')) {
      return <Cloud size={18} />;
    }
    if (lower.includes('k8s') || lower.includes('kube') || lower.includes('cluster')) {
      return <Layers size={18} />;
    }
    if (lower.includes('gateway') || lower.includes('api')) {
      return <Globe size={18} />;
    }
    return <Server size={18} />;
  };

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Privileged Resources</h1>
          <p className="page-description">
            Infrastructure targets, datastores, bastion endpoints, and privileged service
            boundaries.
          </p>
        </div>
        <div className="page-header-actions">
          <button
            onClick={fetchResources}
            disabled={isLoading}
            className="secondary-action-btn"
            title="Refresh resource inventory"
            aria-label="Refresh resource inventory"
          >
            <RotateCw size={16} className={isLoading ? 'spinning-icon' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon-wrap blue">
            <Server size={22} />
          </div>
          <div>
            <div className="metric-value">{isLoading ? '—' : resources.length}</div>
            <div className="metric-label">Total Resources</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrap red">
            <Flame size={22} />
          </div>
          <div>
            <div className="metric-value">{isLoading ? '—' : criticalCount}</div>
            <div className="metric-label">Critical Assets</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrap emerald">
            <Radio size={22} />
          </div>
          <div>
            <div className="metric-value">{isLoading ? '—' : prodCount}</div>
            <div className="metric-label">Production Environments</div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="user-directory-card">
        {/* Search & Filter Toolbar */}
        {!isLoading && !error && resources.length > 0 && (
          <div className="table-toolbar">
            <div className="search-input-wrapper">
              <Search size={18} className="search-icon" aria-hidden="true" />
              <input
                type="text"
                className="search-input"
                placeholder="Search by name, type, environment, or criticality..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search resources"
              />
            </div>

            <div className="filter-controls-group">
              {uniqueEnvironments.length > 0 && (
                <div className="filter-select-wrapper">
                  <select
                    className="role-filter-select"
                    value={selectedEnv}
                    onChange={(e) => setSelectedEnv(e.target.value)}
                    aria-label="Filter by environment"
                  >
                    <option value="ALL">All Environments</option>
                    {uniqueEnvironments.map((env) => (
                      <option key={env} value={env}>
                        {env}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="filter-select-wrapper">
                <select
                  className="role-filter-select"
                  value={selectedCriticality}
                  onChange={(e) => setSelectedCriticality(e.target.value)}
                  aria-label="Filter by criticality"
                >
                  <option value="ALL">All Criticalities</option>
                  <option value="CRITICAL">Critical</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div
            className="directory-loading-container"
            data-testid="loading-state"
            role="status"
            aria-live="polite"
          >
            <div className="loading-spinner-wrap">
              <div className="spinner" />
              <p className="loading-text">Fetching privileged resources from Resource Service...</p>
            </div>
            <div className="skeleton-table" aria-hidden="true">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="skeleton-row">
                  <div className="skeleton-avatar" />
                  <div className="skeleton-line long" />
                  <div className="skeleton-line medium" />
                  <div className="skeleton-line short" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error State */}
        {!isLoading && error && (
          <div className="directory-error-state" data-testid="error-state" role="alert">
            <div className="error-icon-wrap">
              <AlertTriangle size={36} />
            </div>
            <h2 className="error-heading">Failed to Load Resources</h2>
            <p className="error-description">{error}</p>
            <button onClick={fetchResources} className="retry-btn">
              <RotateCw size={16} />
              <span>Try Again</span>
            </button>
          </div>
        )}

        {/* Empty State (0 resources returned from API) */}
        {!isLoading && !error && resources.length === 0 && (
          <div className="directory-empty-state" data-testid="empty-state">
            <div className="empty-icon-wrap">
              <FolderX size={40} />
            </div>
            <h2 className="empty-heading">No resources found</h2>
            <p className="empty-description">
              There are currently no privileged target resources registered in the system.
            </p>
          </div>
        )}

        {/* Empty Filter State (resources exist, but search query matches 0) */}
        {!isLoading && !error && resources.length > 0 && filteredResources.length === 0 && (
          <div className="directory-empty-state" data-testid="no-search-results">
            <div className="empty-icon-wrap">
              <Search size={36} />
            </div>
            <h2 className="empty-heading">No matching resources found</h2>
            <p className="empty-description">
              No resources matched your search query &quot;{searchQuery}&quot;. Try adjusting your
              search term or filters.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedEnv('ALL');
                setSelectedCriticality('ALL');
              }}
              className="clear-filter-btn"
            >
              Clear Filters
            </button>
          </div>
        )}

        {/* Populated Resource Table */}
        {!isLoading && !error && filteredResources.length > 0 && (
          <div className="table-responsive-wrapper">
            <table className="pam-data-table" aria-label="Privileged Resources">
              <thead>
                <tr>
                  <th scope="col">Resource Name</th>
                  <th scope="col">Type</th>
                  <th scope="col">Environment</th>
                  <th scope="col">Criticality</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredResources.map((resource) => (
                  <tr key={resource.id || resource.name} className="pam-table-row">
                    <td>
                      <div className="user-identity-cell">
                        <div className="resource-type-icon-wrapper" aria-hidden="true">
                          {getResourceIcon(resource.type)}
                        </div>
                        <div className="user-name-wrapper">
                          <span className="user-fullname">{resource.name}</span>
                          {resource.ipAddress && (
                            <span className="user-id-sub">{resource.ipAddress}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="resource-type-tag">{resource.type}</span>
                    </td>
                    <td>{getEnvironmentBadge(resource.environment)}</td>
                    <td>{getCriticalityBadge(resource.criticality)}</td>
                    <td>
                      <span className="status-badge-active">
                        <CheckCircle size={14} />
                        <span>Protected</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Resources;
