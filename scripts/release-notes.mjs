/**
 * @file scripts/release-notes.mjs
 * Purpose: Verify a stable release tag and extract its reviewed changelog notes.
 *
 * Table of contents:
 * 1. Imports
 * 2. Constants and state
 * 3. Initialization and execution
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";

const projectRoot = new URL("../", import.meta.url);
const manifest = JSON.parse(
    await readFile(new URL("package.json", projectRoot), "utf8"),
);
const releaseTag = process.argv[2];
const stableVersion = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/u;

if (
    !stableVersion.test(manifest.version) ||
    releaseTag !== `v${manifest.version}`
) {
    throw new Error(
        `Release tag ${releaseTag} must match package version v${manifest.version}.`,
    );
}

const changelog = await readFile(new URL("CHANGELOG.md", projectRoot), "utf8");
const sections = changelog.split(/^## /mu).slice(1);
const expectedHeading = new RegExp(
    `^\\[${manifest.version.replaceAll(".", "\\.")}\\] - \\d{4}-\\d{2}-\\d{2}$`,
    "u",
);
const releaseSection = sections.find((section) =>
    expectedHeading.test(section.split("\n", 1)[0]),
);
const notes = releaseSection?.split("\n").slice(1).join("\n").trim();

if (!notes) {
    throw new Error(
        `CHANGELOG.md must contain dated release notes for ${manifest.version}.`,
    );
}

const outputDirectory = new URL("dist/", projectRoot);
await mkdir(outputDirectory, { recursive: true });
await writeFile(new URL("release-notes.md", outputDirectory), `${notes}\n`);
console.log(`Validated ${releaseTag}; wrote dist/release-notes.md.`);
