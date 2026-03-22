import { RegisterDto } from './dto/register.dto';
import { RedisService } from './redis/redis.service';
import { JwtPayload } from '@/common/types/jwt-payload.interface';
import { UserProfile } from '@/modules/users/entities/user-profile.entity';
import { User } from '@/modules/users/entities/user.entity';
import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { DataSource, Repository } from 'typeorm';

const BCRYPT_ROUNDS_PASSWORDS = 12;
const BCRYPT_ROUNDS_TOKENS = 10;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Validates email + password. Returns user without passwordHash.
   * Returns null if invalid — never throw here (LocalStrategy throws for us).
   */
  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersRepository.findOne({
      where: { email: email.toLowerCase() },
      select: ['id', 'email', 'passwordHash', 'role', 'isActive'],
    });

    if (!user || !user.isActive) {
      return null; // INVALID_CREDENTIALS — don't reveal which field
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return null; // INVALID_CREDENTIALS
    }

    // Return user without passwordHash
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _ph, ...safeUser } = user;
    return safeUser as User;
  }

  async register(dto: RegisterDto) {
    const existing = await this.usersRepository.findOne({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException({ code: 'EMAIL_ALREADY_EXISTS' });
    }

    const passwordHash = await bcrypt.hash(
      dto.password,
      BCRYPT_ROUNDS_PASSWORDS,
    );

    return this.dataSource.transaction(async (manager) => {
      const user = manager.create(User, {
        email: dto.email.toLowerCase(),
        passwordHash,
      });
      const savedUser = await manager.save(user);

      await manager.save(UserProfile, {
        userId: savedUser.id,
        fullName: dto.fullName,
        phone: dto.phone,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
      });

      return {
        id: savedUser.id,
        email: savedUser.email,
        role: savedUser.role,
        createdAt: savedUser.createdAt,
      };
    });
  }

  async login(user: User) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.accessSecret'),

      expiresIn: this.configService.get<string | number>(
        'jwt.accessExpiresIn',
        '15m',
      ) as `${number}m` | `${number}h` | `${number}d` | number,
    });

    const refreshToken = this.jwtService.sign(
      { sub: user.id },
      {
        secret: this.configService.get<string>('jwt.refreshSecret'),

        expiresIn: this.configService.get<string | number>(
          'jwt.refreshExpiresIn',
          '7d',
        ) as `${number}m` | `${number}h` | `${number}d` | number,
      },
    );

    const hash = await bcrypt.hash(refreshToken, BCRYPT_ROUNDS_TOKENS);
    await this.redisService.setRefreshToken(user.id, hash);

    const profile = await this.dataSource.getRepository(UserProfile).findOne({
      where: { userId: user.id },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 900,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: profile?.fullName ?? null,
      },
    };
  }

  async refresh(refreshToken: string) {
    let payload: { sub: string };
    try {
      payload = this.jwtService.verify<{ sub: string }>(refreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException({ code: 'REFRESH_TOKEN_INVALID' });
    }

    const storedHash = await this.redisService.getRefreshToken(payload.sub);
    if (!storedHash) {
      throw new UnauthorizedException({ code: 'REFRESH_TOKEN_INVALID' });
    }

    const isValid = await bcrypt.compare(refreshToken, storedHash);
    if (!isValid) {
      throw new UnauthorizedException({ code: 'REFRESH_TOKEN_INVALID' });
    }

    const user = await this.usersRepository.findOneOrFail({
      where: { id: payload.sub },
    });

    return this.login(user); // Issues new token pair and rotates Redis
  }

  async logout(userId: string): Promise<void> {
    await this.redisService.deleteRefreshToken(userId);
  }
}
