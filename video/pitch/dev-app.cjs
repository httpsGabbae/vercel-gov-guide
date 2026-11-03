// Separate development cache prevents this recording server from colliding
// with the user's existing `npm run dev` sessions.
const next = require('../../node_modules/next');
const http = require('http');
const path = require('path');
const app = next({dev:true,dir:path.resolve(__dirname,'../..'),conf:{distDir:'.next-video-capture'}});
app.prepare().then(()=>http.createServer(app.getRequestHandler()).listen(3012,'127.0.0.1',()=>console.log('Capture app ready: http://localhost:3012')));
