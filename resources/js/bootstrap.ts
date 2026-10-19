import { route } from 'ziggy-js';

declare global {
    var route: typeof import('ziggy-js').route;
}

if (typeof window !== 'undefined') {
    window.route = route;
}


