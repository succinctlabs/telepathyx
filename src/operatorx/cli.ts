// Simple CLI for the operatorx package
// Usage: `operatorx run <config-name>`

import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import { Operator } from './operator.js';
import { ALL_CONFIGS } from './config.js';
import { configDotenv } from 'dotenv';

configDotenv();

// Define the CLI command structure using yargs
yargs(hideBin(process.argv))
    .command(
        'run <config-name>',
        'Run the operator with the specified config',
        (yargs) => {
            return yargs.positional('config-name', {
                describe: 'Name of the configuration to run',
                type: 'string'
            });
        },
        (argv) => {
            if (argv['config-name']) {
                runOperator(argv['config-name']);
            }
        }
    )
    .demandCommand(1)
    .strict()
    .help().argv;

// Function to handle the 'run' command
async function runOperator(configName: string) {
    console.log(`Running operator with config: ${configName}`);
    const config = ALL_CONFIGS[configName];
    if (config === undefined) {
        console.error(`Config with name '${configName}' not found`);
        return;
    }
    const operator = new Operator(config);
    await operator.start();
}
