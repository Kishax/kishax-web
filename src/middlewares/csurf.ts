import csrf from 'csurf';

const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.IS_HTTPS === 'true' || false,
    sameSite: 'strict',
  }
});

export default csrfProtection;
