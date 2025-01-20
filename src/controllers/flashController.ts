import { Request, Response } from 'express';
import { FlashLocalVal, FlashParams, FlashLocalPath, FlashRequire } from '../@types/flashType';

export const defineFlashMessages = (req: Request, res: Response, path: FlashLocalPath, params: FlashParams) => {
    const flashMessages: { [key: string]: any } = {};

    for (const [key, value] of Object.entries(params)) {
        if (value === FlashLocalVal.DEFAULT_EMPTY) {
            flashMessages[key] = req.flash(key)[0] || '';
        } else if (value === FlashLocalVal.DEFAULT_UNDEFINED) {
            flashMessages[key] = req.flash(key)[0] || undefined;
        } else if (value as any) {
            flashMessages[key] = req.flash(key)[0] || value;
            req.flash(key, value);
        }
    }

    if (path !== FlashLocalPath.MIDDLES) {
        res.locals[path] = flashMessages;
    } else {
        for (const [key, value] of Object.entries(flashMessages)) {
            res.locals[key] = value;
        }
    }
};

export const redefineFlashMessages = ((req: Request, params: { [key: string]: any }) => {
    for (const [key, value] of Object.entries(params)) {
        req.flash(key.toLowerCase(), value);
    }
});

export const defineMiddleFlashMessages = (req: Request, res: Response, paramKeys: string[]) => {
    const formatParams = paramKeys.reduce((acc, key) => {
        acc[key] = FlashLocalVal.DEFAULT_UNDEFINED;
        return acc;
    }, {} as { [key: string]: FlashRequire });
    defineFlashMessages(req, res, FlashLocalPath.MIDDLES, formatParams);
};
