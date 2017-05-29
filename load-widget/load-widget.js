/**
 *   _                    _  __        ___     _            _         _                  ____            _       _
 *  | |    ___   __ _  __| | \ \      / (_) __| | __ _  ___| |_      | | __ ___   ____ _/ ___|  ___ _ __(_)_ __ | |_
 *  | |   / _ \ / _` |/ _` |  \ \ /\ / /| |/ _` |/ _` |/ _ \ __|  _  | |/ _` \ \ / / _` \___ \ / __| '__| | '_ \| __|
 *  | |__| (_) | (_| | (_| |   \ V  V / | | (_| | (_| |  __/ |_  | |_| | (_| |\ V / (_| |___) | (__| |  | | |_) | |_
 *  |_____\___/ \__,_|\__,_|    \_/\_/  |_|\__,_|\__, |\___|\__|  \___/ \__,_| \_/ \__,_|____/ \___|_|  |_| .__/ \__|
 *                                               |___/                                                    |_|
 *
 *  @author Brayden Aimar
 */

 /* eslint-disable no-console */

define([ 'jquery' ], $ => ({

	id: 'load-widget',
	name: 'Load GCode File',
	shortName: 'Load',
	btnTheme: 'default',
	icon: 'fa fa-envelope-open-o',
	// icon: 'material-icons open_in_browser',
	desc: 'User interface for loading Gcode files to be run by the machine.',
	publish: {},
	subscribe: {},
	foreignPublish: {
		'/main/widget-loaded': ''
	},
	foreignSubscribe: {
		'/main/all-widgets-loaded': ''
	},

	widgetDom: [ 'load-panel' ],
	widgetVisible: false,

	addLineNumbers: true,

	initBody() {

		console.group(`${this.name}.initBody()`);

		subscribe('/main/window-resize', this, this.resizeWidgetDom.bind(this));
		subscribe('/main/widget-visible', this, this.visibleWidget.bind(this));

		// subscribe('/connection-widget/recvPortList', this, this.recvPortList.bind(this));

		publish('/main/widget-loaded', this.id);

		// Open File Button.
		$(`#${this.id} .load-panel .panel-body`).on('click', 'span.btn', (evt) => {

			const evtData = $(evt.currentTarget).attr('evt-data');

			if (evtData === 'open-file') this.fileOpenDialog();       // Launch the file open dialog

		});

		subscribe('keyboard-shortcut', this, this.keyboardShortcuts);

		return true;

	},
	resizeWidgetDom() {

		/* eslint-disable prefer-const*/
		// If this widget is not visible, do not bother updating the DOM elements.
		if (!this.widgetVisible) return false;

		const that = this;

		let containerHeight = $(`#${this.id}`).height();
		let marginSpacing = 0;
		let panelSpacing = 0;

		for (let i = 0; i < this.widgetDom.length; i++) {

			let panel = that.widgetDom[i];
			let panelDom = $(`#${that.id} .${panel}`);

			marginSpacing += Number(panelDom.css('margin-top').replace(/px/g, ''));

			if (i === that.widgetDom.length - 1) {

				marginSpacing += Number(panelDom.css('margin-bottom').replace(/px/g, ''));

				let panelHeight = containerHeight - (marginSpacing + panelSpacing);

				panelDom.css({ height: `${panelHeight}px` });

			} else {

				panelSpacing += Number(panelDom.css('height').replace(/px/g, ''));

			}

		}

		/* eslint-enable prefer-const */
		return true;

	},
	visibleWidget(wgtVisible, wgtHidden) {

		if (wgtVisible === this.id) {

			this.widgetVisible = true;
			this.resizeWidgetDom();

		} else if (wgtHidden === this.id) {

			this.widgetVisible = false;

		}

	},
	keyboardShortcuts(data) {

		// If this widget is not visible, do not apply any keyboard shortcuts and abort this method.
		if (!this.widgetVisible) return false;

		if (data === 'ctrl+o') this.fileOpenDialog();  // Press Ctrl-o to open a file

		return true;

	},

	/**
	 *  Launches the system's file explorer for the user to select a file to open.
	 *
	 *  @method openFileDialog
	 *
	 *  @return {string}       the global file path selected by user
	 */
	fileOpenDialog() {

		if (this.lastOpenFileDialogTime && Date.now() - this.lastOpenFileDialogTime < 1000) return;
		this.lastOpenFileDialogTime = Date.now();

		const openOptions = {
			title: 'Open a File',
			filters: [
				{ name: 'GCode', extensions: [ 'nc' ] }
			],
			properties: [ 'openFile' ]
		};

		console.log('open dialog');

		// Launch the file explorer dialog.
		ipc.send('open-dialog', openOptions);

		// Callback for file explorer dialog.
		ipc.on('opened-file', (event, path) => {

			console.log(`Open path selected: ${path}`);

			// If a file was selected, parse the selected file.
			path && this.openFile(path);

		});

	},

	openFile(filePath) {

		if (this.lastParseFileTime && Date.now() - this.lastParseFileTime < 1000) return;
		this.lastParseFileTime = Date.now();

		console.log(typeof filePath);
		console.log(filePath);

		// Check that a valid file path was passed.
		if (!filePath) throw new Error('Invalid file path.');

		const [ fileName ] = filePath;

		$(`#${this.id} .file-data.file-name`).text(fileName);

		// const data = fs.readFileSync(filePath[0]).toString().split('\n');  // Read the gcode file

		// Asynchronous file read
		fs.readFile(fileName, (err, data) => {

			if (err) return console.error(err);  // If there was an error openning the file, abort the file read

			const lineData = data.toString().split('\n');

			$(`#${this.id} .file-data.file-lines`).text(`${lineData.length} lines`);

			console.groupCollapsed('File Data');
			console.log(lineData);
			console.groupEnd();

			return this.parseFile(fileName, lineData);

		});

	},

	parseFile(fileName, gcodeLines) {

		let gcodeLineNum = 0;
		let lineData = gcodeLines;
		const gcodeData = {
			x: [],
			y: [],
			z: [],
			lineIndex: []
		};

		for (let i = 0; i < lineData.length; i++) {  // Remove all carriage-return characters

			if (lineData[i].includes('\r')) lineData[i] = lineData[i].replace('\r', '');

			if (/F[0-9]+/i.test(lineData[i]) && inDebugMode) {

				const [ matchStr, matchNum ] = lineData[i].match(/F([0-9]+)/i);

				alert(`Crazy multiplier on feedrate: ${80}`);

				lineData[i] = lineData[i].replace(/F[0-9]+/i, `F${Number(matchNum) * 80}`);

			}

		}

		lineData = lineData.filter((value) => {

			if (/^%|^\n/i.test(value) || value === '' || value === '\n') {

				return false;

			}

			return true;

		});

		for (let i = 0; i < lineData.length; i++) {

			let line = lineData[i];

			if (this.addLineNumbers && line && line !== '' && line !== '\n' && line !== '\r' && line !== '\r\n' && line[0] !== '%' && line[0] !== '(' && line[0] !== 'N') {  // If a valid line of gcode and line number is not already added

				gcodeLineNum += 1;
				lineData[i] = `N${gcodeLineNum} ${line}`;  // Add line number to gcode line
				line = lineData[i];

			}

			if (/[xyz][-0-9.]+/i.test(line)) {

				gcodeData.x.push(0);
				gcodeData.y.push(0);
				gcodeData.z.push(0);
				gcodeData.lineIndex.push(i);

				if (gcodeData.x.length >= 2) {

					Object.keys(gcodeData).forEach((key) => {  // Set x, y, and z values to values from prev line by default

						if (key !== 'lineIndex') {

							const a = gcodeData[key].length - 1;
							const b = gcodeData[key].length - 2;

							gcodeData[key][a] = gcodeData[key][b];

						}

					});

				}

				const matchData = line.match(/[xyz][-0-9.]+/gi);
				// console.log(matchData);

				for (let j = 0; j < matchData.length; j++) {  // For each match found

					const axis = matchData[j].substr(0, 1).toLowerCase();
					const value = Number(matchData[j].substr(1));

					// console.log(`  ${axis.toUpperCase()} ${value}`);

					if (axis === 'z' && value > 0 && !gcodeData.z[0]) {

						for (let a = 0; a < gcodeData.z.length && !gcodeData.z[a]; a++) {

							gcodeData.z[a] = value;

						}

					}

					gcodeData[axis][gcodeData[axis].length - 1] = value;

				}

			}

		}

		console.log(gcodeData);
		this.plotData(gcodeData);

		for (let i = 0; i < gcodeData.z.length; i++) {

			const xVal = gcodeData.x[i];
			const yVal = gcodeData.y[i];
			const zVal = gcodeData.z[i];
			const lineIndex = gcodeData.lineIndex[i];
			const line = lineData[lineIndex];

			if (/x[-0-9.]+/i.test(line)) {

				lineData[lineIndex] = line.replace(/x[-0-9.]+/i, `X${xVal}`);

			}

			if (/y[-0-9.]+/i.test(line)) {

				lineData[lineIndex] = line.replace(/y[-0-9.]+/i, `Y${yVal}`);

			}

			if (/z[-0-9.]+/i.test(line)) {

				lineData[lineIndex] = line.replace(/z[-0-9.]+/i, `Z${zVal}`);

			}

		}

		console.log('gcode lines');
		console.log(lineData);

		publish('gcode-data/file-loaded', { FileName: fileName, Data: lineData });  // Publish the parsed gcode lines so that other widgets can use it

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
			width: 650,
			height: 650,
			margin: {
				l: 20,
				r: 20,
				b: 10,
				t: 5
			}
		};

		Plotly.newPlot('gcode-plot', plotData, layout);

	}

})  /* arrow-function */
);	/* define */
