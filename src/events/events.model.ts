import mongoose, {Schema} from "mongoose"
import {DateTime} from "luxon"

export const eventSchema = new Schema({
    title: { type: String, required:true},
    description: { type: String,required:true},
    venue:{type:String},
    starting_time:{type:String},
    ending_time:{type:String},
    event_date:{type:String, required:true},
    reminder_days:{type:String, required:true},
    category:{type:String, required:true, enum:["Concert", "Sport", "Theater", "Conference", "Trade Show", "Networking", "Workshop", "Product Launch", "Charity", "Seminar", "Exhibition", "Webinar", "Symposium", "Film Show"]},
    registration_deadline:{type:String, required:true},
    ticket_price:{type:String, required:true},
    discount:{type:String},
    event_image:{type:Object, required:true},
    state:{type:String,default:"Draft"},
    additional_info:{type:String},
    created_date:{type:String, default:DateTime.now().toFormat('LLL d, yyyy \'at\' HH:mm')},
    posted_date:{type:String, default:null},
    creatorId:{type:Schema.Types.ObjectId, ref:"Creator"},
    unticketedEventeesId:[{type:Schema.Types.ObjectId, ref:"Eventee"}],
    ticketedEventeesId:[{type:Schema.Types.ObjectId, ref:"Eventee"}]
})


export interface Event extends mongoose.Document{
    id:string
    title:string
    description:string
    venue:string
    starting_time:string
    ending_time:string
    event_date:string
    reminder_days:string
    category:string
    registration_deadline:string
    ticket_price:string
    discount:string
    event_image:object
    state:string
    additional_info:string
    created_date:string
    posted_date:string
    creatorId:string
    unticketedEventeesId:string[]
    ticketedEventeesId:string[]
    
}

