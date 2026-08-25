import { http, HttpResponse } from 'msw';
import type { WireIamUser, WireIamRole, WireIamPermission } from '../features/iam/api/iam-types';

const mockUsers: WireIamUser[] = [
  {
    id: 'user-1',
    email: 'admin@example.com',
    name: 'System Admin',
    role_code: 'SYSTEM_ADMIN',
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'user-2',
    email: 'hr@example.com',
    name: 'HR User',
    role_code: 'HR_ADMIN',
    is_active: false,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
];

const mockRoles: WireIamRole[] = [
  {
    id: 'role-1',
    code: 'SYSTEM_ADMIN',
    name: 'System Admin',
    description: 'Full system access',
    permission_codes: ['IAM_MANAGE', 'AUDIT_VIEW'],
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'role-2',
    code: 'HR_ADMIN',
    name: 'HR Admin',
    description: null,
    permission_codes: ['AUDIT_VIEW'],
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
];

const mockPermissions: WireIamPermission[] = [
  { id: 'perm-1', code: 'IAM_MANAGE', name: 'Manage IAM', description: 'Can manage users and roles' },
  { id: 'perm-2', code: 'AUDIT_VIEW', name: 'View Audit Logs', description: null },
];

function envelope<T>(data: T) {
  return {
    success: true,
    message: 'OK',
    data,
    meta: { request_id: 'test-req-id', timestamp: new Date().toISOString() },
  };
}

const BASE = 'http://localhost:8080';

export const iamHandlers = [
  http.get(`${BASE}/api/iam/users`, () => HttpResponse.json(envelope(mockUsers))),

  http.post(`${BASE}/api/iam/users`, async ({ request }) => {
    const body = (await request.json()) as Record<string, string>;
    if (body.email === 'duplicate@example.com') {
      return HttpResponse.json(
        {
          success: false,
          message: 'Email is already registered.',
          data: null,
          meta: {
            request_id: 'test-req-id',
            timestamp: new Date().toISOString(),
            error: { code: 'DUPLICATE_EMAIL', field: 'email', details: [] },
          },
        },
        { status: 409 },
      );
    }
    const newUser: WireIamUser = {
      id: 'user-new',
      email: body.email,
      name: body.name,
      role_code: body.role_code,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return HttpResponse.json(envelope(newUser), { status: 201 });
  }),

  http.put(`${BASE}/api/iam/users/:id`, async ({ request, params }) => {
    const body = (await request.json()) as Record<string, string>;
    const user = mockUsers.find((u) => u.id === params.id);
    if (!user) return HttpResponse.json({ success: false, message: 'Not found', data: null, meta: { request_id: 'x', timestamp: '' } }, { status: 404 });
    return HttpResponse.json(envelope({ ...user, name: body.name ?? user.name, role_code: body.role_code ?? user.role_code }));
  }),

  http.post(`${BASE}/api/iam/users/:id/deactivate`, ({ params }) => {
    const user = mockUsers.find((u) => u.id === params.id);
    if (!user) return HttpResponse.json({ success: false, message: 'Not found', data: null, meta: { request_id: 'x', timestamp: '' } }, { status: 404 });
    return HttpResponse.json(envelope({ ...user, is_active: false }));
  }),

  http.post(`${BASE}/api/iam/users/:id/activate`, ({ params }) => {
    const user = mockUsers.find((u) => u.id === params.id);
    if (!user) return HttpResponse.json({ success: false, message: 'Not found', data: null, meta: { request_id: 'x', timestamp: '' } }, { status: 404 });
    return HttpResponse.json(envelope({ ...user, is_active: true }));
  }),

  http.get(`${BASE}/api/iam/roles`, () => HttpResponse.json(envelope(mockRoles))),

  http.post(`${BASE}/api/iam/roles`, async ({ request }) => {
    const body = (await request.json()) as Record<string, string>;
    const newRole: WireIamRole = {
      id: 'role-new',
      code: body.code,
      name: body.name,
      description: body.description ?? null,
      permission_codes: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return HttpResponse.json(envelope(newRole), { status: 201 });
  }),

  http.put(`${BASE}/api/iam/roles/:id`, async ({ request, params }) => {
    const body = (await request.json()) as Record<string, string>;
    const role = mockRoles.find((r) => r.id === params.id);
    if (!role) return HttpResponse.json({ success: false, message: 'Not found', data: null, meta: { request_id: 'x', timestamp: '' } }, { status: 404 });
    return HttpResponse.json(envelope({ ...role, name: body.name ?? role.name }));
  }),

  http.get(`${BASE}/api/iam/permissions`, () => HttpResponse.json(envelope(mockPermissions))),

  http.post(`${BASE}/api/iam/roles/:id/permissions`, ({ params }) => {
    const role = mockRoles.find((r) => r.id === params.id);
    if (!role) return HttpResponse.json({ success: false, message: 'Not found', data: null, meta: { request_id: 'x', timestamp: '' } }, { status: 404 });
    return HttpResponse.json(envelope(role));
  }),

  http.delete(`${BASE}/api/iam/roles/:id/permissions/:code`, ({ params }) => {
    const role = mockRoles.find((r) => r.id === params.id);
    if (!role) return HttpResponse.json({ success: false, message: 'Not found', data: null, meta: { request_id: 'x', timestamp: '' } }, { status: 404 });
    return HttpResponse.json(envelope({ ...role, permission_codes: role.permission_codes.filter((c) => c !== params.code) }));
  }),
];
