import { ExecutionContext, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class AuthGqlGuard extends AuthGuard('jwt') {
  getRequest(context: ExecutionContext) {
    const ctx = GqlExecutionContext.create(context);
    const { req, currentUser, extra } = ctx.getContext();
    return currentUser
      ? currentUser
      : extra && extra?.currentUser
      ? extra
      : req;
  }
}

@Injectable()
export class AuthRefreshGqlGuard extends AuthGuard('jwt-refresh') {
  getRequest(context: ExecutionContext): any {
    const ctx = GqlExecutionContext.create(context);
    const { req, currentUser, extra } = ctx.getContext();
    return currentUser
      ? currentUser
      : extra && extra?.currentUser
      ? extra
      : req;
  }
}
