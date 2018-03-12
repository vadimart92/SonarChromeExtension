(function($, window) {
	var tools = window.TeamCityTools;
	if (!tools) {
		window.TeamCityTools = tools = {};
	}
	var settingsProvider = tools.SettingsProvider;
	var crucibleAddin = {

		init: function() {
			this.settingsProvider = settingsProvider || {};
			this.removeLicenseBanner();
		},

		removeLicenseBanner: function() {
			var licenseBanner = $("div[class='system-messages']");
			if (licenseBanner) {
				licenseBanner.each(function(index, el) {
					el = $(el);
					if (el) {
						var text = el.text();
						if (text.indexOf("license expires") !== -1) {
							licenseBanner.remove();
						}
					}
				}.bind(this));
			}
		}
	};
	tools.CrucibleAddin = crucibleAddin;
	crucibleAddin.init(settingsProvider);
})($, window);
