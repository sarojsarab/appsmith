/* eslint-disable no-console */
import fs from "fs/promises";
import globby from "globby";
import minimatch from "minimatch";

// some default properties
const ignoreTestFiles = ["cypress/e2e/**/spec_utility.ts"];

// used to roughly determine how many tests are in a file
const testPattern = /(^|\s)(it)\(/g;

function getArgs() {
  const [totalRunnersStr, thisRunnerStr, thisSpecPattern] =
    process.argv.splice(3);

  if (!totalRunnersStr || !thisRunnerStr) {
    throw new Error("Missing arguments");
  }

  if (!thisSpecPattern) {
    console.log("No specs provided. Running all the tests");
  }

  const totalRunners = totalRunnersStr ? Number(totalRunnersStr) : 0;
  const thisRunner = thisRunnerStr ? Number(thisRunnerStr) : 0;
  const specPattern = thisSpecPattern
    ? thisSpecPattern
    : "cypress/e2e/**/**/*.{js,ts}";

  if (isNaN(totalRunners)) {
    throw new Error("Invalid total runners.");
  }

  if (isNaN(thisRunner)) {
    throw new Error("Invalid runner.");
  }

  return { totalRunners, thisRunner, specPattern };
}

async function getTestCount(filePath: string): Promise<number> {
  const content = await fs.readFile(filePath, "utf8");
  return content.match(testPattern)?.length || 0;
}

async function getSpecFilePaths(specPattern: string): Promise<string[]> {
  const files = await globby(specPattern, {
    ignore: ignoreTestFiles,
  });

  // ignore the files that doesn't match
  const ignorePatterns = [...(ignoreTestFiles || [])];

  // a function which returns true if the file does NOT match
  const doesNotMatchAllIgnoredPatterns = (file: string) => {
    // using {dot: true} here so that folders with a '.' in them are matched
    const MINIMATCH_OPTIONS = { dot: true, matchBase: true };
    return ignorePatterns.every((pattern) => {
      return !minimatch(file, pattern, MINIMATCH_OPTIONS);
    });
  };
  const filtered = files.filter(doesNotMatchAllIgnoredPatterns);
  return filtered;
}

async function sortSpecFilesByTestCount(
  specPathsOriginal: string[],
): Promise<string[]> {
  const specPaths = [...specPathsOriginal];

  const testPerSpec: Record<string, number> = {};

  for (const specPath of specPaths) {
    testPerSpec[specPath] = await getTestCount(specPath);
  }

  return (
    Object.entries(testPerSpec)
      // Sort by the number of tests per spec file, so that we get a bit closer to
      // splitting up the files evenly between the runners. It won't be perfect,
      // but better than just splitting them randomly. And this will create a
      // consistent file list/ordering so that file division is deterministic.
      .sort((a, b) => b[1] - a[1])
      .map((x) => x[0])
  );
}

export function splitSpecs(
  specs: string[],
  totalRunners: number,
  thisRunner: number,
): string[] {
  return specs.filter((_, index) => index % totalRunners === thisRunner);
}

(async () => {
  try {
    const { specPattern, thisRunner, totalRunners } = getArgs();
    const specFilePaths = await sortSpecFilesByTestCount(
      await getSpecFilePaths(specPattern),
    );

    if (!specFilePaths.length) {
      throw Error("No spec files found.");
    }
    const specsToRun = splitSpecs(specFilePaths, totalRunners, thisRunner);
    console.log(specsToRun.join(","));
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
