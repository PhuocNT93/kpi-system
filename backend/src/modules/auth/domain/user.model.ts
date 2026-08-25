export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export type SafeUser = Omit<User, 'passwordHash'>;

export interface UserWithRoles extends User {
  roles: { roleCode: string; roleName: string }[];
}

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User>;
  updatePassword(userId: string, passwordHash: string): Promise<User>;
  findAllUsersWithRoles(): Promise<UserWithRoles[]>;
}
