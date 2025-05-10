import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import config from '../config';

const appId: string = config.server.modules.skyway.id || '';
const secretKey: string = config.server.modules.skyway.secret || '';

export const calculateAuthToken = (roomName: string, memberName: string, iat: number, exp: number) => {
  try {
    return jwt.sign({
      jti: crypto.randomUUID(),
      iat: iat,
      exp: exp,
      version: 3,
      scope: {
        appId: appId,
        turn: {
          enabled: true
        },
        analytics: {
          enabled: true
        },
        rooms: [
          {
            id: '*',
            name: roomName,
            methods: ['create', 'close', 'updateMetadata'],
            sfu: {
              enabled: true,
              maxSubscribersLimit: 99
            },
            member: {
              id: '*',
              name: memberName,
              methods: ['publish', 'subscribe', 'updateMetadata']
            }
          }
        ]
      }
    }, secretKey);
  } catch (error) {
    console.log('Error generating JWT:', error);
    throw new Error('Token generation failed');
  }
};
