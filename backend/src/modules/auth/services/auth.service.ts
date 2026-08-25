import { SafeUser, User, UserRepository } from '../domain/user.model.js';
import { PasswordHasher } from './password-hasher.service.js';
import { TokenService } from './token.service.js';
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
  roleResolver?: (userId: string) => Promise<import('../../../shared/auth/types.js').UserRole>;
}

export class AuthService {
  private userRepository: UserRepository;
  private passwordHasher: PasswordHasher;
  private tokenService: TokenService;
  private authorizer?: IAuthorizer;
  private roleResolver?: (userId: string) => Promise<import('../../../shared/auth/types.js').UserRole>;

  constructor(deps: AuthServiceDependencies) {
    this.userRepository = deps.userRepository;
    this.passwordHasher = deps.passwordHasher;
    this.tokenService = deps.tokenService;
    this.authorizer = deps.authorizer;
    this.roleResolver = deps.roleResolver;
  }

  private toSafeUser(user: User): SafeUser {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...safeUser } = user;
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

    const isMatch = await this.passwordHasher.compare(dto.password!, user.passwordHash);
    if (!isMatch) {
      throw new Unauthenticated('Invalid email or password');
    }

    let actor: Actor;
    if (this.roleResolver) {
      actor = {
        userId: user.id,
        role: await this.roleResolver(user.id),
      };
    } else {
      actor = {
        userId: user.id,
        role: 'EMPLOYEE',
      };
    }

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
      user: this.toSafeUser(user),
    };
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

    const actor: Actor = {
      userId: user.id,
      role: payload.role || 'EMPLOYEE',
    };

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

    const isMatch = await this.passwordHasher.compare(dto.currentPassword!, user.passwordHash);
    if (!isMatch) {
      throw new BadRequest('Current password is incorrect', 'INVALID_CURRENT_PASSWORD', 'currentPassword');
    }

    const newPasswordHash = await this.passwordHasher.hash(dto.newPassword!);
    const updatedUser = await this.userRepository.updatePassword(actor.userId, newPasswordHash);

    return this.toSafeUser(updatedUser);
  }
}
