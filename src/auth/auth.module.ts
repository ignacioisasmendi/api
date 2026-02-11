import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { Auth0Guard } from './auth0.guard';
import { UserModule } from '../users/user.module';
import { PassportModule } from '@nestjs/passport';


@Global()
@Module({
  imports: [
    JwtModule.register({
      signOptions: { algorithm: 'RS256' },
    }),
    UserModule,
  ],
  providers: [Auth0Guard],
  exports: [Auth0Guard, JwtModule],
})
export class AuthModule {}
