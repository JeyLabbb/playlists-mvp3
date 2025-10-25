export const CHECKOUT_ENABLED = true; // Habilitado para producción
export const SHOW_MONTHLY = false;
export const FREE_USAGE_LIMIT = Number(process.env.FREE_USAGE_LIMIT ?? 5);
export const USAGE_WINDOW_DAYS = Number(process.env.USAGE_WINDOW_DAYS ?? 30);