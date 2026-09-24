import React, { useMemo, useState } from 'react';
import { Search, Eye, Info } from 'lucide-react';
import { useWorkflow } from '../state/WorkflowContext';
import { useAuth } from '../context/useAuth';
import useResources from '../hooks/useResources';
import { ApprovalStatusBadge } from '../components/common/StatusBadge';
import { EmptyState, UnsupportedNotice } from '../components/common/StateViews';
import { RequestDetails } from '../components/requests/RequestDetails';
import { Modal } from '../components/common/Modal';
import { formatDateTime, formatDuration, levelLabel } from '../utils/format';
import type { ApprovalRequest, ApprovalStatus } from '../types/pam';

type SortKey = 'newest' | 'oldest' | 'status';

export const MyRequests: React.FC = () => {
  const { myRequests } = useWorkflow();
  const { user } = useAuth();
  const { resourceName } = useResources();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ApprovalStatus>('ALL');
  const [sort, setSort] = useState<SortKey>('newest');
  const [selected, setSelected] = useState<ApprovalRequest | null>(null);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = myRequests.filter((request) => {
      const matchesStatus = statusFilter === 'ALL' || request.status === statusFilter;
      const matchesSearch =
        !query ||
        request.resourceId.toLowerCase().includes(query) ||
        request.reason.toLowerCase().includes(query) ||
        request.id.toLowerCase().includes(query);
      return matchesStatus && matchesSearch;
    });
    const sorted = [...filtered];
    if (sort === 'newest') sorted.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    else if (sort === 'oldest')
      sorted.sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
    else sorted.sort((a, b) => a.status.localeCompare(b.status));
    return sorted;
  }, [myRequests, search, statusFilter, sort]);

  return (
    <section className="page-container">
      <div className="page-header-row">
        <div>
          <h1 className="page-title">My Requests</h1>
          <p className="page-description">
            Access requests submitted by {user?.fullName || 'you'} in this session.
          </p>
        </div>
      </div>

      <UnsupportedNotice message="The backend has no 'list my own requests' endpoint (GET /api/approval/requests returns the approver-only pending queue). This view lists requests you submitted during this session." />

      {myRequests.length === 0 ? (
        <EmptyState
          title="No requests yet"
          message="You have not submitted any access requests in this session."
        />
      ) : (
        <>
          <div className="table-toolbar">
            <div className="search-input-wrapper">
              <Search size={18} className="search-icon" aria-hidden="true" />
              <input
                type="text"
                className="search-input"
                placeholder="Search by resource, reason, or request ID…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Search my requests"
              />
            </div>
            <div className="filter-controls-group">
              <select
                className="role-filter-select"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as 'ALL' | ApprovalStatus)}
                aria-label="Filter by status"
              >
                <option value="ALL">All statuses</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
              <select
                className="role-filter-select"
                value={sort}
                onChange={(event) => setSort(event.target.value as SortKey)}
                aria-label="Sort requests"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="status">By status</option>
              </select>
            </div>
          </div>

          {visible.length === 0 ? (
            <EmptyState
              title="No matching requests"
              message="Try adjusting your search or filters."
            />
          ) : (
            <div className="table-responsive-wrapper">
              <table className="pam-data-table" aria-label="My access requests">
                <thead>
                  <tr>
                    <th scope="col">Request</th>
                    <th scope="col">Resource</th>
                    <th scope="col">Level</th>
                    <th scope="col">Duration</th>
                    <th scope="col">Created</th>
                    <th scope="col">Status</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((request) => (
                    <tr key={request.id} className="pam-table-row">
                      <td className="wf-mono">{request.id.slice(0, 8)}…</td>
                      <td>{resourceName(request.resourceId)}</td>
                      <td>{levelLabel(request.requestedLevel)}</td>
                      <td>{formatDuration(request.durationMinutes)}</td>
                      <td>{formatDateTime(request.createdAt)}</td>
                      <td>
                        <ApprovalStatusBadge status={request.status} />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="link-btn"
                          onClick={() => setSelected(request)}
                          aria-label={`View details for request ${request.id}`}
                        >
                          <Eye size={16} aria-hidden="true" />
                          <span>Details</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {selected && (
        <Modal title="Request details" onClose={() => setSelected(null)}>
          <RequestDetails request={selected} resourceName={resourceName(selected.resourceId)} />
        </Modal>
      )}

      <p className="wf-hint">
        <Info size={14} aria-hidden="true" /> Status changes made by approvers appear when the
        pending queue or notifications refresh.
      </p>
    </section>
  );
};

export default MyRequests;
