import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ejs from 'ejs';
import { JSDOM } from 'jsdom';

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

/**
 * @param{string} url
 * @returns{boolean} 
 */
function isValidUrl(url) {
    try {
        new URL(url);
        return true;
    } catch (_) {
        return false;
    }
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

    if (reqUrl.pathname === '/submit-url') {
        if (req.method !== 'POST') {
            res.writeHead(405, { 'Content-Type': 'text/plain' });
            res.end('Method Not Allowed');
            return;
        }

        let body = ''

        req.on('data', function(chunk) {
            body += chunk.toString();
        })

        req.on('end', function() {
            const parsedBody = new URLSearchParams(body);

            /**
             *@typedef {Object} SubmitUrlFormData
             *@property {string} q - a url to handle or empty string 
             */

            /**@type{SubmitUrlFormData}*/
            const formData = Object.fromEntries(parsedBody.entries());

            console.log("submitted form data: \n", formData);

            if (!formData.q || !isValidUrl(formData.q) || formData.q.trim() === '') {
                res.writeHead(400, { 'Content-Type': 'text/plain' });
                res.end("Invalid URL submitted");
                return;
            }

            fetch(formData.q)
                .then(function(response) {
                    if (!response.ok) {
                        throw new Error("Failed to fetch data form provided endpoint: ", formData.q);
                    }

                    return response.text();
                })
                .then(function(html) {
                    const dom = new JSDOM(html);
                    const document = dom.window.document;
                    return document.body.textContent;
                })
                .then(function(textContent) {
                    if (textContent === null || textContent.trim() === '') {
                        throw new Error("Parsing the body of the fetch document yeilded no text content: ", formData.q);
                    }

                    // do db stuff

                    const data = { text: textContent };

                    ejs.renderFile(path.join(__dirname, "src", "templates", "views", "text-reader.ejs"), data, function(err, str) {
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
                })
                .catch(function({ name, message }) {
                    console.error(err);
                    const error = { error_message: `${name}: ${message}` };
                    ejs.renderFile(path.join(__dirname, "src", "templates", "views", "error.ejs"), error, function(err, str) {
                        if (err) {
                            res.writeHead(500, { 'Content-Type': 'text/plain' });
                            res.end('Internal Server Error');
                            return;
                        }

                        if (!res.headersSent) {
                            res.writeHead(400, { 'Content-Type': 'text/html' });
                        }

                        res.end(str);
                    });

                    return;
                })

            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end('Form data submittied successfully');
            return;
        })
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
