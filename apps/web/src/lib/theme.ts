export type Theme = 'light' | 'dark';

export const THEME_KEY = 'weblume.theme';

/**
 * Runs before the page paints (inlined in <head>) so a saved choice never flashes the other theme.
 * Without a saved choice the site follows the system setting via the tokens' media query.
 */
export const themeInitScript = `try{var t=localStorage.getItem('${THEME_KEY}');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`;
