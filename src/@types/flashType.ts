export enum FlashType {
    NONDEFAULT,
}

export enum FlashLocalType {
    AUTH = 'auth',
    MESSAGES = 'messages',
    ERRORS = 'errors',
}

type FlashRequire = FlashType | any;

export interface FlashParams {
    [key: string]: FlashRequire;
}
