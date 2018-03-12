(function($, window) {
	var tools = window.TeamCityTools;
	if (!tools) {
		window.TeamCityTools = tools = {};
	}
	var utils = tools.Utils;
	var settingsProvider = tools.SettingsProvider;
	var sonarAddin = {

		host: "http://tscore-sonar:9000",

		baseUrl: "/api/",

		sonarProfileParentSelector: "div[id=review-info-container]",

		sonarProfileWrapperId: "sonarProfileWrapper",

		activeFileSelector: "li[class='frx-list-item activeFrx'] a[class=scroll-to-frx]",

		filePathSelector: "div[class*=activeFrx] div[class=path] span[class*=file]",

		lineCoverageStyleTpl: "tr[data-to='{line}'] .tetrisColumn {background-color: {color}} ",

		previousActiveFileName: null,

		sonarProjects: null,
		coreCSharpProjects: null,

		projectNames: {
			coreCSharp: "CoreCSharp"
		},

		init: function(settingsProvider) {
			this.settingsProvider = settingsProvider || {};
			this.initParameters();
			this.addSonarButton();
			this.initSonarProjects()
				.then(() => this.initCoreCSharpProjects())
				.then(function() {
					setInterval(this.initSonarProfile.bind(this), 2000);
				}.bind(this));
		},

		initParameters: function() {
			var host = this.host || location.origin;
			this.baseUrl = host + this.baseUrl;
		},

		initCoreCSharpProjects: function() {
			let url = this.baseUrl + "components/tree?baseComponentKey=" + this.projectNames.coreCSharp +
				"&qualifiers=BRC&ps=500";
			let me = this;
			return new Promise((resolve, reject) => {
				this.send({
					url: url,
					data: {
						dataType: "json"
					},
					success: function(result) {
						me.coreCSharpProjects = result.components;
						resolve();
					},
					error: reject
				});
			});
		},

		initSonarProjects: function() {
			let url = this.baseUrl + "resources";
			let me = this;
			return new Promise((resolve, reject) => {
				this.send({
					url: url,
					data: {
						dataType: "json"
					},
					success: function(result) {
						me.sonarProjects = result;
						resolve(result);
					},
					error: reject
				});
			})

		},

		getActiveFileEl: function() {
			return $(this.activeFileSelector);
		},

		getActiveFileName: function() {
			var activeFileName;
			var activeFileEl = this.getActiveFileEl();
			if (!this.isEmptyElement(activeFileEl)) {
				activeFileName = activeFileEl.text();
			}
			return activeFileName;
		},

		initSonarProfile: function() {
			var activeFileName = this.getActiveFileName();
			if (!activeFileName || this.previousActiveFileName === activeFileName) {
				return;
			}
			this.previousActiveFileName = activeFileName;
			this.hideSonarProfile();
			var fileKey = this.getFileKey(activeFileName);
			if (!fileKey) {
				return;
			}
			this.getFileInfo(fileKey, function(result) {
				if (!result || !result[0]) {
					return;
				}
				var sonarInfo = result[0];
				this.getFileIssues(fileKey, function(issuesResult) {
					if (!issuesResult || !issuesResult.issues) {
						return;
					}
					sonarInfo.issues = issuesResult.issues;
					this.showSonarProfile(sonarInfo);
				}.bind(this));
			}.bind(this));
		},

		getFileInfo: function(fileKey, success, error) {
			var url = this.baseUrl + "resources?resource=" + fileKey + "&metrics=ncloc,coverage,coverage_line_hits_data";
			this.send({
				url: url,
				data: {
					dataType: "json"
				},
				success: success,
				error: error
			});
		},

		getFileIssues: function(fileKey, success) {
			var url = this.baseUrl + "issues/search?componentRoots=" + fileKey + "&resolved=false";
			this.send({
				url: url,
				data: {
					dataType: "json"
				},
				success: success
			});
		},

		getFilePath: function(fileName, componentName) {
			var filePath = "";
			var filePathEl = $(this.filePathSelector);
			if (!this.isEmptyElement(filePathEl)) {
				filePath = filePathEl.attr("title");
				filePath = filePath.replace("trunk/", "");
			}
			var schemaPackage = filePath.match(/^[\w.]+/)[0];
			if (componentName === "CoreJS") {
				filePath = filePath.replace("TSBpm/Src/Lib/Terrasoft.Nui/Resources/", "");
			} else if (componentName === "ConfigurationJS") {
				filePath = "PackagesSources/" + filePath.replace(/branches[^\>]*Schemas\//, "");
			} else if (componentName === "ConfigurationJSCoverage") {
				filePath = "src/SvnPackages/" + filePath.replace(/branches[^\>]\d\.\d\.\d\//, "");
			} else if (componentName === "ConfigurationCS") {
				fileName = fileName.replace(/\.[^/.]+$/, "");
				filePath = "ConfigurationCS:26F3A068-0A28-406C-B60E-BEC4267EB701:" + fileName + "." + schemaPackage + "_Entity.cs";
			} else if (componentName === "Mobile") {
				filePath = filePath.replace("Mobile/appV2/", "coverage/phantom/original-src/");
			} else if (componentName === "ConfigurationTSQL" || componentName === "ConfigurationPLSQL" ||
				componentName === "ConfigurationLESS") {
				filePath = componentName + "/" + schemaPackage + "/" + fileName;
			} else if (componentName === "CoreCSharp") {
				let projectDir = filePath.replace("TSBpm/Src/Lib/", "");
				let localPathSlash = projectDir.indexOf("/");
				let localFilePath = projectDir.substring(localPathSlash + 1);
				projectDir = projectDir.substring(0, localPathSlash);
				const project = this.coreCSharpProjects.find(p => p.name === projectDir);
				const projectKey = project.key.replace("CoreCSharp:", "") + ":";
				filePath = projectKey + localFilePath;
			}
			return filePath;
		},

		getFileComponent: function(fileName) {
			var componentName = "";
			var activeFileEl = this.getActiveFileEl();
			if (!this.isEmptyElement(activeFileEl)) {
				var componentEl = activeFileEl.parents("li[class='source-node']");
				if (!this.isEmptyElement(componentEl)) {
					componentEl = componentEl.children("span[class=' ']");
					if (!this.isEmptyElement(componentEl)) {
						componentName = componentEl.text();
						componentName = componentName.trim();
						var fileExtension = fileName.replace(/^.*?\.([a-zA-Z0-9]+)$/, "$1");
						var isCSharp = fileExtension === "cs";
						var isJS = fileExtension === "js";
						var isSQL = fileExtension === "sql";
						var isLess = fileExtension === "less";
						if (componentName.indexOf("PackageStore") > -1) {
							if (isCSharp) {
								componentName = "ConfigurationCS";
							} else if (isJS) {
								componentName = "ConfigurationJS";
							} else if (isSQL) {
								if (fileName.indexOf("Oracle") > -1) {
									componentName = "ConfigurationPLSQL";
								} else {
									componentName = "ConfigurationTSQL";
								}
							} else if (isLess) {
								componentName = "ConfigurationLESS";
							}
						} else if (componentName.indexOf("TS5 ") > -1) {
							if (isCSharp) {
								componentName = "CoreCSharp";
							} else if (isJS) {
								componentName = "CoreJS";
							}
						} else if (componentName.indexOf("tshub ") > -1) {
							if (isCSharp) {
								componentName = "";
							} else if (isJS) {
								componentName = "Mobile";
							}
						} else {
							componentName = "";
						}
					}
				}
			}
			return componentName;
		},

		getFileKey: function(fileName) {
			var componentName = this.getFileComponent(fileName);
			var filePath = this.getFilePath(fileName, componentName);
			if (!filePath) {
				return;
			}
			return componentName + ":" + filePath;
		},

		getConfigurationJsCoverageFileKey: function(sonarInfo) {
			var key = sonarInfo.key;
			if (key.indexOf("ConfigurationJS") < 0 || key.indexOf("Tests.js") > -1) {
				return null;
			}
			var componentName = "ConfigurationJSCoverage";
			var filePath = this.getFilePath(sonarInfo.name, componentName);
			return componentName + ":" + filePath;
		},

		getFileFullCoverage: function(sonarInfo) {
			var coverage = "";
			var msr = sonarInfo.msr || [];
			msr.forEach(function(object) {
				if (object.key === "coverage") {
					coverage = object.frmt_val;
					return true;
				}
			}, this);
			return coverage;
		},

		getFileCoverageByLine: function(sonarInfo) {
			var lineCoverage = "";
			var msr = sonarInfo.msr || [];
			msr.forEach(function(object) {
				if (object.key === "coverage_line_hits_data") {
					lineCoverage = object.data;
					return true;
				}
			}, this);
			return lineCoverage;
		},

		getFileLastUpdate: function(sonarInfo) {
			return sonarInfo.date;
		},

		getSonarProfileEl: function() {
			var sonarProfile = $("div[id=" + this.sonarProfileWrapperId + "]");
			sonarProfile = (!sonarProfile || sonarProfile.length === 0) ? null : sonarProfile;
			return sonarProfile;
		},

		hideSonarProfile: function() {
			var sonarProfile = this.getSonarProfileEl();
			if (sonarProfile) {
				sonarProfile.remove();
			}
			$("#lineCoverage").remove();
		},

		addSonarLineCoverage: function(sonarInfo) {
			var coverage = this.getFileCoverageByLine(sonarInfo);
			if (!coverage) {
				return;
			}
			setTimeout(function(coverage) {
				var lines = coverage.split(";");
				var style = "";
				lines.forEach(function(line) {
					var data = line.split("=");
					var lineNumber = parseInt(data[0]);
					var cover = parseInt(data[1]);
					var color = cover > 0 ? "#59cd52" : "#ff1111";
					style += this.lineCoverageStyleTpl.replace("{line}", lineNumber).replace("{color}", color);
				}, this);
				$("body").append($("<style id='lineCoverage'>").html(style));
			}.bind(this, coverage), 0);
		},

		addSonarIssuesToProfile: function(sonarInfo, sonarProfile) {
			var issues = sonarInfo.issues || {};
			issues.forEach(function(issue) {
				this.addIssueToSonarProfile(sonarProfile, issue);
			}, this);
		},

		addSonarProfileInfo: function(sonarProfile, fileInfo, sonarInfo) {
			this.addFileInfoToSonarProfile(sonarProfile, fileInfo);
			this.addSonarIssuesToProfile(sonarInfo, sonarProfile);
			this.addSonarLineCoverage(fileInfo);
		},

		showSonarProfile: function(sonarInfo) {
			sonarInfo = sonarInfo || {};
			this.hideSonarProfile();
			var profileEl = $(this.sonarProfileParentSelector);
			if (!profileEl) {
				return;
			}
			var sonarProfile = this.createSonarProfile();
			if (sonarInfo.authorizationError) {
				this.addAuthorizationErrorToSonarProfile(sonarProfile);
			} else {
				var confJsCoverageFileKey = this.getConfigurationJsCoverageFileKey(sonarInfo);
				if (confJsCoverageFileKey) {
					this.getFileInfo(confJsCoverageFileKey, function(result) {
						result = result || [];
						var fileInfo = result[0];
						this.addSonarProfileInfo(sonarProfile, fileInfo, sonarInfo);
					}.bind(this), function() {
						this.addSonarProfileInfo(sonarProfile, sonarInfo, sonarInfo);
					}.bind(this));
				} else {
					this.addSonarProfileInfo(sonarProfile, sonarInfo, sonarInfo);
				}
			}
			profileEl.after(sonarProfile);
		},

		createSonarProfile: function() {
			var sonarProfileWrapper = $("<div>").addClass("sonarProfileWrapper");
			sonarProfileWrapper.attr("id", this.sonarProfileWrapperId);
			return sonarProfileWrapper;
		},

		addAuthorizationErrorToSonarProfile: function(sonarProfile) {
			var authorizationErrorElement = $("<div>").addClass("authorizationError");
			authorizationErrorElement.text("Sonar Authorization Error");
			sonarProfile.append(authorizationErrorElement);
		},

		addFileInfoToSonarProfile: function(sonarProfile, sonarInfo) {
			var coverage = this.getFileFullCoverage(sonarInfo);
			var lastUpdate = this.getFileLastUpdate(sonarInfo);
			var sonarButton = $("#sonarButton");
			if (lastUpdate || coverage) {
				var text = "";
				var coverageElement = $("<div>").addClass("sonar-coverage");
				if (coverage) {
					text = "Coverage: " + coverage + " ";
					var coverageNumber = parseInt(coverage);
					if (coverageNumber >= 90) {
						coverageElement.attr("style", "background-color: #59cd52");
						sonarButton.attr("style", "border-color: #59cd52");
					} else if (coverageNumber >= 60) {
						coverageElement.attr("style", "background-color: #d7d528");
						sonarButton.attr("style", "border-color: #d7d528")
					} else {
						coverageElement.attr("style", "background-color: #ff1111");
						sonarButton.attr("style", "border-color: #ff1111");
					}
					sonarButton.text("Sonar " + coverage);
				} else {
					sonarButton.text("Sonar");
					sonarButton.attr("style", "border-color: #ccc");
				}
				if (lastUpdate) {
					text += "Analysis date: " + new Date(lastUpdate).toLocaleString("en-GB");
				}
				coverageElement.text(text);
				sonarProfile.append(coverageElement);
			}
		},

		addIssueToSonarProfile: function(sonarProfile, issue) {
			var url = this.host + "/issues/search#issues=" + issue.key;
			var issueElement = $("<div>").addClass("sonarIssueElement");
			var issueElementLine = $("<div>").addClass("sonarIssueElementLine");
			issueElementLine.text(issue.line);
			var issueElementLink = $("<a>").addClass("sonarIssueElementLink");
			issueElementLink.attr("href", url);
			issueElementLink.attr("target", "_blank");
			issueElementLink.text(issue.message);
			issueElement.append(issueElementLine);
			issueElement.append(issueElementLink);
			sonarProfile.append(issueElement);
		},

		showAuthorizationError: function() {
			this.showSonarProfile({
				authorizationError: true
			});
		},

		send: function(config) {
			var data = config.data || {};
			var method = config.method || "GET";
			var dataType = config.data.dataType ? config.data.dataType : "";
			var ajaxConfig = {
				url: config.url,
				method: method,
				data: data,
				dataType: dataType,
				success: function(response) {
					config.success(response);
				},
				error: function(jqXHR, textStatus, errorThrown) {
					if (jqXHR.status === 0 || errorThrown === "Unauthorized") {
						this.showAuthorizationError();
					}
					console.warn("Error", arguments);
					if (config.error) {
						config.error(arguments);
					}
				}
			};
			if (method === "POST") {
				ajaxConfig.processData = false;
				ajaxConfig.beforeSend = function(xhr) {
					xhr.setRequestHeader("Authorization", "Basic " + btoa("admin:admin"));
				};
			}
			$.ajax(ajaxConfig);
		},

		isEmptyElement: function(element) {
			return (!element || !element.length);
		},

		addSonarButton: function() {
			var me = this;
			var sonarBtn = $("<button>")
				.attr("id", "sonarButton")
				.addClass("aui-button aui-button-light")
				.text("Sonar")
				.attr("aria-disabled", "false")
				.attr("aria-pressed", "false");
			$("<li>")
				.addClass("sonar-wrapper")
				.attr("title", "Hold ctrl key to copy url to clipboard")
				.click(function(event) {
					me.openSonar(event.ctrlKey);
				})
				.append(sonarBtn)
				.insertAfter(".blame-trigger-wrapper");
		},

		openSonar: function(copyToClipboard) {
			var fileName = this.getActiveFileName();
			if (!fileName) {
				utils.displayMessage("Cannot get file name", "Error");
				return;
			}
			var componentName = this.getFileComponent(fileName);
			var filePath = this.getFilePath(fileName, componentName) || null;
			if (!componentName || !filePath) {
				utils.displayMessage("Cannot get url for: " + fileName, "Error");
				return;
			}
			var url = this.getCodeUrl(componentName, filePath);
			if (componentName === "ConfigurationJS") {
				this.getConfigurationJsFileWithCoverageUrl(fileName, function(coverageUrl) {
					this.openSonarByUrl(coverageUrl || url, copyToClipboard);
				});
				return;
			}
			this.openSonarByUrl(url, copyToClipboard);
		},

		getConfigurationJsFileWithCoverageUrl: function(fileName, callback) {
			var componentName = "ConfigurationJSCoverage";
			var coverageUrl = this.getComponentInfoUrl(fileName, componentName);
			var me = this;
			$.get(coverageUrl).always(function(result) {
				var url = null;
				if (result && result.component && result.component.path) {
					url = me.getCodeUrl(componentName, result.component.path);
				}
				callback.call(me, url);
			});
		},

		getComponentInfoUrl: function(fileName, componentName) {
			var filePath = this.getFilePath(fileName, componentName);
			return this.baseUrl + "components/show?key=" + encodeURIComponent(componentName + ":" + filePath);
		},

		getCodeUrl: function(componentName, filePath) {
			var url = componentName + ":" + filePath;
			url = encodeURIComponent(url);
			var line = this.getActiveFileLineNumber();
			var query = "/code/?id=" + componentName + "&selected=";
			if (line) {
				url += "&line=" + line;
				query = "/component/index?id=";
			}
			url = this.host + query + url;
			return url;
		},

		openSonarByUrl: function(url, copyToClipboard) {
			utils.openNewTab(url);
			if (copyToClipboard) {
				utils.copy(url);
			}
		},

		getActiveFileLineNumber: function() {
			var line = $(".commentableLine.lineHighlighted");
			return line.attr("data-from") || line.attr("data-to");
		}
	};
	tools.SonarAddin = sonarAddin;
	sonarAddin.init(settingsProvider);
})($, window);
