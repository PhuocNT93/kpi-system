import { SafeUser, User, UserRepository } from '../domain/user.model.js';
import { PasswordHasher } from './password-hasher.service.js';
import { TokenService } from './token.service.js';
import { GoogleIdentityVerifier } from './google-identity-verifier.service.js';
import { IAuthorizer, Actor } from '../../../shared/auth/types.js';
import { BadRequest, Unauthenticated, ValidationError } from '../../../api/app-error.js';

export interface SignupDTO {
  email?: string;
  password?: string;
  name?: string;
}

export interface LoginDTO {
  email?: string;
  password?: string;
}

export interface GoogleLoginDTO {
  id_token?: string;
}

export interface ChangePasswordDTO {
  currentPassword?: string;
  newPassword?: string;
}

export interface RefreshTokenDTO {
  refreshToken?: string;
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  user: SafeUser;
}

export interface RefreshTokenResult {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
}

export interface AuthServiceDependencies {
  userRepository: UserRepository;
  passwordHasher: PasswordHasher;
  tokenService: TokenService;
  authorizer?: IAuthorizer;
  actorResolver?: (user: User) => Promise<Actor>;
  ensureDefaultEmployeeRole?: (userId: string) => Promise<void>;
  googleIdentityVerifier?: GoogleIdentityVerifier;
}

export class AuthService {
  private userRepository: UserRepository;
  private passwordHasher: PasswordHasher;
  private tokenService: TokenService;
  private authorizer?: IAuthorizer;
  private actorResolver?: (user: User) => Promise<Actor>;
  private ensureDefaultEmployeeRole?: (userId: string) => Promise<void>;
  private googleIdentityVerifier?: GoogleIdentityVerifier;

  constructor(deps: AuthServiceDependencies) {
    this.userRepository = deps.userRepository;
    this.passwordHasher = deps.passwordHasher;
    this.tokenService = deps.tokenService;
    this.authorizer = deps.authorizer;
    this.actorResolver = deps.actorResolver;
    this.ensureDefaultEmployeeRole = deps.ensureDefaultEmployeeRole;
    this.googleIdentityVerifier = deps.googleIdentityVerifier;
  }

