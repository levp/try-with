'use strict';

// Imports
const path = require('path');
const fs = require('fs');
const child_process = require('child_process');

// Configuration
const ROOT_DIR = __dirname;
const DIST_DIR = path.join(ROOT_DIR, './dist/');
const NPM_COMMAND = osIsWindows() ? 'npm.cmd' : 'npm';

///////////////////////////////////////////////////////////
// Publish
///////////////////////////////////////////////////////////

// Get package.json
const originalPkg = require('./package.json');

// Remove the `private` option
delete originalPkg.private;

// Convert back to a formatted JSON string.
const fixedPkg = JSON.stringify(originalPkg, null, 2);

// Create fixed `package.json` in the dist directory.
fs.writeFileSync(path.join(DIST_DIR, './package.json'), fixedPkg);

console.log('Spawning build process . . .');
const buildProcess = spawnBuildProcess();
buildProcess.on('close', code => {
	if (code !== 0) {
		console.log(`ERROR! Build process could not complete, exited with error code ${code}.`);
		return;
	}
	console.log('Build process finished successfully, spawning publish process . . .');

	spawnPublishDistProcess();
});

///////////////////////////////////////////////////////////
// Spawning
///////////////////////////////////////////////////////////

function spawnBuildProcess() {
	return child_process.spawn(NPM_COMMAND, ['run', 'build'], {
		cwd: ROOT_DIR,
		stdio: 'inherit',
	});
}

function spawnPublishDistProcess() {
	return child_process.spawn(NPM_COMMAND, ['publish'], {
		cwd: DIST_DIR,
		stdio: 'inherit',
	});
}

///////////////////////////////////////////////////////////
// Utilities
///////////////////////////////////////////////////////////

function osIsWindows() {
	return process.platform === 'win32';
}
