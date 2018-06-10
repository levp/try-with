'use strict';

// Imports
const path = require('path');
const fs = require('fs');
const child_process = require('child_process');

/*(function() {
	var childProcess = require("child_process");
	var oldSpawn = childProcess.spawn;
	function mySpawn() {
		console.log('spawn called');
		console.log(arguments);
		var result = oldSpawn.apply(this, arguments);
		return result;
	}
	childProcess.spawn = mySpawn;
})();*/

// Configuration
const DIST_DIR = path.join(__dirname, './dist/');

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

const npmCommand = osIsWindows() ? 'npm.cmd' : 'npm';
child_process.spawn(npmCommand, ['publish'], {cwd: DIST_DIR, stdio: 'inherit'});

///////////////////////////////////////////////////////////
// Utilities
///////////////////////////////////////////////////////////

function osIsWindows() {
	return process.platform === 'win32';
}
