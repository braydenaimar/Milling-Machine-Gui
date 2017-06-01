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


define([ 'jquery' ], $ => ({

	id: 'load-widget',
	name: 'Load GCode File',
	shortName: 'Load',
	btnTheme: 'default',
	icon: 'fa fa-envelope-open-o',
	// icon: 'material-icons open_in_browser',
	desc: 'User interface for loading Gcode files to be run by the machine.',
	publish: {
		'/main/widget-loaded': '',
		'gcode-data/file-loaded': ''
	},
	subscribe: {
		'/main/widget-resize': '',
		'/main/widget-visible': '',
		'/main/all-widgets-loaded': ''
	},

	widgetDom: [ 'load-panel' ],
	widgetVisible: false,

	addLineNumbers: true,

	initBody() {

		debug.group(`${this.name}.initBody()`);

		subscribe('/main/window-resize', this, this.resizeWidgetDom.bind(this));
		subscribe('/main/widget-visible', this, this.visibleWidget.bind(this));

		// subscribe('/connection-widget/recvPortList', this, this.recvPortList.bind(this));

		publish('/main/widget-loaded', this.id);

		$(`#${this.id} .load-panel .panel-body`).on('click', 'span.btn', (evt) => {  // Open File Button.

			const evtData = $(evt.currentTarget).attr('evt-data');

			if (evtData === 'open-file')  // Launch the file open dialog
				this.fileOpenDialog();

		});

		Mousetrap.bind('ctrl+o', this.keyboardShortcuts.bind(this, 'ctrl+o'));  // Launch file open dialog

		return true;

	},
	resizeWidgetDom() {

		if (!this.widgetVisible)  // If this widget is not visible
			return false;

		const { widgetDom, id } = this;

		const containerHeight = $(`#${id}`).height();
		let marginSpacing = 0;
		let panelSpacing = 0;

		for (let i = 0; i < widgetDom.length; i++) {

			const panel = widgetDom[i];
			const panelDom = $(`#${id} .${panel}`);

			marginSpacing += Number(panelDom.css('margin-top').replace(/px/g, ''));

			if (i === widgetDom.length - 1) {

				marginSpacing += Number(panelDom.css('margin-bottom').replace(/px/g, ''));
				panelDom.css({ height: `${containerHeight - (marginSpacing + panelSpacing)}px` });

			} else {

				panelSpacing += Number(panelDom.css('height').replace(/px/g, ''));

			}

		}

		return true;

	},
	visibleWidget(wgtVisible, wgtHidden) {

		const { id } = this;

		if (wgtVisible === id) {

			this.widgetVisible = true;
			this.resizeWidgetDom();

		} else if (wgtHidden === id) {

			this.widgetVisible = false;

		}

	},
	keyboardShortcuts(keys) {

		if (!this.widgetVisible)  // If this widget is not visible
			return false;

		if (typeof keys == 'undefined') {  // If the keys argument is invalid

			debug.error('The keys argument is invalid.');
			return false;

		}

		if (keys === 'ctrl+o')  // ctrl-o
			this.fileOpenDialog();  // Launch file open dialog

	},

	/**
	 *  Launches the system's file explorer for the user to select a file to open.
	 *  @method openFileDialog
	 *  @return {String}       the global file path selected by user
	 */
	fileOpenDialog() {

		if (this.lastOpenFileDialogTime && Date.now() - this.lastOpenFileDialogTime < 1000)
			return;

		this.lastOpenFileDialogTime = Date.now();

		const openOptions = {
			title: 'Open a File',
			filters: [
				{ name: 'GCode', extensions: [ 'nc' ] }
			],
			properties: [ 'openFile' ]
		};

		debug.log('open dialog');

		ipc.send('open-dialog', openOptions);  // Launch the file explorer dialog

		ipc.on('opened-file', (event, path) => {  // Callback for file explorer dialog

			debug.log(`Open path selected: ${path}`);
			path && this.openFile(path);  // If a file was selected, parse the selected file

		});

	},

	openFile(filePath) {

		if (this.lastParseFileTime && Date.now() - this.lastParseFileTime < 1000)
			return;

		this.lastParseFileTime = Date.now();

		if (!filePath)  // Check that a valid file path was passed
			return debug.error('Invalid file path.');

		const [ fileName ] = filePath;

		$(`#${this.id} .file-data.file-name`).text(fileName);

		// const data = fs.readFileSync(filePath[0]).toString().split('\n');  // Read the gcode file

		fs.readFile(fileName, (err, data) => {  // Asynchronous file read

			if (err)  // If there was an error openning the file
				return debug.error(err);

			const lineData = data.toString().split('\n');

			$(`#${this.id} .file-data.file-lines`).text(`${lineData.length} lines`);

			debug.groupCollapsed('File Data');
			debug.log(lineData);
			debug.groupEnd();

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

			if (lineData[i].includes('\r'))
				lineData[i] = lineData[i].replace('\r', '');

			if (/F[0-9]+/i.test(lineData[i]) && inDebugMode) {

				const [ , matchNum ] = lineData[i].match(/F([0-9]+)/i);

				alert(`Crazy multiplier on feedrate: ${80}`);  // eslint-disable-line no-alert

				lineData[i] = lineData[i].replace(/F[0-9]+/i, `F${Number(matchNum) * 80}`);

			}

		}

		lineData = lineData.filter((value) => {

			if (/^%|^\n/i.test(value) || value === '' || value === '\n')
				return false;

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

				for (let j = 0; j < matchData.length; j++) {  // For each match found

					const axis = matchData[j].substr(0, 1).toLowerCase();
					const value = Number(matchData[j].substr(1));

					if (axis === 'z' && value > 0 && !gcodeData.z[0]) {

						for (let a = 0; a < gcodeData.z.length && !gcodeData.z[a]; a++)
							gcodeData.z[a] = value;

					}

					gcodeData[axis][gcodeData[axis].length - 1] = value;

				}

			}

		}

		debug.log(gcodeData);
		this.plotData(gcodeData);

		// for (const [ i, value ] of gcodeData.entries()) {
		for (let i = 0; i < gcodeData.z.length; i++) {

			const xVal = gcodeData.x[i];
			const yVal = gcodeData.y[i];
			const zVal = gcodeData.z[i];
			const lineIndex = gcodeData.lineIndex[i];
			const line = lineData[lineIndex];

			if (/x[-0-9.]+/i.test(line))  // If an x position is in the line
				lineData[lineIndex] = line.replace(/x[-0-9.]+/i, `X${xVal}`);

			if (/y[-0-9.]+/i.test(line))  // If a y position is in the line
				lineData[lineIndex] = line.replace(/y[-0-9.]+/i, `Y${yVal}`);

			if (/z[-0-9.]+/i.test(line))  // If a z position is in the line
				lineData[lineIndex] = line.replace(/z[-0-9.]+/i, `Z${zVal}`);

		}

		debug.log('gcode lines');
		debug.log(lineData);

		publish('gcode-data/file-loaded', { FileName: fileName, Data: lineData });  // Publish the parsed gcode lines so that other widgets can use it

	},

	/**
	 *  [plotData description]
	 *  @param  {[type]} data [description]
	 *  @return {[type]}      [description]
	 */
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
