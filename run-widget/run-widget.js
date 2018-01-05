/**
 *   ____               __        ___     _            _         _                  ____            _       _
 *  |  _ \ _   _ _ __   \ \      / (_) __| | __ _  ___| |_      | | __ ___   ____ _/ ___|  ___ _ __(_)_ __ | |_
 *  | |_) | | | | '_ \   \ \ /\ / /| |/ _` |/ _` |/ _ \ __|  _  | |/ _` \ \ / / _` \___ \ / __| '__| | '_ \| __|
 *  |  _ <| |_| | | | |   \ V  V / | | (_| | (_| |  __/ |_  | |_| | (_| |\ V / (_| |___) | (__| |  | | |_) | |_
 *  |_| \_\\__,_|_| |_|    \_/\_/  |_|\__,_|\__, |\___|\__|  \___/ \__,_| \_/ \__,_|____/ \___|_|  |_| .__/ \__|
 *                                          |___/                                                    |_|
 *  @author Brayden Aimar
 */

 /* eslint-disable no-console */

define([ 'jquery' ], $ => ({

	id: 'run-widget',
	name: 'Run',
	shortName: 'Run',
	btnTheme: 'default',
	icon: 'material-icons directions_run',
	desc: '',
	publish: {
		'/main/widget-loaded': ''
	},
	subscribe: {
		'/main/all-widgets-loaded': ''
	},

	widgetDom: [
		[ '.widget-container', '.tool-panel', '.gcode-view-panel' ],
		[ '.widget-container', '.dro-panel', '.feedrate-panel', '.spindle-panel', '.jog-panel', '.auto-level-panel' ],
		[ ' .gcode-view-panel', '.panel-heading', '.panel-body' ],
		[ ' .gcode-view-panel .panel-body', '.gcode-file-text' ]
	],
	widgetVisible: false,

	/**
	 *  Enables the use of zero indexing of line numbers.
	 *  @type {Boolean}
	 */
	zeroIndexLineNumber: true,
	/**
	 *  The Id of the last gcode line to be buffered to the device.
	 *  @type {String}
	 */
	lastBufferedId: '',
	toolChange: [],
	toolMeta: {},
	activeToolIndex: 0,
	startFromIndex: 0,

	FileName: '',
	Gcode: [],
	GcodeData: {},
	OrigionalGcode: [],
	OrigionalGcodeData: {},
	/**
	 *  Tool meta data.
	 *  Ex. toolMeta: { T2: { Desc: 'D=3.175 CR=0 TAPER=30deg - ZMIN=-0.3 - chamfer mill' }, T3: { ... }, ... }.
	 *  @type {Object}
	 */
	ToolMeta: {},
	/**
	*  List of tool changes that take place throughout the gcode file.
	*  Ex. toolChange: [ { Tool: 'T2', Desc: 'D=3.175 CR=0 TAPER=30deg - ZMIN=-0.3 - chamfer mill', GcodeComment: 'Engrave Text', Gcode: 'N6 T2 M6', Id: 'gcN6', Index: 10 }, { Tool: 'T3', ... }, ... ].
	*  @type {Array}
	*/
	ToolChange: [],
	/**
	 *  Stores a map object relating the id of every gcode line to the line index number.
	 *  @type {Object}
	 */
	idMap: {},
	idToolChangeMap: {},
	/**
	 *  Keeps track of wether or not any gcode from the loaded file has been sent.
	 *  This is used to prevent gcode lines from being market as complete when the file is first opened.
	 *  @type {Boolean}
	 */
	fileStarted: false,
	/**
	 *  The units of the gcode file.
	 *  Ex. 'mm' or 'inch'.
	 *  @type {String}
	 */
	fileUnits: '',
	/**
	 *  Eg. 'inactive' or 'inactive' or 'standby'
	 *  @type {String}
	 */
	fileStatus: 'inactive',
	/**
	 *  Describes the status of each line in the Gcode file.
	 *  Eg. 'success'.
	 *  @type {Array}
	 */
	gcodeStatus: [],

	/**
	 *  File types that will be shown in the file explorer when opening a Gcode file.
	 *  @type {Array}
	 */
	fileOpenGcodeExtensions: [ 'nc' ],
	/**
	 *  Enables the start, pause, resume, and stop buttons after one of the buttons have been pressed.
	 *  @type {Object}
	 */
	gcodeControlBtnVisibility: {
		start: {
			'start-btn': false,
			'pause-btn': true,
			'resume-btn': false,
			'stop-btn': true
		},
		pause: {
			'start-btn': false,
			'pause-btn': false,
			'resume-btn': true,
			'stop-btn': true
		},
		resume: {
			'start-btn': false,
			'pause-btn': true,
			'resume-btn': false,
			'stop-btn': true
		},
		stop: {
			'start-btn': false,
			'pause-btn': false,
			'resume-btn': false,
			'stop-btn': false
		}
	},
	pauseOnFirstToolChange: false,
	pauseOnToolChange: true,
	gcodePacketSplittingEnable: false,
	gcodePacketSplittingThreshold: 1500,
	/**
	 *  The maximum number of Gcode lines to be sent to the connection-widget per packet.
	 *  A value of zero (0) will disable packet splitting.
	 *  @type {Number}
	 */
	maxGcodePacketLength: 500,
	/**
	 *  The delay between packets of Gcode being sent to the connection-widget in milliseconds [ms].
	 *  A value of zero (0) will remove delay between packets.
	 *  @type {Number}
	 */
	gcodePacketInterval: 300,

	activeId: '',
	activeIndex: 0,
	trackMode: 'on-complete',
	// trackMode: 'status-report',
	/**
	 *  Updated by resize function to account for panel height based on the scrollOffsetFactor.
	 *  @type {Number}
	 */
	gcodeLineScrollOffset: 6,
	scrollOffsetFactor: 0.4,
	maxUpdateGapFill: 30,
	activeLineClearDelay: 0,
	/**
	 *  Delay in milliseconds [ms] between the stopping of a gcode and the file being reloaded.
	 *  A value of zero (0) will disable file reloading on stop.
	 *  @type {Number}
	 */
	reloadFileOnStopDelay: 3500,
	startFromLabelText: 'Start From',
	startFromSelectFlashCount: 3,
	startFromSelectFlashInterval: 400,

	minLineNumberDigits: 3,
	/**
	 *  Enable or disable gcode file pagination.
	 *  @type {Boolean}
	 */
	gcodePaginationEnable: true,
    /**
     *  Minimum length of gcode file to be paginated.
     *  Must be equal to or greater than gcodePaginationMaxLength.
     *  @type {Number}
     */
	gcodePaginationFileThreshold: 1500,
	/**
	 *  Maximum length of pagination window.
	 *  Must be equal to or greater than gcodePaginationUpperBuffer + gcodePaginationLowerBuffer + 1.
	 *  @type {Number}
	 */
	gcodePaginationMaxLength: 400,
	/**
	 *  Minimum number of Gcode lines overhead of the current line.
	 *  @type {Number}
	 */
	gcodePaginationUpperBuffer: 40,
	/**
	 *  Maximum number of Gcode lines below the current line.
	 *  @type {Number}
	 */
	gcodePaginationLowerBuffer: 40,
	/**
	 *  Stores the range of Gcode indicies that have DOM elements in the Gcode file view.
	 *  Updated by buildGcodeFileDOM() and buildPaginatedGcodeDOM().
	 *  Index values are totally inclusive.
	 *  ie. [ first, last ]
	 *  @type {Array}
	 */
	paginationRange: [ 0, 0 ],

	jogStep: 1,
	/**
	 *  Current jog mode.
	 *  Eg. 'step' or 'continuous'
	 *  @type {String}
	 */
	jogMode: 'step',
	/**
	 *  Stores the current jog mode.
	 *  @type {Boolean}
	 */
	jogContActive: false,
	/**
	 *  Sets the feedrate at which jogging of each axis should take place at [mm/min].
	 *  @type {Object}
	 */
	jogContFeedrate: {
		x: 3000,
		y: 4000,
		z: 180
	},
	/**
	 *  Sets the interval at which spamming the queue flush command should take place.
	 *  This is done in an attempt to increase a machine's responsiveness to stopping jogging.
	 *  @type {Number}
	 */
	jogSpamQueueFlushInterval: 250,

	/**
	 *  The port on the SPJS that gcode data will be sent to.
	 *  @type {string}
	 */
	mainDevicePort: '',
	/**
	 *  The number of queued messages in the SPJS.
	 *  This is updated when a queue count is published by the connection widget.
	 *  @type {number}
	 */
	queueCount: 0,

	initBody() {

		const { id } = this;

		console.group(`${this.name}.initBody()`);
		disableConsole();  // Disable the console log to prevent program from crashing

		subscribe('/main/window-resize', this, this.resizeWidgetDom.bind(this));
		subscribe('/main/widget-visible', this, this.visibleWidget.bind(this));

		subscribe('/connection-widget/recvPortList', this, this.onPortList.bind(this));  // Used to set mainDevicePort { PortList, PortMeta, Diffs, OpenPorts, OpenLogs }
		subscribe('/connection-widget/recvPortData', this, this.onPortData.bind(this));

		subscribe('gcode-data/file-loaded', this, this.fileLoaded.bind(this));  // Receive gcode lines when a gcode file is loaded { FileName, Data }
		subscribe('probe-data/auto-level', this, this.onAutoLevel.bind(this));  // Receive auto-level data [ { x, y, z }, { x, y, z }, ..., { x, y, z } ]

		subscribe('connection-widget/queue-count', this, this.onQueueCount.bind(this));  // Receive updates for the queue count
		subscribe('connection-widget/message-status', this, this.onMessageStatus.bind(this));
		subscribe('run-widget/update-spindle', this, this.machine.updateSpindle.bind(this.machine));

		Mousetrap.bind('ctrl+o', this.keyboardShortcuts.bind(this, 'ctrl+o'));  // Launch file open dialog

		this.loadSettings();
		this.initClickEvents();

		publish('/main/widget-loaded', id);

		return true;

	},
	loadSettings() {

		const that = this;
		const { machine, probe } = this;
		const { position, $axisValue } = machine;
		const axisKeys = Object.keys(position);

		for (let i = 0; i < axisKeys.length; i++)  // Set each value in the DRO to zero.
			$axisValue[axisKeys[i]].html(machine.buildValueHTML(0));

		fsCSON.readFile('run-widget/Settings.cson', (err, data) => {

			if (err)  // If there was an error reading the file
				return false;

			gui.mergeDeep(that, data);  // Merge settings from cson file into this widget

			fsCSON.readFile('run-widget/User_Settings.cson', (err, userData) => {

				if (err) {  // If there was an error reading the file

					this.repairUserSettings(err);
					userData = this.readUserSettings();

				}

				if (typeof userData != 'undefined')  // If there are any user settings
					gui.mergeDeep(that, userData);  // Merge settings from user settings cson file into this widget

				this.initSettings();

			});

		});

	},
	readUserSettings(recursionDepth = 0) {

		if (recursionDepth > 2)  // Prevent infinite loop between readUserSettings() and repairUserSettings()
			return;

		fsCSON.readFile('run-widget/Settings.cson', (err, data) => {

			if (err)
				return this.repairUserSettings(err, recursionDepth);

		});

	},
	repairUserSettings(err, recursionDepth) {

		const { probe } = this;
		const { code, erno, filename, location, path, message, stack, syscall } = err;

		if (code === 'ENOENT') {  // If no user settings file was found

			const userSettings = {
				probe: {
					defaultProfile: probe.defaultProfile,
					profile: {
						Default: probe.profile.Default
					}
				}
			};

			fsCSON.writeFileSafeSync('run-widget/User_Settings.cson', userSettings);  // Create a user settings cson file

		} else if (code) {

			const [ a, b ] = [ 0, code.match(/probe:/).index ];
			const safeCode = code.substring(a, b);
			const safeData = CSON.parse(safeCode);

			fsCSON.writeFileSafeSync('run-widget/User_Settings.cson', safeData, (err) => {

				if (err)  // If an error occured while writing the file
					return;

			});

			return this.readUserSettings(++recursionDepth);

		} else {

			const userSettings = {
				probe: {
					defaultProfile: probe.defaultProfile,
					profile: {
						Default: probe.profile.Default
					}
				}
			};

			fsCSON.writeFileSafeSync('run-widget/User_Settings.cson', userSettings);  // Create a user settings cson file

		}

	},
	/**
	 *  This method gets called after both the default settings and user settings get loaded.
	 */
	initSettings() {

		const { probe } = this;

		probe.loadProfile(probe.defaultProfile);  // Update the probe settings input fields with loaded default settings
		probe.updateDropDownDOM();

	},
	initClickEvents() {

		$('#run-widget .auto-level-panel .profile-selector .dropdown-menu').on('mousedown', 'span.btn', (evt) => {  // Auto Level profile

			const { probe } = this;
			const { evtSignal, evtData } = this.getBtnEvtData(evt);
			const $target = $(evt.currentTarget);

			if ($target.hasClass('disabled'))  // If the button is disabled
				return false;

			probe.onProfileSelected(evtData);

		});

		$('body').on('mousedown', (evt) => {  // Body events

			const { probe } = this;
			const { saveProfileFlag, deleteProfileFlag } = probe;

			if (saveProfileFlag && !$('#run-widget .auto-level-panel .profile-selector .save-btn').hasClass('btn-active'))
				probe.profileCtrlBtnState('deactivate', 'save');

			else if (saveProfileFlag)
				$('#run-widget .auto-level-panel .profile-selector .save-btn').removeClass('btn-active');

			if (deleteProfileFlag && !$('#run-widget .auto-level-panel .profile-selector .delete-btn').hasClass('btn-active'))
				probe.profileCtrlBtnState('deactivate', 'delete');

			else if (deleteProfileFlag)
				$('#run-widget .auto-level-panel .profile-selector .delete-btn').removeClass('btn-active');

			if ($('#run-widget .auto-level-panel .profile-selector .dropdown-menu').hasClass('hidden'))  // If the dropdown menu is already hidden
				$('#run-widget .auto-level-panel .profile-selector .dropdown-toggle').attr('evt-data', 'hidden');

			else  // If the dropdown menu is visible
				$('#run-widget .auto-level-panel .profile-selector .dropdown-menu').addClass('hidden');  // Hide the drop down profile menu

		});

		$('#run-widget .gcode-view-panel').on('click', 'span.btn', (evt) => {  // GCode Run panel buttons

			const { mainDevicePort: port, activeToolIndex } = this;
			const { evtSignal, evtData } = this.getBtnEvtData(evt);
			const $target = $(evt.currentTarget);

			if ($target.hasClass('disabled'))  // If the button is disabled
				return false;

			if (evtSignal === 'gcode-control')
				this.onGcodeControl(evtData);

			else if (evtData === 'reload-gcode')
				this.reloadFile();

			else if (evtData === 'open-file')
				this.fileOpenDialog();

			else if (evtSignal === 'tool-change')
				this.onToolChangeControl(evtData);

		});

		$('#run-widget .gcode-view-panel .gcode-file-text').on('dblclick', 'div.gcode-div', (evt) => {  // Gcode lines

			const { fileStatus } = this;
			const lineId = $(evt.currentTarget).attr('class').match(/gcN?[0-9]+/i)[0];

			if (fileStatus === 'inactive')
				this.gcodeLineSelected(lineId);

		});

		$('#run-widget .tool-panel .btn-group').on('click', 'span.btn', (evt) => {  // Tool Change panel buttons

			const { evtSignal, evtData } = this.getBtnEvtData(evt);
			const $target = $(evt.currentTarget);

			if ($target.hasClass('disabled'))  // If the button is disabled
				return false;

			this.onToolChangeControl(evtData);

		});

		$('#run-widget .tool-panel .panel-body').on('click', 'div.tool-item', (evt) => {  // Tool item select

			const gcodeLineId = `gc${evt.currentTarget.firstChild.innerText.match(/N[0-9]+/i)[0]}`;
			this.gcodeScrollToId(gcodeLineId);

		});

		$('#run-widget .dro-panel .panel-body').on('dblclick', 'div.dro-value', (evt) => {  // DRO panel

			const { machine } = this;
			const { evtSignal, evtData } = this.getBtnEvtData(evt);
			const $target = $(evt.currentTarget);

			if ($target.hasClass('disabled'))  // If the button is disabled
				return false;

			const $droValue = $(`#run-widget .dro-panel .${evtData}-dro .dro-value`);
			const $droInputGroup = $(`#run-widget .dro-panel .${evtData}-dro .axis-value-input`);
			const $droInput = $droInputGroup.find('.form-control');

			$droInput[0].value = machine.position[evtData[0]];

			$droValue.addClass('hidden');
			$droInputGroup.removeClass('hidden');
			$droInput.focus();

		});

		$('#run-widget .dro-panel .panel-body').on('click', '.btn', (evt) => {  // DRO panel

			const { evtSignal, evtData } = this.getBtnEvtData(evt);
			const $target = $(evt.currentTarget);

			if ($target.hasClass('disabled'))  // If the button is disabled
				return false;

			this.droManualInput(evtSignal, evtData);

		});

		$('#run-widget .jog-panel').on('click', 'span.btn', (evt) => {  // Jog panel

			const { evtSignal, evtData } = this.getBtnEvtData(evt);
			const $target = $(evt.currentTarget);

			if ($target.hasClass('disabled'))  // If the button is disabled
				return false;

			if (evtSignal === 'probe')  // Send gcode to be buffered to the SPJS
				this.probe.begin();

			else if (evtData === 'step' || evtData === 'continuous')
				this.jogModeToggle(evtData);

		});

		$('#run-widget .jog-panel').on('mousedown', 'span.btn', (evt) => {  // Jog panel

			const { evtSignal, evtData } = this.getBtnEvtData(evt);
			const $target = $(evt.currentTarget);

			if ($target.hasClass('disabled'))  // If the button is disabled
				return false;

			if (evtSignal === 'jog')
				this.jogMachine(evtData);

		});

		$(document).on('mouseup', (evt) => {  // Jog panel end of continuous motion

			this.jogMachine('stop');

		});

		$('#run-widget .auto-level-panel:not(.disabled)').on('click', 'span.btn', (evt) => {  // Auto Level panel

			const { mainDevicePort: port, Gcode, probe } = this;
			const { evtSignal, evtData } = this.getBtnEvtData(evt);
			const $target = $(evt.currentTarget);

			if ($target.hasClass('disabled'))  // If the button is disabled
				return false;

			if (evtData === 'start') {

				if (port === '')  // If no device is connected
					return false;

				probe.pollSettings();
				const { probeCount } = probe;

				if (!(probeCount.x === 1 && probeCount.y === 1) && !Gcode.length)  // If no file is open to have auto level data applied to
					return false;

				this.setButtonEnabledState('disable');  // Disable other buttons while sending auto level commands
				$('#run-widget .auto-level-setting input').attr('disabled', true);
				$('#run-widget .profile-selector .dropdown-toggle').addClass('disabled');

				probe.begin();

				$('#run-widget .auto-level-panel .start-btn').addClass('hidden');  // Show the pause and stop buttons in the auto level panel
				$('#run-widget .auto-level-panel .pause-btn').removeClass('hidden');
				$('#run-widget .auto-level-panel .resume-btn').addClass('hidden');
				$('#run-widget .auto-level-panel .stop-btn').removeClass('hidden');

			} else if (evtData === 'pause') {

				publish('/connection-widget/port-feedhold', port);

				$('#run-widget .auto-level-panel .start-btn').addClass('hidden');  // Show the resume and stop buttons in the auto level panel
				$('#run-widget .auto-level-panel .pause-btn').addClass('hidden');
				$('#run-widget .auto-level-panel .resume-btn').removeClass('hidden');
				$('#run-widget .auto-level-panel .stop-btn').removeClass('hidden');

			} else if (evtData === 'resume') {

				publish('/connection-widget/port-feedresume', port);

				$('#run-widget .auto-level-panel .start-btn').addClass('hidden');  // Show the pause and stop buttons in the auto level panel
				$('#run-widget .auto-level-panel .pause-btn').removeClass('hidden');
				$('#run-widget .auto-level-panel .resume-btn').addClass('hidden');
				$('#run-widget .auto-level-panel .stop-btn').removeClass('hidden');

			} else if (evtData === 'stop') {

				publish('/connection-widget/port-feedstop', port);

				this.setButtonEnabledState('enable');
				probe.status = 'inactive';

				$('#run-widget .auto-level-panel .probe-failed-alert').addClass('hidden');  // Hide the probe failed alert
				$('#run-widget .auto-level-panel .start-btn').removeClass('hidden');  // Show the start button in the auto level panel
				$('#run-widget .auto-level-panel .pause-btn').addClass('hidden');
				$('#run-widget .auto-level-panel .resume-btn').addClass('hidden');
				$('#run-widget .auto-level-panel .stop-btn').addClass('hidden');

			} else if (evtSignal === 'dropdown-toggle') {  // Show dropdown profile menu

				if (evtData === 'hidden')  // If profile drop down menu is hidden
					probe.profileDropDownMenu('show');  // Show the profile drop down menu

				else if (evtData === 'visible')  // If profile drop down menu is visible
					probe.profileDropDownMenu('hide');  // Hide the profile drop down menu

			} else if (evtSignal === 'profile-control') {  // Save or Delete

				probe.onProfileControlBtn(evtData);

			}

		});

	},
	keyboardShortcuts(keys) {

		if (!this.widgetVisible)  // If this widget is not visible
			return false;

		if (typeof keys == 'undefined') {  // If the keys argument is invalid

			debug.error('The keys argument is invalid.');
			return false;

		}

		if (keys === 'ctrl+o')  // ctrl-o
			this.fileOpenDialog();  // Launch the file explorer dialog

	},
	getBtnEvtData(evt) {

		const evtSignal = $(evt.currentTarget).attr('evt-signal');
		const evtData = $(evt.currentTarget).attr('evt-data');

		return { evtSignal, evtData }

	},

	fileOpenDialog() {

		if (this.lastOpenFileDialogTime && Date.now() - this.lastOpenFileDialogTime < 1000)  // Prevent multiple file open windows from being opened when button is double pressed
			return;

		this.lastOpenFileDialogTime = Date.now();

		const { fileOpenGcodeExtensions } = this;
		const openOptions = {
			title: 'Open a File',
			filters: [
				{ name: 'GCode', extensions: fileOpenGcodeExtensions },
				{ name: 'All', extensions: [ '' ] }
			],
			properties: [ 'openFile' ]
		};

		debug.log('open dialog');
		ipc.send('open-dialog', openOptions);  // Launch the file explorer dialog

		ipc.on('opened-file', (event, path) => {  // Callback for file explorer dialog

			debug.log(`Open path selected: ${path}`);
			// path && this.openFile(path);  // If a file was selected, parse the selected file
			path && publish('run-widget/file-path', path);  // If a file was selected, parse the selected file

		});

	},
	/**
	 *  Called when a file gets loaded from the Load Widget.
	 *  @param {String}  FileName   Name of the file that was opened.
	 *  @param {Array}   Gcode      Lines of gcode.
	 *  @param {Object}  GcodeData  Parsed gcode data.
	 *  @param {Array}   ToolMeta   Tool change information.
	 *  @param {Array}   ToolChange List of tool changes.
	 *  @param {Boolean} AutoLevel
	 */
	fileLoaded({ FileName, Gcode, GcodeData, ToolMeta, ToolChange, NewFile }) {

		if (FileName === '')  // If the file data is invalid
			return debug.error('The file data is invalid.');

		const { gcodePaginationEnable, gcodePaginationFileThreshold } = this;

		$('.gcode-view-panel .gcode-file-text').removeClass('m-fadeIn');  // Hide any previous Gcode
		$('.gcode-view-panel .no-file-modal').removeClass('m-fadeIn');	  // Hide the 'No Gcode File' modal
		$('.gcode-view-panel .loading-file-modal').addClass('m-fadeIn');  // Show the 'Loading File' modal

		$('#run-widget .gcode-view-panel .start-line-input')[0].value = 0;
		this.startFromIndex = 0;

		if (NewFile) {  // If the file was opened from the file explorer

			this.OrigionalGcode = Gcode;
			this.OrigionalGcodeData = {
				x: [ ...GcodeData.x ],
				y: [ ...GcodeData.y ],
				z: [ ...GcodeData.z ],
				Id: [ ...GcodeData.Id ],
				Line: [ ...GcodeData.Line ],
				Gcode: [ ...GcodeData.Gcode ],
				Desc: [ ...GcodeData.Desc ]
			};

		}

		this.FileName = FileName;
		this.Gcode = Gcode;
		this.GcodeData = GcodeData;
		this.ToolMeta = ToolMeta;
		this.ToolChange = ToolChange;
		this.trackMode = 'on-complete';
		this.fileStarted = false;
		this.fileStatus = 'inactive';
		this.fileUnits = '';
		this.gcodeStatus = Array.apply(null, Array(Gcode.length)).map(String.prototype.valueOf, '');
		this.paginationRange = [ 0, 0 ];
		this.lastBufferedId = '';

		this.setButtonEnabledState('enable');

		const idMap = {};
		const idToolChangeMap = {};
		let tcSum = 0;

		for (let i = 0; i < Gcode.length; i++) {

			const line = GcodeData.Gcode[i];
			const id = GcodeData.Id[i];
			const desc = GcodeData.Desc[i];

			idMap[id] = i;

			if (desc.includes('tool-change'))  // If the line is a tool change command
				idToolChangeMap[id] = tcSum++;

			else if (desc.includes('units'))   // If the line is a units command
				this.fileUnits = line.includes('G21') ? 'mm' : 'inch';

		}

		this.updateToolChange();
		this.activeId = '';
		this.idMap = idMap;
		this.idToolChangeMap = idToolChangeMap;

		const [ globalPath, localFileName ] = FileName.match(/([^\\]+)\.[a-z0-9]+$/i);
		$('#run-widget .gcode-view-panel .gcode-file-name').text(localFileName);

		if (gcodePaginationEnable && Gcode.length >= gcodePaginationFileThreshold) {  // If the Gcode file should be paginated

			this.buildPaginatedGcodeDOM();

			$('#run-widget .gcode-view-panel .pause-btn').addClass('hidden');
			$('#run-widget .gcode-view-panel .resume-btn').addClass('hidden');
			$('#run-widget .gcode-view-panel .stop-btn').addClass('hidden');

			$('#run-widget .gcode-view-panel .start-btn').removeClass('hidden');  		 // Show the play button
			$('#run-widget .gcode-view-panel .reload-gcode-btn').removeClass('hidden');  // Show the reload button

			$('.gcode-view-panel .gcode-file-text').addClass('m-fadeIn');  		 // Show the file
			$('.gcode-view-panel .loading-file-modal').removeClass('m-fadeIn');  // Hide the 'Loading File' modal

		} else {  // If the Gcode file should not be paginated

			this.buildGcodeFileDOM();

		}

	},
	reloadFile() {

		const { FileName, Gcode, GcodeData, ToolMeta, ToolChange } = this;

		if (!FileName)  // If no file is loaded
			return false;

		this.fileLoaded({ FileName, Gcode, GcodeData, ToolMeta, ToolChange });

	},
	buildGcodeFileDOM() {

		const { Gcode, GcodeData, startFromIndex, zeroIndexLineNumber, minLineNumberDigits, startFromLabelText } = this;
		let gcodeHTML = '';

		for (let i = 0; i < Gcode.length; i++) {  // Build the Gcode File DOM

			const lineNumber = zeroIndexLineNumber ? i : i + 1;
			const prefixZeros = ((lineNumber).toString().length > minLineNumberDigits) ? 0 : minLineNumberDigits - (lineNumber).toString().length;
			const domLineNumber = `${'0'.repeat(prefixZeros)}${lineNumber}`;

			const line = GcodeData.Gcode[i];
			const id = GcodeData.Id[i];
			const desc = GcodeData.Desc[i];

			gcodeHTML += `<div id="run-widget/${id}" class="gcode-div ${id}${!i ? ' first-line' : ''}" gcode-index="${i}">`;
			gcodeHTML += `<span class="line-number text-muted">${domLineNumber}</span>`;

			if (desc.includes('comment'))  			// If the line is a comment
				gcodeHTML += `<samp class="gcode text-nowrap text-muted">${line}</samp>`;  // Mute text

			else if (desc.includes('tool-change'))  // If the line is not a comment
				gcodeHTML += `<samp class="gcode text-nowrap text-info">${line}</samp>`;   // Hilite text

			else  									// If the line is not a comment or a tool change command
				gcodeHTML += `<samp class="gcode text-nowrap text-default">${line}</samp>`;

			if (i === startFromIndex)
				gcodeHTML += `<samp class="start-from-label text-success"><samp class="material-icons">arrow_back</samp>${startFromLabelText}</samp>`;

			gcodeHTML += '</div>';

		}

		$('#run-widget .gcode-view-panel .pause-btn').addClass('hidden');
		$('#run-widget .gcode-view-panel .resume-btn').addClass('hidden');
		$('#run-widget .gcode-view-panel .stop-btn').addClass('hidden');

		this.resizeWidgetDom();
		this.paginationRange = [ 0, Gcode.length - 1 ];

		setTimeout(() => {  // Use timeout to allow the filename and tool change panel to perform DOM updates before loading Gcode file

			$('#run-widget .gcode-view-panel .gcode-file-text').html(gcodeHTML);  // Add the gcode file to the file text panel

			const [ gcodeLineId ] = GcodeData.Id;
			this.gcodeScrollToId(gcodeLineId);

			this.resizeWidgetDom();

			$('#run-widget .gcode-view-panel .start-btn').removeClass('hidden');  		 // Show the play button
			$('#run-widget .gcode-view-panel .reload-gcode-btn').removeClass('hidden');  // Show the reload button

			$('.gcode-view-panel .gcode-file-text').addClass('m-fadeIn');  		 // Show the file
			$('.gcode-view-panel .loading-file-modal').removeClass('m-fadeIn');  // Hide the 'Loading File' modal

		}, 10);

	},
	buildPaginatedGcodeDOM(id) {

		const { Gcode, GcodeData, fileStatus, gcodeStatus, activeId, idMap, startFromIndex, zeroIndexLineNumber, minLineNumberDigits, startFromLabelText } = this;
		const { gcodePaginationEnable: enable, gcodePaginationFileThreshold: fileThreshold, gcodePaginationMaxLength: maxLength, gcodePaginationUpperBuffer: upperBuffer, gcodePaginationLowerBuffer: lowerBuffer } = this;

		if (!enable || Gcode.length < fileThreshold)  // If the file is not valid for pagination
			return false;

		const lineIndex = (idMap[id] || startFromIndex);
		let [ lowerLimit, upperLimit ] = [ 0, Gcode.length - 1 ];
		let gcodeHTML = '';

		if (lineIndex <= upperBuffer)  // If at the begining of the Gcode file
			[ lowerLimit, upperLimit ] = [ 0, maxLength ];

		else if (lineIndex >= Gcode.length - 1 - lowerBuffer)  // If at the end of the Gcode file
			[ lowerLimit, upperLimit ] = [ Gcode.length - 1 - maxLength, Gcode.length - 1 ];

		else  // If at the middle of the Gcode file
			[ lowerLimit, upperLimit ] = [ lineIndex - upperBuffer, lineIndex - upperBuffer + maxLength - 1 ];

		for (let i = lowerLimit; i <= upperLimit; i++) {

			const lineNumber = zeroIndexLineNumber ? i : i + 1;
			const prefixZeros = ((lineNumber).toString().length > minLineNumberDigits) ? 0 : minLineNumberDigits - (lineNumber).toString().length;
			const domLineNumber = `${'0'.repeat(prefixZeros)}${lineNumber}`;

			const line = GcodeData.Gcode[i];
			const id = GcodeData.Id[i];
			const desc = GcodeData.Desc[i];
			const status = gcodeStatus[i];
			const hiliteClass = id === activeId ? ' bg-primary' : (status === 'success' ? ' bg-success' : '');

			if (typeof line == 'undefined')
				break;

			gcodeHTML += `<div id="run-widget/${id}" class="gcode-div ${id}${!i ? ' first-line' : ''}${hiliteClass}" gcode-index="${i}">`;
			gcodeHTML += `<span class="line-number text-muted">${domLineNumber}</span>`;

			if (desc && desc.includes('comment'))  			// If the line is a comment
				gcodeHTML += `<samp class="gcode text-nowrap text-muted">${line}</samp>`;  // Mute text

			else if (desc && desc.includes('tool-change'))  // If the line is not a comment
				gcodeHTML += `<samp class="gcode text-nowrap text-info">${line}</samp>`;   // Hilite text

			else  											// If the line is not a comment or a tool change command
				gcodeHTML += `<samp class="gcode text-nowrap text-default">${line}</samp>`;

			if (fileStatus === 'inactive' && i === startFromIndex)  // If the file has not been run yet
				gcodeHTML += `<samp class="start-from-label text-success"><samp class="material-icons">arrow_back</samp>${startFromLabelText}</samp>`;

			gcodeHTML += '</div>';

		}

		this.resizeWidgetDom();
		this.paginationRange = [ lowerLimit, upperLimit ];

		$('#run-widget .gcode-view-panel .gcode-file-text').html(gcodeHTML);  // Add the gcode file to the file text panel

		this.gcodeScrollToId(GcodeData.Id[lineIndex]);
		this.resizeWidgetDom();

		// setTimeout(() => {  // Use timeout to allow the filename and tool change panel to perform DOM updates before loading Gcode file
		// }, 10);

	},
	/**
	 *  Checks if a Gcode line has a DOM element in the Gcode file viewer.
	 *  @param  {String} id The id of the Gcode line to be checked.
	 *  @return {Boolean}
	 */
	inPagination(id) {

		const { idMap, paginationRange } = this;
		const index = idMap[id];
		const [ lowerLimit, upperLimit ] = paginationRange;

		if (index < lowerLimit || index > upperLimit)  // If the Gcode line is not in the pagination
			return false;

		return true;

	},

	onGcodeControl(task) {

		const { gcodeControlBtnVisibility, mainDevicePort: port, reloadFileOnStopDelay } = this;
		const btnVisible = gcodeControlBtnVisibility[task];
		const btnKeys = Object.keys(btnVisible);

		if (task === 'start') {  // If the start button was pressed

			disableConsole();  // Disable the console log to prevent program from crashing

			if (port === '')  // If no device is connected
				return false;

			this.startFromIndex = Number($('#run-widget .gcode-view-panel .start-line-input').val());
			const { startFromIndex } = this;

			this.fileStatus = 'active';
			this.setButtonEnabledState('disable');  // Disable buttons while sending gcode from file
			this.bufferGcode({ StartIndex: this.startFromIndex });

		} else if (task === 'pause') {  // If the pause button was pressed

			this.fileStatus = 'standby';

		} else if (task === 'resume') {  // If the resume button was pressed

			if (port === '')  // If no device is connected
				return false;

			this.fileStatus = 'active';

		} else if (task === 'stop') {  // If the stop button was presed

			// $('#run-widget .tool-panel .complete-btn').addClass('hidden');  // Hide the tool change complete button
			$('#run-widget .gcode-view-panel .complete-btn').addClass('hidden');  // Hide the tool change complete button

			publish('run-widget/update-spindle', { dir: 'off' });
			this.fileStatus = 'inactive';

			if (reloadFileOnStopDelay)
				setTimeout(() => this.reloadFile(), reloadFileOnStopDelay);

		}

		publish('gcode-buffer/control', task);

		for (let i = 0; i < btnKeys.length; i++)
			$(`#run-widget .gcode-view-panel .${btnKeys[i]}`).removeClass(btnVisible[btnKeys[i]] ? 'hidden' : '').addClass(btnVisible[btnKeys[i]] ? '' : 'hidden');

	},
	bufferGcode({ StartIndex = 0 }) {

		const { mainDevicePort: port, Gcode, GcodeData, idToolChangeMap, fileUnits, pauseOnFirstToolChange, pauseOnToolChange, gcodePacketSplittingEnable: splitEnable, gcodePacketSplittingThreshold: splitThreshold, maxGcodePacketLength: packetLength, gcodePacketInterval: packetInterval } = this;

		if (!port || !Gcode.length)  // If no port or gcode file is open
			return false;

		if (StartIndex) {  // If not starting from the begining of the file

			const i = StartIndex - 1;
			const [ x, y, z, feed, dist, plane, momo ] = [ GcodeData.x[i], GcodeData.y[i], GcodeData.z[i], GcodeData.Feed[i], GcodeData.Dist[i], GcodeData.Plane[i], GcodeData.Momo[i] ];
			let Msg = [];

			if (fileUnits)  // If file units are known
				Msg = [ ...Msg, `${fileUnits === 'mm' ? 'G21' : 'G20'}` ];

			Msg = [
				...Msg,
				'G91',
				`G0 Z${fileUnits === 'mm' ? '5' : '0.2'}`,  // Raise spindle 5mm (0.2in)
				'G90',
				`G0 X${x} Y${y}`,
				`G0 Z${z}`,
				`${plane}${feed ? ` F${feed}` : ''}`,  // G17 or G18 or G19 and feedrate
				`${momo}`  // G0, G1, G2 or G3
			];

			if (dist !== 'G90')
				Msg = [ ...Msg, `${dist}` ];

			publish('/connection-widget/port-sendjson', port, { Msg, IdPrefix: 'FileInits', Comment: 'File Inits' });  // Send gcode file inits

		}

		if (!splitEnable || Gcode.length < splitThreshold) {  // If packet splitting is not applicable to the file

			this.sendGcodePacket(StartIndex, Gcode.length);

		} else {  // If buffering gcode into many packets

			setTimeout(() => {

				this.sendGcodePacket(a, b);

			});

		}

	},
	sendGcodePacket(a, b) {

		const { mainDevicePort: port, Gcode, GcodeData, idToolChangeMap, fileUnits, pauseOnFirstToolChange, pauseOnToolChange, maxGcodePacketLength, maxPacketInterval } = this;
		let bufferData = [];

		for (let i = a; i < b; i++) {

			const line = GcodeData.Gcode[i];
			const id = GcodeData.Id[i];
			const desc = GcodeData.Desc[i];

			const dataItem = {
				Msg: line,
				Id: id
			};
			bufferData = [ ...bufferData, dataItem ];

			if (bufferData.length > 1 && desc.includes('tool-change') && i) {  // If the line is a tool change command and not the first line to be sent

				const tcIndex = idToolChangeMap[id];

				if ((!tcIndex && pauseOnFirstToolChange) || (tcIndex && pauseOnToolChange))  // If pause on the tool change command
					break;

			}

		}

		const lastId = bufferData[bufferData.length - 1].Id;
		this.lastBufferedId = lastId;
		this.fileStarted = true;

		publish('connection-widget/port-sendbuffered', port, { Data: bufferData });  // Send gcode data to be buffered to the SPJS

	},

	onPortList(data) {

		const { mainDevicePort, probe, machine } = this;
		const { PortList, PortMeta, Diffs, OpenPorts, OpenLogs } = data;

		console.log(`got port list data:\n${JSON.stringify(data)}`);

		if (OpenPorts && !OpenPorts.length && mainDevicePort) {  // If all connected ports have disconnected

			machine.velocity = undefined;
			$('#run-widget .status-panel .status-value').text('--');
			$('#run-widget .feedrate-panel .feedrate-units').text('--');
			$('#run-widget .feedrate-progress-bar').css('width', '0%');

			this.updateUnits('--');
			machine.updatePosition({ x: 0, y: 0, z: 0 });
			machine.updateSpindle({ rpm: '--' });

		} else if (OpenPorts && OpenPorts.length && !mainDevicePort) {

			machine.updateSpindle({ rpm: 0 });

		}

		if (OpenPorts && OpenPorts.length)  // If there are any open ports
			[ this.mainDevicePort ] = OpenPorts;  // Use the alphanumerically first port that is open as the main port

		else  // If there are no open ports
			this.mainDevicePort = '';

		probe.port = this.mainDevicePort;

	},
	/**
	 *  The recvPortData method receives port data from devices on the SPJS.
	 *  @param {String} port
	 *  @param {String} Msg
	 *  @param {Object} Data
	 */
	onPortData(port, { Msg, Data }) {

		const { probe } = this;

		if (typeof Data == 'undefined' || !Data)  // If the data argument is invalid
			return debug.error('The data argument is invalid.');

		if (Data.sr)  // If a status report was received
			this.onStatusReport(Data.sr);

		if (Data.r && Data.r.sr)  // If a status report was received
			this.onStatusReport(Data.r.sr);

		if (Data.r && Data.r.prb)  // If a probe finished message (eg. '{"r":{"prb":{"e":1,"x":0.000,"y":0.000,"z":-0.511,"a":0.000,"b":0.000,"c":0.000}},"f":[1,0,0,4931]}')
			probe.onReply(Data);

		if (Data.r && typeof Data.r.unit != 'undefined')  // Got units information
			this.updateUnits(Data.r.unit ? 'mm' : 'inch');  // Update the unit

	},
	onQueueCount(QCnt) {

		this.queueCount = QCnt;

	},
	onMessageStatus(data) {

		const { Cmd, Id, P } = data;
		const { trackMode, Gcode, GcodeData, ToolChange, idMap } = this;

		if (!Gcode.length)  // If no file is loaded
			return false;

		const index = idMap[Id];
		const desc = GcodeData.Desc[index];

		if (typeof index != 'undefined' && (trackMode === 'on-complete' || desc.includes('spindle')))
			this.updateGcodeTracker(Id);

	},
	onStatusReport(sr) {

		const { trackMode, machine, idMap, Gcode, GcodeData, gcodeStatus } = this;
		const { line, posx, posy, posz, vel, unit, stat, feed, coor, momo, plan, path, dist, mpox, mpoy, mpoz } = sr;

		if (typeof line != 'undefined' && (typeof stat == 'undefined' || stat !== 5)) {  // If received a line number and status is not error

			const id = `gcN${line}`;
			const index = idMap[id];

			if (typeof index != 'undefined') {  // If the id is in the gcode file

				const desc = GcodeData.Desc[index];

				if (trackMode === 'on-complete') {

					this.trackMode = 'status-report';
					this.updateGcodeTracker(id);  // Update the active line in the gcode viewer panel

					for (let i = index + 1; i < GcodeData.Id.length; i++) {  // Remove success hiliting on following lines that have not yet been completed

						const itemId = GcodeData.Id[i];

						if (gcodeStatus[i] === 'success')
							this.gcodeTrackerActive({ InactiveId: itemId })

						else
							break;

					}

				} else {

					this.updateGcodeTracker(id);  // Update the active line in the gcode viewer panel

				}

			}

		}

		if (typeof feed != 'undefined')  // Feedrate
			machine.feedrate = feed;

		if (typeof vel != 'undefined')  // Machine velocity
			machine.updateVelocity(vel);

		if (typeof posx != 'undefined')  // X axis position
			this.updateMachPosition({ x: posx });

		if (typeof posy != 'undefined')  // Y axis position
			this.updateMachPosition({ y: posy });

		if (typeof posz != 'undefined')  // Z axis position
			this.updateMachPosition({ z: posz });

		if (typeof unit != 'undefined')  // Got units information
			this.updateUnits(unit ? 'mm' : 'inch');  // Update the unit

	},
	updateUnits(newUnit) {

		const { machine } = this;

		machine.updateUnit(newUnit);

	},

	gcodeLineSelected(id) {

		const { startFromLabelText, startFromSelectFlashCount: flashCount, startFromSelectFlashInterval: flashInterval, startFromIndex, idMap, GcodeData } = this;
		const $line = $(`#run-widget .gcode-view-panel .${id}`);
		const prevId = GcodeData.Id[startFromIndex];

		if (id === prevId)  // If the line is already selected
			return false;

		this.startFromIndex = idMap[id];

		$('#run-widget .gcode-view-panel .start-line-input').val(idMap[id]);
		$(`#run-widget .gcode-view-panel .${prevId} .start-from-label`).remove();

		const delay = 2 * flashCount * flashInterval;
		$(`#run-widget .gcode-view-panel .${prevId}`).removeClass('bg-success');

		$line.prepend(`<samp class="start-from-label text-success"><samp class="material-icons">arrow_back</samp>${startFromLabelText}</samp>`);

		this.gcodeFlashLine(id, flashCount, flashInterval);

	},
	gcodeFlashLine(id, repeat, interval) {

		if (!this.inPagination(id))  // If the Gcode line has no DOM element in the Gcode view panel
			return false;

		const { GcodeData, startFromIndex } = this;
		const hiliteClass = 'bg-success';
		const $line = $(`#run-widget .gcode-view-panel .${id}`);

		if ($line.hasClass('bg-primary'))  // If the line is already marked active
			return false;

		if (id !== GcodeData.Id[startFromIndex]) {  // If the line is not the start from line

			$line.removeClass(hiliteClass);  // Remove hiliting and stop flashing
			return false;

		}

		if ($line.hasClass(hiliteClass)) {

			$line.removeClass(hiliteClass);

		} else {

			$line.addClass(hiliteClass);
			repeat -= 1;

		}

		if (repeat)
			setTimeout(() => { this.gcodeFlashLine(id, repeat, interval) }, interval);

	},
	updateGcodeTracker(id, scroll = true) {

		const { fileStarted, Gcode, GcodeData, idMap } = this;
		const { activeId, activeIndex, startFromIndex, gcodeLineScrollOffset, lastBufferedId, activeLineClearDelay, reloadFileOnStopDelay } = this;

		if (!fileStarted)  // If no lines from the gcode file have been sent
			return false;

		// FIXME: match() of undefined.
		if (typeof id == 'undefined' || (typeof lastBufferedId == 'undefined' && Number(lastBufferedId.match(/[0-9]+/)[0]) < Number(id.match(/[0-9]+/)[0])))
			return false;

		if (id === activeId)
			return false;

		const lineIndex = idMap[id];
		const gcodeLine = GcodeData.Gcode[lineIndex];
		const gcodeDesc = GcodeData.Desc[lineIndex];

		if (scroll)
			this.gcodeScrollToId(id);

		if (!activeId && lineIndex > startFromIndex)  // If the first line to be updated is not first line of gcode file
			this.updateGcodeTracker(GcodeData.Id[lineIndex - 1], false);

		if (activeId && lineIndex > idMap[activeId] + 1)  // If there is a gap between the active line and this line
			this.updateGcodeTracker(GcodeData.Id[lineIndex - 1], false);

		if (/S[0-9]+/i.test(gcodeLine))  // Spindle rpm
			publish('run-widget/update-spindle', { rpm: Number(gcodeLine.match(/S([0-9]+)/i)[1]) });

		if (/M3/i.test(gcodeLine) && !/M[0-9]{2,}/i.test(gcodeLine))  // Spindle on clockwise rotation
			publish('run-widget/update-spindle', { dir: 'cw' });

		if (/M4/i.test(gcodeLine) && !/M[0-9]{2,}/i.test(gcodeLine))  // Spindle on counter-clockwise rotation
			publish('run-widget/update-spindle', { dir: 'ccw' });

		if ((/(M0|M1|M2|M5)/i.test(gcodeLine) && !/M[0-9]{2,}/i.test(gcodeLine)) || /M30/i.test(gcodeLine))  // Spindle off or program end
			publish('run-widget/update-spindle', { dir: 'off' });

		if (lineIndex > startFromIndex && gcodeDesc.includes('tool-change'))  // If the line is a tool change command and is not the first line to be sent
			this.toolChangeActive(id);

		if (lineIndex && GcodeData.Desc[lineIndex - 1].includes('tool-change'))  // If the previous line is a tool change command
			this.toolChangeComplete(GcodeData.Id[lineIndex - 1]);

		this.gcodeTrackerActive({ ActiveId: id, SuccessId: this.activeId });

		if (id === GcodeData.Id[Gcode.length - 1] && activeLineClearDelay) {  // If this is the last line in the gcode file

			setTimeout(() => {

				this.updateGcodeTracker();

			}, activeLineClearDelay);

			this.fileStatus = 'inactive';

		} else if (id === GcodeData.Id[Gcode.length - 1] && reloadFileOnStopDelay) {

			setTimeout(() => {

				this.reloadFile();

			}, reloadFileOnStopDelay);

			this.fileStatus = 'inactive';

		}

	},
	gcodeTrackerActive({ ActiveId, SuccessId, InactiveId }) {

		const { idMap } = this;

		if (typeof ActiveId != 'undefined' && ActiveId && typeof idMap[ActiveId] != 'undefined') {

			this.activeId = ActiveId;
			this.activeIndex = idMap[ActiveId];

			if (this.inPagination(ActiveId))  // If the Gcode line has a DOM element in the Gcode view panel
				$(`#run-widget .gcode-view-panel .${ActiveId}`).removeClass('bg-default bg-success').addClass('bg-primary');  // Hilite the active gcode line

		}

		if (typeof SuccessId != 'undefined' && SuccessId && typeof idMap[SuccessId] != 'undefined') {

			this.gcodeStatus[idMap[SuccessId]] = 'success';

			if (this.inPagination(SuccessId))  // If the Gcode line has a DOM element in the Gcode view panel
				$(`#run-widget .gcode-view-panel .${SuccessId}`).removeClass('bg-default bg-primary').addClass('bg-success');  // Hilite the completed gcode line

		}

		if (typeof InactiveId != 'undefined' && InactiveId && typeof idMap[InactiveId] != 'undefined') {

			this.gcodeStatus[idMap[InactiveId]] = '';

			if (this.inPagination(InactiveId))  // If the Gcode line has a DOM element in the Gcode view panel
				$(`#run-widget .gcode-view-panel .${InactiveId}`).removeClass('bg-primary bg-success').addClass('bg-default');  // Remove hiliting from line

		}

	},
	gcodeScrollToId(id) {

		const { idMap, Gcode, GcodeData, gcodeLineScrollOffset, paginationRange, gcodePaginationLowerBuffer, gcodePaginationUpperBuffer } = this;

		const lineIndex = idMap[id];
		const [ lowerLimit, upperLimit ] = paginationRange;
		const [ lowerBufferLimit, upperBufferLimit ] = [ lowerLimit + gcodePaginationUpperBuffer, upperLimit - gcodePaginationLowerBuffer ];

		if (typeof id == 'undefined' || typeof idMap[id] == 'undefined')  // If the id argument is invalid
			return false;

		let scrollId = GcodeData.Id[lowerLimit];

		if ((lowerLimit !== 0 && lineIndex < lowerBufferLimit) || (upperLimit !== Gcode.length && lineIndex > upperBufferLimit))  // If the Gcode is outside of the pagination buffer
			return this.buildPaginatedGcodeDOM(id);  // The buildPaginatedGcodeDOM() function will call this method when it is finished the DOM update

		if (lineIndex - lowerLimit > gcodeLineScrollOffset)
			scrollId = GcodeData.Id[lineIndex - gcodeLineScrollOffset];

		if (!this.inPagination(scrollId))  // If the Gcode line has no DOM element in the Gcode view panel
			return false;

		const element = document.getElementById(`run-widget/${scrollId}`);
		element && element.scrollIntoView({ block: "start", behavior: "smooth" });  // Scroll the active gcode line into view
	},
	onToolChangeControl(task) {

		const { GcodeData, activeIndex, ToolChange, idToolChangeMap, activeToolIndex } = this;

		if (task === 'complete') {  // If the tool change complete button was pressed

			if (typeof activeToolIndex == 'undefined' || typeof ToolChange[activeToolIndex] == 'undefined')  // If the activeToolIndex value is invalid
				return false;

			const StartIndex = ToolChange[activeToolIndex].Index + 1;
			this.bufferGcode({ StartIndex });
			this.setButtonEnabledState('disable');  // Disable buttons that could mess up the sending of the Gcode file

		}

	},
	updateToolChange() {

		const { ToolChange, zeroIndexLineNumber } = this;
		let toolHTML = '';

		for (let i = 0; i < ToolChange.length; i++) {

			const { Tool, Desc, GcodeComment, Gcode, Index, Id } = ToolChange[i];
			const lineNumber = zeroIndexLineNumber ? Index : Index + 1;

			toolHTML += `<div class="tool-item btn btn-default item-${i}">`;
			toolHTML += '<div class="tool-right-info">';
			toolHTML += `<div class="tool-line">Line ${lineNumber}</div>`;
			toolHTML += `<div class="tool-gcode">${Gcode}</div>`;
			toolHTML += '</div>';
			toolHTML += `<div class="tool-name">${GcodeComment}</div>`;
			toolHTML += `<div class="tool-desc">${Tool} <span>${Desc.replace(/T[0-9]+ /i, '')}</span></div>`;
			toolHTML += '</div>';

		}

		$('#run-widget .tool-panel .panel-body').html(toolHTML);

		const $toolPanel = $('#run-widget .tool-panel');
		const $gcodePanel = $('#run-widget .gcode-view-panel');
		const hiddenFlag = $toolPanel.hasClass('hidden');

		if (ToolChange.length && hiddenFlag) {  // If there are tool changes

			$toolPanel.removeClass('hidden');
			const margin = $gcodePanel.css('margin-top');
			$gcodePanel.css('margin-bottom', margin);
			this.resizeWidgetDom();

		} else if (!ToolChange.length && !hiddenFlag) {  // If there are no tool changes

			$toolPanel.addClass('hidden');
			$gcodePanel.css('margin-bottom', 0);
			this.resizeWidgetDom();

		}

	},
	toolChangeActive(id) {

		const { ToolChange, idToolChangeMap, pauseOnFirstToolChange, pauseOnToolChange } = this;
		const tcIndex = idToolChangeMap[id];

		if (typeof tcIndex == 'undefined' || typeof ToolChange[tcIndex] == 'undefined')  // If the tcIndex value is invalid
			return false;

		this.activeToolIndex = tcIndex;
		$(`#run-widget .tool-panel .panel-body .item-${tcIndex}`).addClass('tool-active');  // Hilite the tool as active

		if ((tcIndex === 0 && pauseOnFirstToolChange) || pauseOnToolChange) {

			$('#run-widget .gcode-view-panel .complete-btn').removeClass('hidden');  // Show the tool change complete button
			this.setButtonEnabledState('enable');  // Enable buttons that could mess up the sending of the Gcode file

		} else {

			this.toolChangeComplete(tcIndex);

		}

		$('#run-widget .gcode-view-panel .start-btn').addClass('hidden');  // Show the stop button in the gcode panel
		$('#run-widget .gcode-view-panel .pause-btn').addClass('hidden');
		$('#run-widget .gcode-view-panel .resume-btn').addClass('hidden');
		$('#run-widget .gcode-view-panel .stop-btn').removeClass('hidden');

	},
	toolChangeComplete(id) {

		const { ToolChange, idToolChangeMap } = this;
		const tcIndex = idToolChangeMap[id];

		if (typeof tcIndex == 'undefined' || typeof ToolChange[tcIndex] == 'undefined')  // If the tcIndex value is invalid
			return false;

		$(`#run-widget .tool-panel .panel-body .item-${tcIndex}`).addClass('btn-success');  // Hilite the tool as complete
		$(`#run-widget .tool-panel .panel-body .item-${tcIndex}`).removeClass('tool-active');

		// $('#run-widget .tool-panel .panel-heading .complete-btn').addClass('hidden');  // Hide the tool change complete button
		$('#run-widget .gcode-view-panel .complete-btn').addClass('hidden');  // Hide the tool change complete button

		$('#run-widget .gcode-view-panel .start-btn').addClass('hidden');  // Show the pause and stop buttons in the gcode panel
		$('#run-widget .gcode-view-panel .pause-btn').removeClass('hidden');
		$('#run-widget .gcode-view-panel .resume-btn').addClass('hidden');
		$('#run-widget .gcode-view-panel .stop-btn').removeClass('hidden');

	},

	jogModeToggle(mode) {

		const { jogMode } = this;

		if (mode === 'step') {  // If current mode is step

			$('#run-widget .jog-panel .step-distance-input').addClass('hidden');
			$('#run-widget .jog-panel .step-distance-input.disabled-input').removeClass('hidden');
			$('#run-widget .jog-panel .mode-btn').attr('evt-data', 'continuous');
			$('#run-widget .jog-panel .mode-btn').text('Cont');

			$('#run-widget .jog-panel .step-distance-input.disabled-input')[0].value = $('#run-widget .jog-panel .step-distance-input')[0].value;

			this.jogMode = 'continuous';

		} else {  // If current mode is continuous

			$('#run-widget .jog-panel .step-distance-input').removeClass('hidden');
			$('#run-widget .jog-panel .step-distance-input.disabled-input').addClass('hidden');
			$('#run-widget .jog-panel .mode-btn').attr('evt-data', 'step');
			$('#run-widget .jog-panel .mode-btn').text('Step');

			this.jogMode = 'step';

		}

	},
	jogPollSettings() {

		const { jogMode } = this;

		if (jogMode === 'step')
			this.jogStep = Number($('#run-widget .jog-panel .step-distance-input')[0].value);

	},
	jogMachine(dir) {

		this.jogPollSettings();  //  Get updated settings from user interface
		const { mainDevicePort: port, jogStep, jogMode, jogContFeedrate, jogContActive, jogSpamQueueFlushInterval } = this;

		if (port === '')  // If no devices connected
			return false;

		if (dir === 'stop') {  // If stop jog motion

			if (!jogContActive)
				return false;

			this.jogContActive = false;
			publish('/connection-widget/port-feedstop', port);

			setTimeout(() => {

				publish('/connection-widget/port-sendjson', port, { Msg: 'G90', IdPrefix: 'jog' });

			}, 400);

		} else if (jogMode === 'step') {  // If current jog mode is step

			const axis = dir.match(/x|y|z/i)[0];
			const neg = /neg/.test(dir) ? '-' : '';

			const msg = [
				'G91',  // Set incremental motion mode
				`G0 ${axis.toUpperCase()}${neg}${Math.roundTo(jogStep, 4)}`,  // Move by set amount
				'G90'  // Set absolute motion mode
			];

			publish('/connection-widget/port-sendjson', port, { Msg: msg, IdPrefix: 'jog' });

		} else if (jogMode === 'continuous') {  // If current jog mode is continuous

			const axis = dir.match(/x|y|z/i)[0];
			const neg = /neg/.test(dir) ? '-' : '';

			const msg = [
				'G91',  // Set incremental motion mode
				`G1 ${axis.toUpperCase()}${neg}2000 F${jogContFeedrate[axis.toLowerCase()]}`,  // Move by set amount
				'G90'  // Set absolute motion mode
			];

			if (jogSpamQueueFlushInterval) {

				setTimeout(() => {

					this.jogSpamQueueFlush();

				}, jogSpamQueueFlushInterval);

			}

			this.jogContActive = true;
			publish('/connection-widget/port-sendjson', port, { Msg: msg, IdPrefix: 'jog' });

		}

	},
	jogSpamQueueFlush() {

		const { mainDevicePort: port, jogSpamQueueFlushInterval, jogContActive } = this;

		publish('/connection-widget/port-queueflush', port);  // Send queue flush to device

		if (jogSpamQueueFlushInterval && jogContActive) {

			setTimeout(() => {

				this.jogSpamQueueFlush();

			}, jogSpamQueueFlushInterval);

		}

	},

	/**
	 *  Enables or disables the buttons while gcode is being sent.
	 *  @param {String} task (eg. 'enable' or 'disable')
	 */
	setButtonEnabledState(task) {

		let [ addingClass, removingClass ] = [ '', 'disabled' ];

		if (task === 'disable')
			[ addingClass, removingClass ] = [ 'disabled', '' ];

		const $gcodeStartBtn = $('#run-widget .gcode-view-panel .start-btn');
		const $openFileBtn = $('#run-widget .open-file-btn');
		const $droZeroBtns = $('#run-widget .dro-panel .btn-zero');
		const $droGoBtn = $('#run-widget .dro-panel .goto-value-btn');
		const $droSetBtn = $('#run-widget .dro-panel .set-value-btn');
		const $jogBtns = $('#run-widget .jog-panel .jog-btn');
		const $autoLevelStartBtn = $('#run-widget .auto-level-panel .start-btn');

		$gcodeStartBtn.addClass(addingClass).removeClass(removingClass);
		$openFileBtn.addClass(addingClass).removeClass(removingClass);
		$droZeroBtns.addClass(addingClass).removeClass(removingClass);
		$droGoBtn.addClass(addingClass).removeClass(removingClass);
		$droSetBtn.addClass(addingClass).removeClass(removingClass);
		$jogBtns.addClass(addingClass).removeClass(removingClass);
		$autoLevelStartBtn.addClass(addingClass).removeClass(removingClass);

		if (task !== 'disable')
			$('#run-widget .auto-level-setting input').removeAttr('disabled');

		$('#run-widget .profile-selector .dropdown-toggle').removeClass(removingClass);

	},
	probe: {

		port: '',
		probeCount: {
			x: 1,
			y: 1
		},
		startPoint: {
			x: 0,
			y: 0
		},
		endPoint: {
			x: 120,
			y: 180
		},
		clearanceHeight: 5,
		probe: [
			{
				probeHeight: 1,
				feedrate: 25,
				maxNegative: -20
			},
		],
		// probeHeight: 1,
		// feedrate: 25,
		// maxNegative: -20,
		heightOffset: 0,
		repeatProbe: false,
		scanWithXAxis: true,
		/**
		 *  Stores probe profiles loaded from cson settings files.
		 *  @type {Object}
		 */
		profile: {},
		defaultProfile: '',
		activeProfile: '',

		status: 'inactive',
		probePositions: [],
		probeData: [],
		/**
		 *  Probe data applied to gcode file.
		 *  @type {Array}
		 */
		appliedAutoLevelData: [],
		machPosition: {
			x: 0,
			y: 0,
			z: 0
		},
		failedProbe: false,
		saveProfileFlag: false,
		deleteProfileFlag: false,
		/**
		 *  String containing all characters not allowed in profile names.
		 *  @type {String}
		 */
		profileBannedChars: '',
		/**
		 *  Array of all substitutions that should be made to convert a safe profile name into an unsafe profile name and back again.
		 *  Eg. [ [ 'unsafe-text', 'safe-text' ] ]
		 *  @type {Array}
		 */
		parseProfileRepl: [],
		/**
		 *  Number of decimal places that should be used when adding z values to gcode lines.
		 *  @type {Number}
		 */
		autoLevelDecimalPlaces: 3,
		retryOnFailedProbe: false,

		/**
		 *  Parse profile name entered by the user into one that is safe to be used.
		 *  @param  {String} profileName Profile name entered by the user.
		 *  @return {String}
		 */
		parseUserProfileName(profileName) {

			const { profileBannedChars } = this;
			const banned = profileBannedChars.split('');
			let safeProfileName = profileName;

			for (let i = 0; i < banned.length; i++)
				safeProfileName.replace(banned[i], '');

			// const filter = RegExp(profileBannedChars.split('').join('|').replace('\\', '\\\\'), 'g');
			// safeProfileName = safeProfileName.replace(filter, '');

			return safeProfileName;

		},
		/**
		 *  Parse profile name displayed to the user into a profile name that can be used in dom operations.
		 *  @param  {String} profileName Profile name to be converted.
		 *  @param  {String} convertTo   eg. 'safe' or 'unsafe'
		 *  @return {String}
		 */
		parseProfileName(profileName, convertTo) {

			const { parseProfileRepl } = this;
			let newProfileName = profileName;
			let [ a, b ] = convertTo === 'unsafe' ? [ 1, 0 ] : [ 0, 1 ];  // NOTE: This is intentionally unintuitive so that if args are invalid, default will be to convert to safe.

			if (typeof convertTo == 'undefined' || (convertTo !== 'safe' && convertTo !== 'unsafe'))  // If the convertTo argument is invalid
				debug.warn('The convertTo argument is invalid.');

			for (let i = 0; i < parseProfileRepl.length; i++)
				newProfileName = newProfileName.replace(parseProfileRepl[i][a], parseProfileRepl[i][b]);

			return newProfileName;

		},
		updateDropDownDOM() {

			const { profile, activeProfile } = this;
			const keys = Object.keys(profile);

			let HTML = '';

			for (let i = 0; i < keys.length; i++) {

				const profileName = keys[i];
				const unsafeProfileName = this.parseProfileName(profileName, 'unsafe');

				HTML += '<li>';
				HTML += `<span evt-signal="profile" evt-data="${profileName}" class="btn profile-btn">${unsafeProfileName}</span>`;
				HTML += '</li>';

			}

			HTML += '<li><span evt-signal="profile" evt-data="New-Profile" class="btn profile-btn new-profile-btn hidden">New Profile</span></li>';
			$('#run-widget .auto-level-panel .dropdown-menu').html(HTML);

			const toggleHTML = `<span>${this.parseProfileName(activeProfile, 'unsafe')}</span><span class="caret"></span>`;
			$('#run-widget .auto-level-panel .dropdown-toggle').html(toggleHTML);

		},
		profileDropDownMenu(task) {

			if (task === 'show') {  // Show drop down profile menu

				$('#run-widget .auto-level-panel .profile-selector .dropdown-toggle').attr('evt-data', 'visible');
				$('#run-widget .auto-level-panel .profile-selector .dropdown-menu').removeClass('hidden');

			} else if (task === 'hide') {  // Hide drop down profile menu

				$('#run-widget .auto-level-panel .profile-selector .dropdown-toggle').attr('evt-data', 'hidden');
				$('#run-widget .auto-level-panel .profile-selector .dropdown-menu').addClass('hidden');

			}

		},
		onProfileControlBtn(operation) {

			const { saveProfileFlag, deleteProfileFlag } = this;

			if (operation === 'save') {

				if (deleteProfileFlag)  // If the delete operation is already active
					this.profileCtrlBtnState('deactivate', 'delete');

				if (saveProfileFlag)  	// If the save operation is already active
					this.profileCtrlBtnState('deactivate', 'save');

				else  					// If the save operation is inactive
					this.profileCtrlBtnState('activate', 'save');

			} else if (operation === 'delete') {

				if (saveProfileFlag)  	// If the save operation is already active
					this.profileCtrlBtnState('deactivate', 'save');

				if (deleteProfileFlag)  // If the delete operation is already active
					this.profileCtrlBtnState('deactivate', 'delete');

				else  					// If the delete operation is inactive
					this.profileCtrlBtnState('activate', 'delete');

			}

		},

		/**
		 *  Activates and deactivates the save and delete profile control buttons.
		 *  @param {String} task   (eg. 'activate' or 'deactivate')
		 *  @param {String} target (eg. 'save' or 'delete')
		 */
		profileCtrlBtnState(task, target) {

			const $saveBtn = $('#run-widget .auto-level-panel .profile-selector .save-btn');
			const $deleteBtn = $('#run-widget .auto-level-panel .profile-selector .delete-btn');
			const $newProfileBtn = $('#run-widget .auto-level-panel .profile-selector .new-profile-btn');

			if (target === 'save' && task === 'activate') {  			// Activate the save operation

				this.saveProfileFlag = true;

				$saveBtn.addClass('btn-active');
				$newProfileBtn.removeClass('hidden');
				this.profileDropDownMenu('show');

			} else if (target === 'save' && task === 'deactivate') { 	// Deactivate the save operation

				this.saveProfileFlag = false;

				$saveBtn.removeClass('btn-active');
				$newProfileBtn.addClass('hidden');

			} else if (target === 'delete' && task === 'activate') {  	// Activate the delete operation

				this.deleteProfileFlag = true;

				$deleteBtn.addClass('btn-active');
				this.profileDropDownMenu('show');

			} else if (target === 'delete' && task === 'deactivate') {  // Deactivate the delete operation

				this.deleteProfileFlag = false;
				$deleteBtn.removeClass('btn-active');

			}

		},
		onProfileSelected(profileName) {

			const { saveProfileFlag, deleteProfileFlag } = this;

			if (saveProfileFlag) {  // Save profile

				this.saveProfile(profileName);

			} else if (deleteProfileFlag) {  // Delete profile

				this.deleteProfile(profileName);

			} else {  // Load profile

				this.loadProfile(profileName);

			}

		},
		loadProfile(profileName, recursionDepth = 0) {

			const { profile, activeProfile } = this;
			const profileItem = profile[profileName];

			if (recursionDepth > 1)
				return false;

			if (typeof profileItem == 'undefined') {  // If the profile is invalid

				return this.loadProfile('Default', ++recursionDepth);
				return false;

			}

			$('#run-widget .auto-level-panel .probe-count-input input.x-val').val(profileItem.probeCount.x);  // Probe Count
			$('#run-widget .auto-level-panel .probe-count-input input.y-val').val(profileItem.probeCount.y);

			$('#run-widget .auto-level-panel .start-point-input input.x-val').val(profileItem.startPoint.x);  // Start Point
			$('#run-widget .auto-level-panel .start-point-input input.y-val').val(profileItem.startPoint.y);

			$('#run-widget .auto-level-panel .end-point-input input.x-val').val(profileItem.endPoint.x);  	  // End Point
			$('#run-widget .auto-level-panel .end-point-input input.y-val').val(profileItem.endPoint.y);

			$('#run-widget .auto-level-panel .clearance-height-input input').val(profileItem.clearanceHeight);  	// Clearance Height
			$('#run-widget .auto-level-panel .probe-height-input input').val(profileItem.probeHeight);  			// Probe Height
			$('#run-widget .auto-level-panel .feedrate-input input').val(profileItem.feedrate);  					// Feedrate
			$('#run-widget .auto-level-panel .probe-limit-input input').val(profileItem.maxNegative);  				// Low Probe Limit
			$('#run-widget .auto-level-panel .height-offset-input input').val(profileItem.heightOffset); 			// Height Offset
			$('#run-widget .auto-level-panel .repeat-probe-input input').prop('checked', profileItem.repeatProbe);  // Repeat Probe

			this.activeProfile = profileName;
			this.defaultProfile = profileName;
			this.updateDropDownDOM();

			fsCSON.updateFile('run-widget/User_Settings.cson', (data) => {

				if (!data.probe)
					data.probe = {};

				if (!data.probe.profile)
					data.probe.profile = {};

				data.probe.defaultProfile = profileName;
				return data;

			}, (err) => {

				if (err)  // If an error occurred while reading the file
					return false;

			});

		},
		saveProfile(profileName) {

			const { profile } = this;

			if (profileName == 'New-Profile') {

				for (let i = 1; true; i++) {

					if (profile[`${profileName}-0${i}`])  // If the profie name matches an existing profile name
						continue;

					profileName = `${profileName}-0${i}`;
					break;

				}

			}

			this.activeProfile = profileName;
			this.profileCtrlBtnState('deactivate', 'save');
			this.profileDropDownMenu('hide');

			const profileItem = {
				probeCount: {
					x: Number($('#run-widget .auto-level-panel .probe-count-input input.x-val').val()),
					y: Number($('#run-widget .auto-level-panel .probe-count-input input.y-val').val())
				},
				startPoint: {
					x: Number($('#run-widget .auto-level-panel .start-point-input input.x-val').val()),
					y: Number($('#run-widget .auto-level-panel .start-point-input input.y-val').val())
				},
				endPoint: {
					x: Number($('#run-widget .auto-level-panel .end-point-input input.x-val').val()),
					y: Number($('#run-widget .auto-level-panel .end-point-input input.y-val').val())
				},
				clearanceHeight: Number($('#run-widget .auto-level-panel .clearance-height-input input').val()),
				probeHeight: Number($('#run-widget .auto-level-panel .probe-height-input input').val()),
				feedrate: Number($('#run-widget .auto-level-panel .feedrate-input input').val()),
				maxNegative: Number($('#run-widget .auto-level-panel .probe-limit-input input').val()),
				heightOffset: Number($('#run-widget .auto-level-panel .height-offset-input input').val()),
				repeatProbe: $('#run-widget .auto-level-panel .repeat-probe-input input').prop('checked')
			};

			this.profile[profileName] = profileItem;

			fsCSON.updateFile('run-widget/User_Settings.cson', (data) => {

				if (!data.probe)
					data.probe = {};

				if (!data.probe.profile)
					data.probe.profile = {};

				data.probe.profile[profileName] = profileItem;
				return data;

			}, (err) => {

				if (err)  // If an error occurred while reading the file
					return false;

				this.loadProfile(profileName);

			});

		},
		deleteProfile(profileName) {

			this.profileCtrlBtnState('deactivate', 'delete');
			this.profileDropDownMenu('hide');

			const { defaultProfile, profile, activeProfile } = this;

			if (profileName == 'Default')
				return false;

			delete this.profile[profileName];

			fsCSON.updateFile('run-widget/User_Settings.cson', (data) => {

				if (!data.probe)
					data.probe = {};

				if (!data.probe.profile)
					data.probe.profile = {};

				delete data.probe.profile[profileName];
				return data;

			}, (err) => {

				if (err)  // If there was an error reading the settings file
					this.repairUserSettings(err);

				if (activeProfile === profileName)
					this.loadProfile('Default');

				else
					this.loadProfile(activeProfile);  // Call load profile to update the profile drop-down menu

			});

		},
		pollSettings() {

			this.probeCount.x = Number($('#run-widget .auto-level-panel .probe-count-input input.x-val').val());
			this.probeCount.y = Number($('#run-widget .auto-level-panel .probe-count-input input.y-val').val());

			this.startPoint.x = Number($('#run-widget .auto-level-panel .start-point-input input.x-val').val());
			this.startPoint.y = Number($('#run-widget .auto-level-panel .start-point-input input.y-val').val());

			this.endPoint.x = Number($('#run-widget .auto-level-panel .end-point-input input.x-val').val());
			this.endPoint.y = Number($('#run-widget .auto-level-panel .end-point-input input.y-val').val());

			this.clearanceHeight = Number($('#run-widget .auto-level-panel .clearance-height-input input').val());
			this.heightOffset = Number($('#run-widget .auto-level-panel .height-offset-input input').val());

			const probeHeight = Number($('#run-widget .auto-level-panel .probe-height-input input').val())
			const maxNegative = Number($('#run-widget .auto-level-panel .probe-limit-input input').val());
			const feedrate = Number($('#run-widget .auto-level-panel .feedrate-input input').val());
			this.repeatProbe = $('#run-widget .auto-level-panel .repeat-probe-input input')[0].checked;

			const probeItem = {
				probeHeight,
				feedrate,
				maxNegative
			};

			this.probe = [ probeItem ];

			if (this.repeatProbe)
				this.probe = [ ...this.probe, probeItem ];

		},
		calcProbePositions() {

			let { probePositions, autoLevelDecimalPlaces } = this;
			const { probeCount, startPoint, endPoint, scanWithXAxis } = this;

			probePositions = [];

			if (probeCount.x === 1 && probeCount.y === 1) {

				const probePos = {
					x: startPoint.x,
					y: startPoint.y
				}

				probePositions = [ probePos ];

			} else {

				const { x: xSteps, y: ySteps } = probeCount;
				// const xSteps = Math.ceil(Math.abs(endPoint.x - startPoint.x) / maxStepSpacing);
				// const ySteps = Math.ceil(Math.abs(endPoint.y - startPoint.y) / maxStepSpacing);

				if (scanWithXAxis) {  // Scan in the x axis

					for (let iY = 0; iY < ySteps; iY++) {

						let y = Math.roundTo(startPoint.y + (Math.abs(endPoint.y - startPoint.y) * iY / (ySteps - 1)), 3);

						for (let iX = 0; iX < xSteps; iX++) {

							let x = Math.roundTo(startPoint.x + (Math.abs(endPoint.x - startPoint.x) * iX / (xSteps - 1)), 3);
							const probePos = {
								x: x,
								y: y
							};

							probePositions = [ ...probePositions, probePos ];

						}

					}

				} else {  // Scan in the y axis

					for (let iX = 1; iX < xSteps; iX++) {

						let x = Math.roundTo(Math.abs(endPoint.x - startPoint.x) * iX / (xSteps - 1), 3);

						for (let iY = 1; iY < ySteps; iY++) {

							let y = Math.roundTo(Math.abs(endPoint.y - startPoint.y) * iY / (ySteps - 1), 3);
							const probePos = { x: x, y: y };

							probePositions = [ ...probePositions, probePos ];

						}

					}

				}

			}

			this.probePositions = probePositions;

			debug.log(`Probe Positions:\n${CSON.stringify(probePositions)}`);

		},
		begin() {

			this.pollSettings();  // Get updated settings from user interface
			const { port, probeCount, startPoint, endPoint, clearanceHeight, probe, heightOffset, status } = this;

			if (!port)  // If not connected to a port
				return false;

			this.status = 'active';
			this.probeData = [];
			this.failedProbe = false;
			this.calcProbePositions();

			let msg = [
				'G21 G90',
				'G28.3 Z0',  // Zero z axis
				`G0 Z${clearanceHeight}`,
				`G0 X${startPoint.x} Y${startPoint.y}`,  // Go to the first probe position
				'G0 Z0'
			];

			for (let i = 0; i < probe.length; i++) {  // For each probe repetition

				const probeItem = probe[i];

				if (i)  // If not the first probe repetition
					msg = [ ...msg, `G0 Z${probeItem.probeHeight}` ];  // Move to probe height

				const item = [
					`G38.2 Z${probeItem.maxNegative} F${probeItem.feedrate}`,  // Probe point
					'G28.3 Z0'
				];

				msg = [ ...msg, ...item ];

			}

			publish('/connection-widget/port-sendjson', port, { Msg: msg, IdPrefix: 'autoLevel' });  // Send the commands to the controller

		},
		/**
		 *  Receives probe data messages from controller.
		 *  @param {Object} Data (eg. '{"r":{"prb":{"e":1,"x":0.000,"y":0.000,"z":-0.511,"a":0.000,"b":0.000,"c":0.000}},"f":[1,0,0,4931]}')
		 */
		onReply(Data) {

			let { probeData } = this;
			const { port, startPoint, clearanceHeight, probe, heightOffset, repeatProbe, status, probePositions, machPosition, failedProbe, retryOnFailedProbe } = this;

			if (status === 'inactive')  // If the auto leveler is inactive
				return false;

			let [ e, x, y, z ] = [ '', '', '', '' ];

			if (Data && Data.r && Data.r.prb)
				({ e, x, y, z } = Data.r.prb);

			else if (Data && Data.prb)
				({ e, x, y, z } = Data.prb);

			else  // Got invalid data
				return false;

			const lastIndex = probeData.length - 1;

			if (typeof x == 'undefined')
				({ x } = machPosition);

			if (typeof y == 'undefined')
				({ y } = machPosition);

			if (typeof z == 'undefined')
				({ z } = machPosition);

			const replyData = {
				x: x,
				y: y,
				z: z
			}

			probeData = [ ...probeData, replyData ];
			this.probeData = probeData;

			let matchCount = 0;

			for (let i = 0; i < probeData.length; i++) {  // Look for data from the same position

				if (probeData[i].x === x && probeData[i].y === y)  // If probe data is for same x-y position
					matchCount += 1;

			}

			let replyIndex = 0;

			for (let i = 0; i < probePositions.length; i++) {  // Find current position in the list of probe positions

				const probeItem = probePositions[i];

				if (probeItem.x === x && probeItem.y === y) {

					replyIndex = i;
					break;

				}

			}

			if (!replyIndex) {  // If this is the first probe position

				probeData[probeData.length - 1].z = 0;
				this.probeData = probeData;

			}

			if (!e) {  // If probe failed

				$('#run-widget .auto-level-panel .probe-failed-alert').removeClass('hidden');  // Show the probe failed alert in the auto level panel

				if (failedProbe) {  // If the previous probe also failed

				} else if (retryOnFailedProbe) {  // If the previous probe was successful

					let msg = []

					if (!replyIndex && machPosition.z <= probe[0].maxNegative) {  // If at first probe position and at the probe height limit

						msg = [
							`G0 Z${probe[0].probeHeight}`,
							`G38.2 Z${probe[0].maxNegative} F${probe[0].feedrate}`,
							'G28.3 Z0'
						];

						probeData.splice(probeData.length - 1, 1);
						this.probeData = probeData;

					} else {  // If not at the first probe position

						msg = [
							`G0 Z${probe[0].probeHeight}`,
							`G38.2 Z${probe[0].maxNegative} F${probe[0].feedrate}`
						];

					}

					publish('/connection-widget/port-sendjson', port, { Msg: msg, IdPrefix: 'autoLevel' });  // Send the commands to the controller

					return false;

				}

				this.failedProbe = true;

			} else {  // If the probe succeeded

				if (failedProbe)
					$('#run-widget .auto-level-panel .probe-failed-alert').addClass('hidden');

				this.failedProbe = false;

			}

			if (matchCount === 2 && repeatProbe) {  // Prevent sending next probe command on every probe reply if there are probe repetitions

				const msg = [
					`G0 Z${clearanceHeight}`,
					'(Probe Cycle Complete)'
				];

				publish('/connection-widget/port-sendjson', port, { Msg: msg, IdPrefix: 'autoLevel' });  // Send the commands to the controller

				if (replyIndex + 1 >= probePositions.length)  // If got a reply for the final probe position
					return this.exportProbeData();

				return false;

			}

			if (!repeatProbe && replyIndex + 1 >= probePositions.length)  // If got a reply for the final probe
				return this.exportProbeData();

			else if (replyIndex + 1 >= probePositions.length)  // If got a reply for final probe position
				return false;

			let nextIndex = replyIndex + 1;
			const nextProbePos = probePositions[nextIndex];

			let msg = [
				`G0 Z${clearanceHeight}`,
				`G0 X${nextProbePos.x} Y${nextProbePos.y}`
			];

			for (let i = 0; i < probe.length; i++) {  // For each probe repetition

				const probeItem = probe[i];
				const item = [
					`G0 Z${probeItem.probeHeight}`,
					`G38.2 Z${probeItem.maxNegative} F${probeItem.feedrate}`
				];

				msg = [ ...msg, ...item ];

			}

			publish('/connection-widget/port-sendjson', port, { Msg: msg, IdPrefix: 'autoLevel' });  // Send the commands to the controller

		},
		exportProbeData() {

			const { port, startPoint, clearanceHeight, probe, heightOffset, status, probePositions, machPosition } = this;
			let { probeData } = this;

			this.status = 'inactive';

			$('#run-widget .auto-level-panel .probe-failed-alert').addClass('hidden');  // Hide the probe failed alert
			$('#run-widget .auto-level-panel .start-btn').removeClass('hidden');  // Show the start button in the auto level panel
			$('#run-widget .auto-level-panel .pause-btn').addClass('hidden');
			$('#run-widget .auto-level-panel .resume-btn').addClass('hidden');
			$('#run-widget .auto-level-panel .stop-btn').addClass('hidden');

			probeData = probeData.filter((item, i, arr) => {  // Remove duplicate points

				if (i === arr.length - 1)  // If the last element of the array
					return true;  // Include the item in the filtered array

				if (item.x === arr[i + 1].x && item.y === arr[i + 1].y)  // If this item has the same position as the following element in the array
					return false;  // Remove the item from the array

				else
					return true;

			});
			this.probeData = probeData;

			if (heightOffset !== 0) {  // If a height offset was applied

				const msg = [
					`G0 Z${clearanceHeight}`,
					`G28.3 Z${Math.roundTo(clearanceHeight + heightOffset, 4)}`,
					`G0 X${startPoint.x} Y${startPoint.y}`
				];

				publish('/connection-widget/port-sendjson', port, { Msg: msg, IdPrefix: 'autoLevel' });  // Send the commands to the controller

			} else {  // If no height offset was applied

				const msg = [
					`G0 Z${clearanceHeight}`,
					`G0 X${startPoint.x} Y${startPoint.y}`
				];

				publish('/connection-widget/port-sendjson', port, { Msg: msg, IdPrefix: 'autoLevel' });  // Send the commands to the controller

			}

			if (probeData.length === 1)  // If the data is a single probe point
				return true;

			publish('probe-data/auto-level', probeData);  // Publish the probe data

		}

	},
	updateMachPosition({ x, y, z }) {

		const { probe, machine } = this;

		if (typeof x != 'undefined')
			probe.machPosition.x = x;

		if (typeof y != 'undefined')
			probe.machPosition.y = y;

		if (typeof z != 'undefined')
			probe.machPosition.z = z;

		machine.updatePosition({ x, y, z });

	},
	machine: {

		position: {
			x: 0,
			y: 0,
			z: 0
		},
		/**
		 *  Current unit mode.
		 *  Ex. 'mm' or 'inch'
		 *  @type {String}
		 */
		unit: undefined,
		intomm: 25.4,
		mmtoin: 0.0393700787401575,
		velocity: undefined,
		feedrate: 400,
		feedrateBarMax: 2,
		spindleRPM: 0,
		/**
		 *  Direction and state of spindle.
		 *  '': Spindle off.
		 *  'cw': Spindle on clockwise rotation.
		 *  'ccw': Spindle on counter-clockwise rotation.
		 *  @type {String}
		 */
		spindleDir: 'off',
		/**
		 *  Minimum spindle speed [rpm].
		 *  @type {Number}
		 */
		spindleMin: 1000,
		/**
		 *  Maximum spindle speed [rpm].
		 *  @type {Number}
		 */
		spindleMax: 24000,
		/**
		 *  The number of digits that should be shown before the decimal place by default.
		 *  @type {Number}
		 */
		intGrayDigits: 3,
		/**
		 *  The minimum number of decimal places to show in the DRO.
		 *  @type {Number}
		 */
		minDecimals: 3,
		/**
		 *  The maximum number of decimal places to show in the DRO.
		 *  Values longer than this will be rounded.
		 *  @type {Number}
		 */
		maxDecimals: 3,
		/**
		 *  JQuery cache for DRO values.
		 *  @type {Object}
		 */
		$axisValue: {
			x: $('#run-widget .dro-panel .x-axis-dro .dro-value'),
			y: $('#run-widget .dro-panel .y-axis-dro .dro-value'),
			z: $('#run-widget .dro-panel .z-axis-dro .dro-value')
		},

		/**
		 *  Builds HTML for value in DRO panel.
		 *  @param  {Number} val The value to be built.
		 *  @return {String} HTML to be inserted into the DOM.
		 */
		buildValueHTML(val) {

			const { intGrayDigits, minDecimals, maxDecimals, unit } = this;

			const valStr = Math.roundTo(val, maxDecimals).toString();
			const [ intVal, decVal = '' ] = valStr.split('.');

			// Parse the position value into format for DRO
			const negPosClass = val >= 0 ? ' digits-dimmed' : '';
			const intBlack = intVal.includes('-') ? intVal.substring(1) : intVal;
			const intGray = intBlack.length < intGrayDigits ? '0'.repeat(intGrayDigits - intBlack.length) : '';
			const decBlack = decVal.length < minDecimals ? `${decVal}${'0'.repeat(minDecimals - decVal.length)}` : decVal;
			const decGray = decBlack.length < maxDecimals ? '0'.repeat(maxDecimals - decBlack.length): '';
			const [ unitVal = '--' ] = [ unit ];

			let valueHTML = `<span class="negpos${negPosClass}" >-</span>`;      // Negative Position
			valueHTML += `<span class="intgray digits-dimmed">${intGray}</span>`;  // Integer Gray
			valueHTML += `<span class="intblack">${intBlack}</span>`;              // Integer Black
			valueHTML += `.<span class="decblack">${decBlack}</span>`;             // Decimal Black
			valueHTML += `<span class="decgray digits-dimmed">${decGray}</span>`;  // Decimal Gray
			valueHTML += `<span class="dro-units">${unitVal}</span>`;      // Units

			return valueHTML;

		},
		/**
		 *  Updates the position in the DRO
		 *  @param  {Object} newPos Ex. { x: 3.292, y: 98.238, z:16.828 }
		 */
		updatePosition(newPos) {

			const { position, $axisValue } = this;
			const keys = Object.keys(newPos);

			for (let i = 0; i < keys.length; i++) {

				const key = keys[i];
				const posItem = newPos[key];

				if (typeof posItem != 'undefined' && posItem !== position[key]) {

					this.position[key] = posItem;
					$axisValue[key].html(this.buildValueHTML(posItem));

				}

			}

		},
		updateUnit(newUnit) {

			const { unit } = this;

			if (typeof newUnit == 'undefined')  // If the newUnit argument is invalid
				return debug.error('The newUnit argument is invalid.');

			if (newUnit === unit)
				return false;

			this.unit = newUnit;
			$('#run-widget .dro-panel .dro-units').text(newUnit);  // Update the units in the DRO panel
			$('#run-widget .feedrate-panel .feedrate-units').text(`${newUnit}/min`);

		},
		updateVelocity(vel) {

			const { velocity, feedrate, feedrateBarMax } = this;

			if (typeof vel == 'undefined') // The vel argument is invalid
				return debug.error('The vel argument is invalid.');

			if (vel === velocity)
				return false;

			if (vel > feedrate) {  // If doing a rapid movement

				$('#run-widget .feedrate-progress-bar').addClass('progress-bar-warning');
				$('#run-widget .feedrate-progress-bar').removeClass('progress-bar-success progress-bar-danger');

			} else if (vel === 0) {  // If not moving

				$('#run-widget .feedrate-progress-bar').addClass('progress-bar-danger');
				$('#run-widget .feedrate-progress-bar').removeClass('progress-bar-success progress-bar-warning');
				$('#run-widget .feedrate-progress-bar').css('width', '0%');

			} else {  // If doing a feed movement

				$('#run-widget .feedrate-progress-bar').addClass('progress-bar-success');
				$('#run-widget .feedrate-progress-bar').removeClass('progress-bar-warning progress-bar-danger');

			}

			this.velocity = vel;
			$('#run-widget .feedrate-panel .feedrate-value').text(`${Math.roundTo(vel, 0)}`);  // Update the velocity in the feedrate panel

			const bar = Math.min(Math.max(Math.roundTo(vel * 100 / (feedrate * feedrateBarMax), 0), 0), 100);
			$('#run-widget .feedrate-progress-bar').css('width', `${bar}%`);

		},
		updateSpindle({ rpm, dir }) {

			const { spindleRPM, spindleDir, spindleMin, spindleMax } = this;

			if (rpm === '--') {  // If the device has disconnected

				this.spindleRPM = 0;
				this.spindleDir = 'off';
				$('#run-widget .spindle-panel .spindle-dir').addClass('hidden');
				$('#run-widget .spindle-panel .spindle-value').text('--');
				$('#run-widget .spindle-panel .spindle-progress-bar').addClass('progress-bar-danger');
				$('#run-widget .spindle-panel .spindle-progress-bar').removeClass('progress-bar-success');
				$('#run-widget .spindle-panel .spindle-progress-bar').css('width', '0%');

			} else if (typeof dir != 'undefined' && (dir === 'cw' || dir === 'ccw')) {  // If the spindle is turned on

				this.spindleRPM = typeof rpm == 'undefined' ? spindleRPM : rpm;

				if (typeof this.spindleRPM == 'undefined')
					this.spindleRPM = 0;

				this.spindleDir = dir;
				$(`#run-widget .spindle-panel .spindle-${dir === 'cw' ? 'ccw' : 'cw'}`).addClass('hidden');
				$(`#run-widget .spindle-panel .spindle-${dir}`).removeClass('hidden');
				$('#run-widget .spindle-panel .spindle-value').text(`${this.spindleRPM}`);
				$('#run-widget .spindle-panel .spindle-progress-bar').addClass('progress-bar-success');
				$('#run-widget .spindle-panel .spindle-progress-bar').removeClass('progress-bar-danger');

				const bar = Math.min(Math.max(Math.roundTo((this.spindleRPM - spindleMin) * 100 / (spindleMax - spindleMin), 0), 0), 100);
				$('#run-widget .spindle-panel .spindle-progress-bar').css('width', `${bar}%`);

			} else if ((typeof dir != 'undefined' && dir === 'off') || (typeof rpm == 'undefined' && typeof dir == 'undefined')) {  // If the spindle is turned off

				this.spindleDir = dir;
				$('#run-widget .spindle-panel .spindle-dir').addClass('hidden');
				$('#run-widget .spindle-panel .spindle-value').text('0');
				$('#run-widget .spindle-panel .spindle-progress-bar').addClass('progress-bar-danger');
				$('#run-widget .spindle-panel .spindle-progress-bar').removeClass('progress-bar-success');
				$('#run-widget .spindle-panel .spindle-progress-bar').css('width', '0%');

			}

			if (typeof rpm != 'undefined' && rpm !== '--') {

				this.spindleRPM = Number(rpm);

				if (this.spindleDir != 'off') {  // If the spindle is on

					$('#run-widget .spindle-panel .spindle-value').text(`${this.spindleRPM}`);
					const bar = Math.min(Math.max(Math.roundTo((this.spindleRPM - spindleMin) * 100 / (spindleMax - spindleMin), 0), 0), 100);
					const $stuff = $('#run-widget .spindle-panel .spindle-progress-bar');
					$stuff.css('width', `${bar}%`);

				} else if (this.spindleRPM === 0) {

					$('#run-widget .spindle-panel .spindle-value').text('0');

				}

			}

		}

	},
	droManualInput(task, axis) {

		const { mainDevicePort: port, machine } = this;

		if (typeof task == 'undefined' || typeof axis == 'undefined')  // If the task or axis arguments are invalid
			return false;

		const $droValue = $(`#run-widget .dro-panel .${axis}-axis-dro .dro-value`);
		const $droInputGroup = $(`#run-widget .dro-panel .${axis}-axis-dro .axis-value-input`);
		const $droInput = $droInputGroup.find('.form-control');

		$droValue.removeClass('hidden');
		$droInputGroup.addClass('hidden');

		if (!port || task === 'esc')  // If no open port or the 'Esc' button was pressed
			return false;

		const inputValue = $droInput[0].value;
		let Msg = [];

		if (task === 'zero-axis') {  // If the 'Zero' button was pressed

			Msg = [
				`G28.3 ${axis.toUpperCase()}0`
			];

		} else if (task === 'goto-value') {  // If the 'Go' button was pressed

			Msg = [
				'G90',
				`G0 ${axis.toUpperCase()}${Math.roundTo(Number(inputValue), 4)}`
			];

		} else if (task === 'set-value') {  // If the 'Set' button was pressed

			Msg = [
				`G28.3 ${axis.toUpperCase()}${Math.roundTo(Number(inputValue), 4)}`
			];

		}

		publish('/connection-widget/port-sendjson', port, { Msg, IdPrefix: 'dro', Comment: 'DRO-MDI' });  // Send the commands to the controller

	},
	interpolateProbeValue(pos, probeData, xMap, yMap) {

		const { x: xPos, y: yPos } = pos;

		// const xMap = [
		// 	{ val: 0, probeIndex: [ 0, 1, 2, 3 ] },  // use y sorted data for index list
		// 	{ val: 5, probeIndex: [ 4, 5, 6, 7 ] },
		// 	{ val: 10, probeIndex: [ 8, 9, 10, 11 ] },
		// 	{ val: 15, probeIndex: [ 12, 13, 14, 15 ] }
		// ];
		let xMapLowIndex = 0;
		let xMapHighIndex = 0;
		let yMapLowIndex = 0;
		let yMapHighIndex = 0;

		for (let i = 0; i < xMap.length; i++) {

			const { val } = xMap[i];

			if (val > xPos && i) {

				xMapLowIndex = i - 1;
				xMapHighIndex = i;
				break;

			} else if (val > xPos) {

				return false;

			}

		}

		for (let i = 0; i < yMap.length; i++) {

			const { val } = yMap[i];

			if (val > yPos && i) {

				yMapLowIndex = i - 1;
				yMapHighIndex = i;
				break;

			} else if (val > yPos) {

				return false;

			}

		}

		const botLeft = {
			x: 0,
			y: 0,
			z: 0,
			probeIndex: xMap[xMapLowIndex].probeIndex[yMapLowIndex]
		};
		const botRight = {
			x: 0,
			y: 0,
			z: 0,
			probeIndex: xMap[xMapHighIndex].probeIndex[yMapLowIndex]
		};
		const topLeft = {
			x: 0,
			y: 0,
			z: 0,
			probeIndex: xMap[xMapLowIndex].probeIndex[yMapHighIndex]
		};
		const topRight = {
			x: 0,
			y: 0,
			z: 0,
			probeIndex: xMap[xMapHighIndex].probeIndex[yMapHighIndex]
		};

		({ x: botLeft.x, y: botLeft.y, z: botLeft.z } = probeData[botLeft.probeIndex]);
		({ x: botRight.x, y: botRight.y, z: botRight.z } = probeData[botRight.probeIndex]);
		({ x: topLeft.x, y: topLeft.y, z: topLeft.z } = probeData[topLeft.probeIndex]);
		({ x: topRight.x, y: topRight.y, z: topRight.z } = probeData[topRight.probeIndex]);

		if (botRight.x - botLeft.x === 0)  // If a mapping error occurred
			return false;

		if (topRight.x - topLeft.x === 0)  // If a mapping error occurred
			return false;

		if (topLeft.y - botLeft.y === 0)  // If a mapping error occurred
			return false;

		const botAvg = (botLeft.z * (botRight.x - xPos) / (botRight.x - botLeft.x)) + (botRight.z * (xPos - botLeft.x) / (botRight.x - botLeft.x));
		const topAvg = (topLeft.z * (topRight.x - xPos) / (topRight.x - topLeft.x)) + (topRight.z * (xPos - topLeft.x) / (topRight.x - topLeft.x));
		const avg = (botAvg * (topLeft.y - yPos) / (topLeft.y - botLeft.y)) + (topAvg * (yPos - botLeft.y) / (topLeft.y - botLeft.y));

		return avg;

	},
	onAutoLevel(probeData) {

		const { FileName, OrigionalGcode, OrigionalGcodeData, ToolMeta, ToolChange, probe } = this;
		const { autoLevelDecimalPlaces } = probe;

		const lines = OrigionalGcode;
		const data = {
			x: [ ...OrigionalGcodeData.x ],
			y: [ ...OrigionalGcodeData.y ],
			z: [ ...OrigionalGcodeData.z ],
			Id: [ ...OrigionalGcodeData.Id ],
			Line: [ ...OrigionalGcodeData.Line ],
			Gcode: [ ...OrigionalGcodeData.Gcode ],
			Desc: [ ...OrigionalGcodeData.Desc ]
		};

		if (typeof lines == 'undefined' || !lines.length)  // If no gcode file has been loaded
			return false;

		this.autolevelData = probeData;
		this.probe.appliedAutoLevelData = probeData;

		const xSortedProbeData = probeData;
		const ySortedProbeData = probeData;
		const xVal = [];
		const yVal = [];
		const xMap = [];
		const yMap = [];

		for (let i = 0; i < ySortedProbeData.length; i++) {  // Build xMap

			const { x, y, z } = ySortedProbeData[i];

			if (xVal.includes(x)) {

				xMap[xVal.indexOf(x)].probeIndex.push(i);

			} else {

				xVal.push(x);
				xMap.push({ val: x, probeIndex: [ i ] });

			}

		}

		for (let i = 0; i < xSortedProbeData.length; i++) {  // Build yMap

			const { x, y, z } = xSortedProbeData[i];

			if (yVal.includes(y)) {

				yMap[yVal.indexOf(y)].probeIndex.push(i);

			} else {

				yVal.push(y);
				yMap.push({ val: y, probeIndex: [ i ] });

			}

		}

		for (let i = 0; i < lines.length; i++) {  // Apply auto level data to gcode file

			const line = lines[i];
			const [ x, y, z ] = [ data.x[i], data.y[i], data.z[i] ];

			if (/G28/i.test(line))  // Skip G28 lines
				continue;

			const adjustVal = this.interpolateProbeValue({ x, y, z }, probeData, xMap, yMap);
			let newValue = Math.roundTo(z + adjustVal, autoLevelDecimalPlaces);

			if (adjustVal === false || isNaN(adjustVal))  // If an error occurred interpolating the probe values
				continue

			else if (isNaN(newValue) && !isNaN(adjustVal))  // If an error occurred in rounding z-value
				newValue = Number((adjustVal).toFixed(autoLevelDecimalPlaces));

			if (isNaN(newValue))  // If an error occurred in calculating z-value
				continue;

			if (adjustVal && /z[-.0-9]+/i.test(line) ) {  // Replace z values

				lines[i] = line.replace(/z[-.0-9]+/i, `Z${newValue}`);
				data.Gcode[i] = lines[i];
				data.z[i] = z + adjustVal;

			} else if (adjustVal && (/x[-.0-9]+/i.test(line) || /y[-.0-9]+/i.test(line)) && !/G2|G3/i.test(line)) {  // Add new z value

				lines[i] = `${line} Z${newValue}`;
				data.Gcode[i] = lines[i];
				data.z[i] = z + adjustVal;

			}

		}

		this.fileLoaded({ FileName, Gcode: lines, GcodeData: data, ToolMeta, ToolChange });

	},

	resizeWidgetDom() {

		const { widgetVisible, widgetDom, GcodeData, idMap, gcodeLineScrollOffset, activeId, scrollOffsetFactor} = this;

		if (!widgetVisible)  // If the widgte is not visible
			return false;

		const lineHeight = 18.5;  // Height of lines in the Gcode file view panel in pixels [px]

		// TODO: Do the resize stuff like this: $(selector).attr(attribute,function(index,currentvalue))
		// index - Receives the index position of the element in the set.
		// currentvalue - Receives the current attribute value of the selected elements.
		// Put the .attr() function inside of a for loop.

		for (let i = 0; i < widgetDom.length; i++) {

			const domItem = widgetDom[i];

			if (!domItem || !domItem.length)  // If the domItem is invalid
				continue;

			const $container = $(`#run-widget${domItem[0]}`);
	 	 	const containerHeight = $container.height();
			let marginSpacing = 0;
			let panelSpacing = 0;

			for (let j = 1; j < domItem.length; j++) {

				const panelItem = domItem[j];
				const $panel = $container.find(panelItem);
				marginSpacing += Number($panel.css('margin-top').replace(/px/g, ''));

				if (j < domItem.length - 1) {  // If not last panel in the array

					panelSpacing += Number($panel.css('height').replace(/px/, ''));
					continue;

				}

				marginSpacing += Number($panel.css('margin-bottom').replace(/px/g, ''));
				const panelHeight = $panel.css('height');
				const desiredHeight = `${containerHeight - (marginSpacing + panelSpacing)}px`;

				if (panelHeight !== desiredHeight)
				$panel.css({ height: desiredHeight });

				if (panelHeight !== desiredHeight && panelItem === ' .gcode-view-panel')
				this.gcodeLineScrollOffset = Math.roundTo(Number(desiredHeight.replace(/px/, '')) * scrollOffsetFactor / lineHeight, 0);

			}

		}

		// $.each(this.widgetDom, (setIndex, setItem) => {
        //
		// 	const that1 = that;
        //
		// 	let containerElement = null;
		// 	let containerHeight = null;
		// 	let marginSpacing = 0;
		// 	let panelSpacing = 0;
        //
		// 	$.each(setItem, (panelIndex, panelItem) => {
        //
		// 		if (!panelIndex) {  // If panelItem is the container element
        //
		// 			containerElement = `#${that1.id}${panelItem}`;
		// 			containerHeight = $(containerElement).height();
        //
		// 			return true;
        //
		// 		}
        //
		// 		const $element = $(`${containerElement}${panelItem}`);
		// 		marginSpacing += Number($element.css('margin-top').replace(/px/g, ''));
        //
		// 		if (panelIndex === setItem.length - 1) {  // Last element in array
        //
		// 			marginSpacing += Number($element.css('margin-bottom').replace(/px/g, ''));
		// 			const panelHeight = `${containerHeight - (marginSpacing + panelSpacing)}px`;
		// 			const elementHeight = $element.css('height');
        //
		// 			if (elementHeight !== panelHeight)
		// 				$element.css({ height: panelHeight });
        //
		// 			if (elementHeight !== panelHeight && panelItem === ' .gcode-view-panel') {
        //
		// 				const { scrollOffsetFactor } = that1;
		// 				const lineHeight = 18.5;
		// 				that1.gcodeLineScrollOffset = Math.roundTo(Number(panelHeight.replace(/px/, '')) * scrollOffsetFactor / lineHeight, 0);
        //
		// 			}
        //
		// 		} else {  // If this is not the last element in the array, read the element's height.
        //
		// 			panelSpacing += Number($element.css('height').replace(/px/, ''));
        //
		// 		}
        //
		// 	});
        //
		// });

		// Adjust size of the load file modal
		const $modal = $('.gcode-view-panel .gcode-modal');
		const $gcodePanelBody = $('.gcode-view-panel .panel-body');

		$modal.css({ height: $gcodePanelBody.css('height') });
		$modal.css({ width: $gcodePanelBody.css('width') });

		// this.gcodeScrollToId(activeId);  // Scroll gcode file to active gcode line

		const $autoLevelPanel = $('.auto-level-panel');
		const $autoLevelPanelBody = $('.auto-level-panel .panel-body');
		const $autoLevelBtnHeader = $('.auto-level-panel .btn-header');
		const $autoLevelSettings = $('.auto-level-panel .settings-input');
		const settingsHeight = Number($autoLevelPanel.css('height').replace(/px/, '')) - Number($autoLevelPanelBody.css('padding-top').replace(/px/, '')) - Number($autoLevelBtnHeader.css('height').replace(/px/, ''));

		$autoLevelSettings.css({ height: settingsHeight });

		return true;

	},
	visibleWidget(wgtVisible, wgtHidden) {

		if (wgtVisible === this.id) {

			this.widgetVisible = true;
			this.resizeWidgetDom();

		} else if (wgtHidden === this.id) {

			this.widgetVisible = false;

		}

	}

})  /* arrow-function */
);	/* define */
