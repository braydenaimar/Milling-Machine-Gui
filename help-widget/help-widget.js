/* Help Widget JavaScript */

// TODO: Put in a gcode reference table for M-commands, G-commands and their modifiers.

define(['jquery'], function($) {
return { // eslint-disable-line indent
	id: 'help-widget',
	name: 'Help',
	shortName: null,
	btnTheme: 'info',
	icon: 'glyphicon glyphicon-info-sign',
	desc: '',
	publish: {},
	subscribe: {},
	foreignPublish: {
		'/main/widget-loaded': ''
	},
	foreignSubscribe: {
		'/main/all-widgets-loaded': '',
		'/main/window-resize': '',
		'/main/widget-visible': ''
	},

	widgetDom: [],
	widgetVisible: false,

	initBody: function() {
		console.group(this.name + '.initBody()');

		$(`#${this.id} div.jumbotron p`).on('click', 'a.btn', function(evt) {
			const evtSignal = $(this).attr('evt-signal');

			if (evtSignal === 'open-dev-tools') {
				ipc.send('open-dev-tools');
			}
		});

		subscribe('/main/window-resize', this, this.resizeWidgetDom.bind(this));
		subscribe('/main/widget-visible', this, this.visibleWidget.bind(this));

		publish('/main/widget-loaded', this.id);
	},
	resizeWidgetDom: function() {
		// console.log("Resize " + this.id + " window");
		if (!this.widgetVisible) return false;
		var that = this;
		var containerHeight = $('#' + this.id).height();
		// console.log("containerHeight: " + containerHeight);
		var marginSpacing = 0;
		var panelSpacing = 0;

		$.each(this.widgetDom, function(panelIndex, panel) {
			// console.log("  panelIndex:", panelIndex, "\n  panel:", panel);
			marginSpacing += Number($('#' + that.id + ' .' + panel).css('margin-top').replace(/px/g, ''));

			if (panelIndex == that.widgetDom.length -1) {
				marginSpacing += Number($('#' + that.id + ' .' + panel).css('margin-bottom').replace(/px/g, ''));
				var panelHeight = containerHeight - (marginSpacing + panelSpacing);
				$('#' + that.id + ' .' + panel).css({'height': (panelHeight) + 'px'});
				// console.log("    panelHeight: " + panelHeight);
			} else {
				panelSpacing += Number($('#' + that.id + ' .' + panel).css('height').replace(/px/g, ''));
			}
		});
	},
	visibleWidget: function(wgtVisible, wgtHidden) {

		if (wgtVisible == this.id) {

			this.widgetVisible = true;
			this.resizeWidgetDom();

		} else if (wgtHidden == this.id) {

			this.widgetVisible = false;

		}

	}
};
});
