import * as mongoose from "mongoose"

const Schema = mongoose.Schema

export const creatorSchema = new Schema({
    creator_name: { type: String, required:true},
    company_name:{type: String},
    password: { type: String, unique: true, required:true},
    email:{type:String,required:true},
    country:{type:String},
    state:{type:String},
    profileImage:{type:Object},
    phoneNum:{type:String},
    verified:{type:Boolean, default:false},
    passwordResetToken:{type:String},
    passwordResetExpireDate:{type:Date},
    freePlan:{type:Boolean, default:true},
    paidPlan:{type:Boolean, default:false},
    paymentStatus:{type:Boolean, default:false},
    creationDate:{type:Date},
    eventsId:[{type:Schema.Types.ObjectId, ref:"events"}]
})

mongoose.model("creators", creatorSchema)

export interface Creator extends mongoose.Document{
    id:string
    creator_name:string
    company_name:string
    password:string
    email:string
    country:string
    state:string
    profileImage:Object,
    phoneNum:string
    paymentStatus:boolean
    verified:boolean
    passwordResetToken:string
    passwordResetExpireDate:Date
    freePlan:boolean
    paidPlan:boolean
    creationDate:Date
    eventsId:object[]
}