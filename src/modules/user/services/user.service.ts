import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as argon from 'argon2';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { validateRequest } from '../../../shared/helpers/base.helper';
import { sanitizeResponse } from '../../../shared/helpers/sanitize.response';
import { BaseService } from '../../../shared/services/base.service';
import { Login, Logout, UpdatePassword, UserInput } from '../dtos/user.dto';
import { User } from '../entities/user.entity';

@Injectable()
export class UserService extends BaseService<User> {
  constructor(
    @InjectRepository(User) readonly repository: Repository<User>,
    private jwtService: JwtService,
  ) {
    super(repository, User);
  }

  async login(userLoginInfor: Login, relations: string[]): Promise<any> {
    validateRequest(userLoginInfor);
    const user: User = await User.verifyUser(
      userLoginInfor.email,
      userLoginInfor.password,
    );
    const userWithFields = await this.repository.findOne({
      where: { id: user.id },
      relations,
    });
    return sanitizeResponse(this.loggedInUser({ user: userWithFields }));
  }

  async logout(user: User): Promise<Logout> {
    await this.verifyLoggedInUser(user.refreshTokenHash, user.refreshToken);
    await this.repository.save({ id: user.id, refreshTokenHash: null });
    return { message: 'User logged out successfully' };
  }

  async refreshTokens(loggedInUser: User): Promise<UserInput> {
    validateRequest(loggedInUser);
    if (!loggedInUser || !loggedInUser.refreshTokenHash)
      throw new ForbiddenException();
    const user = await this.repository.findOne({
      where: { id: loggedInUser.id },
    });
    await this.verifyLoggedInUser(
      user.refreshTokenHash,
      loggedInUser.refreshToken,
    );
    return sanitizeResponse(this.loggedInUser({ user }));
  }

  async updatePassword(
    id: string,
    user: UpdatePassword,
    fields: any[],
  ): Promise<UpdatePassword> {
    const userUpdated = await this.findOneInternal(id, []);
    await this.validateUser(user, userUpdated);
    try {
      const salt = await bcrypt.genSalt();
      userUpdated.password = await this.hashPassword({
        salt,
        password: user.newPassword,
      });
      userUpdated.salt = salt;
      await this.repository.save(userUpdated);
      return sanitizeResponse(await this.findOneInternal(id, fields));
    } catch (e) {
      throw new Error(e.message);
    }
  }

  private validateUser = async (
    user: UpdatePassword,
    userUpdated: User,
  ): Promise<void> => {
    const message =
      userUpdated &&
      !(await this.validatePassword(
        user.oldPassword,
        userUpdated.salt,
        userUpdated.password,
      ))
        ? 'Wrong old/current password.'
        : user.newPassword === user.oldPassword
        ? 'New Password can not be the same as the old password.'
        : null;
    if (message) throw new BadRequestException(message);
  };

  private verifyLoggedInUser = async (hash: string, token: string) => {
    const loggedInHash = await argon.verify(hash, token);
    if (!loggedInHash) throw new ForbiddenException();
    return;
  };

  private loggedInUser({ user }) {
    user = {
      ...user,
      accessToken: this.signToken(user.id, true),
      refreshToken: this.signToken(user.id, false),
    };
    this.saveRefreshToken(user.id, user.refreshToken);
    return user;
  }

  private signToken = (id: string, access: boolean) => {
    return this.jwtService.sign(
      {
        id,
      },
      {
        secret: access
          ? process.env.JWTSECRET
          : process.env.REFRESH_TOKEN_SECRET,
        expiresIn: access
          ? Number(process.env.TOKEN_EXPIRE_TIME)
          : Number(process.env.REFRESH_EXPIRE_TIME),
      },
    );
  };

  private saveRefreshToken = async (id: string, token: string) => {
    const refreshTokenHash = await argon.hash(token);
    await this.repository.save({ id, refreshTokenHash });
  };

  private async findOneInternal(
    id: string,
    relations: string[],
  ): Promise<User> {
    return await this.repository.findOne({
      where: { id },
      relations,
    });
  }

  private validatePassword = async (
    oldpassword: string,
    salt: string,
    userpassword: string,
  ): Promise<boolean> => {
    const hash = await bcrypt.hash(oldpassword, salt);
    return hash === userpassword;
  };

  private hashPassword = async ({ password, salt }): Promise<string> => {
    return bcrypt.hash(password, salt);
  };
}
