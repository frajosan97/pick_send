import type { SVGAttributes } from 'react';

export default function AppLogoIcon(props: SVGAttributes<SVGElement>) {
    return (
        <svg
            {...props}
            viewBox="0 0 40 40"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            focusable="false"
        >
            <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M20 4.5 3 13.5v13L20 35.5l17-9v-13L20 4.5Zm0 3.2 13.2 7-13.2 7-13.2-7 13.2-7Zm-14 9.6 12 6.4v8l-12-6.4v-8Zm16 14.4v-8l12-6.4v8l-12 6.4Zm1.5-9.9v-4.6l-2.4 2.4-1.5-1.5 5-5 5 5-1.5 1.5-2.4-2.4v4.6h-2.2Z"
            />
        </svg>
    );
}
