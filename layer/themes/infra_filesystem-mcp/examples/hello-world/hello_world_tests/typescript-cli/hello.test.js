const { execSync } = require('child_process');
const path = require('node:path');

test('should output hello message', () => {
    const helloPath = path.join(__dirname, 'hello.js');
    const output = execSync(`node ${helloPath}`, { encoding: 'utf8' });
    expect(output).toContain('Hello from TypeScript!');
});
