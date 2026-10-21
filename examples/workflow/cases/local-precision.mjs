import {formatRelativeTime} from './owner.mjs';
// This consumer owns precision; wording remains delegated.
export const run = minutes => formatRelativeTime(Math.floor(minutes));
