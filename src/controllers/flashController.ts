import { Request, Response } from 'express';
import { FlashLocalVal, FlashParams, FlashLocalPath, FlashRequire } from '../@types/flashType';

export const saveSession = (req: Request): Promise<void> => {
    return new Promise((resolve, reject) => {
        req.session.save((err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
};

export const defineFlashMessages = (req: Request, res: Response, params: FlashParams, path: FlashLocalPath = FlashLocalPath.NON_PATH) => {
    const flashMessages: { [key: string]: any } = {};

    const lastflash = req.flash();

    for (const [key, value] of Object.entries(params)) {
        const flashValue = lastflash[key] && Array.isArray(lastflash[key]) ? lastflash[key] : undefined;
        if (value === FlashLocalVal.DEFAULT_EMPTY) {
            flashMessages[key] = flashValue || '';
        } else if (value === FlashLocalVal.DEFAULT_UNDEFINED) {
            flashMessages[key] = flashValue || undefined;
        } else if (value as any) {
            flashMessages[key] = value;
            req.flash(key, value);
        }
    }

    if (path === FlashLocalPath.NON_PATH) {
        for (const [key, value] of Object.entries(flashMessages)) {
            res.locals[key] = value;
        }
    } else {
        res.locals[path] = flashMessages;
    }
};

export const redefineFlashMessages = ((req: Request, params: { [key: string]: any }) => {
    for (const [key, value] of Object.entries(params)) {
        req.flash(key, value);
    }
});

export const defineMiddleFlashMessages = (req: Request, res: Response, paramKeys: string[]) => {
    const formatParams = paramKeys.reduce((acc, key) => {
        acc[key] = FlashLocalVal.DEFAULT_UNDEFINED;
        return acc;
    }, {} as { [key: string]: FlashRequire });

    defineFlashMessages(req, res, formatParams);
};

export const debugOutput = (req: Request) => {
    const flashMessages = req.flash();
    console.log('Debug FlashMessages:', flashMessages);

    for (const key in flashMessages) {
        req.flash(key, flashMessages[key]);
    }
};
