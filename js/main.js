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

/* eslint-disable no-undef */
/* eslint-disable no-console */
/* eslint-disable global-require */

define([ 'jquery', 'gui', 'amplify', 'mousetrap' ], ($) => {

	console.log('running main.js');
	console.log('global:', global);

	Plotly = require('./js/lib/plotly.min.js');
	THREE = require('./js/lib/three.min.js');
	CSON = require('cson');
	fsCSON = require('fs-cson');
	fs = require('fs');
	os = require('os');
	spawn = require('child_process').spawn;

	// The ipc module aLlows for communication between the main and render processes.
	electron = require('electron');
	({ ipcRenderer: ipc } = electron);

	// TODO: Clean up the way amplify is imported cuz it is also in module exports.
	publish = amplify.publish;
	subscribe = amplify.subscribe;
	unsubscribe = amplify.unsubscribe;

	// Press Ctrl-Shift-I to launch development tools.
	Mousetrap.bind('ctrl+shift+i', () => ipc.send('open-dev-tools'));

	// Press Ctrl-Shift-R to reload the program.
	Mousetrap.bind('ctrl+shift+r', () => location.reload(true));

	// Keyboard shortcuts for use throughout the program.
	Mousetrap.bind('ctrl+pageup', () => publish('keyboard-shortcut', 'ctrl+pageup'));      // Connection Widget: Show device log to the left
	Mousetrap.bind('ctrl+pagedown', () => publish('keyboard-shortcut', 'ctrl+pagedown'));  // Connection Widget: Show device log to the right
	Mousetrap.bind('ctrl+o', () => publish('keyboard-shortcut', 'ctrl+o'));  // Load Widget: Open a file
	Mousetrap.bind('ctrl+s', () => publish('keyboard-shortcut', 'ctrl+s'));  // Load Widget: Save a file

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

	if (navigator.appVersion.includes('Win')) {

		hostMeta.os = 'Windows';

	} else if (navigator.appVersion.includes('Mac')) {

		hostMeta.os = 'Mac';

	} else if (navigator.appVersion.includes('X11')) {

		hostMeta.os = 'Unix';

	} else if (navigator.appVersion.includes('Linux')) {

		hostMeta.os = 'Linux';

	} else if (navigator.appVersion.includes('SunOs')) {

		hostMeta.os = 'Solaris';

	}

	if (navigator.onLine) {

		console.log('Connected to the internet.');

	}

	console.log(hostMeta);

	(function testCode() { /* eslint-disable */

		console.groupCollapsed('OS Module');
		console.log('OS:', hostMeta.os);
		console.log('Platform:', os.platform());
		console.log('Architecture:', os.arch());
		console.log('CPUs:', os.cpus());
		console.log(`Free memory: ${(os.freemem() / 1000000000).toFixed(3)} Gb`); // free memory [bytes]
		console.log(`Total memory: ${(os.totalmem() / 1000000000).toFixed(3)} Gb`); // total memory [bytes]
		console.log(`Home directory: ${os.homedir()}`);
		console.log(`Hostname: ${os.hostname()}`);
		console.log(`Load average: ${os.loadavg()}`);
		console.log('Network interfaces:', os.networkInterfaces());
		console.log(`Up time: ${(os.uptime() / 3600).toFixed(2)} hr`); // uptime [seconds]
		console.log('User info:', os.userInfo());
		console.groupEnd();

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
		//     console.log(response.statusCode);
		//     console.log(response.body);
		//     console.log(response.headers);
		//   })
		//   .catch(error => {
		//     //error is an instance of SendGridError
		//     //The full response is attached to error.response
		//     console.log(error.response.statusCode);
		//   });
		//
		// //With callback
		// sg.API(request, function(error, response) {
		//   if (error) {
		//     console.log('Error response received');
		//   }
		//   console.log(response.statusCode);
		//   console.log(response.body);
		//   console.log(response.headers);
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
		//   console.log(response.statusCode);
		//   console.log(response.body);
		//   console.log(response.headers);
		// })

		// // single keys
		// Mousetrap.bind('4', function() { console.log('4'); });
		// Mousetrap.bind("?", function() { console.log('show shortcuts!'); });
		// Mousetrap.bind('esc', function() { console.log('escape'); }, 'keyup');
		//
		// // combinations

		// Open the console log.
		// Mousetrap.bind('ctrl+shift+i', () => ipc.send('open-dev-tools'));

		// // map multiple combinations to the same callback
		// Mousetrap.bind(['command+k', 'ctrl+k'], function() {
		//
		//     console.log('command k or control k');
		//
		//     // return false to prevent default browser behavior
		//     // and stop event from bubbling
		//     return false;
		//
		// });
		//
		// // gmail style sequences
		// Mousetrap.bind('g i', function() { console.log('go to inbox'); });
		// Mousetrap.bind('* a', function() { console.log('select all'); });
		//
		// // konami code!
		// Mousetrap.bind('up up down down left right left right b a enter', function() {
		//     console.log('konami code');
		//
		// });

		// console.log(`returned value: ${ 0 || '' || 'helloworld' || 'stuff' }`);

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
		//     	return console.error(err);
		// 	}
		// 	console.log(`Asynchronous read: ${data.toString()}`);
		// 	console.log("Going to write into existing file");
		// 	fs.writeFile('input.txt', data.toString() + 'Simply Easy Learning!',  function(err) {
		// 	   if (err) {
		// 	      return console.error(err);
		// 	   }
		//
		// 	   console.log("Data written successfully!");
		// 	   console.log("Let's read newly written data");
		// 	   fs.readFile('input.txt', function (err, data) {
		// 	      if (err) {
		// 	         return console.error(err);
		// 		 }
		// 	      console.log(`Asynchronous read: ${data.toString()}`);
		// 	   });
		// 	});
		// });
		//
		// // Synchronous file read
		// var data = fs.readFileSync('input.txt');
		// console.log("Synchronous read: " + data.toString());

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
	 *
	 *  @type {Array}
	 */
	wgtMap = [ 'statusbar-widget', 'load-widget', 'run-widget', 'mdi-widget', 'connection-widget', 'settings-widget', 'about-widget' ];
	/**
	 *  Stores the loaded/not-loaded state of each widget.
	 *  This is initialized at runtime and each element gets set to true as the respective widget publishes '/widget-loaded'.
	 *  Eg. [ false, false, ..., false ]
	 *
	 *  @type {Array}
	 */
	wgtLoaded = [];
	/**
	 *  Set which widget is visible at program load.
	 *
	 *  @type {string}
	 */
	// wgtVisible = 'connection-widget';
	wgtVisible = 'load-widget';
	/**
	 *  Set which widgets require html files to be loaded and sidebar buttons to be created.
	 *  After program startup, this is used to store the javascript references for each respective widget.
	 *  @param {Boolean} loadHtml	Specifies if the respective widget has DOM elements that need to be loaded.
	 *  @param {Boolean} sidebarBtn	Specifies how the button should be created.
	 *                              (true: Make and show button; false: Make and hide button; null: Do not create a button)
	 *
	 *  @type {Object}
	 */
	widget = {
		'statusbar-widget': {
			loadHtml: false,
			sidebarBtn: null
		},
		'load-widget': {
			loadHtml: true,
			sidebarBtn: true
		},
		'run-widget': {
			loadHtml: true,
			sidebarBtn: true
		},
		'mdi-widget': {
			loadHtml: true,
			sidebarBtn: true
		},
		'connection-widget': {
			loadHtml: true,
			sidebarBtn: true
		},
		'settings-widget': {
			loadHtml: true,
			sidebarBtn: true
		},
		'about-widget': {
			loadHtml: true,
			sidebarBtn: true
		}
	};

	// Initialize the wgtLoaded array.
	for (let i = 0; i < wgtMap.length; i++) {

		this.wgtLoaded.push(false);

	}

	console.groupCollapsed(`${ws.name} Setup`);

	initBody = function initBody() {

		console.group(`${ws.id}.initBody()`);

		$(window).resize(() => {

			// console.log("Resize window");
			// publish('/' + this.ws.id + '/window-resize');
			// TODO: Fix resize. Widgets do not resize with the window. only the first subscriber to the '/main/window-resize' line gets their callback called.
			publish('/main/window-resize');

		});

		widgetLoadCheck = setTimeout(function () {

			console.log('widgetLoadCheck timeout function running');

			if (wgtLoaded.includes(false)) {

				const that = this;
				let errorLog = '!! Widget(s) Not Successfully Loaded !!';

				$.each(wgtLoaded, (i, item) => {

					errorLog += (item) ? '' : `\n  ${that.wgtMap[i]} widget`;

				});

				console.error(errorLog);

				alert(errorLog);

				ipc.send('open-dev-tools');

			} else {

				console.log('  check non-resultant');

			}

		}, 2000);

		// This gets published at the end of each widget's initBody() function.
		subscribe(`/${this.ws.id}/widget-loaded`, this, (wgt) => {

			console.groupEnd();
			// If this is the first time being called, set timer to check that all widgets are loaded within a given timeframe. If any widgets have not loaded after that time has elapsed, create an alert and log event listing the widget(s) that did not load.
			// if (wgtLoaded.indexOf(true) == -1) {
			// }
			wgtLoaded[wgtMap.indexOf(wgt)] = true;

			// If all of the widgets are loaded.
			if (!wgtLoaded.includes(false)) {

				createSidebarBtns();
				// initSidebarBtnEvts();
				initWidgetVisible();

				console.groupEnd();
				// Publish before making dom visible so that the widgets can start communicating with eachother and getting their shit together.
				publish(`/${this.ws.id}/all-widgets-loaded`);
				ipc.send('all-widgets-loaded');
				clearTimeout(widgetLoadCheck);

			}

		});

		subscribe(`/${this.ws.id}/all-widgets-loaded`, this, updateGitRepo.bind(this));

		// Tells widgets that visibility has been changed so they can stop/resume dom updates if required
		subscribe(`/${this.ws.id}/make-widget-visible`, this, makeWidgetVisible.bind(this));

		// Entry point for loading all widgets
		// Load each widget in the order they appear in the widget object
		$.each(widget, (wgt, wgtItem) => {

			console.log(`Loading ${wgt}`);

			if (wgtItem.loadHtml) {

				createWidgetContainer(wgt);
				loadHtmlWidget(wgt);

			} else {

				loadJsWidget(wgt);

			}

		});

		console.log('Initializing sidebar button click events.');

		$('#sidebar').on('click', 'span.btn', function (evt) {

			makeWidgetVisible($(this).attr('evt-data'));

		});

		console.groupEnd(); // Main Setup

	};

	createWidgetContainer = function createWidgetContainer(wgt) {

		// append a div container to dom body
		console.log('  Creating widget DOM container');

		const containerHtml = `<div id="${wgt}" class="widget-container hidden"></div>`;
		$('body').append(containerHtml);

	};

	loadHtmlWidget = function loadHtmlWidget(wgt) {

		console.log('  Loading HTML & JS');

		$(`#${wgt}`).load(`html/${wgt}.html`, '', () => {

			requirejs([ wgt ], (ref) => {

				const temp = ref;
				temp.loadHtml = widget[wgt].loadHtml;
				temp.sidebarBtn = widget[wgt].sidebarBtn;

				widget[wgt] = temp;

				ref.initBody();

			});

		});

	};

	loadJsWidget = function loadJsWidget(wgt) {

		console.log('  Loading JS');

		requirejs([ wgt ], (ref) => {

			const temp = ref;
			temp.loadHtml = widget[wgt].loadHtml;
			temp.sidebarBtn = widget[wgt].sidebarBtn;
			widget[wgt] = temp;

			ref.initBody();

		});

	};

	createSidebarBtns = function createSidebarBtns(wgt) {

		console.log('Creating Sidebar Buttons');

		$.each(widget, (widgetIndex, widgetItem) => {

			// Check if the respective widget wants a sidebar button made
			console.log(`  ${widgetIndex}`);
			if (widgetItem.sidebarBtn === undefined || widgetItem.sidebarBtn === null) {

				console.log('    ...jk, not creating sidebar button.');

			} else if (widgetItem.icon.includes('material-icons')) {

				let btnHtml = `<span id="btn-${widgetIndex}" evt-data="${widgetIndex}" class="btn btn-${widgetItem.btnTheme}`;
				btnHtml += (widgetItem.sidebarBtn) ? '' : ' hidden';
				btnHtml += `"><div><span class="material-icons">${widgetItem.icon.split(' ')[1]}</span></div><div>`;
				btnHtml += (widgetItem.shortName) ? widgetItem.shortName : widgetItem.name;
				btnHtml += '</div></span>';
				$('#sidebar').append(btnHtml);

			} else {

				// var btnHtml = '<span id="btn-' + widgetIndex + '" evt-data="' + widgetIndex + '" class="btn btn-' + widgetItem.ref.btnTheme;
				let btnHtml = `<span id="btn-${widgetIndex}" evt-data="${widgetIndex}" class="btn btn-${widgetItem.btnTheme}`;
				btnHtml += (widgetItem.sidebarBtn) ? '' : ' hidden';
				// btnHtml += '"><div><span class="' + widgetItem.ref.icon + '"></span></div><div>';
				btnHtml += `"><div><span class="${widgetItem.icon}"></span></div><div>`;
				btnHtml += (widgetItem.shortName) ? widgetItem.shortName : widgetItem.name;
				btnHtml += '</div></span>';
				$('#sidebar').append(btnHtml);

			}

		});

	};

	initWidgetVisible = function initWidgetVisible() {

		// Show the initial widget.
		console.log(`Show wgt: ${wgtVisible}`);

		$(`#${wgtVisible}`).removeClass('hidden');

		$('#header-widget-label').text(widget[wgtVisible].name); // Set header bar label.
		// $('#header-widget-icon').addClass(widget[wgtVisible].icon); // Set header bar icon.

		publish(`/${this.ws.id}/widget-visible`, wgtVisible, null);

	};

	makeWidgetVisible = function makeWidgetVisible(wgt) {

		// If wgt is already visible, do nothing.
		if (wgt === wgtVisible) return;
		// console.log("  wgt: " + wgt + "\n  wgtVisible: " + wgtVisible);

		// Hide previously visible widget.
		$(`#${wgtVisible}`).addClass('hidden');
		// $('#header-widget-icon').removeClass(widget[wgtVisible].icon);

		// Show the requested widget.
		$(`#${wgt}`).removeClass('hidden');

		$('#header-widget-label').text(widget[wgt].name); // Set header bar label.
		// $('#header-widget-icon').addClass(widget[wgt].icon); // Set header bar icon.

		publish(`/${this.ws.id}/widget-visible`, wgt, wgtVisible);
		wgtVisible = wgt;

	};

	updateGitRepo = function updateGitRepo() {

		// Pulls the latest repository from the master branch on GitHub.

		let terminal = null;

		// Skip the update if host is my laptop or if there is no internet connection.
		if (hostMeta.hostName === 'BRAYDENS-LENOVO' || !navigator.onLine) return false;

		console.log('Pulling latest repo from GitHub.');

		terminal = spawn('git pull', [], { shell: true });

		terminal.stdout.on('data', (data) => {

			const msg = `${data}`;
			const msgBuffer = msg.split('\n');

			for (let i = 0; i < msgBuffer.length; i++) {

				if (msgBuffer[i]) console.log(`Git pull stdout: ${msgBuffer[i]}`);

				// If a newer repository was found, reload the GUI so the new scripts are used.
				if (msgBuffer[i].includes('Updating')) {

					console.log('Repository was updated.');

					// Reload the program to make use of any new updates.
					location.reload(true);

				}

			}

		});

		terminal.stderr.on('data', (data) => {

			const msg = `${data}`;
			const msgBuffer = msg.split('\n');

			for (let i = 0; i < msgBuffer.length; i++) {

				if (msgBuffer[i]) console.log(`Git pull stderr: ${msgBuffer[i]}`);

			}

		});

		terminal.on('close', (code) => {

			console.log(`Git pull.\nChild precess exited with the code: ${code}.`);

		});

		return true;

	};

});
