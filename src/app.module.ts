import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CreatorsModule } from './creators/creators.module';
import { EventsModule } from './events/events.module';
import { EventeesModule } from './eventees/eventees.module';
import { MongooseModule } from '@nestjs/mongoose';
import * as dotenv from "dotenv"
import { MiddlewareConsumer,NestModule } from '@nestjs/common';
import { FlashMiddleware } from './middlewares/flash.middleware';
import { MailerModule } from './mailer/mailer.module';
import { AuthService } from './auth/auth.service';
import { MailerService } from './mailer/mailer.service';
import { TransactionsModule } from './transactions/transactions.module';
dotenv.config()

@Module({
  imports: [
    CreatorsModule,
   EventsModule,
    EventeesModule,
      MongooseModule.forRoot(process.env.DB_URL),
      MailerModule,
      TransactionsModule],
  controllers: [AppController],
  providers: [AppService, FlashMiddleware, AuthService, MailerService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(FlashMiddleware).forRoutes('*');
}
}
