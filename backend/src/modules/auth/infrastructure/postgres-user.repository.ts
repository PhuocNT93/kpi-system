import type { Pool } from 'pg';
import { CreateUser, User, UserRepository } from '../domain/user.model.js';
import { NotFound, Conflict } from '../../../api/app-error.js';

interface UserRow {
  id: string;
  email: string;
  name: string;
  password_hash: string | null;
  employee_id: string | null;
  google_subject: string | null;
  created_at: Date;
  updated_at: Date;
}

interface UserRoleSummary {
  roleCode: string;
  roleName: string;
}

interface UserWithRolesRow extends UserRow {
  roles: UserRoleSummary[];
}

export class PostgresUserRepository implements UserRepository {
  constructor(private readonly pool: Pool) {}

  private mapToUser(row: UserRow): User {
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      passwordHash: row.password_hash,
      employeeId: row.employee_id,
      googleSubject: row.google_subject,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async findById(id: string): Promise<User | null> {
    const query = `
      SELECT id, email, name, password_hash, employee_id, google_subject, created_at, updated_at
      FROM app_user
      WHERE id = $1
    `;
    const result = await this.pool.query<UserRow>(query, [id]);
    if (result.rows.length === 0) {
      return null;
    }
    return this.mapToUser(result.rows[0]!);
  }

  async findByEmail(email: string): Promise<User | null> {
    const normalizedEmail = email.toLowerCase().trim();
    const query = `
      SELECT id, email, name, password_hash, employee_id, google_subject, created_at, updated_at
      FROM app_user
      WHERE LOWER(email) = $1
    `;
    const result = await this.pool.query<UserRow>(query, [normalizedEmail]);
    if (result.rows.length === 0) {
      return null;
    }
    return this.mapToUser(result.rows[0]!);
  }

  async create(userData: CreateUser): Promise<User> {
    const normalizedEmail = userData.email.toLowerCase().trim();
    const existing = await this.findByEmail(normalizedEmail);
    if (existing) {
      throw new Conflict('Email is already registered', 'DUPLICATE_EMAIL');
    }

    const query = `
      INSERT INTO app_user (email, name, password_hash, employee_id, google_subject)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, email, name, password_hash, employee_id, google_subject, created_at, updated_at
    `;
    try {
      const result = await this.pool.query<UserRow>(query, [
        normalizedEmail,
        userData.name,
        userData.passwordHash,
        userData.employeeId ?? null,
        userData.googleSubject ?? null,
      ]);
      return this.mapToUser(result.rows[0]!);
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === '23505') {
        throw new Conflict('Email is already registered', 'DUPLICATE_EMAIL');
      }
      throw err;
    }
  }

  async findActiveEmployeeByEmail(email: string): Promise<{ id: string; name: string } | null> {
    const result = await this.pool.query<{ employee_id: string; full_name: string }>(
      `SELECT employee_id, full_name FROM employee WHERE LOWER(email) = $1 AND employment_status = 'ACTIVE'`,
      [email.toLowerCase().trim()]
    );
    const employee = result.rows[0];
    return employee ? { id: employee.employee_id, name: employee.full_name } : null;
  }

  async findManagedTeamIds(employeeId: string): Promise<string[]> {
    const result = await this.pool.query<{ team_id: string }>(
      `
        SELECT DISTINCT team_id
        FROM employee
        WHERE manager_id = $1
          AND employment_status = 'ACTIVE'
          AND team_id IS NOT NULL
      `,
      [employeeId]
    );
    return result.rows.map((team) => team.team_id);
  }

  async linkGoogleIdentity(user: User | null, employeeId: string, googleSubject: string, email: string, name: string): Promise<User> {
    try {
      const result = await this.pool.query<UserRow>(
        `
          INSERT INTO app_user (email, name, password_hash, employee_id, google_subject)
          VALUES ($1, $2, NULL, $3, $4)
          ON CONFLICT (email) DO UPDATE
            SET employee_id = EXCLUDED.employee_id,
                google_subject = EXCLUDED.google_subject,
                updated_at = CURRENT_TIMESTAMP
            WHERE (app_user.google_subject IS NULL OR app_user.google_subject = EXCLUDED.google_subject)
              AND (app_user.employee_id IS NULL OR app_user.employee_id = EXCLUDED.employee_id)
          RETURNING id, email, name, password_hash, employee_id, google_subject, created_at, updated_at
        `,
        [email.toLowerCase().trim(), user?.name || name, employeeId, googleSubject]
      );
      if (result.rows.length === 0) {
        throw new Conflict('Google account cannot be linked.', 'GOOGLE_IDENTITY_CONFLICT');
      }
      return this.mapToUser(result.rows[0]!);
    } catch (error: unknown) {
      if (error instanceof Conflict) {
        throw error;
      }
      if (typeof error === 'object' && error !== null && 'code' in error && (error as { code: string }).code === '23505') {
        throw new Conflict('Google account cannot be linked.', 'GOOGLE_IDENTITY_CONFLICT');
      }
      throw error;
    }
  }

  async updatePassword(userId: string, passwordHash: string): Promise<User> {
    const query = `
      UPDATE app_user
      SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, email, name, password_hash, employee_id, google_subject, created_at, updated_at
    `;
    const result = await this.pool.query<UserRow>(query, [passwordHash, userId]);
    if (result.rows.length === 0) {
      throw new NotFound('User');
    }
    return this.mapToUser(result.rows[0]!);
  }

  async findAllUsersWithRoles(): Promise<import('../domain/user.model.js').UserWithRoles[]> {
    const query = `
      SELECT 
        u.id, u.email, u.name, u.password_hash, u.employee_id, u.google_subject, u.created_at, u.updated_at,
        COALESCE(
          json_agg(
            json_build_object('roleCode', r.code, 'roleName', r.name)
          ) FILTER (WHERE r.code IS NOT NULL),
          '[]'
        ) as roles
      FROM app_user u
      LEFT JOIN user_role ur ON u.id::varchar = ur.user_id
      LEFT JOIN role r ON ur.role_id = r.role_id
      GROUP BY u.id
    `;
    const result = await this.pool.query<UserWithRolesRow>(query);
    return result.rows.map((row) => ({
      ...this.mapToUser(row),
      roles: row.roles,
    }));
  }
}
