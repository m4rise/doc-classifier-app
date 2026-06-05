import { IsBoolean, IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @MinLength(8)
  password!: string;

  @IsBoolean()
  tosAccepted!: boolean;

  @IsString()
  tosVersion!: string;
}
