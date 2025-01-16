import passport from 'passport';
import bcrypt from 'bcrypt';
import '../config';
import knex from '../db/knex';
import User from '../models/user';
import basepath from '../utils/basepath';
import { sendOneTimePass } from '../controllers/emailController';

function generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

function getCallBackURL(type: string): string {
    return basepath.rooturl + `auth/${type}/callback`;
}

passport.serializeUser((user, done) => {
    if (typeof user !== 'object' || user === null) {
        throw new Error('User must be a non-null object');
    }
    const user_info = user as { id: number; [key: string]: any };
    if (!('id' in user_info) || typeof user_info.id !== 'number') {
        throw new Error('User object does not contain a valid id');
    }
    done(null, user_info.id);
});

passport.deserializeUser(async (id: number, done) => {
    try {
        const user: Express.User = await User.findById(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

import { Strategy as DiscordStrategy, Profile as DiscordProfile } from 'passport-discord';

const discordClientId = process.env.DISCORD_CLIENT_ID || '';
const discordClientSecret = process.env.DISCORD_CLIENT_SECRET || '';
const discordCallbackURL =  getCallBackURL('discord');

if (!discordClientId || !discordClientSecret || !discordCallbackURL) {
    throw new Error('Discord OAuth settings are missing in .env file.');
}

passport.use(new DiscordStrategy({
    clientID: discordClientId,
    clientSecret: discordClientSecret,
    callbackURL: discordCallbackURL,
    scope: ['identify', 'email'] // 'guilds', 'guild.join'
}, async (accessToken, _, profile: DiscordProfile, done) => {
    try {
        const existingUser = await knex('users').where({ discordId: profile.id }).first();
        if (existingUser) {
            return done(null, existingUser);
        }

        const [newUserId] = await knex('users').insert({
            discordId: profile.id,
            name: profile.username,
            email: profile.email,
            avatar: profile.avatar,
            accessToken,
        });

        const newUser = await knex('users').where({ id: newUserId }).first();

        return done(null, newUser)
    } catch (err) {
        console.error('Error in DiscordStrategy: ', err)
        return done(null, false, { message: err });
    }
}));

import { Strategy as GoogleStrategy } from 'passport-google-oauth20';

const googleClientId = process.env.GOOGLE_CLIENT_ID || '';
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
const googleCallbackURL = getCallBackURL('google');

if (!googleClientId || !googleClientSecret || !googleCallbackURL) {
    throw new Error('Google OAuth setting are missing in .env file');
}

passport.use(new GoogleStrategy({
    clientID: googleClientId,
    clientSecret: googleClientSecret,
    callbackURL: googleCallbackURL,
    scope: ['profile', 'email'],
}, async (accessToken, _, profile, done) => {
    try {
        const existingUser = await knex('users').where({ googleId: profile.id }).first();
        if (existingUser) {
            return done(null, existingUser);
        }

        const [newUserId] = await knex('users').insert({
            googleId: profile.id,
            name: profile.displayName,
            email: profile.emails?.[0].value,
            avatar: profile.photos?.[0].value,
            accessToken,
        });

        const newUser = await knex('users').where({ id: newUserId }).first();

        return done(null, newUser);
    } catch (err) {
        console.error('Error in GoogleStrategy: ', err)
        return done(err, false);
    }
}));

import { Strategy as XStrategy } from 'passport-twitter';

const xConsumerKey = process.env.X_CONSUMER_KEY || '';
const xConsumerSecret = process.env.X_CONSUMER_SECRET || '';
const xCallbackURL = getCallBackURL("x");

if (!xConsumerKey || !xConsumerSecret || !xCallbackURL) {
    throw new Error('X OAuth settings are missing in .env file.');
}

passport.use('x', new XStrategy({
    consumerKey: xConsumerKey,
    consumerSecret: xConsumerSecret,
    callbackURL: xCallbackURL,
    includeEmail: true,
}, async (token, _, profile, done) => {
    try {
        const existingUser = await knex('users').where({ xId: profile.id }).first();
        if (existingUser) {
            console.log('Existing user found: ', existingUser);
            return done(null, existingUser);
        }

        const [newUserId] = await knex('users').insert({
            xId: profile.id,
            name: profile.displayName,
            xname: profile.username,
            email: profile.emails?.[0].value,
            avatar: profile.photos?.[0].value,
            accessToken: token,
        });

        const newUser = await knex('users').where({ id: newUserId }).first();

        return done(null, newUser);
    } catch (err) {
        console.error('Error in XStrategy: ', err);
        return done(err);
    }
}));

import { IVerifyOptions, Strategy as LocalStrategy } from 'passport-local';
import { generateToken } from './jwt';

passport.use(new LocalStrategy({
    usernameField: 'username',
    passwordField: 'password',
}, async (username: string, password: string, done) => {
    try {
        const user = await knex('users').where({ name: username }).first();
        if (!user) {
            return done(null, false, { message: 'Invalid username or password' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return done(null, false, { message: 'Invalid username or password' });
        }

        const token = await generateToken(user, true);
        if (!user.email) {
            const redirectUrl = `${basepath.rooturl}auth/set-email?token=${token}`;
            return done(null, false, { message: 'Email not set', redirectUrl } as IVerifyOptions);
        }

        const otp = generateOTP();
        await sendOneTimePass(user.email, otp);
        await knex('users').where({ name: username }).update({ otp });

        const redirectUrl: string = `${basepath.rooturl}auth/verify-otp?token=${token}`;

        return done(null, false, { message: 'Email not set', redirectUrl } as IVerifyOptions);
    } catch (err) {
        console.error('Error in LocalStrategy: ', err);
        return done(err);
    }
}));

export default passport;
