/**
 * Enhanced Calculator Demo - Main Entry Point
 * Integrated with AI Development Platform
 */

import { CalculatorCLI } from './cli';

function main(): void {
    const cli = new CalculatorCLI();
    cli.start();
}

// Start the application
if (require.main === module) {
    main();
}

export { Calculator } from './calculator';
export { CalculatorCLI } from './cli';
