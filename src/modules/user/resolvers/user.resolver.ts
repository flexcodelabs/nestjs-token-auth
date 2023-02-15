import { UnauthorizedException, UseGuards } from '@nestjs/common';
import { Args, Info, Mutation, Query, Resolver } from '@nestjs/graphql';
import { GraphQLResolveInfo } from 'graphql';
import { SessionUser } from '../../../shared/decorators/user.decorator';
import { Params } from '../../../shared/dtos/params.utils';
import {
  AuthGqlGuard,
  AuthRefreshGqlGuard,
} from '../../../shared/guards/auth.guard';
import { extractGraphRelations } from '../../../shared/helpers/relations.helper';
import { sanitizeRequest } from '../../../shared/helpers/sanitize.request';
import { sanitizeResponse } from '../../../shared/helpers/sanitize.response';
import {
  Login,
  Logout,
  UpdatePassword,
  UserData,
  UserInput,
  UserUpdate,
} from '../dtos/user.dto';
import { User } from '../entities/user.entity';
import { UserService } from '../services/user.service';

@Resolver()
export class UserResolver {
  constructor(private service: UserService) {}

  @Query(() => [User])
  async getUsers(
    @Args('params') params: Params,
    @Info() info: GraphQLResolveInfo,
  ): Promise<UserData[]> {
    return await this.service.findAll(
      params,
      [...extractGraphRelations({ entity: User, info })],
      {
        table: 'user',
        column: 'user.id',
        query:
          '(user.name ILIKE :search OR user.username ILIKE :search OR user.email ILIKE :search)',
        params: { ...params, search: `%${params.search}%` },
      },
    );
  }

  @Mutation(() => User)
  async register(
    @Args('user') user: UserInput,
    @Info() info: GraphQLResolveInfo,
  ): Promise<UserInput> {
    return await this.service.create(sanitizeRequest({ ...user }), [
      ...extractGraphRelations({ entity: User, info }),
    ]);
  }

  @Query(() => User)
  async login(
    @Args('login') user: Login,
    @Info() info: any,
  ): Promise<UserInput> {
    return await this.service.login({ ...user }, [
      ...extractGraphRelations({ entity: User, info }),
    ]);
  }

  @UseGuards(AuthGqlGuard)
  @Query(() => User)
  async me(
    @SessionUser()
    user: User,
    @Info() info: GraphQLResolveInfo,
  ): Promise<User> {
    return await this.service.findOne({
      id: user.id,
      relations: [...extractGraphRelations({ entity: User, info })],
    });
  }

  @UseGuards(AuthGqlGuard)
  @Mutation(() => User)
  updateUser(
    @Args('user') user: UserUpdate,
    @SessionUser() current: User,
    @Info() info: GraphQLResolveInfo,
  ): Promise<User> {
    return this.service.update(current.id, sanitizeRequest({ ...user }), [
      ...extractGraphRelations({ entity: User, info }),
    ]);
  }

  @UseGuards(AuthRefreshGqlGuard)
  @Mutation(() => Logout)
  logout(@SessionUser() user: User): Promise<Logout> {
    if (!user.refreshTokenHash) {
      throw new Error('User is not logged in!!');
    }
    return this.service.logout(user);
  }

  @UseGuards(AuthRefreshGqlGuard)
  @Mutation(() => User)
  refresh(@SessionUser() user: User): Promise<UserInput> {
    if (!user.refreshTokenHash) {
      throw new UnauthorizedException();
    }
    return this.service.refreshTokens(user);
  }

  @Query(() => User)
  async getUser(
    @Args('id', { type: () => String }) id: string,
    @Info() info: GraphQLResolveInfo,
  ): Promise<User> {
    return sanitizeResponse(
      await this.service.findOne({
        id,
        relations: [...extractGraphRelations({ entity: User, info })],
      }),
    );
  }

  @UseGuards(AuthGqlGuard)
  @Mutation(() => User)
  updatePassword(
    @Args('user') user: UpdatePassword,
    @Info() info: any,
    @SessionUser()
    sessionUser: User,
  ): Promise<UpdatePassword> {
    return this.service.updatePassword(sessionUser.id, { ...user }, [
      ...extractGraphRelations({ entity: User, info }),
    ]);
  }
}
