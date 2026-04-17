import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { Auth0Guard } from './auth0.guard';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from '../users/user.module';

@Global()
@Module({
  imports: [
    JwtModule.register({
      signOptions: { algorithm: 'RS256' },
    }),
    UserModule,
  ],
  controllers: [AuthController],
  providers: [Auth0Guard, AuthService],
  exports: [Auth0Guard, JwtModule, AuthService],
})
export class AuthModule {}
