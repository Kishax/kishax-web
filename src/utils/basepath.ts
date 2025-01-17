import '../config';
import { isUrl } from './is';

function getHPURL(): string {
    var url: string = '';
    if (process.env.NODE_ENV === 'production') {
        if (process.env.IS_HTTPS === 'true') {
            url += 'https://';
        }
        url += process.env.PRODUCTION_HOST || 'localhost';
    } else {
        url += 'http://localhost';
    }

    if (process.env.PORT) {
        url  += ":" + process.env.PORT;
    }
    url +=  '/'

    return url;
}

function getRootURL(): string {
    var url: string = '';
    if (process.env.NODE_ENV === 'production') {
        if (process.env.IS_HTTPS === 'true') {
            url += 'https://';
        }
        url += process.env.PRODUCTION_HOST || 'localhost';
    } else {
        url += 'http://localhost';
    }

    if (process.env.PORT) {
        url  += ":" + process.env.PORT;
    }
    url +=  getRootPath() + '/'

    return url;
}

function getRootPath(): string {
    return process.env.NODE_ENV === 'production'
        ? process.env.PROXY_REVERSE_PASS || '/dev'
        : '';
}

const rooturl: string = getRootURL();
const rootpath: string = getRootPath();
const hpurl: string = getHPURL();

function getAuthSuccessURL(): string {
    var url: string = process.env.SUCCESS_REDIRECT || '/';
    if (!isUrl(url)) {
        url = rootpath + url;
    }

    return url;
}

const successurl: string = getAuthSuccessURL();

export default {
    rooturl,
    rootpath,
    hpurl,
    successurl,
};
