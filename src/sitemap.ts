import expressSitemapXml from 'express-sitemap-xml';
import basepath from './utils/basepath';

const maps: expressSitemapXml.SitemapLeaf[] = [
  {
    url: '/',
    lastMod: true,
    changeFreq: 'weekly'
  },
  {
    url: '/signin',
    lastMod: true,
    changeFreq: 'weekly'
  },
  {
    url: '/app/chart',
    lastMod: true,
    changeFreq: 'weekly'
  },
  {
    url: '/app/skyway',
    lastMod: true,
    changeFreq: 'weekly'
  },
  {
    url: '/app/chat',
    lastMod: true,
    changeFreq: 'weekly'
  },
  {
    url: '/app/todo',
    lastMod: true,
    changeFreq: 'weekly'
  },
  {
    url: '/mc/auth',
    lastMod: true,
    changeFreq: 'weekly'
  },
];

const getUrls = (): expressSitemapXml.SitemapLeaf[] => {
  return maps;
};

const sitemap = expressSitemapXml(getUrls, basepath.hpurl);

export default sitemap;
