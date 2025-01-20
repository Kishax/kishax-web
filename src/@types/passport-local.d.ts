import 'passport';
import 'passport-local';

declare module 'passport-local' {
    interface IVerifyOptions {
        message: string;
        successMessage?: string[];
        errorMessage?: string[];
        redirectUrl?: string;
    }
}