  private toSafeUser(user: User): SafeUser {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, googleSubject, ...safeUser } = user;
    return safeUser;
  }

  async signup(dto: SignupDTO): Promise<SafeUser> {
    const details = [];

    if (!dto.email || !dto.email.trim()) {
      details.push({ field: 'email', code: 'REQUIRED', message: 'Email is required' });
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dto.email.trim())) {
      details.push({ field: 'email', code: 'INVALID_FORMAT', message: 'Email format is invalid' });
    }

    if (!dto.password) {
      details.push({ field: 'password', code: 'REQUIRED', message: 'Password is required' });
    } else if (dto.password.length < 6) {
      details.push({ field: 'password', code: 'TOO_SHORT', message: 'Password must be at least 6 characters long' });
    }

    if (!dto.name || !dto.name.trim()) {
      details.push({ field: 'name', code: 'REQUIRED', message: 'Name is required' });
    }

    if (details.length > 0) {
      throw new ValidationError('Validation failed for signup', details);
    }

    const email = dto.email!.trim().toLowerCase();
    const existing = await this.userRepository.findByEmail(email);
    if (existing) {
      throw new BadRequest('Email is already registered', 'DUPLICATE_EMAIL', 'email');
    }

    const passwordHash = await this.passwordHasher.hash(dto.password!);

    const newUser = await this.userRepository.create({
      email,
      name: dto.name!.trim(),
      passwordHash,
    });

    return this.toSafeUser(newUser);
  }

  async login(dto: LoginDTO): Promise<LoginResult> {
    const details = [];

    if (!dto.email || !dto.email.trim()) {
      details.push({ field: 'email', code: 'REQUIRED', message: 'Email is required' });
    }

    if (!dto.password) {
      details.push({ field: 'password', code: 'REQUIRED', message: 'Password is required' });
    }

    if (details.length > 0) {
      throw new ValidationError('Validation failed for login', details);
    }

    const email = dto.email!.trim().toLowerCase();
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      throw new Unauthenticated('Invalid email or password');
    }

    const isMatch = user.passwordHash ? await this.passwordHasher.compare(dto.password!, user.passwordHash) : false;
    if (!isMatch) {
      throw new Unauthenticated('Invalid email or password');
    }

    return this.createLoginResult(user);
  }

  async loginWithGoogle(dto: GoogleLoginDTO): Promise<LoginResult> {
    if (!dto.id_token?.trim()) {
      throw new ValidationError('Validation failed for Google sign-in', [
        { field: 'id_token', code: 'REQUIRED', message: 'Google ID token is required' },
      ]);
    }
    if (!this.googleIdentityVerifier) {
      throw new BadRequest('Google sign-in is not configured.', 'GOOGLE_SIGN_IN_UNAVAILABLE');
    }

    const identity = await this.googleIdentityVerifier.verify(dto.id_token.trim());
    const employee = await this.userRepository.findActiveEmployeeByEmail(identity.email);
    if (!employee) {
      throw new Unauthenticated('Google account is not eligible to sign in.');
    }

    const user = await this.userRepository.linkGoogleIdentity(
      await this.userRepository.findByEmail(identity.email),
      employee.id,
      identity.subject,
      identity.email,
      employee.name
    );
    await this.ensureDefaultEmployeeRole?.(user.id);
    return this.createLoginResult(user);
  }

  private async createLoginResult(user: User): Promise<LoginResult> {
    const actor: Actor = this.actorResolver
      ? await this.actorResolver(user)
      : { userId: user.id, role: 'EMPLOYEE', employeeId: user.employeeId ?? undefined };
    const tokens = this.tokenService.generateTokens
      ? this.tokenService.generateTokens(actor)
      : { accessToken: this.tokenService.generateAccessToken(actor), refreshToken: this.tokenService.generateRefreshToken(actor) };
    return { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, tokenType: 'Bearer', user: this.toSafeUser(user) };
  }

  async refreshToken(dto: RefreshTokenDTO): Promise<RefreshTokenResult> {
    if (!dto || !dto.refreshToken || !dto.refreshToken.trim()) {
      throw new ValidationError('Validation failed for refresh token', [
        { field: 'refreshToken', code: 'REQUIRED', message: 'Refresh token is required' },
      ]);
    }

    const payload = this.tokenService.verifyRefreshToken(dto.refreshToken.trim());

    const user = await this.userRepository.findById(payload.sub);
    if (!user) {
      throw new Unauthenticated('User no longer exists');
    }

    const actor: Actor = this.actorResolver
      ? await this.actorResolver(user)
      : { userId: user.id, role: payload.role || 'EMPLOYEE', employeeId: user.employeeId ?? undefined };

    const tokens = this.tokenService.generateTokens
      ? this.tokenService.generateTokens(actor)
      : {
          accessToken: this.tokenService.generateAccessToken(actor),
          refreshToken: this.tokenService.generateRefreshToken(actor),
        };

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenType: 'Bearer',
    };
  }

  async changePassword(actor: Actor, dto: ChangePasswordDTO): Promise<SafeUser> {
    if (!actor || !actor.userId) {
      throw new Unauthenticated('Authentication required');
    }

    const details = [];

    if (!dto.currentPassword) {
      details.push({ field: 'currentPassword', code: 'REQUIRED', message: 'Current password is required' });
    }

    if (!dto.newPassword) {
      details.push({ field: 'newPassword', code: 'REQUIRED', message: 'New password is required' });
    } else if (dto.newPassword.length < 6) {
      details.push({ field: 'newPassword', code: 'TOO_SHORT', message: 'New password must be at least 6 characters long' });
    }

    if (details.length > 0) {
      throw new ValidationError('Validation failed for change password', details);
    }

    const user = await this.userRepository.findById(actor.userId);
    if (!user) {
      throw new Unauthenticated('User does not exist');
    }

    if (!user.passwordHash) {
      throw new BadRequest('Password is not available for this account.', 'PASSWORD_SIGN_IN_DISABLED');
    }

    const isMatch = await this.passwordHasher.compare(dto.currentPassword!, user.passwordHash);
    if (!isMatch) {
      throw new BadRequest('Current password is incorrect', 'INVALID_CURRENT_PASSWORD', 'currentPassword');
    }

    const newPasswordHash = await this.passwordHasher.hash(dto.newPassword!);
    const updatedUser = await this.userRepository.updatePassword(actor.userId, newPasswordHash);

    return this.toSafeUser(updatedUser);
  }
}
