import { Request } from 'express';
import { WebType } from '../types';
import config from '../config';

export const defineRedirectDest = (req: Request, data: any) => {
  const webType = req.session.type;
  switch (webType) {
    case WebType.TODO:
      data['redirect_url'] = `${config.server.root}/app/todo`;
      break;
    case WebType.MC_AUTH:
      data['redirect_url'] = `${config.server.root}/mc/auth`;
      break;
    default:
      data['redirect_url'] = `${config.server.root}/`;
      break;
  }
};
