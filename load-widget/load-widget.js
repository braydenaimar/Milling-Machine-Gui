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
	replaceExistingLineNumbers: true,
	matchLineNumberToLineIndex: true,
	lineNumberStartValue: 2,
	lineNumberValueIncrement: 2,
	backFillFirstZAxisValues: true,

	initBody() {

		debug.group(`${this.name}.initBody()`);

		subscribe('/main/window-resize', this, this.resizeWidgetDom.bind(this));
		subscribe('/main/widget-visible', this, this.visibleWidget.bind(this));
		subscribe('run-widget/file-path', this, this.openFile.bind(this));

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
	 */
	fileOpenDialog() {

		if (this.lastOpenFileDialogTime && Date.now() - this.lastOpenFileDialogTime < 1000)
			return;

		this.lastOpenFileDialogTime = Date.now();

		const openOptions = {
			title: 'Open a File',
			filters: [
				{ name: 'GCode', extensions: [ 'nc', 'TAP' ] },
				{ name: 'All', extensions: [ '' ] }
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

		if (typeof filePath == 'string')
			filePath = [ filePath ];

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

			return this.parseFile({ FileName: fileName, Gcode: lineData });

		});

	},

	parseFile({ FileName, Gcode }) {

		const { addLineNumbers, replaceExistingLineNumbers, matchLineNumberToLineIndex, lineNumberStartValue, lineNumberValueIncrement, backFillFirstZAxisValues } = this;
		const gcodeData = {
			x: [],
			y: [],
			z: [],
			Id: [],  // Id
			Line: [],
			Gcode: [],
			Desc: [],  // Eg. 'comment', 'M6', 'M8', 'motion', 'coord'
			Dist: [],
			Plane: [],
			Momo: [],
			Feed: []
		};
		/**
		*  Tool meta data.
		*  Ex. toolMeta: { T2: { Desc: 'D=3.175 CR=0 TAPER=30deg - ZMIN=-0.3 - chamfer mill' }, T3: { ... }, ... }.
		*  @type {Object}
		*/
		const toolMeta = {};
		/**
		*  List of tool changes that take place throughout the gcode file.
		*  Ex. toolChange: [
		* 		{
		*			Tool: 'T2',
		*			Desc: 'D=3.175 CR=0 TAPER=30deg - ZMIN=-0.3 - chamfer mill',
		*			GcodeComment: 'Engrave Text',
		*			Gcode: 'N6 T2 M6',
		*			Id: 'gcN6',
		*			Line: 10
		*		},
		*		{ Tool: 'T3', ... },
		*		...
		*	]
		*  @type {Array}
		*/
		let toolChange = [];
		let gcodeLineNum = 0;
		let gcode = Gcode;
		let [ x, y, z ] = [ 0, 0, 0 ];
		/**
		 *  Motion mode (rapid or linear or arc)
		 *  Eg. 'G0', 'G1', 'G2', or 'G3'
		 *  @type {String}
		 */
		let momo = 'G0';
		/**
		 *  Arc motion plane
		 *  G17: Z-Axis or XY-Plane
		 *  G18: Y-Axis or XZ-Plane
		 *  G19: X-Axis or YZ-Plane
		 *  Eg. 'G17' or 'G18' or 'G19'
		 *  @type {String}
		 */
		let plane = 'G17';
		/**
		 *  Distance Mode (absolute or relative)
		 *  Eg. 'G90' or 'G91'
		 *  @type {String}
		 */
		let dist = 'G90';
		let feed = 0;
		let prevComment = '';
		let tool = 'T0';
		let motionSinceToolChange = false;
		let lineNumberCount = lineNumberStartValue;

		gcode = gcode.filter((value, index, arr) => {  // Remove empty lines and % commands

			if (/^%/.test(value))  // If a clear buffer command
				return false;

			else if (index + 1 === arr.length && (value === '' || value === '\n'))  // If the last line is empty
				return false;

			return true;

		});

		for (let i = 0; i < gcode.length; i++) {

			let line = gcode[i];
			let id = `gc${i}`;
			let desc = [];
			let momoNonModal = '';
			const emptyLineFlag = !line || line === '\n' || line === '\r' || line === '\r\n';

			if (line.includes('\r'))  // If the line has a carriage-return character
				line = line.replace('\r', '');  // Remove carriage-return characters

			if (/^\(|^;/.test(line)) {  // If the line is a comment

				desc.push('comment');
				prevComment = line.replace(/\(|\)/g, '');

			} else if (/\(|;/.test(line)) {  // If the line has an inline comment

				desc.push('inline-comment');

			}

			if (/T[0-9]+/i.test(line) && desc.includes('comment'))  // If a tool meta comment
				toolMeta[line.match(/T[0-9]+/)] = { Desc: line.replace(/\(T[0-9]+ |\)/g, '') };

			else if (/T[0-9]+/i.test(line))  // If a tooling command
				tool = line.match(/T[0-9]+/);

			if (/M6/i.test(line)) {  // If a tool change command is on the next line

				const toolItem = {
					Tool: tool,
					Desc: toolMeta[tool].Desc,
					GcodeComment: prevComment,
					Gcode: line,
					Index: i,
					Id: id
				};

				toolChange = [ ...toolChange, toolItem ];
				desc.push('tool-change');
				motionSinceToolChange = false;

			}

			if (!desc.includes('comment') && !emptyLineFlag) {  // If the line is not a comment

				if (!motionSinceToolChange && /G0/i.test(line) && !/Z[-.0-9]+/i.test(line) && i < gcode.length - 1 && /Z[-.0-9]+/i.test(gcode[i + 1])) {  // If x and y motion is sent before z value

					motionSinceToolChange = true;  // Swap this line with the next line
					const nextLine = gcode[i + 1];

					gcode[i + 1] = line.replace(/G0 /i, '');
					line = `${line.match(/G0+/i)[0]} ${nextLine}`;

				} else if (!motionSinceToolChange && /G0/i.test(line)) {

					motionSinceToolChange = true;

				}

				const existingLineNumberFlag = /^N[0-9]+/i.test(line);
				const newLineNumber = matchLineNumberToLineIndex ? `N${i}` : `N${lineNumberCount}`;
				lineNumberCount += lineNumberValueIncrement;

				if (addLineNumbers && !existingLineNumberFlag)  // Add line number
					line = `${newLineNumber} ${line}`;

				else if (addLineNumbers && replaceExistingLineNumbers && existingLineNumberFlag)  // Replace existing line number
					line = line.replace(/^N[0-9]+/i, newLineNumber);

				if (/N[0-9]+/i.test(line))  // If numbered gcode
					id = `gcN${i}`;

				if (/S[0-9]+/i.test(line) || (/M3|M4/i.test(line) && !/M[0-9]{2,}/i.test(line)))  // If there is a spindle command
					desc.push('spindle');

				if (/M[7-9]/i.test(line) && !/M[0-9]{2,}/i.test(line))  // If there is a coolant command
					desc.push('coolant');

				if (/M30|M60/i.test(line) || (/M[0-2]/i.test(line) && !/M[0-9]{2,}/.test(line)))  // If there is a program end command
					desc.push('program-end');

				if (/G20|G21/i.test(line))  // If there is a units command
					desc.push('units');

				if (/G90|G91/i.test(line))  // If there is a distance mode command
					dist = line.match(/G90|G91/i)[0];

				if (/G1[7-9]{1}/i.test(line))  // If there is an arc plane command
					plane = line.match(/G1[7-9]{1}/i)[0];

				if (/G0?[0-3][^0-9]{1}/i.test(line))  // If there is a motion mode command
					momo = `G${line.match(/G0?([0-3]{1})[^0-9]/i)[1]}`;

				if (/G28|G30/i.test(line))  // If there is a non modal motion mode command
					[ momoNonModal ] = line.match(/G28|G30/i);

				if (/f[.0-9]+/i.test(line)) // If there is feedrate data
					feed = Number(line.match(/f([.0-9]+)/i)[1]);

				if (/x[-.0-9]+/i.test(line))  // If there is x-axis data
					x = Number(line.match(/x([-.0-9]+)/i)[1]);

				if (/y[-.0-9]+/i.test(line))  // If there is y-axis data
					y = Number(line.match(/y([-.0-9]+)/i)[1]);

				if (/z[-.0-9]+/i.test(line))  // If there is z-axis data
					z = Number(line.match(/z([-.0-9]+)/i)[1]);

			}

			gcode[i] = line;
			gcodeData.x.push(x);
			gcodeData.y.push(y);
			gcodeData.z.push(z);
			gcodeData.Line.push(i + 1);
			gcodeData.Gcode.push(line);
			gcodeData.Id.push(id);
			gcodeData.Desc.push(desc);
			gcodeData.Dist.push(dist);  // Absolute or relative distance mode (G90 or G91)
			gcodeData.Plane.push(plane);  //  Arc Plane (G17 - G19)
			gcodeData.Momo.push(momoNonModal || momo);  // Motion Mode (G0 - G3)
			gcodeData.Feed.push(feed);  // Feedrate

		}

		if (backFillFirstZAxisValues) {

			for (let i = 1; i < gcodeData.Id.length; i++) {

				const z = gcodeData.z[i];

				if (z === 0)
					continue;

				for (let j = i - 1; j >= 0; j--)
					gcodeData.z[j] = z;

				break;

			}

		}

		debug.log('Gcode file parsed.');
		debug.log(gcodeData);

		publish('gcode-data/file-loaded', { FileName, Gcode: gcode, GcodeData: gcodeData, ToolMeta: toolMeta, ToolChange: toolChange, NewFile: true });  // Publish the parsed gcode lines so that other widgets can use it

	},

})  /* arrow-function */
);	/* define */
