import cors from 'cors';
import config from '../config';

const mycors = cors({
  origin: (origin, callback) => {
    const allowedOrigins = [config.server.url, 'http://localhost:3000', 'http://localhost:3001'];

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
});

export default mycors;
