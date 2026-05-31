import type { Route } from '@/types';

export const route: Route = {
    path: '/:name?',
    categories: ['other'],
    example: '/hello/world',
    name: 'Hello',
    maintainers: ['demo'],
    handler,
};

async function handler(ctx) {
    const name = ctx.req.param('name') || 'World';

    return {
        title: `Hello ${name}`,
        link: 'https://example.com',
        description: 'A simple demo RSS feed',
        item: [
            {
                title: `Hello, ${name}!`,
                description: `<p>This is a demo RSS item for <strong>${name}</strong>.</p>`,
                link: `https://example.com/hello/${name}`,
                pubDate: new Date().toUTCString(),
                author: 'Demo',
            },
            {
                title: `Welcome to RSSHub, ${name}!`,
                description: `<p>RSSHub is running and this route works correctly.</p>`,
                link: `https://example.com/hello/${name}/welcome`,
                pubDate: new Date(Date.now() - 3600_000).toUTCString(),
                author: 'Demo',
            },
        ],
    };
}
