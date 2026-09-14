import { EventEmitter } from 'events';

export const appEventEmitter = new EventEmitter();

export enum AppEvent {
  EVALUATION_UPDATED = 'EVALUATION_UPDATED',
  EVALUATION_LOCKED = 'EVALUATION_LOCKED',
  CYCLE_LOCKED = 'CYCLE_LOCKED',
}
