import { User, UserRepository } from '../domain/user.model.js';
import { NotFound, Conflict } from '../../../api/app-error.js';

export class InMemoryUserRepository implements UserRepository {
  private users: Map<string, User> = new Map();
  private emailIndex: Map<string, string> = new Map(); // normalized email -> id

  async findById(id: string): Promise<User | null> {
    const user = this.users.get(id);
    return user ? { ...user } : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const normalizedEmail = email.toLowerCase().trim();
    const id = this.emailIndex.get(normalizedEmail);
    if (!id) return null;
    const user = this.users.get(id);
    return user ? { ...user } : null;
  }

  async create(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const normalizedEmail = userData.email.toLowerCase().trim();
    if (this.emailIndex.has(normalizedEmail)) {
      throw new Conflict('Email is already registered', 'DUPLICATE_EMAIL');
    }

    const id = crypto.randomUUID();
    const now = new Date();
    const user: User = {
      ...userData,
      email: normalizedEmail,
      id,
      createdAt: now,
      updatedAt: now,
    };

    this.users.set(id, user);
    this.emailIndex.set(normalizedEmail, id);
    return { ...user };
  }

  async updatePassword(userId: string, passwordHash: string): Promise<User> {
    const user = this.users.get(userId);
    if (!user) {
      throw new NotFound('User');
    }

    const updatedUser: User = {
      ...user,
      passwordHash,
      updatedAt: new Date(),
    };

    this.users.set(userId, updatedUser);
    return { ...updatedUser };
  }

  // Helper method for clean state during tests if needed
  clear(): void {
    this.users.clear();
    this.emailIndex.clear();
  }
}
