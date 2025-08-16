const http = require('http');

const server = http.createServer((req, res) => {
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end('Hello from Express Server!\n');
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

// For testing
if (require.main === module) {
    setTimeout(() => {
        server.close();
        process.exit(0);
    }, 1000);
}

module.exports = server;
