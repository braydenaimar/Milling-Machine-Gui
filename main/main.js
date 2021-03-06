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

define([ 'jquery', 'gui', 'amplify', 'mousetrap', 'bootstrap' ], ($) => {

	/* eslint-disable no-console*/

	console.log('running main.js');
	console.log('global:', global);

	// Plotly = require('./lib/js/plotly.min.js');  // eslint-disable-line import/no-unresolved
	THREE = require('./lib/js/three.min.js');    // eslint-disable-line import/no-unresolved
	CSON = require('cson');
	fsCSON = require('fs-cson');
	fs = require('fs');
	os = require('os');
	({ spawn } = require('child_process'));
	Math.roundTo = gui.roundTo;

	electron = require('electron');
	({ ipcRenderer: ipc } = electron);
	({ publish, subscribe, unsubscribe } = amplify);

	$.fn.tooltip('[data-toggle="tooltip"]');  // Enable tooltips on all elements

	/**
	 *  Enable the console log for debugging.
	 */
	enableConsole = function enableConsole() {

		const keys = Object.keys(console);

		for (let i = 0; i < keys.length; i++) {

			const key = keys[i];

			if (key === 'memory') {

				debug[key] = console[key];

			} else if (key === 'error') {

				debug[key] = ((...args) => {

					throw new Error(...args);

				});  // eslint-disable-line padded-blocks

			} else {

				debug[key] = console[key].bind(console);

			}

		}

	};

	/**
	 *  Disable the console for better performance when it is not needed.
	 */
	disableConsole = function disableConsole() {

		for (let i = 0; i < 10; i++)  // Escape any active console groups
			console.groupEnd();

		const keys = Object.keys(console);
		const banned = [ 'log', 'info', 'table', 'groupCollapsed', 'groupEnd' ];  // Console log methods that will be ignored

		for (let i = 0; i < keys.length; i++) {

			const key = keys[i];

			if (banned.includes(key)) {  // If not allowed

				debug[key] = () => undefined;

			} else if (key === 'memory') {

				debug[key] = console[key];

			} else if (key === 'error') {

				debug[key] = ((...args) => {
					throw new Error(...args);
				});  // eslint-disable-line padded-blocks

			} else {

				debug[key] = console[key].bind(console);

			}

		}

	};

	DEBUG_ENABLED = true;  // Enable debugging mode
	const developerHosts = [ 'BRAYDENS-LENOVO' ];  // List of developer host devices
	inDebugMode = DEBUG_ENABLED && developerHosts.includes(os.hostname());

	debug = {};

	if (inDebugMode && (typeof console != 'undefined'))  // If debug mode is enabled
		enableConsole();

	else  // If debug mode is not enabled
		disableConsole();

	/* eslint-enable no-console*/

	Mousetrap.bind('ctrl+shift+i', () => ipc.send('open-dev-tools'));  // Press Ctrl-Shift-I to launch development tools.
	Mousetrap.bind('ctrl+shift+r', () => location.reload(true));       // Press Ctrl-Shift-R to reload the program.

	// Store information about the system
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
	 *  @type {String}
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
	dropdown = {};
	focusedElement = document;

	debug.groupCollapsed(`${ws.name} Setup`);

	initBody = function initBody() {

		const that = this;

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

	    $(document).on('focus', 'input', (evt) => {

			const target = evt.currentTarget;

	        if (that.focusedElement == target)  // If already focused
				return;  // Return so user can place cursor at specific point in input

	        that.focusedElement = target;
	        setTimeout(() => { this.focusedElement.select(); }, 50);  // Select all text in any field on focus for easy re-entry. Delay sightly to allow focus to "stick" before selecting.

	    });

		widgetLoadCheck = setTimeout(() => {

			debug.log('widgetLoadCheck timeout function running');

			if (wgtLoaded.includes(false)) {

				const that = this;
				let errorLog = '!! Widget(s) Not Successfully Loaded !!';

				$.each(wgtLoaded, (i, item) => {

					errorLog += (item) ? '' : `\n  ${that.wgtMap[i]} widget`;

				});

				debug.error(errorLog);

				alert(errorLog);  // eslint-disable-line no-alert

				ipc.send('open-dev-tools');

			} else {

				debug.log('  check non-resultant');

			}

		}, 2000);

		Mousetrap.bind('ctrl+alt+pageup', this.makeWidgetVisible.bind(this, 'up'));
		Mousetrap.bind('ctrl+alt+pagedown', this.makeWidgetVisible.bind(this, 'down'));

		// This gets published at the end of each widget's initBody() function.
		subscribe(`/${this.ws.id}/widget-loaded`, this, (wgt) => {

			debug.groupEnd();

			// If this is the first time being called, set timer to check that all widgets are loaded within a given timeframe. If any widgets have not loaded after that time has elapsed, create an alert and log event listing the widget(s) that did not load.
			wgtLoaded[wgtMap.indexOf(wgt)] = true;

			if (!wgtLoaded.includes(false)) {  // If all of the widgets are loaded

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

		$('#sidebar').on('click', 'span.btn', (evt) => {

			const evtData = $(evt.currentTarget).attr('evt-data');

			if (evtData === 'feedhold') {

				publish('/connection-widget/port-feedhold');

				$('#sidebar .queueflush-btn').removeClass('hidden');
				$('#sidebar .feedresume-btn').removeClass('hidden');

			} else if (evtData === 'queueflush') {

				publish('/connection-widget/port-queueflush');

				$('#sidebar .queueflush-btn').addClass('hidden');
				$('#sidebar .feedresume-btn').addClass('hidden');

			} else if (evtData === 'feedresume') {

				publish('/connection-widget/port-feedresume');

				$('#sidebar .queueflush-btn').addClass('hidden');
				$('#sidebar .feedresume-btn').addClass('hidden');

			} else {

				makeWidgetVisible(evtData);

			}

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

	createSidebarBtns = function createSidebarBtns() {

		debug.log('Creating Sidebar Buttons');

		$.each(widget, (widgetIndex, widgetItem) => {

			debug.log(`  ${widgetIndex}`);

			if (!widgetItem.sidebarBtn) {  // If this widget has no sidebar button

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

		debug.log(`Show wgt: ${wgtVisible}`);  // Show the initial widget

		$(`#${wgtVisible}`).removeClass('hidden');

		$('#header-widget-label').text(widget[wgtVisible].name);  // Set header bar label
		// $('#header-widget-icon').addClass(widget[wgtVisible].icon);  // Set header bar icon

		publish(`/${this.ws.id}/widget-visible`, wgtVisible, null);

	};

	makeWidgetVisible = function makeWidgetVisible(key) {

		if (widget[key] && !widget[key].loadHtml)  // If a widget with no html was called
			return debug.error('Invalid key argument.');

		if (key === wgtVisible)  // If the widget is already visible
			return false;

		if ((key === 'up' && wgtMap.indexOf(wgtVisible) === 0) || (key === 'down' && wgtMap.indexOf(wgtVisible) === wgtMap - 1))  // If already at the limits of widget list
			return false;

		let wgt = key;

		for (let i = wgtMap.indexOf(wgtVisible) - 1; wgt === 'up' && i >= 0; i--) {  // Search for the closest next widget that has html

			if (widget[wgtMap[i]].loadHtml)
				wgt = wgtMap[i];

		}

		for (let i = wgtMap.indexOf(wgtVisible) + 1; wgt === 'down' && i < wgtMap.length; i++) {  // Search for the closest next widget that has html

			if (widget[wgtMap[i]].loadHtml)
				wgt = wgtMap[i];

		}

		if (!wgtMap.includes(wgt) || !widget[wgt].sidebarBtn)
			return false;

		$(`#btn-${wgt}`).removeClass('btn-default');
		$(`#btn-${wgt}`).addClass('btn-primary');

		$(`#btn-${wgtVisible}`).removeClass('btn-primary');
		$(`#btn-${wgtVisible}`).addClass('btn-default');

		$(`#${wgtVisible}`).addClass('hidden');  // Hide previously visible widget
		// $('#header-widget-icon').removeClass(widget[wgtVisible].icon);

		$(`#${wgt}`).removeClass('hidden');  // Show the requested widget

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
