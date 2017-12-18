/**
 *   ____       _   _   _                  __        ___     _            _         _                  ____            _       _
 *  / ___|  ___| |_| |_(_)_ __   __ _ ___  \ \      / (_) __| | __ _  ___| |_      | | __ ___   ____ _/ ___|  ___ _ __(_)_ __ | |_
 *  \___ \ / _ \ __| __| | '_ \ / _` / __|  \ \ /\ / /| |/ _` |/ _` |/ _ \ __|  _  | |/ _` \ \ / / _` \___ \ / __| '__| | '_ \| __|
 *   ___) |  __/ |_| |_| | | | | (_| \__ \   \ V  V / | | (_| | (_| |  __/ |_  | |_| | (_| |\ V / (_| |___) | (__| |  | | |_) | |_
 *  |____/ \___|\__|\__|_|_| |_|\__, |___/    \_/\_/  |_|\__,_|\__, |\___|\__|  \___/ \__,_| \_/ \__,_|____/ \___|_|  |_| .__/ \__|
 *                              |___/                          |___/                                                    |_|
 *
 *  @author Brayden Aimar
 */

 /* eslint-disable no-console */

define([ 'jquery' ], $ => ({

	id: 'settings-widget',
	name: 'Settings',
	shortName: null,
	btnTheme: 'default',
	// glyphicon glyphicon-cog
	icon: 'fa fa-cogs',
	desc: '',
	publish: {},
	subscribe: {},
	foreignPublish: {
		'/main/widget-loaded': ''
	},
	foreignSubscribe: {
		'/main/all-widgets-loaded': ''
	},

	widgetDom: [ 'settings-panel' ],
	widgetVisible: false,

	defaultSettings: [],
	settings: [],

	initBody() {

		console.group(`${this.name}.initBody()`);

		subscribe('/main/window-resize', this, this.resizeWidgetDom.bind(this));
		subscribe('/main/widget-visible', this, this.visibleWidget.bind(this));

		// subscribe('/connection-widget/recvPortList', this, this.recvPortList.bind(this));

		// this.loadSettings();  // Load the settings file
		// this.readSettingsFile('main');  // Read main settings file

		publish('/main/widget-loaded', this.id);

	},
	/**
	 *  Load settings for this widget.
	 */
	loadSettings() {

		fsCSON.readFile('settings-widget/Settings.cson', (err, data) => {

			if (err)  // If there was an error reading the file
				return false;

		});

		fsCSON.readFile('main/Settings.cson', (err, data) => {

			if (err) // If there was an error reading the file
				return false;



		});

	},
	readSettingsFile(name) {

		const that = this;

		fsCSON.readFile(`${name}/Settings.cson`, (err, data) => {

			if (err)  // If there was an error reading the file
				return false;

			that.defaultSettings[name] = {};
			that.settings[name] = {};
			gui.mergeDeep(that.defaultSettings[name], data);  // Merge settings from cson file into this widget
			gui.mergeDeep(that.settings[name], data);		  // Merge settings from cson file into this widget

			fsCSON.readFile(`${name}/User_Settings.cson`, (err, userData) => {

				if (err) {  // If there was an error reading the file

					const { code, errno, message, path, stack, syscall } = err;

					if (code === 'ENOENT')  // If no user settings file was found
						fsCSON.writeFileSafe(path, '');  // Create a user settings cson file

				}

				if (typeof userData != 'undefined')  // If there are any user settings
					gui.mergeDeep(that.settings[name], userData);  // Merge settings from user settings cson file into this widget

				this.buildPanelDOM(name);

			});

		});

	},
	// buildPanelDOM(name) {
    //
	// },
	// buildDOM() {
    //
	// },
	resizeWidgetDom() {

		/* eslint-disable prefer-const*/

		if (!this.widgetVisible)  // If this widget is not visible
			return false;

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

	}

})  /* arrow-function */
);	/* define */
