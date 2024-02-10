import { IsNotEmpty, IsObject, IsString } from "class-validator"

export class CreateEventeeDto {
    @IsString()
    @IsNotEmpty()
    first_name:string

    @IsString()
    @IsNotEmpty()
    last_name:string

    @IsString()
    @IsNotEmpty()
    password:string

    @IsString()
    @IsNotEmpty()
    email:string

    @IsString()
    @IsNotEmpty()
    sex:string

    @IsString()
    @IsNotEmpty()
    country:string

    @IsString()
    @IsNotEmpty()
    state:string

    @IsString()
    @IsNotEmpty()
    phoneNum:string
}
