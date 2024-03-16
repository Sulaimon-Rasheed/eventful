// src/cron/cron.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as cron from 'node-cron';
import {DateTime} from "luxon"
import {Event} from "../events/events.model"
import {Eventee} from "../eventees/eventees.model"
import { MailerService } from 'src/mailer/mailer.service';
import { url } from 'inspector';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(@InjectModel("Event") private readonly eventModel:Model<Event>,
  @InjectModel("Eventee") private readonly eventeeModel:Model<Eventee>,
  private readonly mailService:MailerService
  ) {

    // Cron job to remind ticketed eventees of the event
    cron.schedule('0 0 * * *', async () => {
      this.logger.debug('Running scheduled task of Creators for ticketed eventees...');
      const events:any = await this.eventModel.find().populate("ticketedEventeesId")
      for(const event of events){
        let parsedDate = DateTime.fromFormat(event.event_date , 'LLL d, yyyy');
        let currentDate = DateTime.now()
        let daysDiff = Math.round(parsedDate.diff(currentDate, 'days').toObject().days)
        let NumReminder_days = parseInt(event.reminder_days)
        console.log(daysDiff)
        if(daysDiff === NumReminder_days){
            for(const eventeeId of event.ticketedEventeesId){
            const eventee = await eventeeModel.findOne({_id:eventeeId})
                this.mailService.sendVerificationEmail({
                    email:eventee.email,
                    subject:`${event.reminder_days} days to go`,
                    html:`<div>
                    <p>Hi, ${eventee.first_name}</P>
                    <img src="${event.event_image.url}" alt="event image" style="length:300px; width:300px">
                    <p>This is a reminder from the Organizer of the upcoming event.</P>
                    <p>We are glad that you will be attending the event.</P>
                    <h2>Event Details:</h2>
                    <p><b>Title: </b>${event.title}</P>
                    <p><b>Date: </b>${event.event_date}</P>
                    <p><b>Time: </b>${event.starting_time} - ${event.ending_time}</P>
                    <p><b>Venue: </b>${event.venue}</P>
                    <p>Don't forget to come with the ticket (QR code) we sent to you previously</P>
                    </div>`
                })
            }
            
        }
      }
    });


    // Cron job to remind Unticketed eventees of the event
    cron.schedule('0 0 * * *', async () => {
      this.logger.debug('Running scheduled task of Creators for unticketed eventees...');
      const events:any = await this.eventModel.find().populate("unticketedEventeesId")
      for(const event of events){
        let parsedDate = DateTime.fromFormat(event.event_date , 'LLL d, yyyy');
        let currentDate = DateTime.now()
        let daysDiff = Math.round(parsedDate.diff(currentDate, 'days').toObject().days)
        let NumReminder_days = parseInt(event.reminder_days)

        let currUrl = "https://eventful-8xm4.onrender.com"
        if(daysDiff === NumReminder_days){
            for(const eventeeId of event.unticketedEventeesId){
            const eventee = await eventeeModel.findOne({_id:eventeeId})
                this.mailService.sendVerificationEmail({
                    email:eventee.email,
                    subject:`Proceed to buy your ticket. Just ${event.reminder_days} days to go`,
                    html:`<div>
                    <p>Hi, ${eventee.first_name}</P>
                    <img src="${event.event_image.url}" alt="event image" style="length:300px; width:300px">
                    <p>You listed this event on Eventful but it seems you forgot to buy the ticket for the event.</P>
                    <p>We will be glad to see you attend the event.</P>
                    <p>So,<a href="${currUrl + "/eventees/login"}">login</a> to buy your ticket today.</P>
                    <h2>Event Details:</h2>
                    <p><b>Title: </b>${event.title}</P>
                    <p><b>Date: </b>${event.event_date}</P>
                    <p><b>Time: </b>${event.starting_time} - ${event.ending_time}</P>
                    <p><b>Venue: </b>${event.venue}</P>
                    <p>Don't forget to come with the ticket (QR code) we sent to you previously</P>
                    </div>`
                })
            }
            
        }
      }
    });

    // Eventee reminder time cron job
    cron.schedule("0 0 * * *", async()=>{
      this.logger.debug('Running scheduled task for Eventees...');
      const eventees = await eventeeModel.find().populate("bought_eventsId")

      for(const eventee of eventees){
        let eventsId = eventee.bought_eventsId
        for(const eventId of eventsId){
          const event:any = await eventModel.findOne({_id:eventId})
          let parsedDate = DateTime.fromFormat(event.event_date , 'LLL d, yyyy');
          let currentDate = DateTime.now()
          let daysDiff = Math.round(parsedDate.diff(currentDate, 'days').toObject().days)
          let NumReminder_days = parseInt(eventee.eventeeReminder_days)
          console.log(daysDiff)
          if(daysDiff === NumReminder_days){
            this.mailService.sendVerificationEmail({
              email:eventee.email,
              subject:`${eventee.eventeeReminder_days} days to go`,
              html:`<div>
                    <p>Hi, ${eventee.first_name}. You set this reminder.</P>
                    <img src="${event.event_image.url}" alt="event image" style="length:300px; width:300px">
                    <p>This is a reminder for the upcoming event.</P>
                    <p>We are glad that you will be attending the event.</P>
                    <h2>Event Details:</h2>
                    <p><b>Title: </b>${event.title}</P>
                    <p><b>Date: </b>${event.event_date}</P>
                    <p><b>Time: </b>${event.starting_time} - ${event.ending_time}</P>
                    <p><b>Venue: </b>${event.venue}</P>
                    <p>Don't forget to come with the ticket (QR code) we sent to you previously</P>
              </div>`
          })
          }
        }
        
      }
    })
  }
}

