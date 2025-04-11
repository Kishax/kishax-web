import { Request } from 'express';
import { WebType } from '../@types/web';
import basepath from '../utils/basepath';

export const defineRedirectDest = (req: Request, data: any) => {
  const webType = req.session.type;
  switch (webType) {
    case WebType.TODO:
      data['redirect_url'] = `${basepath.rootpath}/app/todo`;
      break;
    case WebType.MC_AUTH:
      data['redirect_url'] = `${basepath.rootpath}/mc/auth`;
      break;
    default:
      data['redirect_url'] = `${basepath.rootpath}/`;
      break;
  }
};
