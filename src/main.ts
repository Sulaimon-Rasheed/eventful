import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import * as dotenv from "dotenv"
dotenv.config()
import { join } from 'path'
import * as cookieParser from "cookie-parser"

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
  );

  app.useStaticAssets(join(".", 'public'));
  app.setBaseViewsDir(join(".", 'views'));
  app.setViewEngine('ejs');
  app.use(cookieParser())
  // app.use(session({
  //   secret:"",
  //   cookie:{maxAge:60000},
  //   resave:true,
  //   saveUninitialized:true
    
  // }))
  // app.use(FlashMiddleware)

  await app.listen(process.env.PORT);
}
bootstrap();
