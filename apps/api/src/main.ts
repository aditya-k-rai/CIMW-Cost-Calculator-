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
    origin: (origin: string | undefined, callback: (err: Error | null, origin?: boolean) => void) => {
      if (
        !origin ||
        origin.startsWith("http://localhost:") ||
        origin.startsWith("http://127.0.0.1:") ||
        origin.includes("vercel.app") ||
        (process.env.WEB_ORIGIN && origin === process.env.WEB_ORIGIN)
      ) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true
  });

  await app.listen(port);
  console.log(`🚀 API Server running on: http://localhost:${port}`);
}

void bootstrap();
