import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ejs from 'ejs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function fetchContent(targetUrl, callback) {
    const parseUrl = new URL(targetUrl);
    const protocol = parseUrl.protocol === 'https:' ? https : http;

    protocol.get(targetUrl, function(response) {
        let data = ''

        response.on('data', function(chunk) {
            data += chunk;
        });

        response.on('end', function() {
            callback(null, data);
        });

        response.on('error', function(err) {
            callback(err);
        });
    }).on('error', function(err) {
        callback(err);
    });
}

function serverStaticFile(res, filePath, contentType) {
    fs.readFile(filePath, function(err, data) {
        if (err) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Internal Server Error');
            return;
        }

        if (!res.headerSent) {
            res.writeHead(200, { 'Content-Type': contentType });
        }
        res.end(data);
    });
}

const server = http.createServer(function(req, res) {
    const reqUrl = new URL(req.url, `http://${req.headers.host}`);
    const targetUrl = reqUrl.searchParams.get('url');

    if (targetUrl !== null) {
        fetchContent(targetUrl, function(err, content) {
            if (err) {
                if (!res.headersSent) {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                }
                res.end('Error fetching the Url');
                return;
            }

            if (!res.headersSent) {
                res.writeHead(200, { 'Content-Type': 'text/html' });
            }
            res.end(content);
        });
        return;
    }

    if (reqUrl.pathname === '/app.js') {
        serverStaticFile(res, path.join(__dirname, "src", "js", 'app.js'), 'application/javascript');
        return;
    }

    if (reqUrl.pathname === '/' || reqUrl.pathname === '/index.html') {
        if (req.method !== 'GET') {
            res.writeHead(405, { 'Content-Type': 'text/plain' });
            res.end('Method Not Allowed');
            return;
        }

        ejs.renderFile(path.join(__dirname, "src", "templates", "views", "index.ejs"), function(err, str) {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Internal Server Error');
                return;
            }

            if (!res.headersSent) {
                res.writeHead(200, { 'Content-Type': 'text/html' });
            }
            res.end(str);
        })
        return;
    }

    if (!res.headersSent) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
    }
    res.end('Not Found');
});

const PORT = process.env.PORT || 3000
server.listen(PORT, function() { console.log('Server running on port: ', PORT); });
