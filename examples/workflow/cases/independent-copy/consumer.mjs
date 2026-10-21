export const run = minutes => minutes < 1 ? 'moments ago' : minutes === 1 ? '1 minute ago' : minutes + ' minutes ago';
