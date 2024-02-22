import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class Auth0Service {
  private auth0Client: any; // Use 'any' type to avoid TypeScript errors

  constructor(private readonly configService: ConfigService) {
    // Check if 'window' object is defined (i.e., in browser environment)
    if (typeof window !== 'undefined') {
      const auth0 = require('auth0-js');
      // Initialize Auth0 client with configuration
      this.auth0Client = new auth0.WebAuth({
        domain: configService.get('AUTH0_DOMAIN'),
        clientID: configService.get('AUTH0_CLIENT_ID'),
        redirectUri: `${configService.get('APP_URL')}/callback`,
        audience: `https://${configService.get('AUTH0_DOMAIN')}/userinfo`,
        responseType: 'token id_token',
        scope: 'openid profile email',
      });
    }
  }

  // Method to initiate login with Auth0
  login(): void {
    if (this.auth0Client) {
      this.auth0Client.authorize();
    }
  }

  // Method to handle authentication callback
  handleAuthentication(): Promise<any> {
    if (this.auth0Client) {
      return new Promise((resolve, reject) => {
        this.auth0Client.parseHash((err, authResult) => {
          if (err) {
            reject(err);
          } else if (authResult && authResult.idToken) {
            resolve(authResult);
          } else {
            reject(new Error('Authentication failed'));
          }
        });
      });
    } else {
      return Promise.reject(new Error('Auth0 client not available'));
    }
  }
}