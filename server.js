import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ejs from 'ejs';
import { JSDOM } from 'jsdom';
import sqlite3 from 'sqlite3';

const sqlite3Verbose = sqlite3.verbose();
const db = new sqlite3Verbose.Database('./db/test.db', function(err) {
    if (err) {
        console.error(err.message);
    }

    console.log("Connected to the SQLite database");
});

db.run(`CREATE TABLE IF NOT EXISTS url (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        path TEXT NOT NULL, 
        text_content TEXT NOT NULL
        );`, function(err) {

    if (err) {
        console.error(err.message);
        return;
    }

    console.log("Table created or already exists.");
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

    if (reqUrl.pathname === '/submit-url') {
        if (req.method !== 'GET') {
            res.writeHead(405, { 'Content-Type': 'text/plain' });
            res.end('Method Not Allowed');
            return;
        }

        const query = reqUrl.searchParams;

        /**
         *@typedef {Object} SubmitUrlFormData
         *@property {string} q - a url to handle or empty string 
         */

        /**@type{SubmitUrlFormData}*/
        const formData = { q: query.get('q') };
        console.log("submitted form data: \n", formData);

        if (formData.q === null || !isValidUrl(formData.q) || formData.q.trim() === '') {
            console.warn("Form was submitted with an empty query");
            res.writeHead(204, { 'Content-Type': 'text/plain' });

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

                db.run(`INSERT INTO url (path, text_content) VALUES (${formData.q}, ${textContent});`, function(err) {
                    if (err) {
                        console.error(err.message);
                        return;
                    }

                    console.log("Sucessfully inserted values for path and text content into db");
                })

                const data = { url: formData.q, text: textContent };

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
    }

    if (reqUrl.pathname === '/text-reader') {

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

process.on('SIGINT', function() {
    db.close();
    process.exit();
})
