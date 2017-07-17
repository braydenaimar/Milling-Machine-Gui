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
	desc: 'A description of the program and how to contact developer about issues or bugs.',
	publish: {
		'/main/widget-loaded': ''
	},
	subscribe: {
		'/main/all-widgets-loaded': ''
	},

	widgetDom: [
		[ '.widget-container', ' .tool-panel', ' .gcode-view-panel' ],
		[ '.widget-container', ' .dro-panel', ' .feedrate-panel', ' .spindle-panel', ' .jog-panel', ' .auto-level-panel' ],
		[ ' .gcode-view-panel', ' .panel-heading', ' .panel-body' ],
		[ ' .gcode-view-panel .panel-body', ' .gcode-file-text' ]
	],
	widgetVisible: false,

	/**
	 *  Enables the use of zero indexing of line numbers.
	 *  @type {Boolean}
	 */
	zeroIndexLineNumber: false,

	fileName: '',
	fileGcode: [],      // Origional gcode lines parsed from the gcode file (array[strings])
	fileData: [],
	levelledGcode: [],	// GCode with autolevel applied to z values
	autolevelData: [],  // Probe data used to level the gcode file
	/**
	 *  Gcode lines loaded from file.
	 *  @type {Array}
	 */
	fileGcodeData: [],
	/**
	 *  The Id of the last gcode line to be buffered to the device.
	 *  @type {String}
	 */
	lastBufferedId: '',
	toolChange: [],
	toolChangeGcodeId: [],
	toolMeta: {},
	activeToolIndex: 0,
	startFromIndex: 0,

	FileName: '',
	Gcode: [],
	GcodeData: {},
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
	idMap: {},
	idToolChangeMap: {},

	pauseOnToolChange: true,
	/**
	 *  The maximum number of gcode lines to be sent to the connection-widget per packet.
	 *  @type {Number}
	 */
	maxGcodeBufferLength: 1000,
	/**
	 *  The delay between packets of gcode being sent to the connection-widget in milliseconds [ms].
	 *  @type {Number}
	 */
	gcodeBufferInterval: 500,

	activeIndex: 0,
	trackMode: 'on-complete',
	// trackMode: 'on-complete',
	// trackMode: 'status-report',
	$gcodeLog: $('#run-widget .gcode-view-panel .gcode-file-text'),
	gcodeLineScrollOffset: 6,
	scrollOffsetFactor: 0.4,
	maxUpdateGapFill: 30,
	activeLineClearDelay: 0,

	minLineNumberDigits: 3,

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

		console.group(`${this.name}.initBody()`);

		subscribe('/main/window-resize', this, this.resizeWidgetDom.bind(this));
		subscribe('/main/widget-visible', this, this.visibleWidget.bind(this));

		subscribe('/connection-widget/recvPortList', this, this.onPortList.bind(this));  // Used to set mainDevicePort { PortList, PortMeta, Diffs, OpenPorts, OpenLogs }
		subscribe('/connection-widget/recvPortData', this, this.onPortData.bind(this));

		subscribe('gcode-data/file-loaded', this, this.fileLoaded.bind(this));  // Receive gcode lines when a gcode file is loaded { FileName, Data }
		subscribe('probe-data/auto-level', this, this.onAutoLevel.bind(this));  // Receive auto-level data [ { x, y, z }, { x, y, z }, ..., { x, y, z } ]
		subscribe('gcode-buffer/control', this, this.gcodeBufferControl.bind(this));

		subscribe('connection-widget/queue-count', this, this.onQueueCount.bind(this));  // Receive updates for the queue count
		subscribe('connection-widget/message-status', this, this.onMessageStatus.bind(this));
		subscribe('run-widget/update-spindle', this, this.machine.updateSpindle.bind(this.machine));

		Mousetrap.bind('ctrl+o', this.keyboardShortcuts.bind(this, 'ctrl+o'));  // Launch file open dialog

		this.loadSettings();
		this.initClickEvents();

		publish('/main/widget-loaded', this.id);

		return true;

	},
	loadSettings() {

		const { position, $axisValue } = this.machine;
		const keys = Object.keys(position);

		for (let i = 0; i < keys.length; i++)
			$axisValue[keys[i]].html(this.machine.buildValueHTML(0));

	},
	initClickEvents() {

		const { id } = this;

		$(`#${id} .gcode-view-panel .btn-group`).on('click', 'span.btn', (evt) => {  // GCode Run panel buttons

			const { id } = this;
			const evtSignal = $(evt.currentTarget).attr('evt-signal');
			const evtData = $(evt.currentTarget).attr('evt-data');

			if (evtSignal === 'hide-body') {  // Hide panel body

				$(`#${id} .${evtData} .panel-body`).addClass('hidden');
				$(evt.currentTarget).find('span').removeClass('glyphicon-chevron-up').addClass('glyphicon-chevron-down');
				$(evt.currentTarget).attr('evt-signal', 'show-body');

				this.resizeWidgetDom();

			} else if (evtSignal === 'show-body') {  // Show panel body

				$(`#${id} .${evtData} .panel-body`).removeClass('hidden');
				$(evt.currentTarget).find('span').removeClass('glyphicon-chevron-down').addClass('glyphicon-chevron-up');
				$(evt.currentTarget).attr('evt-signal', 'hide-body');

				this.resizeWidgetDom();

			} else if (evtData === 'play') {  // Send gcode to be buffered to the SPJS

				disableConsole();  // Disable the console log to prevent program from crashing

				// publish('/main/make-widget-visible', 'connection-widget');
				this.bufferGcode({ StartIndex: this.startFromIndex });

			} else if (evtSignal === 'gcode-buffer/control' && (evtData === 'pause' || evtData === 'resume')) {

				publish(evtSignal, evtData);

			} else if (evtSignal === 'gcode-buffer/control' && evtData === 'stop') {

				publish(evtSignal, evtData);

				setTimeout(() => {

					this.reloadFile();

				}, 3500);

			} else if (evtData === 'reload-gcode') {

				this.reloadFile();
				// this.fileLoaded({ FileName, Gcode, GcodeData, ToolMeta, ToolChange });

			} else if (evtData === 'open-file') {

				this.fileOpenDialog();

			}

		});

		$(`#${this.id} .tool-panel .btn-group`).on('click', 'span.btn', (evt) => {  // Tool Change panel buttons

			const { id, GcodeData, activeIndex, ToolChange, idToolChangeMap } = this;
			const evtSignal = $(evt.currentTarget).attr('evt-signal');
			const evtData = $(evt.currentTarget).attr('evt-data');

			if (evtSignal === 'hide-body') {  // Hide panel body

				$(`#${id} .${evtData} .panel-body`).addClass('hidden');
				$(evt.currentTarget).find('span').removeClass('glyphicon-chevron-up').addClass('glyphicon-chevron-down');
				$(evt.currentTarget).attr('evt-signal', 'show-body');

				this.resizeWidgetDom();

			} else if (evtSignal === 'show-body') {  // Show panel body

				$(`#${id} .${evtData} .panel-body`).removeClass('hidden');
				$(evt.currentTarget).find('span').removeClass('glyphicon-chevron-down').addClass('glyphicon-chevron-up');
				$(evt.currentTarget).attr('evt-signal', 'hide-body');

				this.resizeWidgetDom();

			} else if (evtData === 'complete') {  // Tool change complete

				// this.toolChangeComplete(GcodeData.Id[activeIndex]);
				const tcIndex = idToolChangeMap[GcodeData.Id[activeIndex]];

				if (typeof tcIndex == 'undefined' || typeof ToolChange[tcIndex] == 'undefined')  // If the tcIndex argument is invalid
					return false;

				const StartIndex = ToolChange[tcIndex].Index;
				this.bufferGcode({ StartIndex });

			}

		});

		$(`#${id} .tool-panel .panel-body`).on('click', 'div.tool-item', (evt) => {  // Tool item select

			const gcodeLineId = `gc${evt.currentTarget.firstChild.innerText.match(/N[0-9]+/i)[0]}`;

			const gcodeLine = document.getElementById(`run-widget/${gcodeLineId}`);
			gcodeLine && gcodeLine.scrollIntoView();

			return false;

		});

		$(`#${id} .jog-panel`).on('click', 'span.btn', (evt) => {  // Jog panel

			const { id } = this;
			const evtSignal = $(evt.currentTarget).attr('evt-signal');
			const evtData = $(evt.currentTarget).attr('evt-data');

			if (evtSignal === 'hide-body') {  // Hide panel body

				$(`#${id} .${evtData} .panel-body`).addClass('hidden');
				$(evt.currentTarget).find('span').removeClass('glyphicon-chevron-up').addClass('glyphicon-chevron-down');
				$(evt.currentTarget).attr('evt-signal', 'show-body');

				this.resizeWidgetDom();

			} else if (evtSignal === 'show-body') {  // Show panel body

				$(`#${id} .${evtData} .panel-body`).removeClass('hidden');
				$(evt.currentTarget).find('span').removeClass('glyphicon-chevron-down').addClass('glyphicon-chevron-up');
				$(evt.currentTarget).attr('evt-signal', 'hide-body');

				this.resizeWidgetDom();

			} else if (evtSignal === 'probe') {  // Send gcode to be buffered to the SPJS

				this.probe.begin();

			} else if (evtSignal === 'jog') {

				this.jogMachine(evtData);

			}

		});

		$(`#${id} .auto-level-panel`).on('click', 'span.btn', (evt) => {

			const { id } = this;
			const { evtSignal, evtData } = this.getBtnEvtData(evt);

			if (evtData === 'start') {

				this.probe.begin();

			} else if (evtData === 'pause') {



			} else if (evtData === 'stop') {



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

		if (this.lastOpenFileDialogTime && Date.now() - this.lastOpenFileDialogTime < 1000)
			return;

		this.lastOpenFileDialogTime = Date.now();

		const openOptions = {
			title: 'Open a File',
			filters: [
				{ name: 'GCode', extensions: [ 'nc' ] },
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
	fileLoaded({ FileName, Gcode, GcodeData, ToolMeta, ToolChange }) {  // Called when a file gets loaded from the Load Widget

		if (FileName === '')  // If the file data is invalid
			return debug.error('The file data is invalid.');

		this.FileName = FileName;
		this.Gcode = Gcode;
		this.GcodeData = GcodeData;
		this.ToolMeta = ToolMeta;
		this.ToolChange = ToolChange;
		this.trackMode = 'on-complete';

		const idMap = {};
		const idToolChangeMap = {};
		let gcodeHTML = '';
		let tcSum = 0;

		const { id, zeroIndexLineNumber, minLineNumberDigits } = this;

		for (let i = 0; i < Gcode.length; i++) {  // Build the gcode DOM

			const lineNumber = zeroIndexLineNumber ? i : i + 1;
			const prefixZeros = ((lineNumber).toString().length > minLineNumberDigits) ? 0 : minLineNumberDigits - (lineNumber).toString().length;
			const domLineNumber = `${'0'.repeat(prefixZeros)}${lineNumber}`;

			const line = GcodeData.Gcode[i];
			const id = GcodeData.Id[i];
			const desc = GcodeData.Desc[i];

			idMap[id] = i;

			if (desc.includes('tool-change'))  // If the line is a tool change command
				idToolChangeMap[GcodeData.Id[i - 1]] = tcSum++;

			gcodeHTML += `<div  id="run-widget/${id}" class="${id}" gcode-index="${i}">`;
			gcodeHTML += `<span class="line-number text-muted">${domLineNumber}</span>`;

			if (desc.includes('comment'))  // If the line is a comment
				gcodeHTML += `<samp class="gcode text-nowrap text-muted">${line}</samp>`;  // Mute text

			else if (desc.includes('tool-change'))  // If the line is not a comment
				gcodeHTML += `<samp class="gcode text-nowrap text-info">${line}</samp>`;  // Hilite text

			else  // If the line is not a comment or a tool change command
				gcodeHTML += `<samp class="gcode text-nowrap text-default">${line}</samp>`;

			gcodeHTML += '</div>';

		}

		this.updateToolChange();
		this.activeId = GcodeData.Id[0];
		this.idMap = idMap;
		this.idToolChangeMap = idToolChangeMap;

		const [ globalPath, localFileName ] = FileName.match(/([^\\]+)\.[a-zA-Z0-9]+$/i);

		$(`#${id} .gcode-view-panel .gcode-file-name`).text(localFileName);
		$(`#${id} .gcode-view-panel .gcode-file-text`).html(gcodeHTML);  // Add the gcode file to the file text panel

		const [ gcodeLineId ] = GcodeData.Id;
		const element = document.getElementById(`run-widget/${gcodeLineId}`);
		element && element.scrollIntoView();

		// $('#run-widget .gcode-file-panel .gcode-file-text').scrollTop(0);

		// this.plotData(Data);
		this.resizeWidgetDom();

	},
	plotData(data) {

		const trace1 = {
			x: data.x,
			y: data.y,
			z: data.z,
			mode: 'lines',
			marker: {
				color: '#9467bd',
				size: 12,
				symbol: 'circle',
				line: {
					color: 'rgb(0,0,0)',
					width: 0
				}
			},
			line: {
				color: 'rgb(44, 160, 44)',
				width: 2
			},
			type: 'scatter3d'
		};

		const plotData = [ trace1 ];

		const layout = {
			// title: 'GCode Toolpath',
			autosize: false,
			showlegend: false,
			width: 400,
			height: 350,
			margin: {
				l: 20,
				r: 20,
				b: 10,
				t: 5
			}
		};

		Plotly.newPlot('run-widget-gcode-plot', plotData, layout);

	},
	reloadFile() {

		const { FileName, Gcode, GcodeData, ToolMeta, ToolChange } = this;

		if (!FileName)  // If no file is loaded
			return false;

		this.fileLoaded({ FileName, Gcode, GcodeData, ToolMeta, ToolChange });

	},

	bufferGcode({ StartIndex = 0 }) {

		const { mainDevicePort: port, Gcode, GcodeData, pauseOnToolChange, maxGcodeBufferLength, gcodeBufferInterval } = this;
		let bufferData = [];

		if (!port || !Gcode.length)  // If no port or gcode file is open
			return false;

		for (let i = StartIndex; i < Gcode.length; i++) {

			const line = GcodeData.Gcode[i];
			const id = GcodeData.Id[i];
			const desc = GcodeData.Desc[i];

			if (bufferData.length && pauseOnToolChange && desc.includes('tool-change'))  // If the line is a tool change command
				break;

			const dataItem = {
				Msg: line,
				Id: id
			};
			bufferData = [ ...bufferData, dataItem ];

		}

		const lastId = bufferData[bufferData.length - 1].Id;
		this.lastBufferedId = lastId;

		publish('connection-widget/port-sendbuffered', port, { Data: bufferData });  // Send gcode data to be buffered to the SPJS

	},
	gcodeBufferControl(data) {

		if (data === 'auto-paused') {  // If buffering gcode to the SPJS was automatically paused by the connection widget

			$(`#${this.id} .gcode-view-panel .auto-gcode-paused`).removeClass('text-muted', 'btn-default');
			$(`#${this.id} .gcode-view-panel .auto-gcode-paused`).addClass('btn-warning');

		} else if (data === 'auto-resumed') {  // If buffering gcode to the SPJS was automatically resumed by the connection widget

			$(`#${this.id} .gcode-view-panel .auto-gcode-paused`).addClass('text-muted', 'btn-default');
			$(`#${this.id} .gcode-view-panel .auto-gcode-paused`).removeClass('btn-warning');

		} else if (data === 'user-paused') {  // If buffering gcode to the SPJS was manually paused

			$(`#${this.id} .gcode-view-panel .gcode-pause-btn`).attr('evt-data', 'resume');
			$(`#${this.id} .gcode-view-panel .gcode-pause-btn`).addClass('text-muted');
			$(`#${this.id} .gcode-view-panel .gcode-pause-btn`).removeClass('btn-default');

		} else if (data === 'user-resumed') {  // If buffering gcode to the SPJS was manually resumed

			$(`#${this.id} .gcode-view-panel .gcode-pause-btn`).attr('evt-data', 'pause');
			$(`#${this.id} .gcode-view-panel .gcode-pause-btn`).addClass('btn-default');
			$(`#${this.id} .gcode-view-panel .gcode-pause-btn`).removeClass('text-muted');

		}

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

			machine.updateUnit('--');
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
	onPortData(port, { Msg, Data }) {  // The recvPortData method receives port data from devices on the SPJS

		debug.log(`Got data from '${port}':\nLine: ${Msg}\nData: ${Data}\nData:`, Data);

		if (typeof Data == 'undefined' || !Data)  // If the data argument is invalid
			return debug.error('The data argument is invalid.');

		if (Data.sr)  // If a status report was received
			this.onStatusReport(Data.sr);

		if (Data.r && Data.r.sr)  // If a status report was received
			this.onStatusReport(Data.r.sr);

		// if (Data.r && Data.r.n)  // If a line number was received
		// 	this.onStatusReport({ line: Data.r.n });

		if (Data.r && Data.r.prb)  // If a probe finished message (eg. '{"r":{"prb":{"e":1,"x":0.000,"y":0.000,"z":-0.511,"a":0.000,"b":0.000,"c":0.000}},"f":[1,0,0,4931]}')
			this.probe.onReply(Data);

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

		if (trackMode === 'on-complete' && typeof index != 'undefined' && index < Gcode.length - 1 && GcodeData.Desc[index + 1].includes('tool-change'))  // If the next line is a tool change
			this.toolChangeActive(Id);

	},
	onStatusReport(sr) {

		const { trackMode, machine, idMap, Gcode, GcodeData } = this;
		const { line, posx, posy, posz, vel, unit, stat, feed, coor, momo, plan, path, dist, mpox, mpoy, mpoz } = sr;

		if (typeof line != 'undefined' && (typeof stat == 'undefined' || stat !== 5)) {  // If received a line number and status is not error

			const id = `gcN${line}`;
			const index = idMap[id];

			if (typeof index != 'undefined') {  // If the id is in the gcode file

				const desc = GcodeData.Desc[index];

				if (trackMode === 'on-complete')
					this.trackMode = 'status-report';

				this.updateGcodeTracker(id);  // Update the active line in the gcode viewer panel

				if (index < Gcode.length - 1 && GcodeData.Desc[index + 1].includes('tool-change'))  // If the next line is a tool change
					this.toolChangeActive(id);

			}

		}

		if (typeof feed != 'undefined')  // Feedrate
			machine.feedrate = feed;

		if (typeof vel != 'undefined')  // Machine velocity
			machine.updateVelocity(vel);

		if (typeof posx != 'undefined')  // X axis position
			machine.updatePosition({ x: posx });

		if (typeof posy != 'undefined')  // Y axis position
			machine.updatePosition({ y: posy });

		if (typeof posz != 'undefined')  // Z axis position
			machine.updatePosition({ z: posz });

		if (typeof unit != 'undefined')  // Got units information
			machine.updateUnit(unit ? 'mm' : 'inch');  // Update the unit

	},

	updateGcodeTracker(id, scroll = true) {

		const { Gcode, GcodeData, idMap } = this;
		const { activeId, activeIndex, fileGcodeData, $gcodeLog, gcodeLineScrollOffset, lastBufferedId, activeLineClearDelay } = this;
		const $activeElement = $(`#run-widget .gcode-view-panel .${id}`);
		let activeIdNext = '';

		if (typeof id == 'undefined' || (typeof lastBufferedId == 'undefined' && Number(lastBufferedId.match(/[0-9]+/)[0]) - Number(id.match(/[0-9]+/)[0]) < 0))
			return false;

		if (id === activeId)
			return false;

		const lineIndex = idMap[id];
		const gcodeLine = GcodeData.Gcode[lineIndex];
		const gcodeDesc = GcodeData.Desc[lineIndex];

		if (scroll) {

			let scrollId = GcodeData.Id[0];

			if (lineIndex > gcodeLineScrollOffset)
				scrollId = GcodeData.Id[lineIndex - gcodeLineScrollOffset];

			const element = document.getElementById(`run-widget/${scrollId}`);
			element && element.scrollIntoView({ block: "start", behavior: "smooth" });  // Scroll the active gcode line into view

		}

		if (activeId && idMap[activeId] < lineIndex - 1)
			this.updateGcodeTracker(GcodeData.Id[lineIndex - 1], false);
			// this.fillTrackerUpdateGap({ Id: GcodeData.Id[idMap[activeId] + 1], LastId: id });

		if (/S[0-9]+/i.test(gcodeLine))  // Spindle rpm
			publish('run-widget/update-spindle', { rpm: Number(gcodeLine.match(/S([0-9]+)/i)[1]) });

		if (/M3/i.test(gcodeLine) && !/M[0-9]{2,}/i.test(gcodeLine))  // Spindle on clockwise rotation
			publish('run-widget/update-spindle', { dir: 'cw' });

		if (/M4/i.test(gcodeLine) && !/M[0-9]{2,}/i.test(gcodeLine))  // Spindle on counter-clockwise rotation
			publish('run-widget/update-spindle', { dir: 'ccw' });

		if ((/(M0|M1|M2|M5)/i.test(gcodeLine) && !/M[0-9]{2,}/i.test(gcodeLine)) || /M30/i.test(gcodeLine))  // Spindle off or program end
			publish('run-widget/update-spindle', { dir: 'off' });

		if (gcodeDesc.includes('tool-change') && lineIndex)
			this.toolChangeComplete(GcodeData.Id[lineIndex - 1]);

		this.gcodeTrackerActive({ ActiveId: id, SuccessId: this.activeId });

		this.activeId = id;
		this.activeIndex = idMap[id];

		if (id === GcodeData.Id[Gcode.length - 1] && activeLineClearDelay) {  // If this is the last line in the gcode file

			setTimeout(() => {

				this.updateGcodeTracker();

			}, activeLineClearDelay);

		} else if (id === GcodeData.Id[Gcode.length - 1]) {

			setTimeout(() => {

				this.reloadFile();

			}, 3500);

		}

	},
	gcodeTrackerActive({ ActiveId, SuccessId }) {

		const { GcodeData, idMap } = this;

		if (typeof ActiveId != 'undefined' && typeof idMap[ActiveId] != 'undefined') {

			const $line = $(`#run-widget .gcode-view-panel .${ActiveId}`);
			$line.addClass('bg-primary');  // Hilite the active gcode line
			$line.removeClass('bg-default bg-success');

		}

		if (typeof SuccessId != 'undefined' && typeof idMap[SuccessId] != 'undefined') {

			const gcodeLine = GcodeData.Gcode[idMap[SuccessId]];
			const $line = $(`#run-widget .gcode-view-panel .${SuccessId}`);

			$line.addClass('bg-success');
			$line.removeClass('bg-default bg-primary');

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

	},
	toolChangeActive(id) {

		const { ToolChange, idToolChangeMap, pauseOnToolChange } = this;
		const tcIndex = idToolChangeMap[id];

		if (typeof tcIndex == 'undefined' || typeof ToolChange[tcIndex] == 'undefined')  // If the tcIndex argument is invalid
			return false;

		this.activeToolIndex = tcIndex;
		// this.ToolChange[tcIndex].Status = 'active';
		$(`#run-widget .tool-panel .panel-body .item-${tcIndex}`).addClass('btn-primary');  // Hilite the tool as active

		if (pauseOnToolChange)
			$('#run-widget .tool-panel .panel-heading .complete-btn').removeClass('hidden');  // Show the complete button

		else
			this.toolChangeComplete(tcIndex);

	},
	toolChangeComplete(id) {

		const { ToolChange, idToolChangeMap } = this;
		const tcIndex = idToolChangeMap[id];

		if (typeof tcIndex == 'undefined' || typeof ToolChange[tcIndex] == 'undefined')  // If the tcIndex argument is invalid
			return false;

		// this.ToolChange[tcIndex].Status = 'complete';
		$(`#run-widget .tool-panel .panel-body .item-${tcIndex}`).addClass('btn-success');  // Hilite the tool as complete
		$(`#run-widget .tool-panel .panel-body .item-${tcIndex}`).removeClass('btn-primary');

		$('#run-widget .tool-panel .panel-heading .complete-btn').addClass('hidden');  // Hide the complete button

	},

	jogStep: 1,
	jogMode: 'step',

	jogMachine(dir) {

		const { mainDevicePort: port, jogStep, jogMode } = this;

		if (jogMode === 'step') {

			const axis = dir.match(/x|y|z/i)[0];
			const neg = /neg/.test(dir) ? '-' : '';

			const msg = [
				'G91',  // Set incremental motion mode
				`G0 ${axis.toUpperCase()}${neg}${Math.roundTo(jogStep, 4)}`,  // Move by set amount
				'G90'  // Set absolute motion mode
			];

			publish('/connection-widget/port-sendjson', port, { Msg: msg, IdPrefix: 'jog' });

		} else if (jogMode === 'continuous' && dir === 'stop') {

			publish('/connection-widget/port-feedstop', port);

		}

	},

	probe: {

		port: '',
		maxStepSpacing: 45,
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
			{
				probeHeight: 1,
				feedrate: 20,
				maxNegative: -10
			}
			// {
			// 	probeHeight: 0.5,
			// 	feedrate: 20,
			// 	maxNegative: -2
			// }
		],
		zOffset: 0,
		scanWithXAxis: true,

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

		calcProbePositions() {

			let { probePositions } = this;
			const { maxStepSpacing, startPoint, endPoint, scanWithXAxis } = this;

			const xSteps = Math.ceil(Math.abs(endPoint.x - startPoint.x) / maxStepSpacing);
			const ySteps = Math.ceil(Math.abs(endPoint.y - startPoint.y) / maxStepSpacing);

			probePositions = [];

			if (scanWithXAxis) {  // Scan in the x axis

				for (let iY = 0; iY <= ySteps; iY++) {

					let y = Math.roundTo(startPoint.y + (Math.abs(endPoint.y - startPoint.y) * iY / ySteps), 3);

					for (let iX = 0; iX <= xSteps; iX++) {

						let x = Math.roundTo(startPoint.x + (Math.abs(endPoint.x - startPoint.x) * iX / xSteps), 3);
						const probePos = { x: x, y: y };

						probePositions = [ ...probePositions, probePos ];

					}

				}

			} else {  // Scan in the y axis

				for (let iX = 1; iX <= xSteps; iX++) {

					let x = Math.roundTo(Math.abs(endPoint.x - startPoint.x) * iX / xSteps, 3);

					for (let iY = 1; iY <= ySteps; iY++) {

						let y = Math.roundTo(Math.abs(endPoint.y - startPoint.y) * iY / ySteps, 3);
						const probePos = { x: x, y: y };

						probePositions = [ ...probePositions, probePos ];

					}

				}

			}

			this.probePositions = probePositions;

			debug.log(`Probe Positions:\n${CSON.stringify(probePositions)}`);

		},
		begin() {

			const { port, startPoint, endPoint, clearanceHeight, probe, zOffset, status } = this;

			if (!port)  // If not connected to a port
				return false;

			this.probeData = [];
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

			publish('/connection-widget/port-sendjson', port, { Msg: msg, IdPrefix: 'probeCycle' });  // Send the commands to the controller

		},
		onReply(Data) {  // Receives probe data messages from controller

			// Ex. '{"r":{"prb":{"e":1,"x":0.000,"y":0.000,"z":-0.511,"a":0.000,"b":0.000,"c":0.000}},"f":[1,0,0,4931]}'

			let { probeData } = this;
			const { port, startPoint, clearanceHeight, probe, zOffset, status, probePositions, machPosition } = this;

			let e = '';
			let x = '';
			let y = '';
			let z = '';

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

			if (!e)  // If probe failed
				debug.warn('Probe not successful.');

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

			if (matchCount >= probe.length) {  // Prevent sending next probe command on every probe reply if there are probe repetitions

				const msg = [
					`G0 Z${clearanceHeight}`,
					'(Probe Cycle Complete)'
				];

				publish('/connection-widget/port-sendjson', port, { Msg: msg, IdPrefix: 'probeCycle' });  // Send the commands to the controller
				return false;

			}

			let replyIndex = 0;

			for (let i = 0; i < probePositions.length; i++) {  // Find current position in the list of probe positions

				const probeItem = probePositions[i];

				if (probeItem.x === x && probeItem.y === y) {

					replyIndex = i;
					break;

				}

			}

			if (replyIndex + 1 >= probePositions.length)  // If got a reply for the final probe position
				return this.exportProbeData();

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

			publish('/connection-widget/port-sendjson', port, { Msg: msg, IdPrefix: 'probeCycle' });  // Send the commands to the controller

		},
		exportProbeData() {

			const { port, startPoint, clearanceHeight, probe, zOffset, status, probePositions } = this;
			let { probeData } = this;

			probeData = probeData.filter((item, i, arr) => {  // Remove duplicate points

				if (i === arr.length - 1)  // If the last element of the array
					return true;  // Include the item in the filtered array

				if (item.x === arr[i + 1].x && item.y === arr[i + 1].y)  // If this item has the same position as the following element in the array
					return false;  // Remove the item from the array

				else
					return true;

			});
			this.probeData = probeData;

			if (probeData.length === 1)  // If the data is a single probe point
				return false;

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
		spindleMin: 6000,
		/**
		 *  Maximum spindle speed [rpm].
		 *  @type {Number}
		 */
		spindleMax: 24000,
		/**
		 *  How many digits should be shown before the decimal place by default.
		 *  @type {Number}
		 */
		intGrayDigits: 3,
		/**
		 *  the minimum number of decimal places to show in the DRO.
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

			// if ((typeof velocity == 'undefined' || velocity === 0) && vel > 0) {  // If moving
			//
			// 	$('#run-widget .feedrate-progress-bar').addClass('progress-bar-success');
			// 	$('#run-widget .feedrate-progress-bar').removeClass('progress-bar-danger progress-bar-warning');
			//
			// }

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
	interpolateProbeValue(probeData, pos) {

		const { x: xPos, y: yPos } = pos;
		const closest = {  // Stores the probe data index of the four closest probe points around the given position
			x: {
				min: -Infinity,
				max: Infinity,
				minIndex: 0,
				maxIndex: 0
			},
			y: {
				min: -Infinity,
				max: Infinity,
				minIndex: 0,
				maxIndex: 0
			}
		};

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

		if (botRight.x - botLeft.x === 0)
			return false;

		if (topRight.x - topLeft.x === 0)
			return false;

		if (topLeft.y - botLeft.y === 0)
			return false;

		const botAvg = (botLeft.z * (botRight.x - xPos) / (botRight.x - botLeft.x)) + (botRight.z * (xPos - botLeft.x) / (botRight.x - botLeft.x));
		const topAvg = (topLeft.z * (topRight.x - xPos) / (topRight.x - topLeft.x)) + (topRight.z * (xPos - topLeft.x) / (topRight.x - topLeft.x));
		const avg = (botAvg * (topLeft.y - yPos) / (topLeft.y - botLeft.y)) + (topAvg * (yPos - botLeft.y) / (topLeft.y - botLeft.y));

		return avg;

	},
	onAutoLevel(probeData) {

		const { FileName, Gcode: lines, GcodeData: data, ToolMeta, ToolChange } = this;

		if (typeof lines == 'undefined' || !lines.length)  // If no gcode file has been loaded
			return false;

		// probeData = this.probe.probeData;

		this.autolevelData = probeData;
		this.probe.appliedAutoLevelData = probeData;

		for (let i = 0; i < lines.length; i++) {  // Apply auto level data to gcode file

			const line = lines[i];
			// let xyFlag = false;

			const [ x, y, z ] = [ data.x[i], data.y[i], data.z[i] ];

			if (/G28/i.test(line))
				continue;

			if (/z[-.0-9]+/i.test(line)) {  // Replace z commands

				const adjustVal = this.interpolateProbeValue(probeData, { x, y, z });

				if (adjustVal) {

					lines[i] = line.replace(/z[-.0-9]+/i, `Z${Math.roundTo(z + adjustVal, 4)}`);
					data.Gcode[i] = lines[i];
					data.z[i] = z + adjustVal;

				}

			} else if (/x[-.0-9]+/i.test(line) || /y[-.0-9]+/i.test(line)) {  // Add new z value

				const adjustVal = this.interpolateProbeValue(probeData, { x, y, z });

				if (adjustVal) {

					lines[i] = `${line} Z${Math.roundTo(z + adjustVal, 4)}`;
					data.Gcode[i] = lines[i];
					data.z[i] = z + adjustVal;

				}

			}

		}

		this.fileLoaded({ FileName, Gcode: lines, GcodeData: data, ToolMeta, ToolChange });

	},

	resizeWidgetDom() {

		if (!this.widgetVisible)  // If the widgte is not visible
			return false;

		const that = this;
		const { GcodeData, idMap, gcodeLineScrollOffset, activeId } = this;

		// TODO: Do the resize stuff like this: $(selector).attr(attribute,function(index,currentvalue))
		// index - Receives the index position of the element in the set.
		// currentvalue - Receives the current attribute value of the selected elements.
		// Put the .attr() function inside of a $.each() loop.

		$.each(this.widgetDom, (setIndex, setItem) => {

			const that1 = that;
			let containerElement = null;
			let containerHeight = null;
			let marginSpacing = 0;
			let panelSpacing = 0;

			$.each(setItem, (panelIndex, panelItem) => {

				if (!panelIndex) {  // If panelItem is the container element

					containerElement = `#${that1.id}${panelItem}`;
					containerHeight = $(containerElement).height();

					return true;

				}

				const $element = $(`${containerElement}${panelItem}`);
				marginSpacing += Number($element.css('margin-top').replace(/px/g, ''));

				if (panelIndex === setItem.length - 1) {  // Last element in array

					marginSpacing += Number($element.css('margin-bottom').replace(/px/g, ''));
					const panelHeight = `${containerHeight - (marginSpacing + panelSpacing)}px`;
					const elementHeight = $element.css('height');

					if (elementHeight !== panelHeight)
						$element.css({ height: panelHeight });

					if (elementHeight !== panelHeight && panelItem === ' .gcode-view-panel') {

						const { scrollOffsetFactor } = that1;
						const lineHeight = $element.find('div') ? $element.find('div').height() : 18.5;
						that1.gcodeLineScrollOffset = Math.roundTo(Number(panelHeight.replace(/px/, '')) * scrollOffsetFactor / lineHeight, 0);

					}

				} else {  // If this is not the last element in the array, read the element's height.

					panelSpacing += Number($element.css('height').replace(/px/, ''));

				}

			});

		});

		const $panelBody = $(`#${this.id} div.gcode-view-panel div.panel-body`);
		const divWidth = $panelBody.find('div').width();
		const panelWidth = $panelBody.width();

		if (activeId) {

			const lineIndex = idMap[activeId];

			if (typeof lineIndex != 'undefined') {

				let gcodeId = '';

				if (lineIndex > gcodeLineScrollOffset)
					gcodeId = GcodeData.Id[lineIndex - gcodeLineScrollOffset];

				else
					gcodeId = GcodeData.Id[0];

				const element = document.getElementById(`run-widget/${gcodeId}`);
					element && element.scrollIntoView({ block: "start", behavior: "smooth" });  // Scroll the active gcode line into view

			}

		}


		if (divWidth !== panelWidth)
			$panelBody.find('div').width(panelWidth);  // Set the width of the gcode file panel

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
