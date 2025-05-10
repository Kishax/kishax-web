import { Config } from '../types';

const baseConfig: Config = {
  name: 'Default Org',
  year: new Date().getFullYear(),
  url: 'https://default.org.net',
  og: {
    title: 'Default Org',
    description: 'Default Org Description',
    image: 'default-org.png',
    url: 'http://localhost:3000'
  },
  social: {
    me: {
      portfolio: {
        url: 'https://default.me/'
      }
    },
    discord: {
      kishax: {
        url: 'https://discord.gg/default'
      },
    },
    github: {
      kishax: {
        url: 'https://github.com/defaultuser/kishax'
      }
    }
  },
  server: {
    port: '3000',
    url: 'http://localhost:3000',
    protocol: 'http',
    root: "/",
    host: 'localhost:3000',
    logo: {
      url: "http://localhost:3000/favicon.png"
    },
    modules: {
      jwt: {
        secret: "defaultsecret"
      },
      mysql: {
        host: "localhost",
        user: "root",
        password: "password",
        database: "database"
      },
      passport: {
        x: {
          key: "X_COMSUMER_KEY",
          secret: "X_COMSUMER_SECRET"
        },
        google: {
          key: "GOOGLE_CLIENT_SECRET",
          secret: "GOOGLE_CLIENT_SECRET"
        },
        discord: {
          key: "DISCORD_CLIENT_KEY",
          secret: "DISCORD_CLIENT_SECRET"
        }
      },
      express_session: {
        secret: "YOUR_RAMDOM_SECRET"
      },
      nodemailer: {
        host: "smtp.gmail.com",
        port: 587,
        user: "<user>@gmail.com",
        password: "YOUR_PASSWORD"
      },
      skyway: {
        id: "YOUR_SKYWAY_ID",
        secret: "YOUR_SKYWAY_SECRET",
        session: {
          token: "YOUR_RANDOM_SECRET"
        }
      },
      express: {
        websocket: {
          protocol: 'ws',
          root: '/ws',
          url: 'ws://localhost:3000/ws',
          host: 'localhost:3000'
        },
      }
    }
  },
  client: {
    icon: {
      random: {
        enable: false
      },
      path: 'choose: /public/images/icon/default/sample.png (random=false) || /public/images/icon/default (random=true)'
    }
  }
};

export default baseConfig;
