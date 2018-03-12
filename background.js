"use strict";
var eventsHandler = {
	openSettings: function() {
		if (chrome.runtime.openOptionsPage) {
			chrome.runtime.openOptionsPage();
		} else {
			window.open(chrome.runtime.getURL("options/options.html"));
		}
	},
	copyText: function(message) {
		var input = document.createElement("textarea");
		document.body.appendChild(input);
		input.value = message.text;
		input.focus();
		input.select();
		document.execCommand("Copy");
		input.remove();
	},
	openTab: function(message) {
		var url = message.url;
		chrome.tabs.create({url: url});
	}
};
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	if (!request || !request.action) {
		return;
	}
	var method = eventsHandler[request.action];
	if (!method) {
		method = function() {
		};
	}
	sendResponse({result: method.call(eventsHandler, request)});
});