import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from './pipes/validation.pipe';


async function start() {
  const PORT = process.env.PORT || 5000;
  // rawBody keeps the unparsed request bytes available (req.rawBody) — the
  // Paddle webhook signature is an HMAC over the exact raw payload.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });
  app.enableCors();

  // Behind a reverse proxy set TRUST_PROXY to the number of hops (1 for a single
  // nginx) so req.ip — and the rate limiter keyed on it — resolves the real client
  // IP from X-Forwarded-For instead of lumping everyone under the proxy's address.
  // Off by default: trusting the header with no proxy in front would let any client
  // spoof its IP past the throttler.
  const trustProxy = Number(process.env.TRUST_PROXY);
  if (trustProxy > 0) app.set('trust proxy', trustProxy);

  const config = new DocumentBuilder()
  .setTitle('Persona API')
  .setDescription('Persona API documentation')
  .setVersion('1.0')
  .addTag('Persona')
  .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('/api/docs', app, document);

  app.useGlobalPipes(new ValidationPipe());
  // Let Nest run onModuleDestroy (Prisma $disconnect) on SIGTERM/SIGINT.
  app.enableShutdownHooks();

  await app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

start();
