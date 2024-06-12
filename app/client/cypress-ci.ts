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

function getEnvValue(
  varName: string,
  { required = false }: GetEnvOptions = {},
) {
  if (required && process.env[varName] === undefined) {
    throw Error(`${varName} is not set.`);
  }
  const value = process.env[varName] === undefined ? "" : process.env[varName];
  return value;
}

function getArgs() {
  return {
    totalRunners: getEnvNumber("TOTAL_RUNNERS", { required: true }),
    thisRunner: getEnvNumber("THIS_RUNNER", { required: true }),
    specs: getEnvValue("CYPRESS_SPECS", { required: true }),
    env: getEnvValue("CYPRESS_ENV", { required: true }),
    config_file: getEnvValue("CYPRESS_CONFIG_FILE", { required: true }),
    headless: getEnvValue("CYPRESS_HEADLESS", { required: true }),
    browser: getEnvValue("CYPRESS_BROWSER", { required: true }),
  };
}

(async () => {
  try {
    const {
      browser,
      config_file,
      env,
      headless,
      specs,
      thisRunner,
      totalRunners,
    } = getArgs();

    let command = "yarn cypress run";
    command += browser != "" ? `--browser ${browser}` : "";
    command += config_file != "" ? `--config-file ${config_file}` : "";
    command += env != "" ? `--env ${env}` : "";
    command += headless != "true" ? `--headed` : "";

    const final_command = `${command} --spec "$(yarn --silent ts-node --quiet cypress-split.ts ${totalRunners} ${thisRunner} ${specs})"`;
    console.log(`Running: ${final_command}`);

    const commandProcess = exec(final_command);

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
