import { makeRouteHandler } from '@keystatic/next/route-handler';
import config from '../../../../keystatic.config';
import { readdir } from 'fs/promises';
import { join } from 'path';

const handler = makeRouteHandler({ config });

export async function GET(request: Request) {
    console.log('=== Keystatic GET API called ===');
    console.log('URL:', request.url);
    console.log('CWD:', process.cwd());

    const postsPath = join(process.cwd(), 'content/posts');
    console.log('Posts path:', postsPath);

    try {
        const files = await readdir(postsPath);
        console.log('Files found:', files.length, files);
    } catch (err) {
        console.error('ERROR reading posts directory:', err);
    }

    return handler.GET(request);
}

export async function POST(request: Request) {
    console.log('=== Keystatic POST API called ===');
    return handler.POST(request);
}
