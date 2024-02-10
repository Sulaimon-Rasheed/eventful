import * as nodemailer from "nodemailer"
import * as dotenv from "dotenv"
dotenv.config()

const transport = nodemailer.craeteTransport({
    service:"",
    auth:{
      user: process.env.AUTH_EMAIL,
      pass: process.env.AUTH_PASS,
    }
})
