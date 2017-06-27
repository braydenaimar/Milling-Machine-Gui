/* Main Process JavaScript */

/* eslint-disable no-console */

const electron = require('electron');
const os = require('os');

const { app, BrowserWindow, ipcMain, dialog } = electron;

console.log('running index.js');
console.log(`Host Device: '${os.hostname()}'`);

const developerHosts = [ 'BRAYDENS-LENOVO' ];  // List of developer host devices
const inDebugMode = developerHosts.includes(os.hostname());

let indexOpenDialogTime = 0;
let indexSaveDialogTime = 0;

ipcMain.on('open-dialog', (event, options) => {

	if (indexOpenDialogTime && Date.now() - indexOpenDialogTime < 1000)
		return;

	indexOpenDialogTime = Date.now();
	console.log('Showing File Open Dialog.');

	dialog.showOpenDialog(options, (filename) => {

		event.sender.send('opened-file', filename);

	});

});

ipcMain.on('save-dialog', (event, options) => {

	if (indexSaveDialogTime && Date.now() - indexSaveDialogTime < 1000)
		return;

	indexSaveDialogTime = Date.now();
	console.log('Showing File Save Dialog.');

	dialog.showSaveDialog(options, (filename) => {

		event.sender.send('saved-file', filename);

	});

});

app.on('browser-window-created', (e, window) => {

	window.setMenu(null);

});

app.on('ready', () => {

	let win = null;

	if (inDebugMode) {  // If running this on braydens laptop, open it in development mode

		console.log('Opening in development mode.');
		console.log('electron', electron);

		win = new BrowserWindow({
			// show: false,
			// width: 980,
			// height: 620,
			width: 1180,
			height: 810,
			// fullscreen: true,
			// kiosk: true,
			frame: true,
			// backgroundColor: '#eaedf4',
			backgroundThrottling: false,
			// webPreferences: {
			// 	nodeIntegration: false
			// }
			icon: `${__dirname}/icons/icon.ico`
		});

	} else {  // If not running on braydens laptop, open the program in deployment mode

		console.log('Opening in deployment mode.');

		win = new BrowserWindow({
			// show: false,
			// width: 1650,
			// height: 950,
			// fullscreen: true,
			// kiosk: true,
			width: 980,
			height: 810,
			frame: true,
			// backgroundColor: '#eaedf4',
			backgroundThrottling: false,
			// webPreferences: {
			// 	nodeIntegration: false
			// }
			icon: `${__dirname}/icons/icon.ico`
		});

	}

	win.loadURL(`file://${__dirname}/main.html`);

	if (os.hostname() === 'BRAYDENS-LENOVO')
		win.webContents.openDevTools();

	win.webContents.on('did-finish-load', () => {

		console.log('Got \'did-finish-load\' event.');

	});

	ipcMain.on('all-widgets-loaded', () => {  // Called after all widgets initBody() functions and after initial visibility has been set and sidebar buttons have been created

		win.show();
		win.focus();
		console.log('Got ipcMain event: \'all-widgets-loaded\'.\n  ...showing window.');

	});

	ipcMain.on('open-dev-tools', () => {

		win.webContents.openDevTools();
		win.focus();

		console.log('Got ipcMain event: \'open-dev-tools\'.');

	});

	ipcMain.on('focus-window', () => {

		win.focus();

	});

	win.on('close', () => {

		win = null;

	});

});
