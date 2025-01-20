export enum FlashLocalPath {
    AUTH = 'auth',
    MESSAGES = 'messages',
    ERRORS = 'errors',
    MIDDLES = 'middles',
}

export enum FlashLocalVal {
    DEFAULT_UNDEFINED, DEFAULT_EMPTY,
}

export type FlashRequire = FlashLocalVal | any;

export interface FlashParams {
    [key: string]: FlashRequire;
}
