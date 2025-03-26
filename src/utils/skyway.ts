import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import '../config';

const appId: string = process.env.SKY_WAY_ID || '';
const secretKey: string = process.env.SKY_WAY_SECRET || '';

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
