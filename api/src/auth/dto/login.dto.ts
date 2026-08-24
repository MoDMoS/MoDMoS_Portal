import { IsString, MinLength } from 'class-validator';

/** `email` field accepts email or username (legacy key name). */
export class LoginDto {
  @IsString()
  @MinLength(1)
  email!: string;

  @IsString()
  @MinLength(1)
  password!: string;
}
