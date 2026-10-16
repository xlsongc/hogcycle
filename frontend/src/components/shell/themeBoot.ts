/**
 * The viewer's theme, applied before the first paint.
 *
 * ThemeToggle remembers a choice in localStorage, but it runs only after
 * hydration, so a dark choice painted light first and then switched. This
 * runs synchronously in <head>, as the HTML is parsed. It only sets what the
 * toggle would set, and any failure leaves the page on the system theme.
 */

export const THEME_KEY = "hogcycle:theme";

export const THEME_BOOT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_KEY
)});if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;
