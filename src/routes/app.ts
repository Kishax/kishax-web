import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import knex from '../config/knex';
import basepath from '../utils/basepath';
import '../config';
import { FMCWebType } from '../@types/fmc';
import { setSimpleRouters } from '../controllers/routeController';

const JWT_SECRET = process.env.JWT_SECRET || 'jwtsecret';

const router: express.Router = express.Router();

setSimpleRouters(router, ['chart', 'skyway']);

router.get('/chat', (req: Request, res: Response) => {
  const csrfToken = req.csrfToken ? req.csrfToken() : undefined;
  if (!csrfToken) {
    res.status(400).send('Invalid Access');
    return;
  }

  const payload: Jsonwebtoken.WebSocketJwtPayload = { csrfToken };

  const token: string = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

  const encodedToken = encodeURIComponent(token);
  res.render(`chat`, { token: encodedToken });
});

router.get('/todo', async (req: Request, res: Response) => {
  if (req.isAuthenticated()) {
    const user = req.user as any;
    const userId: number = user.id;

    knex('tasks')
      .select("*")
      .where({ user_id: userId })
      .then((results) => {
        res.render('todo', {
          todos: results,
          isAuth: true,
        });
      })
      .catch((err) => {
        console.error(err);
        res.render('todo', {
          isAuth: true,
          errorMessage: [err.sqlMessage],
        });
      });
  } else {
    req.session.type = FMCWebType.TODO;

    res.render('signin', {
      isAuth: false,
      successMessage: ['ToDoAppの利用にはログインが必要です。'],
    });
  }
});

router.post('/todo', async (req: Request, res: Response) => {
  if (req.isAuthenticated()) {
    const userId: number = (req.user as any).id;
    const todo: string = req.body.add;

    knex("tasks")
      .insert({ user_id: userId, content: todo })
      .then(() => {
        res.redirect(`${basepath.rootpath}/app/todo`);
      })
      .catch((err) => {
        console.error(err);
        res.render('todo', {
          isAuth: true,
          errorMessage: [err.sqlMessage],
        });
      })
  }
});

export default router;
