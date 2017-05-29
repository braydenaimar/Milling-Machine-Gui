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
	publish: {},
	subscribe: {},
	foreignPublish: {
		'/main/widget-loaded': ''
	},
	foreignSubscribe: {
		'/main/all-widgets-loaded': ''
	},

	// widgetDom: [ 'run-panel' ],
	widgetDom: [
		[ '.widget-container', ' .gcode-run-panel', ' .gcode-file-panel' ],
		[ ' .gcode-file-panel', ' .panel-heading', ' .panel-body' ],
		[ ' .gcode-file-panel .panel-body', ' .gcode-file-text' ]
	],
	widgetVisible: false,

	fileGcode: [],      // Origional gcode lines parsed from the gcode file (array[strings])
	levelledGcode: [],

	minLineNumberDigits: 3,

	/**
	 *  Keep track of which port gcode data will be sent to.
	 *  @type {string}
	 */
	mainDevicePort: '',
	/**
	 *  Keep track of the number of queued messages in the SPJS.
	 *  This is updated what a queue count is published by the connection widget.
	 *  @type {number}
	 */
	queueCount: 0,

	initBody() {

		console.group(`${this.name}.initBody()`);

		subscribe('/main/window-resize', this, this.resizeWidgetDom.bind(this));
		subscribe('/main/widget-visible', this, this.visibleWidget.bind(this));

		subscribe('/connection-widget/recvPortList', this, this.onPortList.bind(this));  // Used to set mainDevicePort { PortList, PortMeta, Diffs, OpenPorts, OpenLogs }

		subscribe('gcode-data/file-loaded', this, this.fileLoaded.bind(this));  // Receive gcode lines when a gcode file is loaded { FileName, Data }
		subscribe('gcode-buffer/control', this, this.gcodeBufferControl.bind(this));

		subscribe('connection-widget/queue-count', this, this.onQueueCount.bind(this));  // Receive updates for the queue count

		this.initClickEvents();

		publish('/main/widget-loaded', this.id);

		return true;

	},
	initClickEvents() {

		// GCode Run panel buttons.
		$(`#${this.id} .gcode-run-panel .btn-group`).on('click', 'span.btn', (evt) => {

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

			} else if (evtSignal === '/connection-widget/spjs-send') {  // Send message to the SPJS

				publish(evtSignal, { Msg: evtData });  // Request serial port list or restart the SPJS

			} else if (evtData === 'play') {  // Send gcode to be buffered to the SPJS

				this.bufferGcode();

			} else if (evtSignal === 'gcode-buffer/control' && (evtData === 'pause' || evtData === 'resume' || evtData === 'stop')) {

				console.log(`pressed ${evtData}`);

				publish(evtSignal, evtData);

			}

		});

	},

	// Called when a file gets loaded from the Load Widget
	fileLoaded({ FileName, Data }) {

		this.fileGcodeData = Data;  // Store the data globally

		let gcodeHTML = '';

		for (let i = 0; i < Data.length; i++) {  // Build the gcode file text DOM

			const prefixZeros = (i.toString().length > this.minLineNumberDigits) ? 0 : this.minLineNumberDigits - i.toString().length;
			const domLineNumber = '0'.repeat(prefixZeros) + i;

			gcodeHTML += `<span class="text-muted" style="font-size: 8px; margin-right: 19px; margin-left: 0px;">${domLineNumber}</span>`;
			gcodeHTML += `<samp class="text-nowrap text-default">${Data[i]}</samp>`;
			gcodeHTML += '<br />';

		}

		const [ globalPath, localFileName ] = FileName.match(/([^\\]+)\.[a-zA-Z0-9]+$/i);

		$(`#${this.id} .gcode-file-panel .gcode-file-name`).text(localFileName);
		$(`#${this.id} .gcode-file-panel .gcode-file-text`).html(gcodeHTML);  // Add the gcode file to the file text panel

	},

	onPortList(data) {

		const { PortList, PortMeta, Diffs, OpenPorts, OpenLogs } = data;

		console.log(`got port list data:\n${JSON.stringify(data)}`);

		if (OpenPorts && OpenPorts.length) {  // If there are any open ports

			[ this.mainDevicePort ] = OpenPorts;  // Use the alphanumerically first port that is open as the main port

		} else {  // If there are no open ports

			this.mainDevicePort = '';

		}

	},

	bufferGcode() {

		const { mainDevicePort: port, fileGcodeData, mainDevicePort } = this;

		if (!port || !fileGcodeData) return false;

		// Only buffer up to the first tool change command

		publish('connection-widget/port-sendbuffered', mainDevicePort, { Msg: fileGcodeData });  // Send gcode data to be buffered to the SPJS

	},

	gcodeBufferControl(data) {

		if (data === 'auto-paused') {  // If buffering gcode to the SPJS was automatically paused by the connection widget

			$(`#${this.id} .gcode-run-panel .auto-gcode-paused`).removeClass('text-muted', 'btn-default');
			$(`#${this.id} .gcode-run-panel .auto-gcode-paused`).addClass('btn-warning');

		} else if (data === 'auto-resumed') {

			$(`#${this.id} .gcode-run-panel .auto-gcode-paused`).addClass('text-muted', 'btn-default');
			$(`#${this.id} .gcode-run-panel .auto-gcode-paused`).removeClass('btn-warning');

		} else if (data === 'user-paused') {  // If buffering gcode to the SPJS was manually paused

			$(`#${this.id} .gcode-run-panel .gcode-pause-btn`).attr('evt-data', 'resume');
			$(`#${this.id} .gcode-run-panel .gcode-pause-btn`).addClass('text-muted');

		} else if (data === 'user-resumed') {

			$(`#${this.id} .gcode-run-panel .gcode-pause-btn`).attr('evt-data', 'pause');
			$(`#${this.id} .gcode-run-panel .gcode-pause-btn`).removeClass('text-muted');

		}

	},

	onQueueCount(QCnt) {

		this.queueCount = QCnt;
		console.log(`got queue count ${this.queueCount}`);

	},

	resizeWidgetDom() {

		// If widget is not visible, do not update the size of DOM elements.
		if (!this.widgetVisible) return false;

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

				// If panelItem is the container element, skip it.
				if (!panelIndex) {

					containerElement = `#${that1.id}${panelItem}`;
					containerHeight = $(containerElement).height();
					// console.log("    Container: " + containerElement + "\n    Height: " + containerHeight);
					return true;

				}

				let elementItem = containerElement + panelItem;
				marginSpacing += Number($(elementItem).css('margin-top').replace(/px/g, ''));

				// Last element in array, set it's height.
				if (panelIndex === setItem.length - 1) {

					marginSpacing += Number($(elementItem).css('margin-bottom').replace(/px/g, ''));

					let panelHeight = containerHeight - (marginSpacing + panelSpacing);

					$(elementItem).css({ height: `${panelHeight}px` });
					// console.log("    panelHeight: " + panelHeight);

				} else {  // If this is not the last element in the array, read the element's height.

					panelSpacing += Number($(elementItem).css('height').replace(/px/g, ''));

				}

			});

		});

		$(`#${this.id} div.gcode-file-panel div.panel-body div`).width($(`#${this.id} div.gcode-file-panel div.panel-body`).width() - 10);  // Set the width of the gcode file panel
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
