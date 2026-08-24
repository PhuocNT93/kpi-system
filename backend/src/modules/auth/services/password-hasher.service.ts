import crypto from 'crypto';

export interface PasswordHasher {
  hash(password: string): Promise<string>;
  compare(password: string, hash: string): Promise<boolean>;
}

export class SimplePasswordHasher implements PasswordHasher {
  private saltRounds = 10;

  async hash(password: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const salt = crypto.randomBytes(16).toString('hex');
      crypto.scrypt(password, salt, 64, (err, derivedKey) => {
        if (err) return reject(err);
        resolve(`${salt}:${derivedKey.toString('hex')}`);
      });
    });
  }

  async compare(password: string, storedHash: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const parts = storedHash.split(':');
      if (parts.length !== 2) return resolve(false);

      const salt = parts[0];
      const hashHex = parts[1];

      if (!salt || !hashHex) return resolve(false);

      crypto.scrypt(password, salt, 64, (err, derivedKey) => {
        if (err) return reject(err);
        const storedKeyBuffer = Buffer.from(hashHex, 'hex');
        const derivedKeyBuffer = derivedKey;
        if (storedKeyBuffer.length !== derivedKeyBuffer.length) {
          return resolve(false);
        }
        resolve(crypto.timingSafeEqual(storedKeyBuffer, derivedKeyBuffer));
      });
    });
  }
}
