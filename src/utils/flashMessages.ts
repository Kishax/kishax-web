import { Request, Response } from 'express';
import { FlashLocalType, FlashParams, FlashType } from '../@types/flashType';

export const defineFlashMessages = (req: Request, res: Response, type: FlashLocalType, params: FlashParams) => {
    const flashMessages: { [key: string]: any } = {};

    for (const [key, value] of Object.entries(params)) {
        if (value === FlashType.NONDEFAULT) {
            flashMessages[key] = req.flash(key)[0] || '';
        } else {
            flashMessages[key] = req.flash(key)[0] || value;
        }
    }

    res.locals[type] = flashMessages;
};

export const redefineFlashMessages = ((req: Request, params: { [key: string]: any }) => {
    for (const [key, value] of Object.entries(params)) {
        req.flash(key.toLowerCase(), value);
    }
});
