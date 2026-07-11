import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";
import helmet from "helmet";
import compression from "compression";

const port = Number(process.env.PORT ?? 4000);

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Apply Helmet middleware for securing HTTP headers
  app.use(helmet());

  // Apply compression middleware (Gzip)
  app.use(compression());

  app.enableCors({
    origin: process.env.WEB_ORIGIN ?? "http://localhost:3000",
    credentials: true
  });

  await app.listen(port);
  console.log(`🚀 API Server running on: http://localhost:${port}`);
}

void bootstrap();
