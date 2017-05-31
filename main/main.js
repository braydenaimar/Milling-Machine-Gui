/**
 *   __  __       _             _                  ____            _       _
 *  |  \/  | __ _(_)_ __       | | __ ___   ____ _/ ___|  ___ _ __(_)_ __ | |_
 *  | |\/| |/ _` | | '_ \   _  | |/ _` \ \ / / _` \___ \ / __| '__| | '_ \| __|
 *  | |  | | (_| | | | | | | |_| | (_| |\ V / (_| |___) | (__| |  | | |_) | |_
 *  |_|  |_|\__,_|_|_| |_|  \___/ \__,_| \_/ \__,_|____/ \___|_|  |_| .__/ \__|
 *                                                                  |_|
 *
 *  @author Brayden Aimar
 */

/* global ws:true, wgtMap:true, wgtLoaded:true, wgtVisible:true, widget:true, initBody:true, widgetLoadCheck:true, createWidgetContainer:true, loadHtmlWidget:true, loadJsWidget:true, createSidebarBtns:true, initWidgetVisible:true, makeWidgetVisible:true, updateGitRepo:true */  // eslint-disable-line no-unused-vars

define([ 'jquery', 'gui', 'amplify', 'mousetrap' ], ($) => {

	/* eslint-disable no-console*/

	console.log('running main.js');
	console.log('global:', global);

	Plotly = require('./lib/js/plotly.min.js');  // eslint-disable-line import/no-unresolved
	THREE = require('./lib/js/three.min.js');    // eslint-disable-line import/no-unresolved
	CSON = require('cson');
	fsCSON = require('fs-cson');
	fs = require('fs');
	os = require('os');
	({ spawn } = require('child_process'));

	// The ipc module aLlows for communication between the main and render processes.
	electron = require('electron');
	({ ipcRenderer: ipc } = electron);

	({ publish, subscribe, unsubscribe } = amplify);

	DEBUG_ENABLED = true;  // Enable debugging mode
	const developerHosts = [ 'BRAYDENS-LENOVO' ];  // List of developer host devices
	inDebugMode = DEBUG_ENABLED && developerHosts.includes(os.hostname());

	debug = {};

	if (inDebugMode && (typeof console != 'undefined')) {  // If debug mode is enabled

		const keys = Object.keys(console);

		for (let i = 0; i < keys.length; i++) {

			const key = keys[i];

			if (key === 'memory') {

				debug[key] = console[key];

			} else if (key === 'error') {

				debug[key] = ((...args) => {

					throw new Error(...args);

				});

			} else {

				debug[key] = console[key].bind(console);

			}

		}

	} else {  // If debug mode is not enabled

		const keys = Object.keys(console);
		const banned = [ 'log', 'info', 'table' ];  // Console log methods that will be ignored

		for (let i = 0; i < keys.length; i++) {

			const key = keys[i];

			if (banned.includes(key))  // If not allowed
				debug[key] = () => false;

			else if (key === 'memory')
				debug[key] = console[key];

			else
				debug[key] = console[key].bind(console);

		}

	}

	/* eslint-enable no-console*/

	Mousetrap.bind('ctrl+shift+i', () => ipc.send('open-dev-tools'));  // Press Ctrl-Shift-I to launch development tools.
	Mousetrap.bind('ctrl+shift+r', () => location.reload(true));       // Press Ctrl-Shift-R to reload the program.

	// Store information about the system.
	hostMeta = {
		os: null,
		platform: os.platform(),
		architecture: os.arch(),
		cpus: os.cpus(),
		freeMemory: os.freemem(),
		totalMemory: os.totalmem(),
		homeDirectory: os.homedir(),
		hostName: os.hostname(),
		networkInterfaces: os.networkInterfaces(),
		upTime: (os.uptime() / (60 * 60)).toFixed(2),
		userInfo: os.userInfo()
	};

	if (navigator.appVersion.includes('Win'))
		hostMeta.os = 'Windows';

	else if (navigator.appVersion.includes('Mac'))
		hostMeta.os = 'Mac';

	else if (navigator.appVersion.includes('X11'))
		hostMeta.os = 'Unix';

	else if (navigator.appVersion.includes('Linux'))
		hostMeta.os = 'Linux';

	else if (navigator.appVersion.includes('SunOs'))
		hostMeta.os = 'Solaris';


	if (navigator.onLine)
		debug.log('Connected to the internet.');


	debug.log(hostMeta);

	(function testCode() { /* eslint-disable */

		debug.groupCollapsed('OS Module');
		debug.log('OS:', hostMeta.os);
		debug.log('Platform:', os.platform());
		debug.log('Architecture:', os.arch());
		debug.log('CPUs:', os.cpus());
		debug.log(`Free memory: ${(os.freemem() / 1000000000).toFixed(3)} Gb`); // free memory [bytes]
		debug.log(`Total memory: ${(os.totalmem() / 1000000000).toFixed(3)} Gb`); // total memory [bytes]
		debug.log(`Home directory: ${os.homedir()}`);
		debug.log(`Hostname: ${os.hostname()}`);
		debug.log(`Load average: ${os.loadavg()}`);
		debug.log('Network interfaces:', os.networkInterfaces());
		debug.log(`Up time: ${(os.uptime() / 3600).toFixed(2)} hr`); // uptime [seconds]
		debug.log('User info:', os.userInfo());
		debug.groupEnd();

		// var sg = require('sendgrid')(process.env.SENDGRID_API_KEY);
		// var request = sg.emptyRequest({
		//   method: 'POST',
		//   path: '/v3/mail/send',
		//   body: {
		//     personalizations: [
		//       {
		//         to: [
		//           {
		//             email: 'baimar97@hotmail.com',
		//           },
		//         ],
		//         subject: 'Hello World from the SendGrid Node.js Library!',
		//       },
		//     ],
		//     from: {
		//       email: 'brayden.aimar@gmail.com',
		//     },
		//     content: [
		//       {
		//         type: 'text/plain',
		//         value: 'Hello, Email!',
		//       },
		//     ],
		//   },
		// });
		//
		// //With promise
		// sg.API(request)
		//   .then(response => {
		//     debug.log(response.statusCode);
		//     debug.log(response.body);
		//     debug.log(response.headers);
		//   })
		//   .catch(error => {
		//     //error is an instance of SendGridError
		//     //The full response is attached to error.response
		//     debug.log(error.response.statusCode);
		//   });
		//
		// //With callback
		// sg.API(request, function(error, response) {
		//   if (error) {
		//     debug.log('Error response received');
		//   }
		//   debug.log(response.statusCode);
		//   debug.log(response.body);
		//   debug.log(response.headers);
		// });

		// // using SendGrid's v3 Node.js Library
		// // https://github.com/sendgrid/sendgrid-nodejs
		// var helper = require('sendgrid').mail;
		//
		// from_email = new helper.Email("baimar97@hotmail.com");
		// to_email = new helper.Email("brayden.aimar@gmail.com");
		// subject = "Sending with SendGrid is Fun";
		// content = new helper.Content("text/plain", "and easy to do anywhere, even with Node.js");
		// mail = new helper.Mail(from_email, subject, to_email, content);
		//
		// var sg = require('sendgrid')(process.env.SENDGRID_API_KEY);
		// var request = sg.emptyRequest({
		//   method: 'POST',
		//   path: '/v3/mail/send',
		//   body: mail.toJSON()
		// });
		//
		// sg.API(request, function(error, response) {
		//   debug.log(response.statusCode);
		//   debug.log(response.body);
		//   debug.log(response.headers);
		// })

		// // single keys
		// Mousetrap.bind('4', function() { debug.log('4'); });
		// Mousetrap.bind("?", function() { debug.log('show shortcuts!'); });
		// Mousetrap.bind('esc', function() { debug.log('escape'); }, 'keyup');
		//
		// // combinations

		// Open the debug.log.
		// Mousetrap.bind('ctrl+shift+i', () => ipc.send('open-dev-tools'));

		// // map multiple combinations to the same callback
		// Mousetrap.bind(['command+k', 'ctrl+k'], function() {
		//
		//     debug.log('command k or control k');
		//
		//     // return false to prevent default browser behavior
		//     // and stop event from bubbling
		//     return false;
		//
		// });
		//
		// // gmail style sequences
		// Mousetrap.bind('g i', function() { debug.log('go to inbox'); });
		// Mousetrap.bind('* a', function() { debug.log('select all'); });
		//
		// // konami code!
		// Mousetrap.bind('up up down down left right left right b a enter', function() {
		//     debug.log('konami code');
		//
		// });

		// debug.log(`returned value: ${ 0 || '' || 'helloworld' || 'stuff' }`);

		// const saveBtn = document.getElementById('save-dialog')
		//
		// saveBtn.addEventListener('click', function (event) {
		// 	ipc.send('save-dialog');
		// })
		//
		// ipc.on('saved-file', function (event, path) {
		// 	if (!path) path = 'No path';
		// 	document.getElementById('file-saved').innerHTML = `Path selected: ${path}`;
		// })

		// // Asynchronous file read
		// fs.readFile('input.txt', function (err, data) {
		// 	if (err) {
		//     	return debug.error(err);
		// 	}
		// 	debug.log(`Asynchronous read: ${data.toString()}`);
		// 	debug.log("Going to write into existing file");
		// 	fs.writeFile('input.txt', data.toString() + 'Simply Easy Learning!',  function(err) {
		// 	   if (err) {
		// 	      return debug.error(err);
		// 	   }
		//
		// 	   debug.log("Data written successfully!");
		// 	   debug.log("Let's read newly written data");
		// 	   fs.readFile('input.txt', function (err, data) {
		// 	      if (err) {
		// 	         return debug.error(err);
		// 		 }
		// 	      debug.log(`Asynchronous read: ${data.toString()}`);
		// 	   });
		// 	});
		// });
		//
		// // Synchronous file read
		// var data = fs.readFileSync('input.txt');
		// debug.log("Synchronous read: " + data.toString());

	}()); /* eslint-enable */

	// WorkSpace.
	ws = {
		id: 'main',
		name: 'CNC Interface',
		desc: 'Setting the ground-work for the future of modern CNC user interface software.',
		publish: {
			'/all-widgets-loaded': 'This gets called once all widgets have ran their initBody() functions. Widgets can wait for this signal to know when  to start doing work, preventing missed publish calls if some widgets take longer to load than others.',
			'/widget-resize': '',
			'/widget-visible': 'Gets published after a new widget has been made visible.'
		},
		subscribe: {
			'/widget-loaded': '',
			'/all-widgets-loaded': 'The init scripts wait for this to know when to make the widgets visible to prevent visual flash on loading.',
			'/make-widget-visible': ''
		}
	};

	/**
	 *  Same as respective widget's id, filename, reference object, and DOM container.
	 *  Ex. [ 'statusbar-widget', 'run-widget', 'connection-widget', 'settings-widget' ]
	 *  @type {Array}
	 */
	wgtMap = [];
	/**
	 *  Stores the loaded/not-loaded state of each widget.
	 *  This is initialized at runtime and each element gets set to true as the respective widget publishes '/widget-loaded'.
	 *  Eg. [ false, false, ..., false ]
	 *  @type {Array}
	 */
	wgtLoaded = [];
	/**
	 *  Set which widget is visible at program load.
	 *  @type {string}
	 */
	wgtVisible = '';
	/**
	 *  Set which widgets require html files to be loaded and sidebar buttons to be created.
	 *  After program startup, this is used to store the javascript references for each respective widget.
	 *  @param {Boolean} loadHtml	Specifies if the respective widget has DOM elements that need to be loaded.
	 *  @param {Boolean} sidebarBtn	Specifies how the button should be created.
	 *                              (true: Make and show button; false: Do not create a button)
	 *  @type {Object}
	 */
	widget = {};

	debug.groupCollapsed(`${ws.name} Setup`);

	initBody = function initBody() {

		debug.group(`${ws.id}.initBody()`);

		CSON.parseCSONFile('main/Settings.cson', (err, result) => {  // Import settings.

			debug.log('Error:', err, '\nResult:', result);

			({ wgtVisible, widget } = result);
			const keys = Object.keys(widget);

			for (let i = 0; i < keys.length; i++) {  // Build the widget map

				if (!wgtVisible && widget[keys[i]].loadHtml === true) {  // If the visible widget is not set

					wgtVisible = keys[i];  // Set visible widget to first html widget loaded

				}

				wgtMap.push(keys[i]);

			}

			debug.log(`wgtMap: ${wgtMap}`);

		});

		for (let i = 0; i < wgtMap.length; i++)  // Initialize the wgtLoaded array
			this.wgtLoaded.push(false);

		$(window).resize(() => {

			// debug.log("Resize window");
			// publish('/' + this.ws.id + '/window-resize');
			publish('/main/window-resize');

		});

		widgetLoadCheck = setTimeout(function () {

			debug.log('widgetLoadCheck timeout function running');

			if (wgtLoaded.includes(false)) {

				const that = this;
				let errorLog = '!! Widget(s) Not Successfully Loaded !!';

				$.each(wgtLoaded, (i, item) => {

					errorLog += (item) ? '' : `\n  ${that.wgtMap[i]} widget`;

				});

				debug.error(errorLog);

				alert(errorLog);

				ipc.send('open-dev-tools');

			} else {

				debug.log('  check non-resultant');

			}

		}, 2000);

		// This gets published at the end of each widget's initBody() function.
		subscribe(`/${this.ws.id}/widget-loaded`, this, (wgt) => {

			debug.groupEnd();

			// If this is the first time being called, set timer to check that all widgets are loaded within a given timeframe. If any widgets have not loaded after that time has elapsed, create an alert and log event listing the widget(s) that did not load.
			wgtLoaded[wgtMap.indexOf(wgt)] = true;

			// If all of the widgets are loaded.
			if (!wgtLoaded.includes(false)) {

				createSidebarBtns();
				initWidgetVisible();

				debug.groupEnd();

				publish(`/${this.ws.id}/all-widgets-loaded`);  // Publish before making DOM visible so that the widgets can start communicating with eachother and getting their shit together.

				ipc.send('all-widgets-loaded');
				clearTimeout(widgetLoadCheck);

			}

		});

		subscribe(`/${this.ws.id}/all-widgets-loaded`, this, updateGitRepo.bind(this));
		subscribe(`/${this.ws.id}/make-widget-visible`, this, makeWidgetVisible.bind(this));

		// Entry point for loading all widgets
		// Load each widget in the order they appear in the widget object
		$.each(widget, (wgt, wgtItem) => {

			debug.log(`Loading ${wgt}`);

			if (wgtItem.loadHtml) {

				createWidgetContainer(wgt);
				loadHtmlWidget(wgt);

			} else {

				loadJsWidget(wgt);

			}

		});

		debug.log('Initializing sidebar button click events.');

		$('#sidebar').on('click', 'span.btn', function (evt) {

			makeWidgetVisible($(this).attr('evt-data'));

		});

		debug.groupEnd();  // Main Setup

	};

	createWidgetContainer = function createWidgetContainer(wgt) {

		// append a div container to dom body
		debug.log('  Creating widget DOM container');

		const containerHtml = `<div id="${wgt}" class="widget-container hidden"></div>`;
		$('body').append(containerHtml);

	};

	loadHtmlWidget = function loadHtmlWidget(wgt) {

		debug.log('  Loading HTML & JS');

		$(`#${wgt}`).load(`${wgt}/${wgt}.html`, '', () => {  // Load html content

			requirejs([ `./${wgt}/${wgt}.js` ], (ref) => {  // Load javascript

				const temp = ref;
				temp.loadHtml = widget[wgt].loadHtml;
				temp.sidebarBtn = widget[wgt].sidebarBtn;

				widget[wgt] = temp;

				ref.initBody();

			});

		});

	};

	loadJsWidget = function loadJsWidget(wgt) {

		debug.log('  Loading JS');

		requirejs([ `${wgt}/${wgt}` ], (ref) => {  // Load javascript

			const temp = ref;
			temp.loadHtml = widget[wgt].loadHtml;
			temp.sidebarBtn = widget[wgt].sidebarBtn;
			widget[wgt] = temp;

			ref.initBody();

		});

	};

	createSidebarBtns = function createSidebarBtns(wgt) {

		debug.log('Creating Sidebar Buttons');

		$.each(widget, (widgetIndex, widgetItem) => {

			// Check if the respective widget wants a sidebar button made
			debug.log(`  ${widgetIndex}`);
			if (!widgetItem.sidebarBtn) {

				debug.log('    ...jk, not creating sidebar button.');

			} else if (widgetItem.icon.includes('material-icons')) {

				let btnHtml = `<span id="btn-${widgetIndex}" evt-data="${widgetIndex}" class="btn btn-${widgetItem.btnTheme}`;
				btnHtml += (widgetItem.sidebarBtn) ? '' : ' hidden';
				btnHtml += `"><div><span class="material-icons">${widgetItem.icon.split(' ')[1]}</span></div><div>`;
				btnHtml += (widgetItem.shortName) ? widgetItem.shortName : widgetItem.name;
				btnHtml += '</div></span>';

				$('#sidebar').append(btnHtml);

			} else {

				let btnHtml = `<span id="btn-${widgetIndex}" evt-data="${widgetIndex}" class="btn btn-${widgetItem.btnTheme}`;
				btnHtml += (widgetItem.sidebarBtn) ? '' : ' hidden';
				btnHtml += `"><div><span class="${widgetItem.icon}"></span></div><div>`;
				btnHtml += (widgetItem.shortName) ? widgetItem.shortName : widgetItem.name;
				btnHtml += '</div></span>';

				$('#sidebar').append(btnHtml);

			}

			if (widgetIndex === wgtVisible && widgetItem.sidebarBtn) {

				$(`#btn-${widgetIndex}`).removeClass('btn-default');
				$(`#btn-${widgetIndex}`).addClass('btn-primary');

			}

		});

	};

	initWidgetVisible = function initWidgetVisible() {

		// Show the initial widget.
		debug.log(`Show wgt: ${wgtVisible}`);

		$(`#${wgtVisible}`).removeClass('hidden');

		$('#header-widget-label').text(widget[wgtVisible].name); // Set header bar label.
		// $('#header-widget-icon').addClass(widget[wgtVisible].icon); // Set header bar icon.

		publish(`/${this.ws.id}/widget-visible`, wgtVisible, null);

	};

	makeWidgetVisible = function makeWidgetVisible(wgt) {

		// If wgt is already visible, do nothing.
		if (wgt === wgtVisible) return;
		// debug.log("  wgt: " + wgt + "\n  wgtVisible: " + wgtVisible);

		$(`#btn-${wgt}`).removeClass('btn-default');
		$(`#btn-${wgt}`).addClass('btn-primary');

		$(`#btn-${wgtVisible}`).removeClass('btn-primary');
		$(`#btn-${wgtVisible}`).addClass('btn-default');

		// Hide previously visible widget.
		$(`#${wgtVisible}`).addClass('hidden');
		// $('#header-widget-icon').removeClass(widget[wgtVisible].icon);

		// Show the requested widget.
		$(`#${wgt}`).removeClass('hidden');

		$('#header-widget-label').text(widget[wgt].name);  // Set header bar label.
		// $('#header-widget-icon').addClass(widget[wgt].icon);  // Set header bar icon.

		publish(`/${this.ws.id}/widget-visible`, wgt, wgtVisible);  // Tells widgets that visibility has been changed so they can stop/resume dom updates if required
		wgtVisible = wgt;

	};

	updateGitRepo = function updateGitRepo() {

		// Pulls the latest repository from the master branch on GitHub.

		let terminal = null;

		const { hostName } = hostMeta;

		if (developerHosts.includes(hostName) || !navigator.onLine) // If on a developer host or no internet connection
			return false;

		debug.log('Pulling latest repo from GitHub.');

		terminal = spawn('git pull', [], { shell: false });

		terminal.stdout.on('data', (data) => {

			const msg = `${data}`;
			const msgBuffer = msg.split('\n');

			for (let i = 0; i < msgBuffer.length; i++) {

				if (msgBuffer[i])
					debug.log(`Git pull stdout: ${msgBuffer[i]}`);

				if (msgBuffer[i].includes('Updating')) {  // If a newer repository was found

					debug.log('Repository was updated.');
					location.reload(true);  // Reload the program to make use of any new updates.

				}

			}

		});

		terminal.stderr.on('data', (data) => {

			const msg = `${data}`;
			const msgBuffer = msg.split('\n');

			for (let i = 0; i < msgBuffer.length; i++) {

				if (msgBuffer[i])
					debug.log(`Git pull stderr: ${msgBuffer[i]}`);

			}

		});

		terminal.on('close', (code) => {

			debug.log(`Git pull.\nChild precess exited with the code: ${code}.`);

		});

		return true;

	};

});
