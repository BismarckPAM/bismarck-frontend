import { identityClient } from './client';
import { normalizeApiError } from './errors';
import type { NotificationItem, PagedResult } from '../types/pam';

/**
 * List notifications for a user.
 * GET /api/notifications/{userId}?page=&pageSize= -> PagedResult<NotificationResponseDto>
 *
 * The Notification service is a read-only, immutable log: there is NO
 * mark-as-read endpoint. Any read state is therefore local-only (see the
 * notification hook) and never presented as persisted.
 */
export async function getNotifications(
  userId: string,
  page = 1,
  pageSize = 20,
  signal?: AbortSignal,
): Promise<PagedResult<NotificationItem>> {
  try {
    const { data } = await identityClient.get<PagedResult<NotificationItem>>(
      `/api/notifications/${userId}`,
      { params: { page, pageSize }, signal },
    );
    return {
      items: Array.isArray(data?.items) ? data.items : [],
      totalCount: Number(data?.totalCount ?? 0),
      page: Number(data?.page ?? page),
      pageSize: Number(data?.pageSize ?? pageSize),
    };
  } catch (error) {
    throw normalizeApiError(error);
  }
}