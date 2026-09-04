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
        url: '/',
        description: 'API Server',
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
        Employee: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', example: 'e1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' },
            employee_code: { type: 'string', example: 'EMP-001' },
            full_name: { type: 'string', example: 'Nguyen Van A' },
            email: { type: 'string', format: 'email', example: 'nva@company.com' },
            department_id: { type: 'string', format: 'uuid', nullable: true, example: 'd1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' },
            team_id: { type: 'string', format: 'uuid', nullable: true, example: 't1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' },
            role_id: { type: 'string', format: 'uuid', example: 'r1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' },
            job_level_id: { type: 'string', format: 'uuid', example: 'j1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' },
            manager_id: { type: 'string', format: 'uuid', nullable: true, example: 'm1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' },
            employment_status: { type: 'string', enum: ['ACTIVE', 'ON_LEAVE', 'INACTIVE', 'TERMINATED'], example: 'ACTIVE' },
            join_date: { type: 'string', format: 'date', example: '2026-01-15' },
            termination_date: { type: 'string', format: 'date', nullable: true, example: null },
            version: { type: 'integer', example: 1 },
            created_at: { type: 'string', format: 'date-time', example: '2026-01-15T08:00:00Z' },
            updated_at: { type: 'string', format: 'date-time', example: '2026-01-15T08:00:00Z' },
          },
        },
        CreateEmployeeRequest: {
          type: 'object',
          required: ['employee_code', 'full_name', 'email', 'role_id', 'job_level_id', 'join_date'],
          properties: {
            employee_code: { type: 'string', example: 'EMP-002' },
            full_name: { type: 'string', example: 'Tran Van B' },
            email: { type: 'string', format: 'email', example: 'tvb@company.com' },
            department_id: { type: 'string', format: 'uuid', example: 'd1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' },
            team_id: { type: 'string', format: 'uuid', example: 't1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' },
            role_id: { type: 'string', format: 'uuid', example: 'r1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' },
            job_level_id: { type: 'string', format: 'uuid', example: 'j1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' },
            manager_id: { type: 'string', format: 'uuid', example: 'e1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' },
            employment_status: { type: 'string', enum: ['ACTIVE', 'ON_LEAVE', 'INACTIVE', 'TERMINATED'], example: 'ACTIVE' },
            join_date: { type: 'string', format: 'date', example: '2026-02-01' },
          },
        },
        UpdateEmployeeRequest: {
          type: 'object',
          properties: {
            full_name: { type: 'string', example: 'Nguyen Van A Updated' },
            email: { type: 'string', format: 'email', example: 'nva.updated@company.com' },
            department_id: { type: 'string', format: 'uuid', example: 'd1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' },
            team_id: { type: 'string', format: 'uuid', example: 't1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' },
            role_id: { type: 'string', format: 'uuid', example: 'r1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' },
            job_level_id: { type: 'string', format: 'uuid', example: 'j1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' },
            manager_id: { type: 'string', format: 'uuid', nullable: true, example: 'm1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' },
            employment_status: { type: 'string', enum: ['ACTIVE', 'ON_LEAVE', 'INACTIVE', 'TERMINATED'], example: 'ACTIVE' },
            termination_date: { type: 'string', format: 'date', example: '2026-12-31' },
          },
        },
        TerminateEmployeeRequest: {
          type: 'object',
          properties: {
            termination_date: { type: 'string', format: 'date', example: '2026-08-31' },
          },
        },
        EmployeeAssignment: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' },
            employee_id: { type: 'string', format: 'uuid', example: 'e1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' },
            department_id: { type: 'string', format: 'uuid', example: 'd1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' },
            team_id: { type: 'string', format: 'uuid', example: 't1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' },
            role_id: { type: 'string', format: 'uuid', example: 'r1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' },
            job_level_id: { type: 'string', format: 'uuid', example: 'j1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' },
            manager_id: { type: 'string', format: 'uuid', nullable: true, example: 'm1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' },
            effective_from: { type: 'string', format: 'date', example: '2026-01-15' },
            effective_to: { type: 'string', format: 'date', nullable: true, example: null },
            change_reason: {
              type: 'string',
              enum: ['INITIAL_HIRING', 'TEAM_TRANSFER', 'PROMOTION', 'MANAGER_CHANGE', 'DEPARTMENT_REORG', 'STATUS_CHANGE', 'CORRECTION'],
              example: 'TEAM_TRANSFER',
            },
            change_note: { type: 'string', nullable: true, example: 'Transferred to Backend Team' },
            created_at: { type: 'string', format: 'date-time', example: '2026-01-15T08:00:00Z' },
          },
        },
        CreateAssignmentRequest: {
          type: 'object',
          required: ['department_id', 'team_id', 'role_id', 'job_level_id', 'effective_from'],
          properties: {
            department_id: { type: 'string', format: 'uuid', example: 'd1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' },
            team_id: { type: 'string', format: 'uuid', example: 't1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' },
            role_id: { type: 'string', format: 'uuid', example: 'r1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' },
            job_level_id: { type: 'string', format: 'uuid', example: 'j1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' },
            manager_id: { type: 'string', format: 'uuid', example: 'm1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' },
            effective_from: { type: 'string', format: 'date', example: '2026-03-01' },
            effective_to: { type: 'string', format: 'date', example: '2026-12-31' },
            change_reason: { type: 'string', example: 'PROMOTION' },
            change_note: { type: 'string', example: 'Promoted to Senior Developer' },
          },
        },
        Criterion: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            code: { type: 'string', example: 'ON_TIME_COMPLETION' },
            category: { type: 'string', enum: ['PERFORMANCE', 'CAPABILITY', 'CONTRIBUTION', 'CUSTOM'], example: 'PERFORMANCE' },
            name: { type: 'string', example: 'On-time Completion' },
            description: { type: 'string', example: 'Percentage of work completed on time' },
            status: { type: 'string', enum: ['ACTIVE', 'INACTIVE'], example: 'ACTIVE' },
            version: { type: 'integer', example: 1 },
          },
        },
        ScoringRule: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            code: { type: 'string', example: 'RULE_ON_TIME_COMPLETION' },
            name: { type: 'string', example: 'On-time Completion Range Threshold' },
            rule_type: { type: 'string', enum: ['RANGE_THRESHOLD', 'INVERSE_THRESHOLD', 'COUNT_THRESHOLD', 'ORDINAL_MANUAL', 'ROLE_CONDITIONAL'], example: 'RANGE_THRESHOLD' },
            config: { type: 'object' },
            status: { type: 'string', enum: ['DRAFT', 'VALIDATING', 'VALID', 'PUBLISHED', 'RETIRED'], example: 'PUBLISHED' },
            version: { type: 'integer', example: 1 },
          },
        },
        EvaluationOrganizationContext: {
          type: 'object',
          properties: {
            employeeId: { type: 'string', format: 'uuid', example: 'e1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' },
            department: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid', example: 'd1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' },
                code: { type: 'string', example: 'ENG' },
                name: { type: 'string', example: 'Engineering' },
              },
            },
            team: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid', example: 't1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' },
                code: { type: 'string', example: 'BE' },
                name: { type: 'string', example: 'Backend Team' },
              },
            },
            jobRole: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid', example: 'r1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' },
                code: { type: 'string', example: 'DEV' },
                name: { type: 'string', example: 'Software Engineer' },
              },
            },
            jobLevel: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid', example: 'j1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' },
                code: { type: 'string', example: 'L3' },
                name: { type: 'string', example: 'Senior Engineer' },
                rank: { type: 'integer', example: 3 },
              },
            },
            manager: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid', nullable: true, example: 'm1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' },
                fullName: { type: 'string', nullable: true, example: 'Manager Name' },
              },
            },
            effectiveFrom: { type: 'string', format: 'date', example: '2026-01-01' },
            effectiveTo: { type: 'string', format: 'date', nullable: true, example: null },
          },
        },
        Department: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', example: 'd1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' },
            code: { type: 'string', example: 'ENG' },
            name: { type: 'string', example: 'Engineering' },
            active: { type: 'boolean', example: true },
            created_at: { type: 'string', format: 'date-time', example: '2026-01-01T00:00:00Z' },
            updated_at: { type: 'string', format: 'date-time', example: '2026-01-01T00:00:00Z' },
          },
        },
        CreateDepartmentRequest: {
          type: 'object',
          required: ['code', 'name'],
          properties: {
            code: { type: 'string', example: 'HR' },
            name: { type: 'string', example: 'Human Resources' },
          },
        },
        UpdateDepartmentRequest: {
          type: 'object',
          properties: {
            code: { type: 'string', example: 'HR_GLOBAL' },
            name: { type: 'string', example: 'Global HR' },
            active: { type: 'boolean', example: true },
          },
        },
        Team: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', example: 't1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' },
            code: { type: 'string', example: 'BE' },
            name: { type: 'string', example: 'Backend Team' },
            description: { type: 'string', nullable: true, example: 'Backend Engineering Team' },
            department_id: { type: 'string', format: 'uuid', example: 'd1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' },
            active: { type: 'boolean', example: true },
            created_at: { type: 'string', format: 'date-time', example: '2026-01-01T00:00:00Z' },
            updated_at: { type: 'string', format: 'date-time', example: '2026-01-01T00:00:00Z' },
          },
        },
        TeamDetail: {
          allOf: [
            { $ref: '#/components/schemas/Team' },
            {
              type: 'object',
              properties: {
                member_count: { type: 'integer', example: 10 },
                active_member_count: { type: 'integer', example: 8 },
              },
            },
          ],
        },
        CreateTeamRequest: {
          type: 'object',
          required: ['code', 'name', 'department_id'],
          properties: {
            code: { type: 'string', example: 'FE' },
            name: { type: 'string', example: 'Frontend Team' },
            department_id: { type: 'string', format: 'uuid', example: 'd1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' },
            description: { type: 'string', nullable: true, example: 'Frontend Web Team' },
          },
        },
        UpdateTeamRequest: {
          type: 'object',
          properties: {
            name: { type: 'string', example: 'Frontend Web Team' },
            department_id: { type: 'string', format: 'uuid', example: 'd1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' },
            description: { type: 'string', nullable: true, example: 'Updated team description' },
            active: { type: 'boolean', example: true },
          },
        },
        EmployeeRole: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', example: 'r1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' },
            code: { type: 'string', example: 'DEV' },
            name: { type: 'string', example: 'Software Engineer' },
            description: { type: 'string', nullable: true, example: 'Software developer role' },
            active: { type: 'boolean', example: true },
            created_at: { type: 'string', format: 'date-time', example: '2026-01-01T00:00:00Z' },
            updated_at: { type: 'string', format: 'date-time', example: '2026-01-01T00:00:00Z' },
          },
        },
        CreateEmployeeRoleRequest: {
          type: 'object',
          required: ['code', 'name'],
          properties: {
            code: { type: 'string', example: 'QA' },
            name: { type: 'string', example: 'Quality Assurance Engineer' },
            description: { type: 'string', example: 'QA Engineer role' },
          },
        },
        UpdateEmployeeRoleRequest: {
          type: 'object',
          properties: {
            code: { type: 'string', example: 'QA_LEAD' },
            name: { type: 'string', example: 'QA Lead Engineer' },
            description: { type: 'string', example: 'Lead QA Engineer role' },
            active: { type: 'boolean', example: true },
          },
        },
        JobLevel: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', example: 'j1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' },
            code: { type: 'string', example: 'L2' },
            name: { type: 'string', example: 'Mid-Level Specialist' },
            rank: { type: 'integer', example: 2 },
            active: { type: 'boolean', example: true },
            created_at: { type: 'string', format: 'date-time', example: '2026-01-01T00:00:00Z' },
            updated_at: { type: 'string', format: 'date-time', example: '2026-01-01T00:00:00Z' },
          },
        },
        CreateJobLevelRequest: {
          type: 'object',
          required: ['code', 'name', 'rank'],
          properties: {
            code: { type: 'string', example: 'L3' },
            name: { type: 'string', example: 'Senior Specialist' },
            rank: { type: 'integer', example: 3 },
          },
        },
        UpdateJobLevelRequest: {
          type: 'object',
          properties: {
            code: { type: 'string', example: 'L3_SENIOR' },
            name: { type: 'string', example: 'Senior Specialist Level 3' },
            rank: { type: 'integer', example: 3 },
            active: { type: 'boolean', example: true },
          },
        },
        EmployeeImportJob: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', example: 'imp-1b2c3d4-e5f6' },
            csv_template_id: { type: 'string', example: 'template-v1' },
            evaluation_cycle_id: { type: 'string', example: 'cycle-2026-h1' },
            file_name: { type: 'string', example: 'employees_import_2026.csv' },
            status: { type: 'string', enum: ['UPLOADED', 'VALIDATED', 'PROCESSING', 'PROCESSED', 'COMPLETED', 'FAILED'], example: 'UPLOADED' },
            total_rows: { type: 'integer', example: 50 },
            success_rows: { type: 'integer', example: 48 },
            error_rows: { type: 'integer', example: 2 },
            created_at: { type: 'string', format: 'date-time', example: '2026-01-01T00:00:00Z' },
          },
        },
        CreateImportJobRequest: {
          type: 'object',
          properties: {
            csv_template_id: { type: 'string', example: 'template-v1' },
            file_name: { type: 'string', example: 'employees_import_2026.csv' },
            evaluation_cycle_id: { type: 'string', example: 'cycle-2026-h1' },
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
      '/health/db': {
        get: {
          summary: 'Deep health check',
          description:
            'Verifies database connectivity with a single lightweight query. Also used by the develop keep-alive job to prevent free-tier suspension.',
          tags: ['Health'],
          responses: {
            200: {
              description: 'Service and database are healthy',
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
                              database: { type: 'string', example: 'up' },
                            },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            503: {
              description: 'Database is not reachable',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ApiErrorResponse' },
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
      // ── Employee Module Routes ──────────────────────────────────────────────
      '/api/employees': {
        get: {
          summary: 'List employees',
          description: 'Retrieves a paginated list of employees with optional filtering by department, team, role, job level, status, or search query.',
          tags: ['Employee - Employees'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'department_id', in: 'query', required: false, schema: { type: 'string', format: 'uuid' } },
            { name: 'team_id', in: 'query', required: false, schema: { type: 'string', format: 'uuid' } },
            { name: 'role_id', in: 'query', required: false, schema: { type: 'string', format: 'uuid' } },
            { name: 'job_level_id', in: 'query', required: false, schema: { type: 'string', format: 'uuid' } },
            {
              name: 'employment_status',
              in: 'query',
              required: false,
              schema: { type: 'string', enum: ['ACTIVE', 'ON_LEAVE', 'INACTIVE', 'TERMINATED'] },
            },
            { name: 'search', in: 'query', required: false, schema: { type: 'string' } },
            { name: 'page', in: 'query', required: false, schema: { type: 'integer', default: 1 } },
            { name: 'page_size', in: 'query', required: false, schema: { type: 'integer', default: 20 } },
          ],
          responses: {
            200: {
              description: 'Employees list retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/ApiCollectionResponse' },
                      {
                        type: 'object',
                        properties: {
                          data: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/Employee' },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            401: { description: 'Unauthorized' },
          },
        },
        post: {
          summary: 'Create employee',
          description: 'Creates a new employee record and initial assignment.',
          tags: ['Employee - Employees'],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreateEmployeeRequest' },
              },
            },
          },
          responses: {
            201: {
              description: 'Employee created successfully',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/ApiResponse' },
                      {
                        type: 'object',
                        properties: {
                          data: { $ref: '#/components/schemas/Employee' },
                        },
                      },
                    ],
                  },
                },
              },
            },
            400: { description: 'Validation error' },
            401: { description: 'Unauthorized' },
            409: { description: 'Employee code already exists' },
          },
        },
      },
      '/api/employees/lookup': {
        get: {
          summary: 'Employee lookup',
          description: 'Quick search for employees by keyword.',
          tags: ['Employee - Employees'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'q', in: 'query', required: false, schema: { type: 'string' } },
            { name: 'search', in: 'query', required: false, schema: { type: 'string' } },
            { name: 'page', in: 'query', required: false, schema: { type: 'integer', default: 1 } },
            { name: 'page_size', in: 'query', required: false, schema: { type: 'integer', default: 10 } },
          ],
          responses: {
            200: {
              description: 'Lookup results retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/ApiCollectionResponse' },
                      {
                        type: 'object',
                        properties: {
                          data: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/Employee' },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            401: { description: 'Unauthorized' },
          },
        },
      },
      '/api/employees/{employeeId}': {
        get: {
          summary: 'Get employee by ID',
          description: 'Retrieves detailed information of an employee.',
          tags: ['Employee - Employees'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'employeeId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            200: {
              description: 'Employee details retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/ApiResponse' },
                      {
                        type: 'object',
                        properties: {
                          data: { $ref: '#/components/schemas/Employee' },
                        },
                      },
                    ],
                  },
                },
              },
            },
            401: { description: 'Unauthorized' },
            404: { description: 'Employee not found' },
          },
        },
        patch: {
          summary: 'Update employee',
          description: 'Updates employee profile attributes.',
          tags: ['Employee - Employees'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'employeeId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UpdateEmployeeRequest' },
              },
            },
          },
          responses: {
            200: {
              description: 'Employee updated successfully',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/ApiResponse' },
                      {
                        type: 'object',
                        properties: {
                          data: { $ref: '#/components/schemas/Employee' },
                        },
                      },
                    ],
                  },
                },
              },
            },
            401: { description: 'Unauthorized' },
            404: { description: 'Employee not found' },
          },
        },
      },
      '/api/employees/{employeeId}/deactivate': {
        post: {
          summary: 'Deactivate employee',
          description: 'Sets employee status to INACTIVE.',
          tags: ['Employee - Employees'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'employeeId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            200: {
              description: 'Employee deactivated successfully',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/ApiResponse' },
                      {
                        type: 'object',
                        properties: {
                          data: { $ref: '#/components/schemas/Employee' },
                        },
                      },
                    ],
                  },
                },
              },
            },
            401: { description: 'Unauthorized' },
            404: { description: 'Employee not found' },
          },
        },
      },
      '/api/employees/{employeeId}/reactivate': {
        post: {
          summary: 'Reactivate employee',
          description: 'Sets employee status to ACTIVE.',
          tags: ['Employee - Employees'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'employeeId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            200: {
              description: 'Employee reactivated successfully',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/ApiResponse' },
                      {
                        type: 'object',
                        properties: {
                          data: { $ref: '#/components/schemas/Employee' },
                        },
                      },
                    ],
                  },
                },
              },
            },
            401: { description: 'Unauthorized' },
            404: { description: 'Employee not found' },
          },
        },
      },
      '/api/employees/{employeeId}/terminate': {
        post: {
          summary: 'Terminate employee',
          description: 'Sets employee status to TERMINATED and closes active assignments.',
          tags: ['Employee - Employees'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'employeeId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          requestBody: {
            required: false,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/TerminateEmployeeRequest' },
              },
            },
          },
          responses: {
            200: {
              description: 'Employee terminated successfully',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/ApiResponse' },
                      {
                        type: 'object',
                        properties: {
                          data: { $ref: '#/components/schemas/Employee' },
                        },
                      },
                    ],
                  },
                },
              },
            },
            401: { description: 'Unauthorized' },
            404: { description: 'Employee not found' },
          },
        },
      },
      '/api/employees/{employeeId}/assignments': {
        get: {
          summary: 'Get employee assignment history',
          description: 'Retrieves historic and current assignments of an employee.',
          tags: ['Employee - Assignments'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'employeeId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
            { name: 'page', in: 'query', required: false, schema: { type: 'integer', default: 1 } },
            { name: 'page_size', in: 'query', required: false, schema: { type: 'integer', default: 20 } },
          ],
          responses: {
            200: {
              description: 'Assignments retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/ApiCollectionResponse' },
                      {
                        type: 'object',
                        properties: {
                          data: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/EmployeeAssignment' },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            401: { description: 'Unauthorized' },
            404: { description: 'Employee not found' },
          },
        },
        post: {
          summary: 'Create assignment',
          description: 'Transfers or reassigns an employee to a new department, team, role, job level, or manager.',
          tags: ['Employee - Assignments'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'employeeId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreateAssignmentRequest' },
              },
            },
          },
          responses: {
            201: {
              description: 'Assignment created successfully',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/ApiResponse' },
                      {
                        type: 'object',
                        properties: {
                          data: { $ref: '#/components/schemas/EmployeeAssignment' },
                        },
                      },
                    ],
                  },
                },
              },
            },
            400: { description: 'Validation error' },
            401: { description: 'Unauthorized' },
            404: { description: 'Employee not found' },
          },
        },
      },
      '/api/employees/{employeeId}/assignments/current': {
        get: {
          summary: 'Get current active assignment',
          description: 'Retrieves the currently effective assignment for an employee.',
          tags: ['Employee - Assignments'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'employeeId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            200: {
              description: 'Current assignment retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/ApiResponse' },
                      {
                        type: 'object',
                        properties: {
                          data: { $ref: '#/components/schemas/EmployeeAssignment' },
                        },
                      },
                    ],
                  },
                },
              },
            },
            401: { description: 'Unauthorized' },
            404: { description: 'Active assignment for employee not found' },
          },
        },
      },
      '/api/employees/{employeeId}/context': {
        get: {
          summary: 'Get employee evaluation context',
          description: 'Retrieves organizational evaluation context (department, team, role, level, manager) at a specific date.',
          tags: ['Employee - Context'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'employeeId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
            { name: 'at', in: 'query', required: false, schema: { type: 'string', format: 'date' }, description: 'Target date (YYYY-MM-DD)' },
          ],
          responses: {
            200: {
              description: 'Employee context retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/ApiResponse' },
                      {
                        type: 'object',
                        properties: {
                          data: { $ref: '#/components/schemas/EvaluationOrganizationContext' },
                        },
                      },
                    ],
                  },
                },
              },
            },
            401: { description: 'Unauthorized' },
            404: { description: 'Employee not found' },
          },
        },
      },
      '/api/employees/{employeeId}/direct-reports': {
        get: {
          summary: 'Get direct reports',
          description: 'Retrieves all employees reporting directly to this manager.',
          tags: ['Employee - Hierarchy'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'employeeId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
            { name: 'page', in: 'query', required: false, schema: { type: 'integer', default: 1 } },
            { name: 'page_size', in: 'query', required: false, schema: { type: 'integer', default: 20 } },
          ],
          responses: {
            200: {
              description: 'Direct reports retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/ApiCollectionResponse' },
                      {
                        type: 'object',
                        properties: {
                          data: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/Employee' },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            401: { description: 'Unauthorized' },
            404: { description: 'Employee not found' },
          },
        },
      },
      '/api/employees/{employeeId}/manager-chain': {
        get: {
          summary: 'Get manager chain',
          description: 'Retrieves management chain hierarchy from employee up to top management.',
          tags: ['Employee - Hierarchy'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'employeeId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
            { name: 'page', in: 'query', required: false, schema: { type: 'integer', default: 1 } },
            { name: 'page_size', in: 'query', required: false, schema: { type: 'integer', default: 20 } },
          ],
          responses: {
            200: {
              description: 'Manager chain retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/ApiCollectionResponse' },
                      {
                        type: 'object',
                        properties: {
                          data: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/Employee' },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            401: { description: 'Unauthorized' },
            404: { description: 'Employee not found' },
          },
        },
      },
      '/api/departments': {
        get: {
          summary: 'List departments',
          description: 'Retrieves a list of all departments.',
          tags: ['Employee - Departments'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'page', in: 'query', required: false, schema: { type: 'integer', default: 1 } },
            { name: 'page_size', in: 'query', required: false, schema: { type: 'integer', default: 20 } },
          ],
          responses: {
            200: {
              description: 'Departments retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/ApiCollectionResponse' },
                      {
                        type: 'object',
                        properties: {
                          data: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/Department' },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            401: { description: 'Unauthorized' },
          },
        },
        post: {
          summary: 'Create department',
          description: 'Creates a new department.',
          tags: ['Employee - Departments'],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreateDepartmentRequest' },
              },
            },
          },
          responses: {
            201: {
              description: 'Department created successfully',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/ApiResponse' },
                      {
                        type: 'object',
                        properties: {
                          data: { $ref: '#/components/schemas/Department' },
                        },
                      },
                    ],
                  },
                },
              },
            },
            400: { description: 'Bad request' },
            401: { description: 'Unauthorized' },
          },
        },
      },
      '/api/departments/{departmentId}': {
        get: {
          summary: 'Get department by ID',
          description: 'Retrieves details of a department.',
          tags: ['Employee - Departments'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'departmentId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            200: {
              description: 'Department details retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/ApiResponse' },
                      {
                        type: 'object',
                        properties: {
                          data: { $ref: '#/components/schemas/Department' },
                        },
                      },
                    ],
                  },
                },
              },
            },
            401: { description: 'Unauthorized' },
            404: { description: 'Department not found' },
          },
        },
        patch: {
          summary: 'Update department',
          description: 'Updates department code, name, or active status.',
          tags: ['Employee - Departments'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'departmentId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UpdateDepartmentRequest' },
              },
            },
          },
          responses: {
            200: {
              description: 'Department updated successfully',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/ApiResponse' },
                      {
                        type: 'object',
                        properties: {
                          data: { $ref: '#/components/schemas/Department' },
                        },
                      },
                    ],
                  },
                },
              },
            },
            401: { description: 'Unauthorized' },
            404: { description: 'Department not found' },
          },
        },
      },
      '/api/departments/{departmentId}/deactivate': {
        post: {
          summary: 'Deactivate department',
          description: 'Sets department status to inactive.',
          tags: ['Employee - Departments'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'departmentId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            200: {
              description: 'Department deactivated successfully',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/ApiResponse' },
                      {
                        type: 'object',
                        properties: {
                          data: { $ref: '#/components/schemas/Department' },
                        },
                      },
                    ],
                  },
                },
              },
            },
            401: { description: 'Unauthorized' },
            404: { description: 'Department not found' },
          },
        },
      },
      '/api/departments/{departmentId}/teams': {
        get: {
          summary: 'List department teams',
          description: 'Retrieves all teams belonging to a department.',
          tags: ['Employee - Departments'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'departmentId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
            { name: 'page', in: 'query', required: false, schema: { type: 'integer', default: 1 } },
            { name: 'page_size', in: 'query', required: false, schema: { type: 'integer', default: 20 } },
          ],
          responses: {
            200: {
              description: 'Department teams retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/ApiCollectionResponse' },
                      {
                        type: 'object',
                        properties: {
                          data: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/Team' },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            401: { description: 'Unauthorized' },
            404: { description: 'Department not found' },
          },
        },
      },
      '/api/teams': {
        get: {
          summary: 'List teams',
          description: 'Retrieves a list of all teams with optional filtering by department, active status, or search query.',
          tags: ['Employee - Teams'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'department_id', in: 'query', required: false, schema: { type: 'string', format: 'uuid' } },
            { name: 'active', in: 'query', required: false, schema: { type: 'boolean' } },
            { name: 'search', in: 'query', required: false, schema: { type: 'string' } },
            { name: 'page', in: 'query', required: false, schema: { type: 'integer', default: 1 } },
            { name: 'page_size', in: 'query', required: false, schema: { type: 'integer', default: 20 } },
          ],
          responses: {
            200: {
              description: 'Teams retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/ApiCollectionResponse' },
                      {
                        type: 'object',
                        properties: {
                          data: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/Team' },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            401: { description: 'Unauthorized' },
          },
        },
        post: {
          summary: 'Create team',
          description: 'Creates a new team under a department.',
          tags: ['Employee - Teams'],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreateTeamRequest' },
              },
            },
          },
          responses: {
            201: {
              description: 'Team created successfully',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/ApiResponse' },
                      {
                        type: 'object',
                        properties: {
                          data: { $ref: '#/components/schemas/Team' },
                        },
                      },
                    ],
                  },
                },
              },
            },
            400: { description: 'Bad request' },
            401: { description: 'Unauthorized' },
          },
        },
      },
      '/api/teams/{teamId}': {
        get: {
          summary: 'Get team by ID',
          description: 'Retrieves team details including member counts.',
          tags: ['Employee - Teams'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'teamId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            200: {
              description: 'Team retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/ApiResponse' },
                      {
                        type: 'object',
                        properties: {
                          data: { $ref: '#/components/schemas/TeamDetail' },
                        },
                      },
                    ],
                  },
                },
              },
            },
            401: { description: 'Unauthorized' },
            404: { description: 'Team not found' },
          },
        },
        patch: {
          summary: 'Update team',
          description: 'Updates team information.',
          tags: ['Employee - Teams'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'teamId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UpdateTeamRequest' },
              },
            },
          },
          responses: {
            200: {
              description: 'Team updated successfully',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/ApiResponse' },
                      {
                        type: 'object',
                        properties: {
                          data: { $ref: '#/components/schemas/Team' },
                        },
                      },
                    ],
                  },
                },
              },
            },
            401: { description: 'Unauthorized' },
            404: { description: 'Team not found' },
          },
        },
      },
      '/api/teams/{teamId}/deactivate': {
        post: {
          summary: 'Deactivate team',
          description: 'Deactivates a team.',
          tags: ['Employee - Teams'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'teamId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            200: {
              description: 'Team deactivated successfully',
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
                              id: { type: 'string', format: 'uuid', example: 't1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' },
                              active: { type: 'boolean', example: false },
                            },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            401: { description: 'Unauthorized' },
            404: { description: 'Team not found' },
          },
        },
      },
      '/api/roles': {
        get: {
          summary: 'List employee roles',
          description: 'Retrieves a list of organizational employee roles.',
          tags: ['Employee - Roles'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'page', in: 'query', required: false, schema: { type: 'integer', default: 1 } },
            { name: 'page_size', in: 'query', required: false, schema: { type: 'integer', default: 20 } },
          ],
          responses: {
            200: {
              description: 'Roles retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/ApiCollectionResponse' },
                      {
                        type: 'object',
                        properties: {
                          data: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/EmployeeRole' },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            401: { description: 'Unauthorized' },
          },
        },
        post: {
          summary: 'Create employee role',
          description: 'Creates a new organizational role.',
          tags: ['Employee - Roles'],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreateEmployeeRoleRequest' },
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
                          data: { $ref: '#/components/schemas/EmployeeRole' },
                        },
                      },
                    ],
                  },
                },
              },
            },
            400: { description: 'Bad request' },
            401: { description: 'Unauthorized' },
          },
        },
      },
      '/api/roles/{roleId}': {
        get: {
          summary: 'Get employee role by ID',
          description: 'Retrieves details of an organizational role.',
          tags: ['Employee - Roles'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'roleId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            200: {
              description: 'Role retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/ApiResponse' },
                      {
                        type: 'object',
                        properties: {
                          data: { $ref: '#/components/schemas/EmployeeRole' },
                        },
                      },
                    ],
                  },
                },
              },
            },
            401: { description: 'Unauthorized' },
            404: { description: 'Role not found' },
          },
        },
        patch: {
          summary: 'Update employee role',
          description: 'Updates an organizational role.',
          tags: ['Employee - Roles'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'roleId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UpdateEmployeeRoleRequest' },
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
                          data: { $ref: '#/components/schemas/EmployeeRole' },
                        },
                      },
                    ],
                  },
                },
              },
            },
            401: { description: 'Unauthorized' },
            404: { description: 'Role not found' },
          },
        },
      },
      '/api/roles/{roleId}/deactivate': {
        post: {
          summary: 'Deactivate employee role',
          description: 'Deactivates an organizational role.',
          tags: ['Employee - Roles'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'roleId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            200: {
              description: 'Role deactivated successfully',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/ApiResponse' },
                      {
                        type: 'object',
                        properties: {
                          data: { $ref: '#/components/schemas/EmployeeRole' },
                        },
                      },
                    ],
                  },
                },
              },
            },
            401: { description: 'Unauthorized' },
            404: { description: 'Role not found' },
          },
        },
      },
      '/api/job-levels': {
        get: {
          summary: 'List job levels',
          description: 'Retrieves job levels ordered by rank.',
          tags: ['Employee - Job Levels'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'page', in: 'query', required: false, schema: { type: 'integer', default: 1 } },
            { name: 'page_size', in: 'query', required: false, schema: { type: 'integer', default: 20 } },
          ],
          responses: {
            200: {
              description: 'Job levels retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/ApiCollectionResponse' },
                      {
                        type: 'object',
                        properties: {
                          data: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/JobLevel' },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            401: { description: 'Unauthorized' },
          },
        },
        post: {
          summary: 'Create job level',
          description: 'Creates a new job level with rank.',
          tags: ['Employee - Job Levels'],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreateJobLevelRequest' },
              },
            },
          },
          responses: {
            201: {
              description: 'Job level created successfully',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/ApiResponse' },
                      {
                        type: 'object',
                        properties: {
                          data: { $ref: '#/components/schemas/JobLevel' },
                        },
                      },
                    ],
                  },
                },
              },
            },
            400: { description: 'Bad request' },
            401: { description: 'Unauthorized' },
          },
        },
      },
      '/api/job-levels/{jobLevelId}': {
        get: {
          summary: 'Get job level by ID',
          description: 'Retrieves details of a job level.',
          tags: ['Employee - Job Levels'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'jobLevelId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            200: {
              description: 'Job level retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/ApiResponse' },
                      {
                        type: 'object',
                        properties: {
                          data: { $ref: '#/components/schemas/JobLevel' },
                        },
                      },
                    ],
                  },
                },
              },
            },
            401: { description: 'Unauthorized' },
            404: { description: 'Job level not found' },
          },
        },
        patch: {
          summary: 'Update job level',
          description: 'Updates job level attributes.',
          tags: ['Employee - Job Levels'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'jobLevelId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UpdateJobLevelRequest' },
              },
            },
          },
          responses: {
            200: {
              description: 'Job level updated successfully',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/ApiResponse' },
                      {
                        type: 'object',
                        properties: {
                          data: { $ref: '#/components/schemas/JobLevel' },
                        },
                      },
                    ],
                  },
                },
              },
            },
            401: { description: 'Unauthorized' },
            404: { description: 'Job level not found' },
          },
        },
      },
      '/api/job-levels/{jobLevelId}/deactivate': {
        post: {
          summary: 'Deactivate job level',
          description: 'Deactivates a job level.',
          tags: ['Employee - Job Levels'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'jobLevelId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            200: {
              description: 'Job level deactivated successfully',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/ApiResponse' },
                      {
                        type: 'object',
                        properties: {
                          data: { $ref: '#/components/schemas/JobLevel' },
                        },
                      },
                    ],
                  },
                },
              },
            },
            401: { description: 'Unauthorized' },
            404: { description: 'Job level not found' },
          },
        },
      },
      '/api/employee-imports/templates/{version}/download': {
        get: {
          summary: 'Download import template',
          description: 'Retrieves download link for CSV employee import template by version.',
          tags: ['Employee - Imports'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'version', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: {
            200: {
              description: 'Template download link retrieved successfully',
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
                              url: { type: 'string', example: '/api/v1/employee-imports/template.csv' },
                            },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            401: { description: 'Unauthorized' },
          },
        },
      },
      '/api/employee-imports': {
        get: {
          summary: 'List employee import jobs',
          description: 'Retrieves history of employee import jobs.',
          tags: ['Employee - Imports'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'page', in: 'query', required: false, schema: { type: 'integer', default: 1 } },
            { name: 'page_size', in: 'query', required: false, schema: { type: 'integer', default: 20 } },
          ],
          responses: {
            200: {
              description: 'Import jobs retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/ApiCollectionResponse' },
                      {
                        type: 'object',
                        properties: {
                          data: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/EmployeeImportJob' },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            401: { description: 'Unauthorized' },
          },
        },
        post: {
          summary: 'Create import job',
          description: 'Initializes a new employee CSV import job.',
          tags: ['Employee - Imports'],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: false,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreateImportJobRequest' },
              },
            },
          },
          responses: {
            202: {
              description: 'Import job created successfully',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/ApiResponse' },
                      {
                        type: 'object',
                        properties: {
                          data: { $ref: '#/components/schemas/EmployeeImportJob' },
                        },
                      },
                    ],
                  },
                },
              },
            },
            401: { description: 'Unauthorized' },
          },
        },
      },
      '/api/employee-imports/{importJobId}': {
        get: {
          summary: 'Get import job status',
          description: 'Retrieves details and status of an import job.',
          tags: ['Employee - Imports'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'importJobId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            200: {
              description: 'Import job retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/ApiResponse' },
                      {
                        type: 'object',
                        properties: {
                          data: { $ref: '#/components/schemas/EmployeeImportJob' },
                        },
                      },
                    ],
                  },
                },
              },
            },
            401: { description: 'Unauthorized' },
            404: { description: 'Import job not found' },
          },
        },
      },
      '/api/employee-imports/{importJobId}/preview': {
        get: {
          summary: 'Preview import job data',
          description: 'Previews parsed data and validation results for an import job.',
          tags: ['Employee - Imports'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'importJobId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            200: {
              description: 'Import job preview retrieved successfully',
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
                              id: { type: 'string' },
                              rows: { type: 'array', items: { type: 'object' } },
                            },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            401: { description: 'Unauthorized' },
            404: { description: 'Import job not found' },
          },
        },
      },
      '/api/employee-imports/{importJobId}/confirm': {
        post: {
          summary: 'Confirm import job',
          description: 'Confirms and processes the imported employee records.',
          tags: ['Employee - Imports'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'importJobId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            200: {
              description: 'Import job confirmed',
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
                              id: { type: 'string' },
                              status: { type: 'string', example: 'COMPLETED' },
                            },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            401: { description: 'Unauthorized' },
            404: { description: 'Import job not found' },
          },
        },
      },

      // ── Configuration Module Routes ──────────────────────────────────────────
      '/api/v1/configuration/criteria': {
        get: {
          summary: 'List criteria',
          description: 'Retrieves a list of evaluation criteria.',
          tags: ['Configuration - Criteria'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'category', in: 'query', required: false, schema: { type: 'string' } },
            { name: 'status', in: 'query', required: false, schema: { type: 'string' } },
          ],
          responses: {
            200: { description: 'Criteria list retrieved successfully' },
            401: { description: 'Unauthorized' },
            403: { description: 'Forbidden' },
          },
        },
        post: {
          summary: 'Create criterion',
          description: 'Creates a new evaluation criterion.',
          tags: ['Configuration - Criteria'],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object' } } },
          },
          responses: {
            201: { description: 'Criterion created successfully' },
            401: { description: 'Unauthorized' },
            403: { description: 'Forbidden' },
          },
        },
      },
      '/api/v1/configuration/criteria/{criterionId}': {
        get: {
          summary: 'Get criterion by ID',
          description: 'Retrieves details of a specific evaluation criterion.',
          tags: ['Configuration - Criteria'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'criterionId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            200: { description: 'Criterion retrieved successfully' },
            401: { description: 'Unauthorized' },
            404: { description: 'Criterion not found' },
          },
        },
        put: {
          summary: 'Update criterion',
          description: 'Updates an existing evaluation criterion.',
          tags: ['Configuration - Criteria'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'criterionId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object' } } },
          },
          responses: {
            200: { description: 'Criterion updated successfully' },
            401: { description: 'Unauthorized' },
            404: { description: 'Criterion not found' },
          },
        },
      },
      '/api/v1/configuration/criteria/{criterionId}/activate': {
        post: {
          summary: 'Activate criterion',
          description: 'Activates an evaluation criterion.',
          tags: ['Configuration - Criteria'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'criterionId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            200: { description: 'Criterion activated successfully' },
            401: { description: 'Unauthorized' },
            404: { description: 'Criterion not found' },
          },
        },
      },
      '/api/v1/configuration/criteria/{criterionId}/deactivate': {
        post: {
          summary: 'Deactivate criterion',
          description: 'Deactivates an evaluation criterion.',
          tags: ['Configuration - Criteria'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'criterionId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            200: { description: 'Criterion deactivated successfully' },
            401: { description: 'Unauthorized' },
            404: { description: 'Criterion not found' },
          },
        },
      },
      '/api/v1/configuration/criteria/{criterionId}/versions': {
        get: {
          summary: 'Get criterion versions',
          description: 'Retrieves version history for a criterion.',
          tags: ['Configuration - Criteria'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'criterionId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            200: { description: 'Criterion versions retrieved successfully' },
            401: { description: 'Unauthorized' },
          },
        },
        post: {
          summary: 'Create criterion version',
          description: 'Creates a new version for a criterion.',
          tags: ['Configuration - Criteria'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'criterionId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object' } } },
          },
          responses: {
            201: { description: 'Criterion version created successfully' },
            401: { description: 'Unauthorized' },
          },
        },
      },
      '/api/v1/configuration/criteria/{criterionId}/versions/{versionId}': {
        get: {
          summary: 'Get criterion version by ID',
          description: 'Retrieves details of a specific criterion version.',
          tags: ['Configuration - Criteria'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'criterionId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
            { name: 'versionId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            200: { description: 'Criterion version retrieved successfully' },
            401: { description: 'Unauthorized' },
            404: { description: 'Version not found' },
          },
        },
        put: {
          summary: 'Update criterion version',
          description: 'Updates a specific criterion version.',
          tags: ['Configuration - Criteria'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'criterionId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
            { name: 'versionId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object' } } },
          },
          responses: {
            200: { description: 'Criterion version updated successfully' },
            401: { description: 'Unauthorized' },
            404: { description: 'Version not found' },
          },
        },
      },
      '/api/v1/configuration/criteria/{criterionId}/versions/{versionId}/publish': {
        post: {
          summary: 'Publish criterion version',
          description: 'Publishes a criterion version.',
          tags: ['Configuration - Criteria'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'criterionId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
            { name: 'versionId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            200: { description: 'Criterion version published successfully' },
            401: { description: 'Unauthorized' },
            404: { description: 'Version not found' },
          },
        },
      },
      '/api/v1/configuration/levels': {
        get: {
          summary: 'List evaluation levels',
          description: 'Retrieves all evaluation levels.',
          tags: ['Configuration - Levels'],
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'Levels retrieved successfully' },
            401: { description: 'Unauthorized' },
          },
        },
        post: {
          summary: 'Create evaluation level',
          description: 'Creates a new evaluation level.',
          tags: ['Configuration - Levels'],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object' } } },
          },
          responses: {
            201: { description: 'Evaluation level created successfully' },
            401: { description: 'Unauthorized' },
          },
        },
      },
      '/api/v1/configuration/levels/{id}': {
        get: {
          summary: 'Get evaluation level by ID',
          description: 'Retrieves a single evaluation level.',
          tags: ['Configuration - Levels'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            200: { description: 'Evaluation level retrieved successfully' },
            401: { description: 'Unauthorized' },
            404: { description: 'Level not found' },
          },
        },
        put: {
          summary: 'Update evaluation level',
          description: 'Updates an evaluation level.',
          tags: ['Configuration - Levels'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object' } } },
          },
          responses: {
            200: { description: 'Evaluation level updated successfully' },
            401: { description: 'Unauthorized' },
            404: { description: 'Level not found' },
          },
        },
      },
      '/api/v1/configuration/levels/{id}/activate': {
        post: {
          summary: 'Activate evaluation level',
          description: 'Activates an evaluation level.',
          tags: ['Configuration - Levels'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            200: { description: 'Evaluation level activated successfully' },
            401: { description: 'Unauthorized' },
          },
        },
      },
      '/api/v1/configuration/levels/{id}/deactivate': {
        post: {
          summary: 'Deactivate evaluation level',
          description: 'Deactivates an evaluation level.',
          tags: ['Configuration - Levels'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            200: { description: 'Evaluation level deactivated successfully' },
            401: { description: 'Unauthorized' },
          },
        },
      },
      '/api/v1/configuration/scoring-rules': {
        get: {
          summary: 'List scoring rules',
          description: 'Retrieves all scoring rules.',
          tags: ['Configuration - Scoring Rules'],
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'Scoring rules retrieved successfully' },
            401: { description: 'Unauthorized' },
          },
        },
        post: {
          summary: 'Create scoring rule',
          description: 'Creates a new scoring rule.',
          tags: ['Configuration - Scoring Rules'],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object' } } },
          },
          responses: {
            201: { description: 'Scoring rule created successfully' },
            401: { description: 'Unauthorized' },
          },
        },
      },
      '/api/v1/configuration/scoring-rules/{id}': {
        get: {
          summary: 'Get scoring rule by ID',
          description: 'Retrieves details of a scoring rule.',
          tags: ['Configuration - Scoring Rules'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            200: { description: 'Scoring rule retrieved successfully' },
            401: { description: 'Unauthorized' },
            404: { description: 'Scoring rule not found' },
          },
        },
        put: {
          summary: 'Update scoring rule',
          description: 'Updates a scoring rule.',
          tags: ['Configuration - Scoring Rules'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object' } } },
          },
          responses: {
            200: { description: 'Scoring rule updated successfully' },
            401: { description: 'Unauthorized' },
            404: { description: 'Scoring rule not found' },
          },
        },
      },
      '/api/v1/configuration/scoring-rules/{id}/validate': {
        post: {
          summary: 'Validate scoring rule',
          description: 'Validates a scoring rule configuration.',
          tags: ['Configuration - Scoring Rules'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            200: { description: 'Scoring rule validation completed' },
            401: { description: 'Unauthorized' },
          },
        },
      },
      '/api/v1/configuration/scoring-rules/{id}/publish': {
        post: {
          summary: 'Publish scoring rule',
          description: 'Publishes a scoring rule.',
          tags: ['Configuration - Scoring Rules'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            200: { description: 'Scoring rule published successfully' },
            401: { description: 'Unauthorized' },
          },
        },
      },
      '/api/v1/configuration/templates': {
        get: {
          summary: 'List templates',
          description: 'Retrieves all evaluation templates.',
          tags: ['Configuration - Templates'],
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'Templates retrieved successfully' },
            401: { description: 'Unauthorized' },
          },
        },
        post: {
          summary: 'Create template',
          description: 'Creates a new evaluation template.',
          tags: ['Configuration - Templates'],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object' } } },
          },
          responses: {
            201: { description: 'Template created successfully' },
            401: { description: 'Unauthorized' },
          },
        },
      },
      '/api/v1/configuration/templates/{id}': {
        get: {
          summary: 'Get template by ID',
          description: 'Retrieves details of an evaluation template.',
          tags: ['Configuration - Templates'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            200: { description: 'Template retrieved successfully' },
            401: { description: 'Unauthorized' },
            404: { description: 'Template not found' },
          },
        },
        put: {
          summary: 'Update template',
          description: 'Updates an evaluation template.',
          tags: ['Configuration - Templates'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object' } } },
          },
          responses: {
            200: { description: 'Template updated successfully' },
            401: { description: 'Unauthorized' },
            404: { description: 'Template not found' },
          },
        },
      },
      '/api/v1/configuration/templates/{id}/activate': {
        post: {
          summary: 'Activate template',
          description: 'Activates an evaluation template.',
          tags: ['Configuration - Templates'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            200: { description: 'Template activated successfully' },
            401: { description: 'Unauthorized' },
          },
        },
      },
      '/api/v1/configuration/templates/{id}/deactivate': {
        post: {
          summary: 'Deactivate template',
          description: 'Deactivates an evaluation template.',
          tags: ['Configuration - Templates'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            200: { description: 'Template deactivated successfully' },
            401: { description: 'Unauthorized' },
          },
        },
      },
      '/api/v1/configuration/templates/{templateId}/versions': {
        get: {
          summary: 'List template versions',
          description: 'Retrieves all versions of an evaluation template.',
          tags: ['Configuration - Templates'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'templateId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            200: { description: 'Template versions retrieved successfully' },
            401: { description: 'Unauthorized' },
          },
        },
        post: {
          summary: 'Create template version',
          description: 'Creates a new version for an evaluation template.',
          tags: ['Configuration - Templates'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'templateId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object' } } },
          },
          responses: {
            201: { description: 'Template version created successfully' },
            401: { description: 'Unauthorized' },
          },
        },
      },
      '/api/v1/configuration/templates/{templateId}/versions/{versionId}': {
        get: {
          summary: 'Get template version by ID',
          description: 'Retrieves details of a specific template version.',
          tags: ['Configuration - Templates'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'templateId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
            { name: 'versionId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            200: { description: 'Template version retrieved successfully' },
            401: { description: 'Unauthorized' },
            404: { description: 'Version not found' },
          },
        },
        put: {
          summary: 'Update template version',
          description: 'Updates a specific template version.',
          tags: ['Configuration - Templates'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'templateId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
            { name: 'versionId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object' } } },
          },
          responses: {
            200: { description: 'Template version updated successfully' },
            401: { description: 'Unauthorized' },
            404: { description: 'Version not found' },
          },
        },
      },
      '/api/v1/configuration/templates/{templateId}/versions/{versionId}/validate': {
        post: {
          summary: 'Validate template version',
          description: 'Validates a template version.',
          tags: ['Configuration - Templates'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'templateId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
            { name: 'versionId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            200: { description: 'Template version validated' },
            401: { description: 'Unauthorized' },
          },
        },
      },
      '/api/v1/configuration/templates/{templateId}/versions/{versionId}/publish': {
        post: {
          summary: 'Publish template version',
          description: 'Publishes a template version.',
          tags: ['Configuration - Templates'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'templateId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
            { name: 'versionId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            200: { description: 'Template version published successfully' },
            401: { description: 'Unauthorized' },
          },
        },
      },
      '/api/v1/configuration/templates/{templateId}/versions/{versionId}/retire': {
        post: {
          summary: 'Retire template version',
          description: 'Retires a template version.',
          tags: ['Configuration - Templates'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'templateId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
            { name: 'versionId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            200: { description: 'Template version retired successfully' },
            401: { description: 'Unauthorized' },
          },
        },
      },
      '/api/v1/configuration/templates/{templateId}/versions/{versionId}/clone': {
        post: {
          summary: 'Clone template version',
          description: 'Clones a template version into a new version.',
          tags: ['Configuration - Templates'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'templateId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
            { name: 'versionId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            201: { description: 'Template version cloned successfully' },
            401: { description: 'Unauthorized' },
          },
        },
      },
      '/api/v1/configuration/templates/{templateId}/versions/{versionId}/snapshot': {
        get: {
          summary: 'Get template version snapshot',
          description: 'Retrieves full frozen snapshot of a template version.',
          tags: ['Configuration - Templates'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'templateId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
            { name: 'versionId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            200: { description: 'Template snapshot retrieved successfully' },
            401: { description: 'Unauthorized' },
          },
        },
      },
      '/api/v1/configuration/templates/{templateId}/versions/{fromVersion}/diff/{toVersion}': {
        get: {
          summary: 'Diff template versions',
          description: 'Compares two versions of a template.',
          tags: ['Configuration - Templates'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'templateId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
            { name: 'fromVersion', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
            { name: 'toVersion', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            200: { description: 'Diff generated successfully' },
            401: { description: 'Unauthorized' },
          },
        },
      },
      '/api/v1/configuration/templates/{templateId}/versions/{versionId}/criteria': {
        get: {
          summary: 'Get template criteria',
          description: 'Retrieves criteria assigned to a template version.',
          tags: ['Configuration - Templates'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'templateId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
            { name: 'versionId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            200: { description: 'Template criteria retrieved successfully' },
            401: { description: 'Unauthorized' },
          },
        },
        post: {
          summary: 'Add criterion to template version',
          description: 'Adds a criterion to a template version.',
          tags: ['Configuration - Templates'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'templateId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
            { name: 'versionId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object' } } },
          },
          responses: {
            201: { description: 'Criterion added to template version successfully' },
            401: { description: 'Unauthorized' },
          },
        },
        put: {
          summary: 'Bulk update template criteria',
          description: 'Updates multiple criteria bindings in a template version.',
          tags: ['Configuration - Templates'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'templateId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
            { name: 'versionId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object' } } },
          },
          responses: {
            200: { description: 'Template criteria updated successfully' },
            401: { description: 'Unauthorized' },
          },
        },
      },
      '/api/v1/configuration/templates/{templateId}/versions/{versionId}/criteria/{id}': {
        delete: {
          summary: 'Remove criterion from template version',
          description: 'Removes a criterion from a template version.',
          tags: ['Configuration - Templates'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'templateId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
            { name: 'versionId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            200: { description: 'Criterion removed from template version' },
            401: { description: 'Unauthorized' },
          },
        },
      },
      '/api/v1/configuration/role-overrides': {
        get: {
          summary: 'List role overrides',
          description: 'Retrieves all role-level configuration overrides.',
          tags: ['Configuration - Overrides'],
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'Role overrides retrieved successfully' },
            401: { description: 'Unauthorized' },
          },
        },
        post: {
          summary: 'Create role override',
          description: 'Creates a role-level configuration override.',
          tags: ['Configuration - Overrides'],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object' } } },
          },
          responses: {
            201: { description: 'Role override created successfully' },
            401: { description: 'Unauthorized' },
          },
        },
      },
      '/api/v1/configuration/role-overrides/{id}': {
        get: {
          summary: 'Get role override by ID',
          description: 'Retrieves details of a role override.',
          tags: ['Configuration - Overrides'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            200: { description: 'Role override retrieved successfully' },
            401: { description: 'Unauthorized' },
            404: { description: 'Override not found' },
          },
        },
        put: {
          summary: 'Update role override',
          description: 'Updates a role override.',
          tags: ['Configuration - Overrides'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object' } } },
          },
          responses: {
            200: { description: 'Role override updated successfully' },
            401: { description: 'Unauthorized' },
            404: { description: 'Override not found' },
          },
        },
        delete: {
          summary: 'Delete role override',
          description: 'Deletes a role override.',
          tags: ['Configuration - Overrides'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            200: { description: 'Role override deleted successfully' },
            401: { description: 'Unauthorized' },
            404: { description: 'Override not found' },
          },
        },
      },
      '/api/v1/configuration/team-overrides': {
        get: {
          summary: 'List team overrides',
          description: 'Retrieves all team-level configuration overrides.',
          tags: ['Configuration - Overrides'],
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'Team overrides retrieved successfully' },
            401: { description: 'Unauthorized' },
          },
        },
        post: {
          summary: 'Create team override',
          description: 'Creates a team-level configuration override.',
          tags: ['Configuration - Overrides'],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object' } } },
          },
          responses: {
            201: { description: 'Team override created successfully' },
            401: { description: 'Unauthorized' },
          },
        },
      },
      '/api/v1/configuration/team-overrides/{id}': {
        get: {
          summary: 'Get team override by ID',
          description: 'Retrieves details of a team override.',
          tags: ['Configuration - Overrides'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            200: { description: 'Team override retrieved successfully' },
            401: { description: 'Unauthorized' },
            404: { description: 'Override not found' },
          },
        },
        put: {
          summary: 'Update team override',
          description: 'Updates a team override.',
          tags: ['Configuration - Overrides'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object' } } },
          },
          responses: {
            200: { description: 'Team override updated successfully' },
            401: { description: 'Unauthorized' },
            404: { description: 'Override not found' },
          },
        },
        delete: {
          summary: 'Delete team override',
          description: 'Deletes a team override.',
          tags: ['Configuration - Overrides'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            200: { description: 'Team override deleted successfully' },
            401: { description: 'Unauthorized' },
            404: { description: 'Override not found' },
          },
        },
      },
      '/api/v1/configuration/template-overrides': {
        get: {
          summary: 'List template overrides',
          description: 'Retrieves all template-level configuration overrides.',
          tags: ['Configuration - Overrides'],
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'Template overrides retrieved successfully' },
            401: { description: 'Unauthorized' },
          },
        },
        post: {
          summary: 'Create template override',
          description: 'Creates a template-level configuration override.',
          tags: ['Configuration - Overrides'],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object' } } },
          },
          responses: {
            201: { description: 'Template override created successfully' },
            401: { description: 'Unauthorized' },
          },
        },
      },
      '/api/v1/configuration/template-overrides/{id}': {
        get: {
          summary: 'Get template override by ID',
          description: 'Retrieves details of a template override.',
          tags: ['Configuration - Overrides'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            200: { description: 'Template override retrieved successfully' },
            401: { description: 'Unauthorized' },
            404: { description: 'Override not found' },
          },
        },
        put: {
          summary: 'Update template override',
          description: 'Updates a template override.',
          tags: ['Configuration - Overrides'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object' } } },
          },
          responses: {
            200: { description: 'Template override updated successfully' },
            401: { description: 'Unauthorized' },
            404: { description: 'Override not found' },
          },
        },
        delete: {
          summary: 'Delete template override',
          description: 'Deletes a template override.',
          tags: ['Configuration - Overrides'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            200: { description: 'Template override deleted successfully' },
            401: { description: 'Unauthorized' },
            404: { description: 'Override not found' },
          },
        },
      },
      '/api/v1/configuration/effective-configurations/resolve': {
        post: {
          summary: 'Resolve effective configuration',
          description: 'Resolves effective configuration for a target evaluation context.',
          tags: ['Configuration - Effective Config'],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object' } } },
          },
          responses: {
            200: { description: 'Effective configuration resolved successfully' },
            401: { description: 'Unauthorized' },
          },
        },
      },
      '/api/v1/configuration/effective-configurations/preview': {
        post: {
          summary: 'Preview effective configuration',
          description: 'Previews effective configuration resolution with candidate overrides.',
          tags: ['Configuration - Effective Config'],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object' } } },
          },
          responses: {
            200: { description: 'Effective configuration previewed successfully' },
            401: { description: 'Unauthorized' },
          },
        },
      },
      '/api/v1/configuration/validate': {
        post: {
          summary: 'Validate global configuration',
          description: 'Validates entire system configuration matrix.',
          tags: ['Configuration - Effective Config'],
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'Global configuration validation succeeded' },
            401: { description: 'Unauthorized' },
          },
        },
      },
      '/api/v1/configuration/workflows': {
        get: {
          summary: 'List workflows',
          description: 'Retrieves all evaluation workflow definitions.',
          tags: ['Configuration - Workflows'],
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'Workflows retrieved successfully' },
            401: { description: 'Unauthorized' },
          },
        },
        post: {
          summary: 'Create workflow',
          description: 'Creates a new workflow definition.',
          tags: ['Configuration - Workflows'],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object' } } },
          },
          responses: {
            201: { description: 'Workflow created successfully' },
            401: { description: 'Unauthorized' },
          },
        },
      },
      '/api/v1/configuration/workflows/{id}': {
        get: {
          summary: 'Get workflow by ID',
          description: 'Retrieves details of a workflow definition.',
          tags: ['Configuration - Workflows'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            200: { description: 'Workflow retrieved successfully' },
            401: { description: 'Unauthorized' },
            404: { description: 'Workflow not found' },
          },
        },
        put: {
          summary: 'Update workflow',
          description: 'Updates a workflow definition.',
          tags: ['Configuration - Workflows'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object' } } },
          },
          responses: {
            200: { description: 'Workflow updated successfully' },
            401: { description: 'Unauthorized' },
            404: { description: 'Workflow not found' },
          },
        },
      },
      '/api/v1/configuration/workflows/{id}/states': {
        get: {
          summary: 'Get workflow states',
          description: 'Retrieves states for a workflow.',
          tags: ['Configuration - Workflows'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            200: { description: 'Workflow states retrieved successfully' },
            401: { description: 'Unauthorized' },
          },
        },
        post: {
          summary: 'Add workflow state',
          description: 'Adds a state to a workflow.',
          tags: ['Configuration - Workflows'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object' } } },
          },
          responses: {
            201: { description: 'Workflow state added successfully' },
            401: { description: 'Unauthorized' },
          },
        },
      },
      '/api/v1/configuration/workflows/{id}/transitions': {
        get: {
          summary: 'Get workflow transitions',
          description: 'Retrieves state transitions for a workflow.',
          tags: ['Configuration - Workflows'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            200: { description: 'Workflow transitions retrieved successfully' },
            401: { description: 'Unauthorized' },
          },
        },
        post: {
          summary: 'Add workflow transition',
          description: 'Adds a state transition to a workflow.',
          tags: ['Configuration - Workflows'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object' } } },
          },
          responses: {
            201: { description: 'Workflow transition added successfully' },
            401: { description: 'Unauthorized' },
          },
        },
      },
      '/api/v1/configuration/workflows/{id}/validate': {
        post: {
          summary: 'Validate workflow',
          description: 'Validates a workflow structure and graph integrity.',
          tags: ['Configuration - Workflows'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            200: { description: 'Workflow validation completed' },
            401: { description: 'Unauthorized' },
          },
        },
      },
      '/api/v1/configuration/workflows/{id}/publish': {
        post: {
          summary: 'Publish workflow',
          description: 'Publishes a workflow definition.',
          tags: ['Configuration - Workflows'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            200: { description: 'Workflow published successfully' },
            401: { description: 'Unauthorized' },
          },
        },
      },
      '/api/v1/configuration/audit-logs': {
        get: {
          summary: 'List configuration audit logs',
          description: 'Retrieves audit logs for configuration changes.',
          tags: ['Configuration - Audit Logs'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'page', in: 'query', required: false, schema: { type: 'integer', default: 1 } },
            { name: 'page_size', in: 'query', required: false, schema: { type: 'integer', default: 20 } },
          ],
          responses: {
            200: { description: 'Audit logs retrieved successfully' },
            401: { description: 'Unauthorized' },
            403: { description: 'Forbidden' },
          },
        },
      },
      '/api/v1/configuration/audit-logs/{id}': {
        get: {
          summary: 'Get audit log by ID',
          description: 'Retrieves details of a specific configuration audit log.',
          tags: ['Configuration - Audit Logs'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            200: { description: 'Audit log retrieved successfully' },
            401: { description: 'Unauthorized' },
            404: { description: 'Audit log not found' },
          },
        },
      },
    },
  },
  apis: [],
};

export const swaggerSpec = swaggerJsdoc(swaggerOptions);
