import { IsEmail, IsNotEmpty} from "class-validator";

export class emailVerificationDto {
    @IsEmail()
    @IsNotEmpty()
    email:string   
}