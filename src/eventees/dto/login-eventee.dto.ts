import { IsEmail, IsNotEmpty,IsString } from "class-validator";

export class LoginEventeeDto {
    @IsEmail()
    @IsNotEmpty()
    email:string

    @IsString()
    @IsNotEmpty()
    password:string
    
}
