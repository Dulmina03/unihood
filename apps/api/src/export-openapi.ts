import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { OpenApiService } from './openapi/openapi.service';
async function exportDocument() {
  const app = await NestFactory.createApplicationContext(AppModule, {logger: false});
  try {process.stdout.write(JSON.stringify(app.get(OpenApiService).document(), null, 2) + '\n');}
  finally {await app.close();}
}
void exportDocument().catch(() => {process.stderr.write('OpenAPI export failed. Check controller contract metadata.\n'); process.exitCode = 1;});
