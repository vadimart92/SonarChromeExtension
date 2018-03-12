var CRCHL = {
	mainContainer: null,

	listContainer: null,

	tabsContainer: null,

	preffixTabId: "crchl_tab_",

	tabs: [],

	activeTab: 0,

	panelSettings: {
		x: 30,
		y: 30,
		collapsed: false
	},

	init: function() {
		this.loadSettings(this.initView);
	},

	initView: function() {
		var container = $(document.body);
		var titleBar = this.createTitleBar();
		this.createMainContainer();
		this.createTabsContainer();
		this.createListContainer();
		this.mainContainer.append(titleBar);
		this.drawTabs();
		this.drawList();
		this.initDraggablePanel();
		$(container).append(this.mainContainer);
	},

	createMainContainer: function() {
		var main = $("<div>").attr("id", "crchlMainContainer")
			.css("left", this.panelSettings.x)
			.css("top", this.panelSettings.y);
		if (this.panelSettings.collapsed) {
			$(main).addClass("minimized");
		}
		this.mainContainer = main;
	},

	createListContainer: function() {
		var list = $("<div>").attr("id", "crchlListContainer");
		if (this.panelSettings.collapsed) {
			$(list).addClass("minimized");
		}
		this.listContainer = list;
	},

	createTabsContainer: function() {
		var tabs = $("<div>").attr("id", "crchlTabsContainer");
		if (this.panelSettings.collapsed) {
			$(tabs).addClass("minimized");
		}
		this.tabsContainer = tabs;
	},

	createTitleBar: function() {
		var optionsUrl = chrome.extension.getURL("settings.html");
		var settingsBtn = $("<a>").attr("href", optionsUrl).attr("target", "_blank").addClass("crchl-btn-settings");
		var toggleBtn = $("<span>").on("click", this.togglePanel.bind(this)).addClass("crchl-btn-toggle");
		var closeBtn = $("<span>").on("click", this.close.bind(this)).addClass("crchl-btn-close");
		var bar = $("<div>")
			.attr("id", "crchlTitleBarContainer")
			.append(settingsBtn)
			.append(toggleBtn)
			.append(closeBtn);
		return bar;
	},

	togglePanel: function() {
		$(this.mainContainer).toggleClass("minimized");
		$(this.listContainer).toggleClass("minimized");
		$(this.tabsContainer).toggleClass("minimized");
		this.panelSettings.collapsed = $(this.mainContainer).hasClass("minimized");
		this.saveSettings({
			panelSettings: this.panelSettings
		});
	},

	close: function() {
		$(this.mainContainer).hide();
	},

	drawTabs: function() {
		for (var index in this.tabs) {
			var config = this.tabs[index];
			config.id = this.preffixTabId + index;
			if (index === this.activeTab) {
				config.checked = true;
			}
			var tab = this.createTab(config);
			this.tabsContainer.append(tab);
		}
		this.mainContainer.append(this.tabsContainer);
	},

	drawList: function() {
		for (var index in this.tree) {
			var config = this.tree[index];
			for (var i in config.tabs) {
				if ((i === this.activeTab) && (config.tabs[i] === true)) {
					config.visible = true;
				}
			}
			var item = this.createChecklistItem(config);
			this.listContainer.append(item);
		}
		this.mainContainer.append(this.listContainer);
	},

	reDrawList: function() {
		var items = $(".crchl-item");
		for (var index in this.tree) {
			var config = this.tree[index];
			var visible = false;
			for (var i in config.tabs) {
				if ((i === this.activeTab) && (config.tabs[i] === true)) {
					visible = true;
				}
			}
			if (visible) {
				$(items[index]).show();
			} else {
				$(items[index]).hide();
			}
		}
	},

	initDraggablePanel: function() {
		$(this.mainContainer).draggable({
			stop: function(event, ui) {
				this.panelSettings.x = ui.position.left;
				this.panelSettings.y = ui.position.top;
				this.saveSettings({
					panelSettings: this.panelSettings
				});
			}.bind(this)
		}).bind(this);
	},

	createTab: function(config) {
		var tab = $("<span>")
			.attr({
				id: config.id
			})
			.text(config.text)
			.on("click", this.onChangeTab.bind(this))
			.addClass("crchl-tab");
		if (config.checked) {
			tab.addClass("active-tab");
		}
		return tab;
	},

	onChangeTab: function(event) {
		var el = event.target;
		var regexp = new RegExp(this.preffixTabId + "(\\d)");
		var id = regexp.exec(el.id)[1];
		$(this.tabsContainer).find(".crchl-tab").removeClass("active-tab");
		$(el).addClass("active-tab");
		this.activeTab = id;
		this.reDrawList();
	},

	createChecklistItem: function(config) {
		var isLink = config.text.indexOf("http") === 0;
		var extInfoEl = $("<span>").addClass("crchl-item-img");
		if (isLink) {
			extInfoEl
				.attr("title", config.text)
				.addClass("crchl-item-link")
				.on("click", this.goToUrl.bind(this, config.text));
		} else {
			if (config.text.length > 0) {
				extInfoEl.attr("tooltip", config.text).addClass("crchl-item-info");
			}
		}
		var item = $("<div>").addClass("crchl-item")
			.append(
				$("<input>").attr({
					type: "checkbox"
				}).addClass("crchl-item-checkbox")
			)
			.append(
				$("<span>").text(config.caption).addClass("crchl-item-text")
				.on("click", this.insertComment.bind(this, config))
			)
			.append(extInfoEl);
		if (config.visible) {
			item.show();
		} else {
			item.hide();
		}
		return item;
	},

	goToUrl: function(link) {
		window.open(link);
	},

	insertComment: function(config) {
		var comment = config.caption;
		var textarea = $(".comment-body textarea.commentTextarea");
		var caretPos = textarea[0].selectionStart;
		var textAreaValue = textarea.val();
		textarea.val(textAreaValue.substring(0, caretPos) + comment + textAreaValue.substring(caretPos));
	},

	loadSettings: function(callback) {
		var self = this;
		chrome.storage.sync.get({
			crchlTabsSettings: [],
			crchlSettings: [],
			panelSettings: {}
		}, function(items) {
			self.panelSettings = items.panelSettings;
			self.tree = items.crchlSettings;
			self.tabs = items.crchlTabsSettings;
			if (callback) {
				callback.call(self);
			}
		});
	},

	saveSettings: function(config) {
		chrome.storage.sync.set(config);
	}
};

CRCHL.init();
