var CRCHLSettings = {
	mainContainer: null,

	tree: [],

	tabs: [],

	tabsContainer: null,

	init: function() {
		document.addEventListener("DOMContentLoaded", this.loadSettings.bind(this));
		document.getElementById("saveToFile").addEventListener("click", this.saveToFile.bind(this));
		document.getElementById("loadFromFile").addEventListener("click", this.loadFromFile.bind(this));
		document.getElementById("save").addEventListener("click", this.saveControlsValueToConfig.bind(this));
		document.getElementById("add").addEventListener("click", this.addOption.bind(this));
		document.getElementById("addTab").addEventListener("click", this.addTabOption.bind(this));
		this.mainContainer = $("#main");
		this.tabsContainer = $("#tabs");
		this.drawTabs();
		this.drawTree();
	},

	drawTabs: function() {
		this.tabsContainer.empty();
		for (var i in this.tabs) {
			var config = this.tabs[i];
			this.drawTabOption(config);
		}
	},

	addTabOption: function() {
		var config = {
			text: ""
		};
		this.tabs.push(config);
		this.drawTabOption(config);
	},

	createTabOption: function(config) {
		var option = $("<div>")
			.append(
				$("<input>").attr({
					type: "text"
				}).val(config.text)
			)
			.append(
				$("<span>").addClass("crchl-button-del-tab").attr({
					index: config.index
				}).on("click", this.deleteTabOption.bind(this))
			);
		return option;
	},

	drawTabOption: function(config) {
		var option = this.createTabOption(config);
		this.tabsContainer.append(option);
	},

	deleteTabOption: function(event) {
		var el = event.target;
		var index = $(el).attr("index");
		$(el).parent().remove();
		this.tabs.splice(index, 1);
	},

	saveSettings: function() {
		chrome.storage.sync.set({
			crchlTabsSettings: this.tabs,
			crchlSettings: this.tree
		}, function() {
			var status = document.getElementById("status");
			status.textContent = "Сохранено";
			setTimeout(function() {
				status.textContent = "";
			}, 2000);
		});
	},

	loadSettings: function() {
		var self = this;
		chrome.storage.sync.get({
			crchlTabsSettings: [],
			crchlSettings: []
		}, function(items) {
			self.tree = items.crchlSettings;
			self.tabs = items.crchlTabsSettings;
			self.drawTree();
			self.drawTabs();
		});
	},

	drawTree: function() {
		this.mainContainer.empty();
		for (var i in this.tree) {
			var config = this.tree[i];
			config.index = i;
			var option = this.createOption(config);
			var container = this.mainContainer;
			/*var ul = $("<ul>").on("drop", this.drop)
							.on("dragover", this.allowDrop);
			if (config.parentId) {
				container = $("#" + config.parentId)
			}
			ul.append(option);
			container.append(ul);
			*/
			container.append(option);
		}
	},

	createOption: function(config) {
		var typeCheckbox = "checkbox";
		var typeText = "text";
		var cls = "crchl-option";
		var option = $("<li>")
			.append(
				$("<input>")
				.attr({
					type: typeCheckbox,
					checked: config.checked
				})
				.addClass(cls + "-" + typeCheckbox)
			)
			.append(
				$("<input>").attr({
					type: typeText
				}).val(config.caption).addClass(cls + "-" + "caption")
			)
			.append(
				$("<textarea>").text(config.text).addClass(cls + "-" + "text")
			)
			.attr({
				id: config.id,
				parentId: config.parentId,
				draggable: false
			})
			//.on("dragstart", this.drag)
			.addClass(cls);
		var tabsCont = $("<span>").addClass(cls + "-" + "tabs");
		for (var i in this.tabs) {
			var tab = $("<input>")
				.attr({
					type: typeCheckbox,
					checked: config.tabs[i]
				});
			tabsCont.append(tab);
		}
		option.append(tabsCont);
		option.append(
			$("<span>").addClass("crchl-button-del-option").attr({
				index: config.index
			}).on("click", this.deleteOption.bind(this))
		);
		return option;
	},

	deleteOption: function() {
		var el = event.target;
		var index = $(el).attr("index");
		$(el).parent().remove();
		this.tree.splice(index, 1);
	},

	saveControlsValueToConfig: function() {
		this.saveTabsControlsValueToConfig();
		this.saveTreeControlsValueToConfig();
		this.saveSettings();
	},

	saveTreeControlsValueToConfig: function() {
		var container = this.mainContainer;
		var options = $(container).find("li");
		this.tree = [];
		options.each(function(i, option) {
			var config = this.getValuesFromOption(option);
			this.tree.push(config);
		}.bind(this));
	},

	saveTabsControlsValueToConfig: function() {
		var container = this.tabsContainer;
		var options = $(container).find("input");
		this.tabs = [];
		options.each(function(i, tab) {
			var config = this.getValuesFromTab(tab);
			this.tabs.push(config);
		}.bind(this));
	},

	getValuesFromOption: function(option) {
		var config = {};
		config.id = $(option).attr("id");
		config.parentId = $(option).attr("parentid");
		config.checked = $(option).find("input:first:checked").length ? true : false;
		config.caption = $(option).find("input[type=text]:first").val();
		config.text = $(option).find("textarea:first").val();
		config.tabs = [];
		var tabsCheckbox = $(option).find(".crchl-option-tabs input");
		tabsCheckbox.each(function(i, el) {
			config.tabs[i] = el.checked;
		});
		return config;
	},

	getValuesFromTab: function(tab) {
		var config = {};
		config.text = $(tab).val();
		return config;
	},

	addOption: function() {
		var config = {
			id: this.getNewId(),
			checked: false,
			caption: "",
			text: "",
			parentId: null,
			tabs: []
		};
		this.tree.push(config);
		var option = this.createOption(config);
		this.mainContainer.append(option);
	},

	getNewId: function() {
		var newId = this.tree.length;
		return newId;
	},

	loadFromFile: function() {
		var self = this;
		$.ajaxSetup({
			cache: false
		});
		$.getJSON("settings.json").done(function(json) {
			self.tree = json.tree;
			self.tabs = json.tabs;
			self.drawTree();
			self.drawTabs();
			$.ajaxSetup({
				cache: true
			});
		}).fail(function(resonse, errName, error) {
			alert(errName + ":" + error);
			console.log(error);
		});
	},

	saveToFile: function() {
		var config = {};
		var json;
		this.saveTabsControlsValueToConfig();
		this.saveTreeControlsValueToConfig();
		config.tabs = this.tabs;
		config.tree = this.tree;
		json = JSON.stringify(config);
		$("#jsonContent").val(json);
	}

	/*
	// Поддержку иерархии и перетаскивания пока не реализовываю.
	allowDrop: function(ev) {
		if (ev.target.tagName !== "UL") {
			return false;
		}
		ev.preventDefault();
	},

	drag: function(ev) {
		ev.originalEvent.dataTransfer.setData("text", ev.target.id);
	},

	drop: function(ev) {
		ev.preventDefault();
		var data = ev.originalEvent.dataTransfer.getData("text");
		var el = document.getElementById(data);
		var target = ev.originalEvent.target;
		if (el !== target) {
			target.appendChild(el);	
		}
	}*/
};

CRCHLSettings.init();
