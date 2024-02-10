import { ConflictException, Injectable, NotFoundException, Res } from '@nestjs/common';
import { CreateEventeeDto } from './dto/create-eventee.dto';
import { UpdateEventeeDto } from './dto/update-eventee.dto';
import{v2} from "cloudinary"
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Eventee } from './eventees.model';
import * as encoding from 'Utils/bcrypt';
import * as fs from "fs";
import * as dotenv from "dotenv"
import { EventeeVerification } from './verifiedEventee.model';
import { MailerService } from 'src/mailer/mailer.service';
dotenv.config()
import {v4 as uuidv4} from "uuid"
import { Request, Response } from 'express';
import { AuthService } from 'src/auth/auth.service';
import { LoginEventeeDto } from './dto/login-eventee.dto';
import {Event} from "../events/events.model"
import { Transaction } from '../transactions/transactions.model';
import axios from "axios"
@Injectable()
export class EventeesService {
  
  constructor(@InjectModel("Eventee") private readonly eventeeModel:Model<Eventee>,
  @InjectModel("EventeeVerification") private readonly eventeeVerificationModel:Model<EventeeVerification>,
  @InjectModel("Event") private readonly eventModel:Model<Event>,
  @InjectModel("Transaction") private readonly transactionModel:Model<Transaction>,
  private readonly mailservice:MailerService,
  private readonly Authservice:AuthService
  ) {
    v2.config({
      cloud_name:process.env.CLOUDINARY_CLOUD_NAME,
      api_key:process.env.CLOUDINARY_API_KEY,
      api_secret:process.env.CLOUDINARY_API_SECRET
    })
  }
  
  async createEventee(createEventeeDto:CreateEventeeDto, filePath:string) {
    try{
      const existingEventee:object = await this.eventeeModel.findOne({email:createEventeeDto.email })
      if(existingEventee){
            throw new ConflictException("Creator already exist")
        }
       
        const password = await encoding.encodePassword(createEventeeDto.password)
        const result = await v2.uploader.upload(filePath, {folder:"eventful_eventees_ProfileImage"})
        
        if(!result){
          throw new Error("file upload fails")
        }
  
  
       const newEventee =  await this.eventeeModel.create({
          first_name: createEventeeDto.first_name,
          last_name: createEventeeDto.last_name,
          email: createEventeeDto.email,
          sex: createEventeeDto.sex,
          phoneNum: createEventeeDto.phoneNum,
          country: createEventeeDto.country,
          state: createEventeeDto.state,
          profileImage:result,
          password:password
        })

        fs.unlink(filePath, (err)=>{
          if(err){
            throw new Error("file unlink failed")
          }
        })

        const currUrl = "https://9cbd-102-88-68-64.ngrok-free.app"
        let uniqueString = newEventee._id + uuidv4()
        const hashedUniqueString = await encoding.encodePassword(uniqueString)
        
        await this.eventeeVerificationModel.create({
          eventeeId:newEventee._id,
          uniqueString:hashedUniqueString,
          creation_date:Date.now(),
          expiring_date:Date.now() + 21600000
        })

        await this.mailservice.sendVerificationEmail({
          email:createEventeeDto.email,
          subject:"Verify your email",
          html:`<div style = "background-color:lightgrey; padding:16px"; border-radius:20px>
          <p>Hi, ${createEventeeDto.first_name}</P>
          <p>Thank you for opening account with Eventful.</p>
          <p>We need to confirm it is you before being authorized to login to your account</P>
              <p>Click <a href=${
                currUrl + "/eventees/verify/" + newEventee._id + "/" + uniqueString
              }>here</a> to get authorized</P>
              <p>This link <b>will expire in the next 6hrs</b></p>
              <p>With <b>Eventful</b>, You are assured of passport to a world of unforgettable moments.</P>
              <p>Click this link: <a href=${
                currUrl + "/eventees/verify/" + newEventee._id + "/" + uniqueString
              } >${currUrl + "/eventees/verify/" + newEventee._id + "/" + uniqueString}<a/></p>
              </div>`
        })
    
        return 'successfulEventee_creation';

    }catch(err){
      console.log(err.message)
    }
  }

  // Getting the signup page
  getSignUpPage(){
    return "eventee_signup_page"
  }

