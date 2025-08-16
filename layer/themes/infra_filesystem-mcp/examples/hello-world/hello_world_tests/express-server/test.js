const http = require('http');

http.get('http://localhost:3000', (res) => {
    let data = '';
    res.on('data', chunk => { data += chunk; });
    res.on('end', () => {
        if (data.includes('Hello from Express Server!')) {
            console.log('Test passed!');
            process.exit(0);
        } else {
            console.log('Test failed!');
            process.exit(1);
        }
    });
});
