import { Request } from 'express';
import { FMCWebType } from '../@types/fmc';
import basepath from '../utils/basepath';

export const defineRedirectDest = (req: Request, data: any) => {
    const webType = req.session.type;
    switch (webType) {
        case FMCWebType.TODO:
            data['redirect_url'] = `${basepath.rootpath}/app/todo`;
            break;
        case FMCWebType.MC_AUTH:
            data['redirect_url'] = `${basepath.rootpath}/mc/auth`;
            break;
        default:
            data['redirect_url'] = `${basepath.rootpath}/`;
            break;
    }
};
