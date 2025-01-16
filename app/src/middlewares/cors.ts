import cors from 'cors';

const mycors = cors({
    origin: (origin, callback) => {
        const allowedOrigins = [ 'http://localhost:3001' ];

        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
});

export default mycors;
