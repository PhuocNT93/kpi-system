import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service.js';
import { sendSuccess } from '../../../api/http-response.js';
import { getActorOrThrow } from '../../../shared/auth/actor-context.js';

export class AuthController {
  constructor(private authService: AuthService) {}

  signup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await this.authService.signup(req.body);
      sendSuccess(res, 201, 'User registered successfully', user);
    } catch (error) {
      next(error);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.authService.login(req.body);
      sendSuccess(res, 200, 'Login successful', result);
    } catch (error) {
      next(error);
    }
  };

  changePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = getActorOrThrow(req);
      const user = await this.authService.changePassword(actor, req.body);
      sendSuccess(res, 200, 'Password changed successfully', user);
    } catch (error) {
      next(error);
    }
  };
}
