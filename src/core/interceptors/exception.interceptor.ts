import {
  Catch,
  NotFoundException,
  ExceptionFilter,
  ArgumentsHost,
} from '@nestjs/common';

@Catch(NotFoundException)
export class NotFoundExceptionFilter implements ExceptionFilter {
  catch(_exception: NotFoundException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    response.json({ error: 'Oops 😢!! Route not available.' });
  }
}
