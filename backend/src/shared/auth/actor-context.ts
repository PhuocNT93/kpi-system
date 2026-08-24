import { AsyncLocalStorage } from 'async_hooks';
import { Request } from 'express';
import { Actor } from './types.js';

const actorAsyncLocalStorage = new AsyncLocalStorage<Actor>();

export function runWithActorContext<T>(actor: Actor, fn: () => T): T {
  return actorAsyncLocalStorage.run(actor, fn);
}

export function getActorFromContext(req?: Request): Actor | undefined {
  const asyncActor = actorAsyncLocalStorage.getStore();
  if (asyncActor) {
    return asyncActor;
  }
  if (req && req.actor) {
    return req.actor;
  }
  return undefined;
}

export function getActorOrThrow(req?: Request): Actor {
  const actor = getActorFromContext(req);
  if (!actor) {
    throw new Error('No authenticated actor found in context');
  }
  return actor;
}

export function setActorContext(req: Request, actor: Actor): void {
  req.actor = actor;
}