  // Verifying the eventee email verification link
  async verifyEventee(userId:string, uniqueString:string) {
    try{
      let user = await this.eventeeVerificationModel.findOne({eventeeId:userId})
  
      if(!user){
        throw new NotFoundException("User not found") 
      }

      if(user.expiring_date.getTime() < Date.now()){
        await this.eventeeVerificationModel.deleteOne({eventeeId:userId})
        await this.eventeeModel.deleteOne({_id:userId})
      }
      
      const valid = await encoding.validateEncodedString(uniqueString, user.uniqueString)
      if(!valid){
        throw new Error("Opps!. It seems you have altered the verification link")
      }

      

      await this.eventeeModel.findByIdAndUpdate({_id:userId}, {verified:true })
      await this.eventeeVerificationModel.deleteOne({eventeeId:userId})
     
      return `successful_verification`;

    }catch(err){
      console.log(err.message)
    }
    
  }

  getLoginPage() {
    return `eventeeLogin_page`;
  }

  
  async login(LoginEventeeDto:LoginEventeeDto, res:Response) {
    try{
      const {email, password} = LoginEventeeDto
      let user = await this.eventeeModel.findOne({email})
      // let dbUser = await this.eventeeModel.findOne({email})

      if(!user){
        throw new NotFoundException("User not found")
      }

      if(!user.verified){
        throw new Error("You are not verfied.Please, check your email for verification link.")
      }

      const valid = await encoding.validateEncodedString(password, user.password)

      if(!valid){
        throw new Error("email or passord is incorrect")
      }

      const token:string =  this.Authservice.generateJwtToken(user._id, user.email, user.first_name, user.profileImage )
      
      res.cookie("jwt", token, { maxAge: 60 * 60 * 1000 })

      return `/eventees/eventeeDashboard`;
    }catch(err){
      console.log(err.message)
    }
   
  }

  async getDashboard(req:Request, res:Response) {
    try{
      await this.Authservice.ensureLogin(req, res)
      const postedEvents = await this.eventModel.find({state:"Posted"}).populate("creatorId")
      if(!postedEvents){
        return []
      }

      return  postedEvents
  
    }catch(err){
      res.send(err.message)
    }
    
  }

  async buyTicket(eventId:string, price:number, req:Request, res:Response) {
    try{
      await this.Authservice.ensureLogin(req, res)
      const eventee = await this.eventeeModel.findOne({_id:res.locals.user.id})
      if(eventee.bought_eventsId.includes(eventId)){
        res.send("Opps! Duplicate transaction. You have bought the ticket for the Event before.")
      }

      const transaction = await this.transactionModel.create({
        amount:price,
        eventId:eventId,
        eventeeId:eventee._id

      })

      const data = {
        amount: price * 100,
        email: eventee.email,
        reference: transaction._id,
      };

      const headers = {
        Authorization: `Bearer ${process.env.PAYSTACK_KEY}`,
      };

      const response = await axios.post(
        "https://api.paystack.co/transaction/initialize",
        data,
        { headers }
      );

      
      return response

    }catch(err){
      res.send(err.message)
    }
    
  }


  async processPaystackCallBack(req:Request, res:Response) {
    try{
      const body = req.body
      let transaction = await this.transactionModel
      .findOne({ _id: body.data.reference })
      .populate("eventeeId").populate("eventId");

    if (!transaction) {
      res.send("Transaction is not found")
    }

    if (body.event === "charge.success") {
      transaction.status = "success";
      transaction.save();
      
      const event = await this.eventModel.findOne({_id:transaction.eventId})
      event.ticketedEventeesId.push(transaction.eventeeId)
      event.unticketedEventeesId.splice(event.unticketedEventeesId.indexOf(transaction.eventeeId), 1)
      event.save()

      const eventee = await this.eventeeModel.findOne({_id:transaction.eventeeId})
      eventee.event_count = eventee.event_count + 1
      eventee.bought_eventsId.push(event._id)
      eventee.save()
    }
  
  if (body.event === "charge.failed") {
      transaction.status = "failed";
      transaction.save();
    }

    return "call back received"


    }catch(err){
      res.send(err.message)
    }
      
  }

  async getPaymentSuccessPage() {
    return "paymentSuccess"
}

//
}
