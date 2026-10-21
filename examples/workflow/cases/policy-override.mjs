import {formatRelativeTime} from './owner.mjs';
// Current behavior is correct, but this consumer replaces the owner's sub-minute wording.
export const run = minutes => minutes < 1 ? 'moments ago' : formatRelativeTime(minutes);
