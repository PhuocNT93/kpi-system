import swaggerJsdoc from 'swagger-jsdoc';

export const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'KPI System API',
      version: '0.1.0',
      description: 'REST API documentation for Employee Performance Evaluation & KPI Management System',
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Local Development Server',
      },
      {
        url: '/api',
        description: 'Relative API Base',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT Bearer token in format: Bearer <token>',
        },
      },
      schemas: {
        ApiResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Operation completed successfully.' },
            data: { type: 'object', nullable: true },
            requestId: { type: 'string', example: 'req-123456' },
          },
          required: ['success', 'message'],
        },
        ApiCollectionResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Items retrieved successfully.' },
            data: {
              type: 'array',
              items: { type: 'object' },
            },
            pagination: {
              type: 'object',
              properties: {
                total_items: { type: 'integer', example: 100 },
                page_size: { type: 'integer', example: 20 },
                total_pages: { type: 'integer', example: 5 },
                current_page: { type: 'integer', example: 1 },
              },
            },
            requestId: { type: 'string', example: 'req-123456' },
          },
          required: ['success', 'message', 'data'],
        },
        ApiErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'RESOURCE_NOT_FOUND' },
                message: { type: 'string', example: 'The requested resource was not found.' },
                details: { type: 'object', nullable: true },
              },
              required: ['code', 'message'],
            },
            requestId: { type: 'string', example: 'req-123456' },
          },
          required: ['success', 'error'],
        },
        ValidationErrorDetails: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'VALIDATION_ERROR' },
                message: { type: 'string', example: 'Request validation failed.' },
                details: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      field: { type: 'string', example: 'email' },
                      code: { type: 'string', example: 'REQUIRED' },
                      message: { type: 'string', example: 'Email is required.' },
                    },
                  },
                },
              },
            },
          },
        },
        SignupRequest: {
          type: 'object',
          required: ['email', 'password', 'fullName'],
          properties: {
            email: { type: 'string', format: 'email', example: 'john.doe@example.com' },
            password: { type: 'string', format: 'password', minLength: 8, example: 'SecureP@ss123' },
            fullName: { type: 'string', example: 'John Doe' },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'admin@kpi.com' },
            password: { type: 'string', format: 'password', example: 'Password123!' },
          },
        },
        RefreshTokenRequest: {
          type: 'object',
          required: ['refreshToken'],
          properties: {
            refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsIn...' },
          },
        },
        ChangePasswordRequest: {
          type: 'object',
          required: ['currentPassword', 'newPassword'],
          properties: {
            currentPassword: { type: 'string', format: 'password', example: 'CurrentP@ss123' },
            newPassword: { type: 'string', format: 'password', minLength: 8, example: 'NewP@ssw0rd!' },
          },
        },
        AuthTokens: {
          type: 'object',
          properties: {
            accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsIn...' },
            refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsIn...' },
            expiresIn: { type: 'number', example: 3600 },
          },
        },
        AuthResponseData: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid', example: '123e4567-e89b-12d3-a456-426614174000' },
                email: { type: 'string', example: 'john.doe@example.com' },
                fullName: { type: 'string', example: 'John Doe' },
              },
            },
            tokens: { $ref: '#/components/schemas/AuthTokens' },
          },
        },
        Role: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' },
            code: { type: 'string', example: 'HR_MANAGER' },
            name: { type: 'string', example: 'HR Manager' },
            description: { type: 'string', example: 'Human Resources Manager role' },
            isSystemRole: { type: 'boolean', example: false },
            createdAt: { type: 'string', format: 'date-time', example: '2026-01-01T00:00:00Z' },
            updatedAt: { type: 'string', format: 'date-time', example: '2026-01-01T00:00:00Z' },
          },
        },
        CreateRoleRequest: {
          type: 'object',
          required: ['code', 'name'],
          properties: {
            code: { type: 'string', example: 'DEPT_HEAD' },
            name: { type: 'string', example: 'Department Head' },
            description: { type: 'string', example: 'Department Manager role' },
          },
        },
        UpdateRoleRequest: {
          type: 'object',
          properties: {
            name: { type: 'string', example: 'Senior Department Head' },
            description: { type: 'string', example: 'Updated description' },
          },
        },
        Permission: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', example: 'p1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' },
            code: { type: 'string', example: 'kpi:create' },
            name: { type: 'string', example: 'Create KPI' },
            module: { type: 'string', example: 'KPI' },
            description: { type: 'string', example: 'Allows creating new KPI goals' },
          },
        },
        AssignRoleRequest: {
          type: 'object',
          required: ['roleCode'],
          properties: {
            roleCode: { type: 'string', example: 'EMPLOYEE' },
          },
        },
        AssignPermissionRequest: {
          type: 'object',
          required: ['permissionCode', 'scope'],
          properties: {
            permissionCode: { type: 'string', example: 'kpi:read' },
            scope: { type: 'string', enum: ['GLOBAL', 'DEPARTMENT', 'SELF'], example: 'DEPARTMENT' },
          },
        },
      },
    },
    paths: {
      '/health': {
        get: {
          summary: 'Service health check',
          description: 'Returns health status of the API service.',
          tags: ['Health'],
          responses: {
            200: {
              description: 'Service is healthy',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/ApiResponse' },
                      {
                        type: 'object',
                        properties: {
                          data: {
                            type: 'object',
                            properties: {
                              status: { type: 'string', example: 'healthy' },
                            },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      },
      '/api/auth/signup': {
        post: {
          summary: 'User registration',
          description: 'Registers a new user account and returns JWT tokens.',
          tags: ['Auth'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SignupRequest' },
              },
            },
          },
          responses: {
            201: {
              description: 'User registered successfully',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/ApiResponse' },
                      {
                        type: 'object',
                        properties: {
                          data: { $ref: '#/components/schemas/AuthResponseData' },
                        },
                      },
                    ],
                  },
                },
              },
            },
            400: {
              description: 'Validation error or email already exists',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ApiErrorResponse' },
                },
              },
            },
          },
        },
      },
      '/api/auth/login': {
        post: {
          summary: 'User login',
          description: 'Authenticates a user with email and password, returning JWT access and refresh tokens.',
          tags: ['Auth'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LoginRequest' },
              },
            },
          },
          responses: {
            200: {
              description: 'Login successful',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/ApiResponse' },
                      {
                        type: 'object',
                        properties: {
                          data: { $ref: '#/components/schemas/AuthResponseData' },
                        },
                      },
                    ],
                  },
                },
              },
            },
            401: {
              description: 'Invalid credentials',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ApiErrorResponse' },
                },
              },
            },
          },
        },
      },
      '/api/auth/refresh': {
        post: {
          summary: 'Refresh access token',
          description: 'Issues a new access and refresh token pair using a valid refresh token.',
          tags: ['Auth'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RefreshTokenRequest' },
              },
            },
          },
          responses: {
            200: {
              description: 'Token refreshed successfully',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/ApiResponse' },
                      {
                        type: 'object',
                        properties: {
                          data: { $ref: '#/components/schemas/AuthTokens' },
                        },
                      },
                    ],
                  },
                },
              },
            },
            401: {
              description: 'Invalid or expired refresh token',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ApiErrorResponse' },
                },
              },
            },
          },
        },
      },
      '/api/auth/refresh-token': {
        post: {
          summary: 'Refresh access token (Alias)',
          description: 'Alias endpoint for refreshing access token.',
          tags: ['Auth'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RefreshTokenRequest' },
              },
            },
          },
          responses: {
            200: {
              description: 'Token refreshed successfully',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/ApiResponse' },
                      {
                        type: 'object',
                        properties: {
                          data: { $ref: '#/components/schemas/AuthTokens' },
                        },
                      },
                    ],
                  },
                },
              },
            },
            401: {
              description: 'Invalid or expired refresh token',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ApiErrorResponse' },
                },
              },
            },
          },
        },
      },
      '/api/auth/change-password': {
        post: {
          summary: 'Change password',
          description: 'Changes password for the currently authenticated user.',
          tags: ['Auth'],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ChangePasswordRequest' },
              },
            },
          },
          responses: {
            200: {
              description: 'Password changed successfully',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ApiResponse' },
                },
              },
            },
            401: {
              description: 'Unauthorized / Invalid token or current password',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ApiErrorResponse' },
                },
              },
            },
          },
        },
      },
      '/api/iam/roles': {
        get: {
          summary: 'List all roles',
          description: 'Retrieves all defined RBAC roles.',
          tags: ['IAM - Roles'],
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: 'Roles retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/ApiResponse' },
                      {
                        type: 'object',
                        properties: {
                          data: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/Role' },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            401: { description: 'Unauthorized' },
            403: { description: 'Forbidden - Missing role:read permission' },
          },
        },
        post: {
          summary: 'Create a new role',
          description: 'Creates a custom RBAC role.',
          tags: ['IAM - Roles'],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreateRoleRequest' },
              },
            },
          },
          responses: {
            201: {
              description: 'Role created successfully',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/ApiResponse' },
                      {
                        type: 'object',
                        properties: {
                          data: { $ref: '#/components/schemas/Role' },
                        },
                      },
                    ],
                  },
                },
              },
            },
            400: { description: 'Role code already exists or validation failed' },
            401: { description: 'Unauthorized' },
            403: { description: 'Forbidden - Missing role:create permission' },
          },
        },
      },
      '/api/iam/roles/{id}': {
        get: {
          summary: 'Get role by ID',
          description: 'Retrieves details of a specific role.',
          tags: ['IAM - Roles'],
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'Role ID (UUID)',
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          responses: {
            200: {
              description: 'Role details',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/ApiResponse' },
                      {
                        type: 'object',
                        properties: {
                          data: { $ref: '#/components/schemas/Role' },
                        },
                      },
                    ],
                  },
                },
              },
            },
            404: { description: 'Role not found' },
          },
        },
        patch: {
          summary: 'Update role',
          description: 'Updates name or description of a non-system role.',
          tags: ['IAM - Roles'],
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'Role ID (UUID)',
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UpdateRoleRequest' },
              },
            },
          },
          responses: {
            200: {
              description: 'Role updated successfully',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/ApiResponse' },
                      {
                        type: 'object',
                        properties: {
                          data: { $ref: '#/components/schemas/Role' },
                        },
                      },
                    ],
                  },
                },
              },
            },
            400: { description: 'Cannot modify system role or invalid data' },
            404: { description: 'Role not found' },
          },
        },
      },
      '/api/iam/permissions': {
        get: {
          summary: 'List all permissions',
          description: 'Retrieves all available permissions in the system.',
          tags: ['IAM - Permissions'],
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: 'Permissions list',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/ApiResponse' },
                      {
                        type: 'object',
                        properties: {
                          data: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/Permission' },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      },
      '/api/iam/permissions/{id}': {
        get: {
          summary: 'Get permission by ID',
          description: 'Retrieves a permission by ID.',
          tags: ['IAM - Permissions'],
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'Permission ID (UUID)',
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          responses: {
            200: {
              description: 'Permission detail',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/ApiResponse' },
                      {
                        type: 'object',
                        properties: {
                          data: { $ref: '#/components/schemas/Permission' },
                        },
                      },
                    ],
                  },
                },
              },
            },
            404: { description: 'Permission not found' },
          },
        },
      },
      '/api/iam/users/{userId}/roles': {
        get: {
          summary: 'Get assigned roles for a user',
          description: 'Retrieves roles assigned to a user.',
          tags: ['IAM - User Roles'],
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'userId',
              in: 'path',
              required: true,
              description: 'User ID (UUID)',
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          responses: {
            200: {
              description: 'User roles list',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/ApiResponse' },
                      {
                        type: 'object',
                        properties: {
                          data: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/Role' },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
          },
        },
        post: {
          summary: 'Assign a role to a user',
          description: 'Assigns a role to a user by role code.',
          tags: ['IAM - User Roles'],
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'userId',
              in: 'path',
              required: true,
              description: 'User ID (UUID)',
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AssignRoleRequest' },
              },
            },
          },
          responses: {
            200: { description: 'Role assigned successfully' },
            404: { description: 'User or Role not found' },
          },
        },
      },
      '/api/iam/users/{userId}/roles/{roleCode}': {
        delete: {
          summary: 'Remove role from user',
          description: 'Removes a role assignment from a user.',
          tags: ['IAM - User Roles'],
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'userId',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
            {
              name: 'roleCode',
              in: 'path',
              required: true,
              schema: { type: 'string' },
            },
          ],
          responses: {
            200: { description: 'Role removed successfully' },
            404: { description: 'User or Role assignment not found' },
          },
        },
      },
      '/api/iam/roles/{roleId}/permissions': {
        get: {
          summary: 'Get role permissions',
          description: 'Retrieves permissions assigned to a role.',
          tags: ['IAM - Role Permissions'],
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'roleId',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          responses: {
            200: {
              description: 'Role permissions list',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/ApiResponse' },
                      {
                        type: 'object',
                        properties: {
                          data: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/Permission' },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
          },
        },
        post: {
          summary: 'Assign permission to role',
          description: 'Assigns a permission with a scope (GLOBAL, DEPARTMENT, SELF) to a role.',
          tags: ['IAM - Role Permissions'],
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'roleId',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AssignPermissionRequest' },
              },
            },
          },
          responses: {
            200: { description: 'Permission assigned to role successfully' },
            404: { description: 'Role or Permission not found' },
          },
        },
      },
      '/api/iam/roles/{roleId}/permissions/{permissionCode}': {
        delete: {
          summary: 'Remove permission from role',
          description: 'Removes a permission assignment from a role.',
          tags: ['IAM - Role Permissions'],
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'roleId',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
            {
              name: 'permissionCode',
              in: 'path',
              required: true,
              schema: { type: 'string' },
            },
          ],
          responses: {
            200: { description: 'Permission removed from role' },
            404: { description: 'Role or Permission assignment not found' },
          },
        },
      },
      '/api/sample/resource': {
        get: {
          summary: 'Sample single-resource endpoint',
          description: 'Returns a single sample resource.',
          tags: ['Samples'],
          responses: {
            200: {
              description: 'Sample resource retrieved',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ApiResponse' },
                },
              },
            },
          },
        },
      },
      '/api/sample/collection': {
        get: {
          summary: 'Sample paginated collection endpoint',
          description: 'Returns a paginated sample collection.',
          tags: ['Samples'],
          parameters: [
            {
              name: 'page',
              in: 'query',
              required: false,
              schema: { type: 'integer', default: 1 },
            },
            {
              name: 'page_size',
              in: 'query',
              required: false,
              schema: { type: 'integer', default: 20 },
            },
          ],
          responses: {
            200: {
              description: 'Paginated collection retrieved',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ApiCollectionResponse' },
                },
              },
            },
          },
        },
      },
      '/api/sample/error': {
        get: {
          summary: 'Sample error throwing endpoint',
          description: 'Demonstrates throwing an AppError (NotFound).',
          tags: ['Samples'],
          responses: {
            404: {
              description: 'Sample NotFound error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ApiErrorResponse' },
                },
              },
            },
          },
        },
      },
      '/api/sample/validation-error': {
        get: {
          summary: 'Sample validation error throwing endpoint',
          description: 'Demonstrates throwing a ValidationError with details.',
          tags: ['Samples'],
          responses: {
            400: {
              description: 'Sample ValidationError',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ValidationErrorDetails' },
                },
              },
            },
          },
        },
      },
    },
  },
  apis: [],
};

export const swaggerSpec = swaggerJsdoc(swaggerOptions);
