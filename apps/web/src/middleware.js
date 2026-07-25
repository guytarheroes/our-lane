import { defineMiddleware } from 'astro:middleware';
import { unsign } from './lib/auth.js';

export const onRequest = defineMiddleware((ctx, next) => {
  ctx.locals.userId = unsign(ctx.cookies.get('session')?.value);
  if (ctx.url.pathname.startsWith('/admin') && !ctx.locals.userId) {
    return ctx.redirect('/login');
  }
  return next();
});
