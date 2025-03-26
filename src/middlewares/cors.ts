import cors from 'cors';
import { getHPURL } from '../utils/basepath';

const mycors = cors({
  origin: (origin, callback) => {
    const allowedOrigins = [getHPURL(false), 'http://localhost:3000', 'http://localhost:3001']; // null -> file://

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
});

export default mycors;
