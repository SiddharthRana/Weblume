import 'reflect-metadata';
import { SwaggerModule } from '@nestjs/swagger';
import { buildOpenApi, createApp } from './app';
import { ENV, type Env } from './config/env';

async function bootstrap() {
  const app = await createApp();
  const env = app.get<Env>(ENV);
  if (env.NODE_ENV !== 'production') {
    SwaggerModule.setup('docs', app, buildOpenApi(app));
  }
  await app.listen(env.PORT);
}

void bootstrap();
