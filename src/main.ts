import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import * as dotenv from "dotenv"
dotenv.config()
import { join } from 'path'
import * as cookieParser from "cookie-parser"
import * as session from 'express-session';
import * as flash from 'connect-flash'
import { Response } from 'express';



async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
  );

  console.log(__dirname)
  app.useStaticAssets(join(".",'src','public'));
  app.setBaseViewsDir(join(".", 'views'));
  app.setViewEngine('ejs');
  app.use(cookieParser())
  app.use(session({
    secret:process.env.SESSION_SECRET,
    cookie:{maxAge:60000},
    resave:false,
    saveUninitialized:false
    
  }))
  app.use(flash());

  await app.listen(process.env.PORT);
}
bootstrap();
