export const API =
  process.env.REACT_APP_API_URL ||
  (process.env.NODE_ENV === 'development'
    ? `${window.location.protocol}//${window.location.hostname}:3000`
    : '');
export const api = (path, opts) => fetch(API + path, opts);
