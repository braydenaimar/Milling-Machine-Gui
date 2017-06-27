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
		[ '.widget-container', ' .path-view-panel', ' .gcode-view-panel' ],
		[ '.widget-container', ' .dro-panel', ' .feedrate-panel', ' .spindle-panel', ' .vertical-probe-panel' ],
		[ ' .gcode-view-panel', ' .panel-heading', ' .panel-body' ],
		[ ' .gcode-view-panel .panel-body', ' .gcode-file-text' ]
	],
	widgetVisible: false,

	fileGcode: [],      // Origional gcode lines parsed from the gcode file (array[strings])
	levelledGcode: [],	// GCode with autolevel applied to z values
	autolevelData: [],  // Probe data used to level the gcode file

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

		$(`#${this.id} .gcode-view-panel .btn-group`).on('click', 'span.btn', (evt) => {  // GCode Run panel buttons

			const evtSignal = $(evt.currentTarget).attr('evt-signal');
			const evtData = $(evt.currentTarget).attr('evt-data');

			if (evtSignal === 'hide-body') {  // Hide panel body

				$(`#${this.id} .${evtData} .panel-body`).addClass('hidden');
				$(evt.currentTarget).find('span').removeClass('glyphicon-chevron-up').addClass('glyphicon-chevron-down');
				$(evt.currentTarget).attr('evt-signal', 'show-body');

				this.resizeWidgetDom();

			} else if (evtSignal === 'show-body') {  // Show panel body

				$(`#${this.id} .${evtData} .panel-body`).removeClass('hidden');
				$(evt.currentTarget).find('span').removeClass('glyphicon-chevron-down').addClass('glyphicon-chevron-up');
				$(evt.currentTarget).attr('evt-signal', 'hide-body');

				this.resizeWidgetDom();

			} else if (evtData === 'play') {  // Send gcode to be buffered to the SPJS

				disableConsole();  // Disable the console log to prevent program from crashing

				publish('/main/make-widget-visible', 'connection-widget');
				this.bufferGcode();

			} else if (evtSignal === 'gcode-buffer/control' && (evtData === 'pause' || evtData === 'resume' || evtData === 'stop')) {

				inDebugMode && enableConsole();  // Re-enable the console log for debugging

				console.log(`pressed ${evtData}`);
				publish(evtSignal, evtData);

			}

		});

		$(`#${this.id} .vertical-probe-panel .btn-group`).on('click', 'span.btn', (evt) => {  // Vertical probe panel buttons

			const evtSignal = $(evt.currentTarget).attr('evt-signal');
			const evtData = $(evt.currentTarget).attr('evt-data');

			if (evtSignal === 'hide-body') {  // Hide panel body

				$(`#${this.id} .${evtData} .panel-body`).addClass('hidden');
				$(evt.currentTarget).find('span').removeClass('glyphicon-chevron-up').addClass('glyphicon-chevron-down');
				$(evt.currentTarget).attr('evt-signal', 'show-body');

				this.resizeWidgetDom();

			} else if (evtSignal === 'show-body') {  // Show panel body

				$(`#${this.id} .${evtData} .panel-body`).removeClass('hidden');
				$(evt.currentTarget).find('span').removeClass('glyphicon-chevron-down').addClass('glyphicon-chevron-up');
				$(evt.currentTarget).attr('evt-signal', 'hide-body');

				this.resizeWidgetDom();

			} else if (evtData === 'play') {  // Send gcode to be buffered to the SPJS

				publish('/main/make-widget-visible', 'connection-widget');
				this.probe.begin();

			}

		});

	},

	fileLoaded({ FileName, Lines, Data }) {  // Called when a file gets loaded from the Load Widget

		this.fileGcodeData = Lines;  // Store the data globally

		let gcodeHTML = '';

		for (let i = 0; i < Lines.length; i++) {  // Build the gcode file text DOM

			const prefixZeros = ((i + 1).toString().length > this.minLineNumberDigits) ? 0 : this.minLineNumberDigits - (i + 1).toString().length;
			const domLineNumber = '0'.repeat(prefixZeros) + (i + 1);
			const line = Lines[i];

			if (/^N[0-9]+/i.test(line)) {  // If the line is numbered gcode

				const divClass = `gc${line.match(/N[0-9]+/i)[0]}`;
				gcodeHTML += `<div class="${divClass}">`;

			} else {

				gcodeHTML += `<div class="gc${i}">`;

			}

			gcodeHTML += `<span class="text-muted" style="font-size: 8px; margin-right: 19px; margin-left: 0px;">${domLineNumber}</span>`;

			if (/\(|\)/i.test(line))  // If the line is a comment
				gcodeHTML += `<samp class="text-nowrap text-muted">${line}</samp>`;
			else
				gcodeHTML += `<samp class="text-nowrap ${(/T[0-9]+/i.test(line)) ? 'text-info' : 'text-default'}">${line}</samp>`;  // Hilite text if it is a tool change command

			gcodeHTML += '</div>';

		}

		const [ globalPath, localFileName ] = FileName.match(/([^\\]+)\.[a-zA-Z0-9]+$/i);

		$(`#${this.id} .gcode-view-panel .gcode-file-name`).text(localFileName);
		$(`#${this.id} .gcode-view-panel .gcode-file-text`).html(gcodeHTML);  // Add the gcode file to the file text panel

		this.plotData(Data);
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

	onPortList(data) {

		const { PortList, PortMeta, Diffs, OpenPorts, OpenLogs } = data;

		console.log(`got port list data:\n${JSON.stringify(data)}`);

		if (OpenPorts && OpenPorts.length)  // If there are any open ports
			[ this.mainDevicePort ] = OpenPorts;  // Use the alphanumerically first port that is open as the main port

		else  // If there are no open ports
			this.mainDevicePort = '';

		this.probe.port = this.mainDevicePort;

	},
	onPortData(port, { Msg, Data }) {  // The recvPortData method receives port data from devices on the SPJS

		debug.log(`Got data from '${port}':\nLine: ${Msg}\nData: ${Data}\nData:`, Data);

		if (Data && Data.r && Data.r.prb)  // If a probe finished message (eg. '{"r":{"prb":{"e":1,"x":0.000,"y":0.000,"z":-0.511,"a":0.000,"b":0.000,"c":0.000}},"f":[1,0,0,4931]}')
			this.probe.onReply(Data);

		if (Data && Data.sr && typeof Data.sr.unit !== 'undefined') {  // Got units information

			const { unit: unitData } = Data.sr;
			const unit = unitData ? 'mm' : 'inch';

			this.machine.updateUnit(unit);  // Update the unit

		} else if (Data && Data.r && Data.r.sr && typeof Data.r.sr.unit !== 'undefined') {  // Got units information from a status report

			const { unit: unitData } = Data.r.sr;
			const unit = unitData ? 'mm' : 'inch';

			this.machine.updateUnit(unit);  // Update the unit

		}

		if (Data && Data.sr && typeof Data.sr.posx !== 'undefined')  // X axis position
			this.machine.updatePosition({ x: Data.sr.posx });

		else if (Data && Data.r && Data.r.sr && typeof Data.r.sr.posz !== 'undefined')  // X axis position
			this.machine.updatePosition({ x: Data.r.sr.posx });

		if (Data && Data.sr && typeof Data.sr.posy !== 'undefined')  // Y axis position
			this.machine.updatePosition({ y: Data.sr.posy });

		else if (Data && Data.r && Data.r.sr && typeof Data.r.sr.posy !== 'undefined')  // Y axis position
			this.machine.updatePosition({ y: Data.r.sr.posy });

		if (Data && Data.sr && typeof Data.sr.posz !== 'undefined')  // Z axis position
			this.machine.updatePosition({ z: Data.sr.posz });

		else if (Data && Data.r && Data.r.sr && typeof Data.r.sr.posz !== 'undefined')  // Z axis position
			this.machine.updatePosition({ z: Data.r.sr.posz });

	},
	onQueueCount(QCnt) {

		this.queueCount = QCnt;
		debug.log(`got queue count ${this.queueCount}`);

	},

	bufferGcode() {

		const { mainDevicePort: port, fileGcodeData, mainDevicePort } = this;

		if (!port || !fileGcodeData)
			return false;

		// Only buffer up to the first tool change command

		publish('connection-widget/port-sendbuffered', mainDevicePort, { Msg: fileGcodeData });  // Send gcode data to be buffered to the SPJS

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
				probeHeight: 0.5,
				feedrate: 10,
				maxNegative: -2
			}
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
		/**
		 *  How many digits should be shown before the decimal place by default.
		 *  @type {Number}
		 */
		intGrayDigits: 3,
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
			$('#run-widget .dro-panel .dro-units').text(this.unit);  // Update the unit in the DRO

		}

	},
	interpolateProbeValue(probeData, pos) {

		const { xPos, yPos } = pos;
		probeData = [
			{ x: 0, y: 0, z: 0 },
			{ x: 15, y: 0, z: 0.046 }
		]
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

		for (let i = 0; i < probeData.length; i++) {  // Find the four closest probe points around the given position

			const { x, y, z } = probeData[i];

			if (x <= xPos && x > closest.x.min)
				[ closest.x.min, closest.x.minIndex ] = [ x, i ];

			else if (x > xPos && x < closest.x.max)
				[ closest.x.max, closest.x.maxIndex ] = [ x, i ];

			if (y <= yPos && y > closest.y.min)
				[ closest.y.min, closest.y.minIndex ] = [ y, i ];

			else if (y > yPos && y < closest.y.max)
				[ closest.y.max, closest.y.maxIndex ] = [ y, i ];

		}

		if (closest.x.min === -Infinity || closest.x.max === Infinity || closest.y.min === -Infinity || closest.y.max === Infinity)  // If the position is outside of the probed area
			return;



	},
	onAutoLevel(probeData) {

		const { fileLoaded } = this;

		if (!fileLoaded.length)  // If no gcode file has been loaded
			return false;

		this.autolevelData = probeData;
		this.probe.appliedAutoLevelData = probeData;

		const pos = {
			x: 0,
			y: 0
		}

		for (let i = 0; i < fileLoaded.length; i++) {  // Apply auto level data to gcode file

			const line = fileLoaded[i];
			let xyzFlag = false;

			if (/x[-.0-9]+/i.test(line)) {

				const [ , val ] = line.match(/x([-.0-9]+)'/i);
				pos.x = Number(val);
				xyFlag = true;

			}

			if (/y[-.0-9]+/i.test(line)) {

				const [ , val ] = line.match(/y([-.0-9]+)'/i);
				pos.y = Number(val);
				xyFlag = true;

			}

			if (xyzFlag || /z[-.0-9]+/i.test(line)) {

				const newVal = this.interpolateProbeValue(probeData, pos);

				if (/z[-.0-9]+/i.test(line)) {

				} else {

				}

			}

		}

	},

	resizeWidgetDom() {

		if (!this.widgetVisible)  // If the widgte is not visible
			return false;

		const that = this;

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

				let elementItem = containerElement + panelItem;
				marginSpacing += Number($(elementItem).css('margin-top').replace(/px/g, ''));

				if (panelIndex === setItem.length - 1) {  // Last element in array

					marginSpacing += Number($(elementItem).css('margin-bottom').replace(/px/g, ''));
					let panelHeight = containerHeight - (marginSpacing + panelSpacing);

					$(elementItem).css({ height: `${panelHeight}px` });

				} else {  // If this is not the last element in the array, read the element's height.

					panelSpacing += Number($(elementItem).css('height').replace(/px/g, ''));

				}

			});

		});

		$(`#${this.id} div.gcode-view-panel div.panel-body div`).width($(`#${this.id} div.gcode-view-panel div.panel-body`).width() - 10);  // Set the width of the gcode file panel
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
