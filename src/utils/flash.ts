import { Request } from 'express';

export function getMessage(req: Request, key: string): string[] | undefined {
  const flashMessage = req.flash(key);
  if (Array.isArray(flashMessage) && flashMessage.length > 0) {
    return flashMessage;
  } else {
    return undefined;
  }
}

