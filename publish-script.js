'use strict';

// Imports
const path = require('path');
const fs = require('fs');
const util = require('util');
const child_process = require('child_process');

const fsp = {
	readFile: util.promisify(fs.readFile),
	writeFile: util.promisify(fs.writeFile),
};

// Configuration
const ROOT_DIR = __dirname;
const DIST_DIR = path.join(ROOT_DIR, './dist/');
const NPM_COMMAND = osIsWindows() ? 'npm.cmd' : 'npm';

const PACKAGE_JSON_PATH = path.join(ROOT_DIR, './package.json');
const README_PATH = path.join(ROOT_DIR, './README.md');

///////////////////////////////////////////////////////////

publishScript();

async function publishScript() {
	await runBuildProcess();
	await Promise.all([
		copyPackageJsonToDist(),
		copyReadmeToDist(),
	]);
	console.log('Build process finished successfully, spawning publish process . . .');
	await spawnPublishDistProcess();
	console.log('Build publish finished successfully!');
}

async function copyPackageJsonToDist() {
	// Get package.json contents
	const packageJsonContents = await fsp.readFile(PACKAGE_JSON_PATH);
	const originalPkg = JSON.parse(packageJsonContents.toString());
	// Remove the `private` option
	delete originalPkg.private;
	// Convert back to a formatted JSON string.
	const fixedPkg = JSON.stringify(originalPkg, null, 2);
	// Create fixed `package.json` in the dist directory.
	await fsp.writeFile(path.join(DIST_DIR, './package.json'), fixedPkg);
}

async function copyReadmeToDist() {
	const readmeContents = await fsp.readFile(README_PATH);
	await fsp.writeFile(path.join(DIST_DIR, './README.md'), readmeContents);
}

async function runBuildProcess() {
	return new Promise((resolve, reject) => {
		const buildProcess = child_process.spawn(NPM_COMMAND, ['run', 'build'], {
			cwd: ROOT_DIR,
			stdio: 'inherit',
		});

		buildProcess.on('close', code => {
			if (code !== 0) {
				reject(new Error(`ERROR! Build process could not complete, exited with error code ${code}.`));
				return;
			}
			resolve();
		});
	});
}

async function spawnPublishDistProcess() {
	return new Promise((resolve, reject) => {
		const publishProcess = child_process.spawn(NPM_COMMAND, ['publish'], {
			cwd: DIST_DIR,
			stdio: 'inherit',
		});

		publishProcess.on('close', code => {
			if (code !== 0) {
				reject(`ERROR! Publish process could not complete, exited with error code ${code}.`);
				return;
			}
			resolve();
		});
	});
}

///////////////////////////////////////////////////////////
// Utilities
///////////////////////////////////////////////////////////

function osIsWindows() {
	return process.platform === 'win32';
}
