export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string | null;
  employeeId: string | null;
  googleSubject: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateUser = Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'employeeId' | 'googleSubject'> & {
  employeeId?: string | null;
  googleSubject?: string | null;
};

export type SafeUser = Omit<User, 'passwordHash' | 'googleSubject'>;

export interface UserWithRoles extends User {
  roles: { roleCode: string; roleName: string }[];
}

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(user: CreateUser): Promise<User>;
  findActiveEmployeeByEmail(email: string): Promise<{ id: string; name: string } | null>;
  findManagedTeamIds(employeeId: string): Promise<string[]>;
  linkGoogleIdentity(user: User | null, employeeId: string, googleSubject: string, email: string, name: string): Promise<User>;
  updatePassword(userId: string, passwordHash: string): Promise<User>;
  findAllUsersWithRoles(): Promise<UserWithRoles[]>;
}
