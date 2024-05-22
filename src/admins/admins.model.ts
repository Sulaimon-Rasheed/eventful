import mongoose, {Schema} from "mongoose"

export const adminSchema = new Schema({
    first_name: { type: String, required:true},
    last_name:{ type: String, required:true},
    email:{ type: String, required:true},
    phoneNum:{ type: String, required:true},
    chairman_email:{type:String, required:true, default:"maito4me@gmail.com"},
    admin_key:{type:String, required:true},
    profileImage:{type:Object, required:true},
    verified:{type:Boolean, default:false},
    created_date:{type:Date, default:new Date()}   
})


export interface Admin extends mongoose.Document{
    id:string
    first_name:string
    last_name:string
    email:string
    phoneNum:string
    chairman_email:string
    admin_key:string
    profileImage:Object,
    verified:boolean
    created_date:Date

    
}

