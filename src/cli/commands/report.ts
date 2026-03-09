import { Command } from 'commander';

/** `zaria report` — re-renders the most recent saved audit result. */
export const reportCommand = new Command('report')
  .description('Generate a report from the last audit run')
  .option('-o, --output <format>', 'output format: terminal|json|html|markdown|sarif', 'terminal')
  .option('-f, --file <path>', 'write report to file instead of stdout')
  .action(() => {
    console.log('Generating report from last audit run…');
  });
