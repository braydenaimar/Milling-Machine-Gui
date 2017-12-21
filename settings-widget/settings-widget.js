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

	/**
	 *  Links to directory of settings files.
	 *  Each directory should have a 'Settings.cson' and a 'User_Settings.cson' file.
	 *  If the 'Settings.cson' file is missing from the directory, a warning will be displayed in the corresponding settings panel.
	 *  If the 'User_Settings.cson' file is missing from the directory, a blank 'User_Settings.cson' file will be created in that directory.
	 *  Aliases must be safe for HTML, CSS, and JavaScript.
	 *  Eg. /alias/ = /directory_name/
	 *  @type {Object}
	 */
	directoryLinks: {},
	/**
	 *  Enable the contents of the settings widget to be reloaded when the widget is made visible.
	 *  @type {Boolean}
	 */
	reloadContentsOnWidgetShow: false,

	/**
	 *  Stores the default settings imported from the 'Settings.cson' files.
	 *  @type {Object}
	 */
	defaultSettings: {},
	/**
	 *  Stores the current settings imported from the 'Settings.cson' file and overwritten by the 'User_Settings.cson' file.
	 *  @type {Object}
	 */
	settings: {},

	initBody() {

		console.group(`${this.name}.initBody()`);

		subscribe('/main/window-resize', this, this.resizeWidgetDom.bind(this));
		subscribe('/main/widget-visible', this, this.visibleWidget.bind(this));

		// subscribe('/connection-widget/recvPortList', this, this.recvPortList.bind(this));

		this.loadSettings();  // Load the settings file

		publish('/main/widget-loaded', this.id);

	},
	/**
	 *  Load settings for this widget.
	 */
	loadSettings() {

		fsCSON.readFile('settings-widget/Settings.cson', (err, data) => {

			if (err)  // If there was an error reading the file
				return false;

			gui.mergeDeep(this, data);
			this.loadContents();

		});

	},
	loadContents() {

		const { directoryLinks } = this;

		if (!directoryLinks)
			return false;

		const aliases = Object.keys(directoryLinks);

		$('#settings-widget .settings-panel').empty();  // Clear all previous contents

		for (let i = 0; i < aliases.length; i++) {

			const alias = aliases[i];
			const directory = directoryLinks[alias];

			this.buildPanelDOM(alias);
			this.readSettingsFiles(alias, directory);

		}

	},
	buildPanelDOM(alias) {

		let panelHTML = `<div class="panel panel-default ${alias}-panel sub-settings-panel">`;
		panelHTML += '<div class="panel-heading">';
		panelHTML += `<h3>${alias}</h3>`;
		panelHTML += '</div>';
		panelHTML += '<div class="panel-body"></div>';
		panelHTML += '</div>';

		$('#settings-widget .settings-panel').append(panelHTML);  // Add the settings panel to the widget

	},
	readSettingsFiles(alias, directory) {

		fsCSON.readFile(`${directory}/Settings.cson`, (err, data) => {

			if (err)  // If there was an error reading the file
				return false;

			this.defaultSettings[alias] = {};
			this.settings[alias] = {};
			gui.mergeDeep(this.defaultSettings[alias], data);  // Merge settings from cson file into this widget
			gui.mergeDeep(this.settings[alias], data);		   // Merge settings from cson file into this widget

			fsCSON.readFile(`${directory}/User_Settings.cson`, (err, userData) => {

				if (err) {  // If there was an error reading the file

					const { code, errno, message, path, stack, syscall } = err;

					if (code === 'ENOENT')  // If no user settings file was found
						fsCSON.writeFileSafe(path, '');  // Create a user settings cson file

				}

				if (typeof userData != 'undefined')  // If there are any user settings
					gui.mergeDeep(this.settings[alias], userData);  // Merge settings from user settings cson file into this widget

				this.buildPanelBodyHTML(alias);

			});

		});

	},
	/**
	 *  Build the HTML for the panel body.
	 *  @param  {String} alias Name of the settings panel.
	 */
	buildPanelBodyHTML(alias) {

		const { defaultSettings, settings } = this;
		const bodyHTML = this.buildObjectHTML(settings[alias], defaultSettings[alias]);

		if (!bodyHTML)  // If the settings data was not successfuly parsed
			return false;

		$(`#settings-widget .${alias}-panel .panel-body`).html(bodyHTML);

	},
	/**
	 *  Build for each object and sub-object within the settings data via recursion.
	 *  @param  {Object} data        Settings object to make HTML for.
	 *  @param  {Object} defaultData Default settings.
	 *  @return {String}
	 */
	buildObjectHTML(data, defaultData, recursionDepth = 0) {

		const dataKeys = Object.keys(data);
		let objectHTML = '';

		recursionDepth += 1;

		for (let i = 0; i < dataKeys.length; i++) {

			const objectDepth = `object-depth-${`${recursionDepth}`.padStart(2, '0')}`;
			const key = dataKeys[i];
			const title = this.toUserFriendlyTitle(key);
			const item = data[key];
			const defaultItem = defaultData[key];
			const description = 'This setting does very interesting things.';

			switch (typeof item) {
				case 'boolean':

					// <div class="checkbox">
					// 	<label>
					// 		<input id="core.allowPendingPaneItems" type="checkbox" class="input-checkbox" data-original-title="" title="">
					// 		<div class="setting-title">Allow Pending Pane Items</div>
					// 	</label>
					// 	<div class="setting-description">Allow items to be previewed without adding them to a pane permanently, such as when single clicking files in the tree view.</div>
					// </div>

					objectHTML += `<div class="${objectDepth} checkbox">`;
					objectHTML += `<input class="" type="checkbox"${item ? ' checked' : ''}>`;
					objectHTML += `<span class="setting-title">${title}</span>`;
					objectHTML += `<span class="setting-description text-muted">${description}</span>`;
					objectHTML += '</div>';

					break;
				case 'number':

					// number input
					objectHTML += `<div class="${objectDepth} number-input">`;
					objectHTML += `<span class="setting-title">${title}</span>`;
					objectHTML += `<span class="setting-description text-muted">${description}</span>`
					objectHTML += `<input class="" type="number" value="${item}">`;
					objectHTML += '</div>';

					break;
				case 'string':

					// textbox input
					objectHTML += `<div class="${objectDepth} text-input">`;
					objectHTML += `<span class="setting-title">${title}</span>`;
					objectHTML += `<span class="setting-description text-muted">${description}</span>`
					objectHTML += `<input class="" type="text" value="${item}">`;
					objectHTML += '</div>';

					break;
				case 'object':

					if (Array.isArray(item)) {  // If the object is an array

						if (typeof item[0] == 'object') {  // If the array consists of other arrays or objects

							// paragraph textbox input with cson parsing
							const value = CSON.stringify(item).replace(/"\n/g,'",').replace(/\n|\s/g,'').replace(/,]/g,']').replace(/^[\[\{]|[\]\}]$/g,'');

							objectHTML += `<div class="${objectDepth} cson-input">`;
							objectHTML += `<span class="setting-title">${title}</span>`;
							objectHTML += `<span class="setting-description text-muted">${description}</span>`
							objectHTML += `<input class="" type="text" value="${value}">`;
							objectHTML += '</div>';

						} else {

							const value = item.join(',');

							// textbox input with comma-delineated elements
							objectHTML += `<div class="${objectDepth} text-input">`;
							objectHTML += `<span class="setting-title">${title}</span>`;
							objectHTML += `<span class="setting-description text-muted">${description}</span>`
							objectHTML += `<input class="" type="text" value="${value}">`;
							objectHTML += '</div>';

						}

					} else {  // If the object is not an array

						// recursivley solve it

						objectHTML += `<div class="${objectDepth}">`;
						objectHTML += `<span class="object-title">${title}</span>`;
						objectHTML += this.buildObjectHTML(item, defaultItem, recursionDepth);
						objectHTML += '</div>';

					}

					break;
				default:
					// idek
					objectHTML += '<p>default</p>';

			}

		}

		return objectHTML;

	},
	/**
	 *  Parses object names into user-friendly names.
	 *  @param  {String} key The object name to be parsed.
	 *  @return {String}
	 */
	toUserFriendlyTitle(key) {

		let title = key;

		const [ a, ...b ] = key.split('');
		title = `${a.toUpperCase()}${b.join('')}`;

		return title;

	},
	resizeWidgetDom() {

		/* eslint-disable prefer-const*/
		const { id, widgetVisible, widgetDom } = this;

		if (!widgetVisible)  // If this widget is not visible
			return false;

		const containerHeight = $('#settings-widget').height();
		let marginSpacing = 0;
		let panelSpacing = 0;

		for (let i = 0; i < widgetDom.length; i++) {

			const $panel = $(`#settings-widget .${widgetDom[i]}`);

			marginSpacing += Number($panel.css('margin-top').replace(/px/g, ''));

			if (i < widgetDom.length - 1) {

				panelSpacing += Number($panel.css('height').replace(/px/g, ''));

			} else {

				marginSpacing += Number($panel.css('margin-bottom').replace(/px/g, ''));
				const panelHeight = containerHeight - (marginSpacing + panelSpacing);

				$panel.css({ height: `${panelHeight}px` });

			}

		}

		/* eslint-enable prefer-const */
		return true;

	},
	visibleWidget(wgtVisible, wgtHidden) {

		const { id, reloadContentsOnWidgetShow } = this;

		if (wgtVisible === id) {  // If the widget is shown

			this.widgetVisible = true;
			this.resizeWidgetDom();

			if (reloadContentsOnWidgetShow)
				this.loadContents();

		} else if (wgtHidden === id) {  // If the widget is hidden

			this.widgetVisible = false;

		}

	}

})  /* arrow-function */
);	/* define */
