import { ConflictException, Injectable, NotFoundException} from '@nestjs/common';
import { CreateCreatorDto } from './dto/create-creator.dto';
import { UpdateCreatorDto } from './dto/update-creator.dto';
import {v2} from "cloudinary"
import { InjectModel } from '@nestjs/mongoose';
import {Creator} from "./creators.model"
import {Event} from "../events/events.model"
import { Model } from 'mongoose';
import * as encoding from 'Utils/bcrypt';
import * as fs from "fs"
import * as dotenv from "dotenv"
import { MailerService } from 'src/mailer/mailer.service';
dotenv.config()
import {v4 as uuidv4} from "uuid"
import { CreatorVerification } from './verifiedCreators.model';
import { LoginCreatorDto } from './dto/login-creator.dto';
import { AuthService } from 'src/auth/auth.service';
import {Request, Response } from 'express';
import { Eventee } from 'src/eventees/eventees.model';
// import {Response} from "express"
// import { Response } from 'supertest';
// import RequestWithFlash from "../requestWithFlash"

@Injectable()
export class CreatorsService {
  constructor(@InjectModel("Creator") private readonly creatorModel:Model<Creator>,
  @InjectModel("CreatorVerification") private readonly creatorVerificationModel:Model<CreatorVerification>, 
  @InjectModel("Event") private readonly eventModel:Model<Event>,
  @InjectModel("Eventee") private readonly eventeeModel:Model<Eventee>,
  private readonly mailservice:MailerService,
  private readonly Authservice:AuthService
  ){
    v2.config({
      cloud_name:process.env.CLOUDINARY_CLOUD_NAME,
      api_key:process.env.CLOUDINARY_API_KEY,
      api_secret:process.env.CLOUDINARY_API_SECRET
    })
  }
  async createCreator(createCreatorDto:CreateCreatorDto, filePath:string) {
    try{
      const existingCreator:object = await this.creatorModel.findOne({email:createCreatorDto.email })
      if(existingCreator){
            throw new ConflictException("Creator already exist")
        }
       
        const password = await encoding.encodePassword(createCreatorDto.password)
        const result = await v2.uploader.upload(filePath, {folder:"eventful_creators_ProfileImage"})
        if(!result){
          throw new Error("file upload fails")
        }
  
  
       let newCreator =  await this.creatorModel.create({
          creator_name: createCreatorDto.creator_name,
          company_name: createCreatorDto.company_name,
          email: createCreatorDto.email,
          phoneNum: createCreatorDto.phoneNum,
          country: createCreatorDto.country,
          state: createCreatorDto.state,
          profileImage:result,
          password:password
        })


        fs.unlink(filePath, (err)=>{
          if(err){
            throw new Error("file unlink failed")
          }
         
        })

        const currUrl = "http://localhost:8000"
        let uniqueString = newCreator._id + uuidv4()

        const hashedUniqueString = await encoding.encodePassword(uniqueString)

        await this.creatorVerificationModel.create({
          creatorId:newCreator._id,
          uniqueString:hashedUniqueString,
          creation_date:Date.now(),
          expiring_date:Date.now() + 21600000
        })

        await this.mailservice.sendVerificationEmail({
          email:createCreatorDto.email,
          subject:"Verify your email",
          html:`<div style = "background-color:lightgrey; padding:16px"; border-radius:20px>
          <p>Hi, ${createCreatorDto.creator_name} of ${createCreatorDto.company_name}</P>
          <p>Thank you for opening account with us.</p>
          <p>We need to confirm it is you before being authorized to login to your account</P>
              <p>Click <a href=${
                currUrl + "/creators/verify/" + newCreator._id + "/" + uniqueString
              }>here</a> to get authorized</P>
              <p>This link <b>will expire in the next 6hrs</b></p>
              <p>We look forward to your impactfull events post on <b>Eventful</b></P>
              <p>Click this link: <a href=${
                currUrl + "/creators/verify/" + newCreator._id + "/" + uniqueString
              } >${currUrl + "/creators/verify/" + newCreator._id + "/" + uniqueString}<a/></p>
              </div>`
        })
       
        return 'successfulCreator_creation';
        
      }catch(err){
        console.log(err.message)
      }
    
  }

  getSignupPage(){
    return "creator_signup_page"
  }

  async verifyCreator(userId:string, uniqueString:string) {
    
    try{
      let user = await this.creatorVerificationModel.findOne({creatorId:userId})
  
      if(!user){
        throw new NotFoundException("User not found") 
      }

      if(user.expiring_date.getTime() < Date.now()){
        await this.creatorVerificationModel.deleteOne({creatorId:userId})
        await this.creatorModel.deleteOne({_id:userId})
      }
      
      const valid = await encoding.validateEncodedString(uniqueString, user.uniqueString)
      if(!valid){
        throw new Error("Opps!. It seems you have altered the verification link")
      }

      

      await this.creatorModel.findByIdAndUpdate({_id:userId}, {verified:true })
      await this.creatorVerificationModel.deleteOne({creatorId:userId})
     
      return `successful_verification`;

    }catch(err){
      console.log(err.message)
    }
  }

  getLoginPage() {

    return `creatorLogin_page`;
  }

  async login(LoginCreatorDto:LoginCreatorDto, res:Response) {
    try{
      const {email, password} = LoginCreatorDto
      let user = await this.creatorModel.findOne({email})

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

      const token:string =  this.Authservice.generateJwtToken(user._id, user.email, user.creator_name, user.profileImage)
      
      return {
        token
      }
    }catch(err){
      res.send(err.message)
    }
   
  }

  async getDashboard(req:Request, res:Response) {
    try{
    await this.Authservice.ensureLogin(req, res)
    const events:Event[] = await this.eventModel.find({creatorId:res.locals.user.id})
    if(!events){
      return []
    }

    return events

    }catch(err){
      res.send(err.message)
    }
  }

  async getUnticketedEventees(eventId:string, req:Request, res:Response) {
    try{
    await this.Authservice.ensureLogin(req, res)
    const event = await this.eventModel.findOne({_id:eventId}).populate("unticketedEventeesId")
    if(!event){
      return res.send("event not found")
    }
    let unticketedEventees = []
    let count = 0
    for(const eventee of event.unticketedEventeesId){
      unticketedEventees.push(eventee)
      count++
    }
    return [unticketedEventees,count]
      
    }catch(err){
      res.send(err.message)
    }
  }



  async getTicketedEventees(eventId:string, req:Request, res:Response) {
    try{
    await this.Authservice.ensureLogin(req, res)
    const event = await this.eventModel.findOne({_id:eventId}).populate("ticketedEventeesId")
    if(!event){
      return res.send("event not found")
    }
    let ticketedEventees = []
    let count = 0
    for(const eventee of event.ticketedEventeesId){
      ticketedEventees.push(eventee)
      count++
    }
    return [ticketedEventees,count]
      
    }catch(err){
      res.send(err.message)
    }
  }

}
