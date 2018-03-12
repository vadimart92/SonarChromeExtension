var tools = window.TeamCityTools;
if (!tools) {
	window.TeamCityTools = tools = {};
}
tools.Utils = {
	addDays: function(date, days) {
		var result = new Date(date);
		result.setDate(result.getDate() + days);
		return result;
	},
	formatDates: function(obj) {
		for (var prop in obj) {
			if (!obj.hasOwnProperty(prop)) {
				continue;
			}
			var val = obj[prop];
			if (val instanceof Date) {
				obj[prop] = this.formatDate(val);
			}
		}
	},
	formatDate: function(date) {
		var month = date.getMonth() + 1;
		var year = date.getFullYear();
		var day = date.getDate();
		return year + "-" + this.getLeadingZeroValue(month) + "-" + this.getLeadingZeroValue(day);
	},
	getLeadingZeroValue: function(value) {
		if (value < 10) {
			return "0" + value;
		}
		return value;
	},
	getBuildNameFromPath: function(path) {
		var regex = /(\d\.\d\.\d\.\d{1,4})_(.*)(\.zip)/;
		var match = regex.exec(path);
		return match && (match[1] + "_" + match[2]);
	},
	convertArrayToObj: function(parametersArray, needProps) {
		var params = {};
		this.copyParameters(params, parametersArray, needProps, function(name, prop) {
			return name == prop;
		}, true);
		this.copyParameters(params, parametersArray, needProps, function(name, prop) {
			return name.indexOf(prop) > -1;
		}, false);
		return params;
	},
	findVersion: function(versionStr){
		var checkRe = /(\d+)\.(\d+)\.(\d+)\.(\d){1,4}\D{0}/gi;
		var match = checkRe.exec(versionStr);
		return match && match[0];
	},
	checkIsVersionValid: function(versionStr){
		var ver = this.findVersion(versionStr);
		return Boolean(ver && (ver.lenght === versionStr.lenght));
	},
	validateParameter: function(obj, name, validator, valueProvider){
		name = name.toLowerCase();
		var result = {};
		for (var prop in obj) {
			if (!obj.hasOwnProperty(prop)) {
				continue;
			}
			var val = obj[prop];
			if (prop.toLowerCase() === name && !validator(val)) {
				val = valueProvider();
			}
			result[prop] = val;
		}
		return result;
	},
	normalizeProductName: function(name) {
		var maxLength = 16;
		var nameDivider = "_";
		if (!name || name.length < maxLength) {
			return name;
		}
		var nameParts = name.split(nameDivider);
		var resultName = "";
		var versionPartFound = false;
		_.each(nameParts, function(namePart) {
			if (resultName.length > 0) {
				resultName += nameDivider;
			}
			if (versionPartFound || !isNaN(Number(namePart[0]))){
				versionPartFound = true;
				resultName += namePart;
			} else {
				resultName += namePart.replace(/[a-z]/g, '');
			}
		});
		return (resultName.length > maxLength) ? resultName.substring(0, maxLength) : resultName;
	},
	copyParameters: function(params, parametersArray, needProps, filterFn, ignoreIfExists){
		_.each(parametersArray, function(parameter) {
			var name = parameter.name;
			var value = parameter.value;
			if (name && value) {
				if (needProps) {
					var props = _.filter(needProps, filterFn.bind(this, name));
					_.each(props, function(prop) {
						if (ignoreIfExists || !Boolean(params[prop])) {
							params[prop] = value;
						}
					});
				} else {
					params[name] = value;
				}
			}
		});
	},
	callServer: function(config, callback) {
		var promise = $.ajax(config)
			.error(function(msg) {
				window.console.log(msg);
			});
		if (callback) {
			promise.success(callback);
		}
		return promise;
	},
	getJSON: function(url, callback) {
		return this.callServer({
			url: url,
			method: "GET",
			dataType: "json"
		}, callback);
	},
	findItemByProp: function(arr, propName, propVal) {
		return this.findItem(arr, function(item) {
			return item[propName] === propVal;
		}) || {};
	},
	findItem: function(arr, callback) {
		return _.first(_.filter(arr, callback));
	},
	copy: function(str) {
		chrome.runtime.sendMessage({action: "copyText", text: str});
		let iconUrl = chrome.extension.getURL("lib/images/copy-content.png");
		this.displayNotification("Success", {
			body: "Copied to clipboard",
			icon: iconUrl
		}, 3000);
	},
	requestNotification: function(callback) {
		if (Notification.permission === "granted") {
			callback();
		} else if (Notification.permission !== "denied") {
			Notification.requestPermission(function(permission) {
				if (permission === "granted") {
					callback();
				}
			});
		}
	},
	displayNotification: function(title, config, timeout) {
		this.requestNotification(() => {
			let notification = new window.Notification(title, config);
			setTimeout(() => {
				notification.close();
			}, timeout || 5000);
		});
	},
	displayMessage: function(message, title, callback) {
		var buttonCaption = (callback && callback.caption) || "OK";
		var okBtn = {
			buttons: {
				[buttonCaption]: function() {
				  $(this).dialog("close");
					callback();
				}
			  }
		};
		var mbConfig = {
			modal: true
		};
		if (callback) {
			mbConfig = $.extend(mbConfig, okBtn);
		}
		$("<p>").attr("title", title).text(message).css("word-break", "break-all").css("min-height", "20px").dialog(mbConfig);
	},
	openOptions: function() {
		chrome.runtime.sendMessage({action: "openSettings"}, function(response) {
			console.log(response.result);
		});
	},
	openNewTab: function(url) {
		chrome.runtime.sendMessage({action: "openTab", url: url});
	},
	displayDialogByParams: function(title, params, promise) {
		var dialog;
		var d = $("<div>");
		var fs = $("<fieldSet>");
		$.each(params, function(paramName, paramValue) {
			var val = paramValue;
			if (paramValue instanceof Date) {
				val = paramValue.toISOString().substring(0, 10);
			}
			fs.append(
				$("<label>").attr("for", paramName).text(paramName)
			).append(
				$("<input>").attr({type: "text", name: paramName, value: val}).addClass("build-param")
			)
		});
		d.attr({title: title || "dialog"}).addClass("params-dialog").append(
			$("<form>").append(fs)
		);
		var run = function(){
			$(".params-dialog input.build-param").each(function(index, input) {
				var name = $(input).attr("name");
				var value = input.value;
				params[name] = value;
			});
			promise.resolve(params);
		};
		dialog = $(d).dialog({
			autoOpen: true,
			height: 550,
			width: 800,
			modal: true,
			buttons: {
				"Run": function() {
					run();
					dialog.dialog( "close" );
				},
				"Cancel": function() {
					promise.reject();
					dialog.dialog( "close" );
				}
			},
			close: function() {
				promise.reject();
				dialog.dialog("close");
			}
		});
	}
};
tools.Utils.openOptions.caption = "Setup";