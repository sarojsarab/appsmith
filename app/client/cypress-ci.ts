/* eslint-disable no-console */
import { exec } from "child_process";

type GetEnvOptions = {
  required?: boolean;
};

function getEnvNumber(
  varName: string,
  { required = false }: GetEnvOptions = {},
): number {
  if (required && process.env[varName] === undefined) {
    throw Error(`${varName} is not set.`);
  }

  const value = Number(process.env[varName]);

  if (isNaN(value)) {
    throw Error(`${varName} is not a number.`);
  }

  return value;
}

function getArgs() {
  return {
    totalRunners: getEnvNumber("TOTAL_RUNNERS", { required: true }),
    thisRunner: getEnvNumber("THIS_RUNNER", { required: true }),
    specs: getEnvNumber("SPECS", { required: true }),
  };
}

(async () => {
  try {
    const { thisRunner, totalRunners, specs } = getArgs();
    const command = `yarn cypress run --spec "$(yarn --silent ts-node --quiet cypress-split.ts ${totalRunners} ${thisRunner} ${specs})"`;
    console.log(`Running: ${command}`);

    const commandProcess = exec(command);

    // pipe output because we want to see the results of the run
    if (commandProcess.stdout) {
      commandProcess.stdout.pipe(process.stdout);
    }

    if (commandProcess.stderr) {
      commandProcess.stderr.pipe(process.stderr);
    }

    commandProcess.on("exit", (code) => {
      process.exit(code || 0);
    });
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
