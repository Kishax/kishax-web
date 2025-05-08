import { Request, Response, NextFunction } from 'express';
import * as path from 'path';
import fs from 'fs';
import '../config';
import config from '../../data/config.json';
import basepath from '../utils/basepath';
import { isUrl } from '../utils/is';

function getRandomFileName(directoryPath): string {
  const files = fs.readdirSync(directoryPath);
  const randomIndex = Math.floor(Math.random() * files.length);
  return files[randomIndex];
}

const localvals = async (req: Request, res: Response, next: NextFunction) => {
  res.locals.config = config
  res.locals.application_name = process.env.APP_NAME || 'App';
  res.locals.rootpath = basepath.rootpath;
  res.locals.hpurl = basepath.hpurl;
  res.locals.org_name = process.env.ORG_NAME || '';
  res.locals.org_year = process.env.ORG_YEAR || '';
  res.locals.org_logourl = process.env.ORG_LOGO_URL || '';
  res.locals.isAuth = req.isAuthenticated();
  res.locals.refurl = req.headers.referer || req.get('referer');
  res.locals.current_path = req.path;
  res.locals.discord_url = process.env.DISCORD_URL || '';
  res.locals.webapp_git_repo_url = process.env.GIT_REPO_URL || '';
  res.locals.blog_url = process.env.BLOG_URL || '';

  const defaultAvatarPath: string = path.join(__dirname, '../public', 'images', 'avatar', 'default');
  const randomAvatarFileName = getRandomFileName(defaultAvatarPath);
  res.locals.avatar_path = `${basepath.rootpath}/images/avatar/default/${randomAvatarFileName}`;

  if (req.isAuthenticated()) {
    const user = req.user as any;
    if (user.custom_avatar) {
      res.locals.avatar_path = user.custom_avatar;
    } else if (user.avatar) {
      if (isUrl(user.avatar)) {
        res.locals.avatar_path = user.avatar;
      } else {
        if (user.discordId) {
          res.locals.avatar_path = 'https://cdn.discordapp.com/avatars/'
            + user.discordId + "/" + user.avatar + '.'
            + (user.avatar.startsWith('a_') ? 'gif' : 'png');
        }
      }
    }
  }

  res.locals.csrfToken = req.csrfToken ? req.csrfToken() : '';

  next();
};

export default localvals;
