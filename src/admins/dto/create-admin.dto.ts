import { IsNotEmpty, IsObject, IsString, IsNumber } from "class-validator"

export class CreateAdminDto {
    @IsString()
    @IsNotEmpty()
    first_name:string

    @IsString()
    @IsNotEmpty()
    last_name:string

    @IsString()
    @IsNotEmpty()
    email:string

    @IsString()
    @IsNotEmpty()
    phoneNum:string

    @IsNotEmpty()
    profileImage:any

}
