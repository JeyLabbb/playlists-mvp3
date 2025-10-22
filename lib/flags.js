export const CHECKOUT_ENABLED = process.env.NODE_ENV !== 'production';
export const SHOW_MONTHLY = false;
export const FREE_USAGE_LIMIT = Number(process.env.FREE_USAGE_LIMIT ?? 5);
export const USAGE_WINDOW_DAYS = Number(process.env.USAGE_WINDOW_DAYS ?? 30);