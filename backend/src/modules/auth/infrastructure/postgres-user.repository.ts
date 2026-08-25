import type { Pool } from 'pg';
import { User, UserRepository } from '../domain/user.model.js';
import { NotFound, Conflict } from '../../../api/app-error.js';

interface UserRow {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  created_at: Date;
  updated_at: Date;
}

export class PostgresUserRepository implements UserRepository {
  constructor(private readonly pool: Pool) {}

  private mapToUser(row: UserRow): User {
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      passwordHash: row.password_hash,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async findById(id: string): Promise<User | null> {
    const query = `
      SELECT id, email, name, password_hash, created_at, updated_at
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
      SELECT id, email, name, password_hash, created_at, updated_at
      FROM app_user
      WHERE LOWER(email) = $1
    `;
    const result = await this.pool.query<UserRow>(query, [normalizedEmail]);
    if (result.rows.length === 0) {
      return null;
    }
    return this.mapToUser(result.rows[0]!);
  }

  async create(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const normalizedEmail = userData.email.toLowerCase().trim();
    const existing = await this.findByEmail(normalizedEmail);
    if (existing) {
      throw new Conflict('Email is already registered', 'DUPLICATE_EMAIL');
    }

    const query = `
      INSERT INTO app_user (email, name, password_hash)
      VALUES ($1, $2, $3)
      RETURNING id, email, name, password_hash, created_at, updated_at
    `;
    try {
      const result = await this.pool.query<UserRow>(query, [
        normalizedEmail,
        userData.name,
        userData.passwordHash,
      ]);
      return this.mapToUser(result.rows[0]!);
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === '23505') {
        throw new Conflict('Email is already registered', 'DUPLICATE_EMAIL');
      }
      throw err;
    }
  }

  async updatePassword(userId: string, passwordHash: string): Promise<User> {
    const query = `
      UPDATE app_user
      SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, email, name, password_hash, created_at, updated_at
    `;
    const result = await this.pool.query<UserRow>(query, [passwordHash, userId]);
    if (result.rows.length === 0) {
      throw new NotFound('User');
    }
    return this.mapToUser(result.rows[0]!);
  }
}
