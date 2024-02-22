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
import { SocialmediaService } from './socialmedia/socialmedia.service';
import { CronService } from './cron/cron.service';
import { eventSchema } from './events/events.model';
import { eventeeSchema } from './eventees/eventees.model';
import { ThrottlerModule } from '@nestjs/throttler';
import { CacheService } from './cache/cache.service';
dotenv.config()

@Module({
  imports: [
    CreatorsModule,
   EventsModule,
    EventeesModule,
      MongooseModule.forRoot(process.env.DB_URL),
      MongooseModule.forFeature([{name:"Event", schema:eventSchema},{name:"Eventee", schema:eventeeSchema} ]),
      MailerModule,
      TransactionsModule,
      ThrottlerModule.forRoot([{ ttl: 60 * 1000, limit: 10 }])
    ],
  controllers: [AppController],
  providers: [AppService, FlashMiddleware, AuthService, MailerService, SocialmediaService, CronService, CacheService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(FlashMiddleware).forRoutes('*');
}
}
