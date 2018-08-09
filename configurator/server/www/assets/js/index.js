/* WORKSPACE */

/* global 
	$ 
	Project 
	temperature 
	Cookies 
*/

var selectingComponents = true;
var selected = [];

var drake;

var WORK_MODE_SELECT = 10;
var WORK_MODE_BROWSE = 20;

var INITIAL_SCALE = 0.3;

var CIRCUIT_COLOR = [
	"#3cb44b", //Green
	"#ffe119", //Yellow
	"#0082c8", //Blue
	"#f58231", //Orange
	"#911eb4", //Purple
	"#46f0f0", //Cyan
	"#f032e6", //Magenta
	"#d2f53c", //Lime
	"#fabebe", //Pink
	"#008080", //Teal
	"#e6beff", //Lavender
	"#aa6e28", //Brown
	"#fffac8", //Beige
	"#800000", //Maroon
	"#aaffc3", //Mint
	"#808000", //Olive
	"#ffd8b1", //Coral
	"#000080", //Navy
	"#e6194b", //Red
	"#808080", //Grey	
];

var POWER_SUPPLY = [
	{ value: 15, title: "Power Supply - Min. Power Rating 15W" },	
	{ value: 30, title: "Power Supply - Min. Power Rating 30W" },	
	{ value: 45, title: "Power Supply - Min. Power Rating 45W" },	
	{ value: 60, title: "Power Supply - Min. Power Rating 60W" },	
];

var configModeOptions = [];
configModeOptions['auto-area'] = 'Auto - Specified Illumination Area';
configModeOptions['auto-size'] = 'Auto - Specified Count of IllumiTile';
configModeOptions['manual'] = 'Manual';

var temperatureOptions = [];
temperatureOptions["cool"] = "Cool (6000K CCT)";
temperatureOptions["neutral"] = "Neutral (4500K CCT)";
temperatureOptions["warm"] = "Warm (3000K CCT)";

$( function() {
	if (!Cookies.get("auth")) {
		window.location = "/account.html";
		return;
	}
	
	resetWorkTable();

	$("#footerHandle").on("click", function() {
		var footer = $("footer");
		var handle = $("#footerHandle");

		if (footer.hasClass("closed")) {
			footer.animate({bottom: 0}, 300, "easeInBack");
			footer.removeClass("closed");
			handle.switchClass("ion-arrow-up-a", "ion-arrow-down-a");
		} else {
			footer.animate({bottom: (footer.outerHeight() + 23) * -1}, 300, "easeInBack");
			footer.addClass("closed");
			handle.switchClass("ion-arrow-down-a", "ion-arrow-up-a");
		}
	});

	$("#projectMenu").on("change", function() {
		console.log("menu changed");
		var menu = $(this);
		var val = menu.val();
		console.log("selected", val);
		switch(val) {
			case "newProject" : startProject(); break;
			case "openProject" : openProject(); break;
			case "saveProject" : saveCurrentProject(); break;
			case "export" : exportProject(); break;
			case "closeProject" : closeProject(); break;
			case "print" : printProject(); break;
			default : break;
		}
		
		menu.val("");
	});

	Project.refreshList(function(list) {
		list.forEach(function(x) {
			addProjectToDialog(x);
		});

		if (Cookies.get("_open")) {
			Cookies.remove("_open");
			openProject();		
		} 
	}, function(msg) {
		alert(msg);
	});

	if (Cookies.get("_save")) {
		Project.unstash();
		Cookies.remove("_save");
		
		saveCurrentProject();		
	} 
	

	$("[name=work-table-width], [name=work-table-height]")
		.change(function() {
			var field = $(this);
			var val = parseFloat(field.val());
			
			if (!(val > 4)) {
				val = 4;
			}

			field.val(val.toFixed(1));
		});

	$("[name=tile-count-width], [name=tile-count-height]")
		.change(function() {
			var field = $(this);
			var val = parseInt(field.val());
			
			if (!(val > 1)) {
				val = 1;
			}

			field.val(val.toFixed(0));
		});

	$(window).on("unload", function() {	
		Project.stash(compressWorkspace());
	});

	if (Project.unstash()) {
		decompressWorkspace(Project.active.content);
		prepareWizard();
		displayConfiguration();
	} else {
		startProject();
	}
	

	if ($(".work-table .tile").length === 0) {
		navigateWizard("temperature");
	}

	setWorkMode(WORK_MODE_BROWSE);

	
	$(".button-help").click(function() {
		$(".help")
			.attr("showing", 0)
			.css({display: "none"});
			
		var button = $(this);
		var help = $(this)
			.parent()
			.find(".help");
			
		if (help.attr("showing") === "1") {
			help
				.css({display: "none"})
				.attr("showing", "0");
		} else {
			var bottom = (button.offset().top - button.parents(".specs").offset().top + 40) + "px";
			var left = (button.offset().left - (help.width() / 2)) + "px";

			help
				.css({display: "inline-block", bottom: bottom})
				.attr("showing", "1");
			
			// var adjust = function() {
	
			// 	help.css({});
			// }

			// adjust();
			
			// setTimeout(function() {
			// 	adjust();
			// }, 300);			
		}
	});
	
	$(".help")
		.click(function() {
			$(this)
				.css({display: "none"});
		});
});

function toggleDeleteMode(ev) {
	var button = $(ev.target);
	
	if (parseInt(button.attr("mode")) === WORK_MODE_SELECT) {
		setWorkMode(WORK_MODE_BROWSE);

		button	
			.attr("mode", WORK_MODE_BROWSE)
			.blur()
			.parent()
			.removeClass("button-active");
	} else {
		setWorkMode(WORK_MODE_SELECT);

		button	
			.attr("mode", WORK_MODE_SELECT)
			.blur()
			.parent()
			.addClass("button-active");
	}
}

function setWorkMode(mode) {
	switch (mode) {
		case WORK_MODE_BROWSE : {
			selectingComponents = false;
			
			$(selected).each(function(i, el) {
				var component = $(el);
				
				if (component.hasClass("tile")) {
					component.find(".highlight").remove();
				} else {
					component.css("background", "transparent");
				}
			});
			
			selected = [];
			
			$(".work-table")
				.css({cursor: "-webkit-grab"})
				.draggable("option", "disabled", false);
				
			$(".canvas")
				.get()[0].addEventListener("wheel", function(e) {
					console.log("wheel detected", e.deltaY);
					if (e.deltaY < 0) {
						scaleCanvas("+");
					} else if (e.deltaY > 0) {
						scaleCanvas("-");
					} 
				});

			break;
		}

		case WORK_MODE_SELECT :
		default : {
			selectingComponents = true;
			
			$(".work-table")
				.css({cursor: "pointer"})
				.draggable("option", "disabled", true);
			
			break;
		}		
	}
}

function closeProject() {
	resetWorkTable(); 
	Project.close();
}

function resetWorkTable() {
	$(".work-table")
		.empty()
		.draggable({ disabled: true, })
		.css({ transform: "scale(" + INITIAL_SCALE + ")"})
		.attr({ scale: INITIAL_SCALE });

	$(".circuit-panel .circuit-button").remove();
	$(".sub-title[rel=project-title]").text("");

	initializeDrag();
	addToCircuitPanel(0, "black");
	addTileRow(0);
}

function initializeDrag() {
	if (drake) drake.destroy();
	
	drake = dragula($(".drag-to-canvas").get(), {
		copy: function(el, source) {
			return $(el).parent().hasClass("drag-to-canvas");
		},
		
		accepts: function(el, target) {
			var drop = $(el);
			var onto = $(target);

			return (drop.parent().attr("rel") === "tile" && onto.hasClass("tile-slot") && onto.find(".tile").length === 0)
				|| (drop.parent().attr("rel") === "harness" && onto.hasClass("zone"))
				|| (drop.parent().attr("rel") === "power" && onto.hasClass("tile"));
		},
		
		revertOnSpill: true,
	})
	
	.on("cloned", function(clone, original, type) {
		var el = $(clone);
    	var component = "";
		var scale = parseFloat($(".work-table").attr("scale") || 1.0);
		var width = "";
		var type = $(original).parent().attr("rel");
		
		switch(type) {
			case "tile"     : component = "./assets/img/tile/illumitile_252x252.png"; width = (252 * scale) + "px"; break;
			case "harness"  : component = "./assets/img/tile/harness_180x22.png"; width = (180 * scale) + "px"; break;
			case "power"    : component = "./assets/img/powersupply/ps-left.png"; width = (480 * scale) + "px"; break;
		}

		el
			.attr({ src: component, rel: type })
			.css({ width: width, height: "", });
	})

	.on("drop", function(el, target) {
		var onto = $(target);
		var drop = $(el);

		if (onto.hasClass("tile-slot")) {
	       var row = $(target).parents(".tile-row");
	       var y = parseInt(row.attr("y"));
			
	    	if ($(".work-table .tile-row[y=" + (y + 1) + "]").length === 0) {
				addTileRow(y+1);
			}
	
			var tile = $("<div />")
				.addClass("tile")
				.attr({ rel: "tile" })
				.css({ backgroundImage: $(el).attr("src") })
				.append($("<div />").addClass("zone right"))
				.append($("<div />").addClass("zone bottom"))
				.click(selectComponentForDeletion)
				.appendTo(onto.empty());
				
			drake.containers.push(tile.get(0));
			drake.containers = drake.containers.concat(tile.find(".zone").get());
			
			var map = tilePosition(tile);
			
			map.fore.find(".power-right").remove();
			map.above.find(".power-up").remove();
			map.aft.find(".power-left").remove();

			Project.recordStep(compressWorkspace());
		} else if (onto.hasClass("zone")) {
			var tile = onto.parents(".tile");
			var map = tilePosition(tile);
			
			if ((onto.hasClass("right") && map.aft.length === 0) || (onto.hasClass("bottom") && map.below.length === 0)) {
				drake.cancel(true);
				return;
			}
			
			$("<img />")
				.attr({ src: "./assets/img/tile/harness_180x22.png"})
				.css({ zIndex: 4, })
				.click(selectComponentForDeletion)
				.appendTo(onto.empty());
				
			var tile = onto.parents(".tile");
			var map = tilePosition(tile);
			var circuit = tile.attr("circuit");
			
			if (!circuit) {
				if (onto.hasClass("right")) {
					circuit = map.aft.attr("circuit");
				} else {
					circuit = map.below.attr("circuit");
				}
			}
			
			if (!circuit) {
				circuit = parseInt($(".circuit-panel .circuit-button").last().attr("rel") || 0) + 1;
			} else {
				circuit = parseInt(circuit);
			}
			
			joinCircuit(circuit, tile);
			
			Project.recordStep(compressWorkspace());
		} else if (onto.hasClass("tile")) {
			var ps = $("<img />").attr("rel", "power");
			var map = tilePosition(onto);
			var circuit = onto.attr("circuit");
			var perform = true;

			if (map.fore.length === 0) {
				ps
				.addClass("power power-left power-center")
				.attr("src", "assets/img/powersupply/ps-right.png");
			} else if (map.above.length === 0) {
				ps
				.addClass("power power-top power-down")
				.attr("src", "assets/img/powersupply/ps-down.png");
			} else if (map.aft.length === 0 && onto.find(".zone.right img").length === 0) {
				ps
				.addClass("power power-right power-center")
				.attr("src", "assets/img/powersupply/ps-left.png");
			} else if (map.below.length === 0 && onto.find(".zone.bottom img").length === 0) {
				ps
				.addClass("power power-bottom power-up")
				.attr("src", "assets/img/powersupply/ps-up.png");
			} else {
				drake.cancel(true);
				perform = false;
			} 
			
			if (perform) {
				if (circuit) {
					$(".work-table .tile[circuit=" + circuit + "] .power").remove();
				}
				
				drop.remove();
				
				ps
				.appendTo(onto)
				.click(selectComponentForDeletion);
			
				buildComponentList();
				Project.recordStep(compressWorkspace());
			}
		}
	});

}

function removeComponents() {
	
	if (selectingComponents) {
		while (selected.length > 0) {
			var component = $(selected.pop());
			var tile = component.hasClass("tile") ? component : component.parents(".tile");
			var circuit = parseInt(tile.attr("circuit"));
			
			if (component.hasClass("tile")) {
				var map = tilePosition(component);
				
				if (map.above.attr("circuit") == circuit) {
					map.above
						.find(".zone.bottom")
						.find("img").remove();
				}
				
				if (map.fore.attr("circuit") == circuit) {
					map.fore
						.find(".zone.right")
						.find("img").remove();
				}

				component.parents(".tile-slot")
					.removeClass("tile-circuit")
					.css({borderColor: ""});
			}

			component.remove();

			if (circuit > 0) {
				adjustCircuit(circuit);
			}
			
			Project.recordStep(compressWorkspace());
		}

		$(".tile-row:not(:has(.tile))").remove();
		addTileRow(1);
		
		$(".tile-row")
			.each(function(i, el) {
				$(el).attr("y", i);
			});
	}

}

function startProject() {
	closeProject();
	
	Project.create(function() {
		prepareWizard();
		navigateWizard("temperature");
	});
}

function openProject() {
	var token = Cookies.get("auth");
	var user = Cookies.get("user");
	var dialog = $(".openProject");
	var close = dialog.find("[action=close]");
	
	close.click(function() {
		dialog.hide();
	});
	
	if (token) {
		dialog.show();
	} else {
		Cookies.set("_open", 1);
		window.location = "/account.html";
	}
}

function saveCurrentProject() {
	if (!Cookies.get("auth")) {
		Project.stash(compressWorkspace())
		Cookies.set("_save", 1);
		
		window.location = "/account.html";
	} else {
		var p = Project.active;
		
		p.content = compressWorkspace();
		saveProject(p);
	}
}

function saveProject(p) {
	var dialog = $(".saveProject")

	dialog.show();
	dialog.find("[name=projectTitle]").val(p.title).focus();
    dialog.find("[name=projectDescription]").val(p.description);		
	
	dialog.find("button[action=save]").click(function() {
		var title = $("[name=projectTitle]").val();
        var description = $("[name=projectDescription").val();		
        
        p.title = title;
        p.description = description;

		Project.save(p, function() {
			addProjectToDialog(p);
			dialog.hide();
		}, function(msg) {
			alert(msg);
		});

		dialog.find("button[action=save]").unbind("click");
	});

	dialog.find("button[action=close]").click(function() {
		dialog.find("button[action=save]").unbind("click");
		dialog.hide();
	});
}

function copyProject(project) {
	Project.create(function(copy) {
		copy.title = project.title + " (Copy)";
		copy.description = project.description;
		copy.content = project.content;
		copy.configuration = project.configuration;
		copy.settings = project.settings;
    
    	saveProject(copy);
	});
}

function exportProject() {
	window.open("print.html", "_blank");
}

function printProject() {
	window.open("print.html", "_blank");
}

function compressWorkspace() {
	var lzstring = window.LZString;
	var doc = $(".work-table").html();
	var b64 = lzstring.compressToBase64(doc);
	
	return b64;
}

function decompressWorkspace(b64) {
	var lzstring = window.LZString;
	var doc = $(".work-table");
	var circuits = [1];

	doc.html(lzstring.decompressFromBase64(b64));

	$(".tile, .tile .zone img, .tile .power")
		.click(selectComponentForDeletion);

	initializeDrag();
	
	drake.containers = drake.containers.concat($(".work-table").find(".tile-slot, .tile, .zone").get());
	
	$(".work-table .tile").each(function(i, el) {
		var circuitNumber = $(el).attr("circuit");
		
		circuits[circuitNumber] = 1;
	});

	for (var i in circuits) {
		if (i > 0) {
			addToCircuitPanel(i, CIRCUIT_COLOR[i - 1]);
			updateSystemSpecs(i)
		}
	}
	
	updateSystemSpecs();
	buildComponentList();
}

function addProjectToDialog(project) {
	var projectList = $(".project-list");

	var projPanel = function() {
		return $("<div />")
			.addClass("action-panel")
			.append($("<button />").text("Open").attr("rel", "open").addClass("open"))
			.append($("<button />").attr("rel", "edit").addClass("icon ion-edit"))
			.append($("<button />").attr("rel", "delete").addClass("icon ion-close"))
			.append($("<button />").attr("rel", "copy").addClass("icon ion-ios-copy"))
	};
	
	var projInfo = function(project) {
		return $("<div />")
			.addClass("project-info")
			.append(
				$("<label />")
					.text(project.title)
			)
			.append(
				$("<p />").text(project.description)
			)
			.click(function() { 
				Project.open(project.handle, function() {
					decompressWorkspace(project.content);
					prepareWizard();
					displayConfiguration();
					$(".sub-title[rel=project-title]").text(project.title);
					$(".openProject").hide();
				});
			});
	};

	var item = $("<div />")
		.addClass("project-item")
		.attr("rel", project.handle)
		.append(projPanel())
		.append(projInfo(project))
		.prependTo(projectList);

	if (projectList.children().length > 3) {
		$(".openProject").find(".button-navigation").show();
	} else {
		$(".openProject").find(".button-navigation").hide();
	}

	item.find(".action-panel button")
		.click(function() {
			var button = $(this);
			var item = button.parents(".project-item");
			var h = item.attr("rel");
			var project = Project.find(h);

			if (!project) {
				return;
			}
			
			switch (button.attr("rel")) {
				case "open": 
					Project.open(h, function() {
						decompressWorkspace(project.content);
						prepareWizard();
						displayConfiguration();
						$(".sub-title[rel=project-title]").text(project.title);
						$(".openProject").hide();
					});
					
					break;
					
				case "edit" :
					saveProject(project);
					$(".openProject").hide();
					
					break;
				case "copy" :
					copyProject(project);
					$(".openProject").hide();
					
					break;

				case "delete" :
					Project.delete(h, function() {
						if (Project.active.handle === h) {
							closeProject();
						}
						
						item.remove();
					}, function(msg) {
						alert(msg);
					});
					
					break;
			}
		});
}

function updateSystemSpecs(circuitNumber) {
	var selectedTemperature = Project.active.configuration.temperature;
	var specs = temperature[selectedTemperature];
	var workTable = $(".work-table");
	var tiles = workTable.find(".tile");
	var harnessCount = tiles.find(".zone img").length;
	var psCount = workTable.find("img.power").length;
	var circuitTiles = workTable.find(".tile[circuit=" + circuitNumber + "]");
	var circuitHarnessCount = circuitTiles.find(".zone img").length;
	var fields = $(".specs");
	var circuitFields = $(".circuit-panel [rel=" + circuitNumber + "]");
	var components = $(".components");
	var overallSet = false;
	var circuitSet = false;
	
	components.find("[rel=tileCount]").text(tiles.length);
	components.find("[rel=harnessCount]").text(harnessCount);
	components.find("[rel=powerCount]").text(psCount);
	$(".specs").find("[rel=temperature]").text(temperatureOptions[selectedTemperature]);

	if (specs) {
		for (var i = 0, spec; (spec = specs[i]) && (!overallSet || !circuitSet); i++) {
			if (!overallSet && spec.tiles == tiles.length && spec.harnesses <= harnessCount) {
				console.log("using", spec)
				fields.find("[rel=current]").text(spec.current);
				fields.find("[rel=power]").text(spec.power);
				fields.find("[rel=voltage]").text(spec.voltage);
	
				$(".circuit-panel [rel=0]")
					.find("[rel=current]").text(spec.current)
					.parents(".circuit-button")
					.find("[rel=power]").text(spec.power);
				
				overallSet = true;
			}
			
			if (!circuitSet && spec.tiles == circuitTiles.length && spec.harnesses <= circuitHarnessCount) {
				circuitFields.find("[rel=current]").text(spec.current);
				circuitFields.find("[rel=power]").text(spec.power);
				circuitSet = true;
			}
		}
	}
	
	tiles.each(function(index) {
		$(this).attr("rel", index);	
	});
	
}

function buildComponentList() {
	var workTable = $(".work-table");
	var tiles = workTable.find(".tile");
	var harnessCount = tiles.find(".zone img").length;
	var psCount = workTable.find("img.power").length;
	var ps = [];
	var list = [];
	var tbody = [];

	list.push({ name: "IllumiTile Light Engine", count: tiles.length });
	list.push({ name: "IllumiSnap Harness D", count: harnessCount });
	list.push({ name: "IllumiSnap Power Harness", count: psCount });
	
	workTable.find("img.power")
		.each(function(_, el) {
			var circuit = $(el).parents(".tile").attr("circuit");
			var rated = rateCircuitPower(circuit);
			var agg = ps[rated.value] || { ps: rated, count: 0 };
			
			agg.count++;
			
			ps[rated.value] = agg;
		});

	ps.forEach(function(x) {
		list.push({ name: x.ps.title, count: x.count });
	});
	
	for (var i = 0, item; (item = list[i]); i++) {
		if (item.count > 0) {
			tbody.push(
				$("<tr />")
					.append($("<td />").text(item.name))
					.append($("<td />").text(item.count))
					.append($("<td />").append($("<button />").addClass("button-help icon ion-help")))
				);
		}
	}
	
	$(".components .item-table tbody")
		.empty()
		.append(tbody);
}

function addTileRow(index) {
	var workTable = $(".work-table");
	var orientation = workTable.attr("orientation");
	var cols = orientation === "portrait" ? 8 : 20;
	var row = $("<div></div>")
		.addClass("tile-row")
		.attr("y", index);

	for (var i = 0; i < cols; i++) {
		var slot = $("<div />")
			.addClass("tile-slot")
			.attr("x", i);
		
		drake.containers.push(slot.get(0));
		row.append(slot);
	}

	workTable.append(row);

	return row;
}

function scaleCanvas(direction, ev) {
	var canvas = $(".work-table");
	var scale = parseFloat(canvas.attr("scale") || 1.0);
	var step = 0.10;
	var max = 1.5;
	
	if (isNaN(scale)) {
		scale = 1.0;
	}
	
	if (ev) {
		var button = $(ev.target);

		button.parent().addClass("button-active");
		setTimeout(function() { button.parent().removeClass("button-active"); }, 200);
		button.blur();
	}
	
	switch (direction) {
		case "-": {
			scale -= step;
			
			if (scale < step) {
				scale = step;
			}
			
			break;
		}
		
		case "+": 
		default : {
			scale += step;
			
			if (scale > max) {
				scale = max;
			}
		}
	}

	canvas.css("transform", "scale(" + scale + ")");
	canvas.attr("scale", scale);
}

function dimensionWorkTable(workspaceWidth, workspaceHeight) {
	var panningEnabled = !$(".work-table").draggable("option", "disabled");

	$(".work-table")
		.empty()
		.css({
			transform: "scale(" + INITIAL_SCALE + ")",
			top: "0px",
			left: "0px",
		})
		.attr("scale", INITIAL_SCALE);

	initializeDrag();

	$(".circuit-panel .circuit-button:gt(1)").remove();
	
	for (var y = 0; y < workspaceHeight; y++) {
		addTileRow(y);
	}
	
	createCircuits(splitCircuit(workspaceWidth, workspaceHeight));
	buildComponentList();
	
	drake.containers = drake.containers.concat($(".work-table").find(".tile-slot, .tile, .zone").get());
	
	Project.recordStep(compressWorkspace());
	
	if (panningEnabled) {
		$(".work-table")
			.css({cursor: "move"})
			.draggable("option", "disabled", false);
	}
}

function splitCircuit(width, height, offsetNumber, circuitOffset) {
	offsetNumber = offsetNumber || 0;
	circuitOffset = circuitOffset || 0;
	
		console.log("dimensioning", width, height, offsetNumber, circuitOffset)
	if (width * height <= 20) {
		if (width >= height) {
			return [{
				number: 1 + offsetNumber,
				startX: circuitOffset,
				startY: 0,
				width: width,
				height: height,
			}];
		} else if (height > width) {
			return [{
				number: 1 + offsetNumber,
				startX: 0,
				startY: circuitOffset,
				width: width,
				height: height,
			}];
		}
	}
	
	var list = [];
	
	if (width > height && width > 10) {
		var split = Math.floor(width / 2.0);
		var c1 = splitCircuit(split, height);
		var c2 = splitCircuit(width - split, height);
		var startY = 0;
		
		var row = [];

		for (var wI = 0; wI < c1.length; wI++) {
			var x = c1[wI].startX;
			var y = c1[wI].startY;

			row[y] = (row[y] || 0) + c1[wI].width;
		}

		for (var i = 0; i < c2.length; i++) {
			while (row[startY] + c2[i].width > width) {
				startY += c1[0].height;
			}

			c2[i].startX = row[startY] || 0;
			c2[i].startY = startY;
			
			row[startY] = (row[startY] || 0) + c2[i].width;
		}

		list = c1.concat(c2);

		for (var i = 0; i < list.length; i++) {
			list[i].number = i + 1;
		}

		console.log("circuit list", list);
		
		return list;
	} else if (height > width && height > 10) {
		var split = Math.floor(height / 2.0);
		var c1 = splitCircuit(width, split);
		var c2 = splitCircuit(width, height - split);
		var startY = 0;
		
		var row = [];

		for (var wI = 0; wI < c1.length; wI++) {
			var x = c1[wI].startX;
			var y = c1[wI].startY;

			row[y] = (row[y] || 0) + c1[wI].width;
		}

		for (var i = 0; i < c2.length; i++) {
			while (row[startY] + c2[i].width > width) {
				startY += c1[0].height;
			}

			c2[i].startX = row[startY] || 0;
			c2[i].startY = startY;
			
			row[startY] = (row[startY] || 0) + c2[i].width;
		}

		list = c1.concat(c2);
		
		for (var i = 0; i < list.length; i++) {
			list[i].number = i + 1;
		}			
		
		console.log("circuit list", list);
		
		return list;
	}
	
	if (width >= height) {
		if (width % 2 === 0 && width / 2 * height <= 20) {
			list.push({
				number: 1 + offsetNumber,
				width: width / 2,
				height: height,
				startX: circuitOffset,
				startY: 0,
			});
			
			list.push({
				number: 2 + offsetNumber,
				width: width / 2,
				height: height,
				startX: circuitOffset + width / 2,
				startY: 0,
			});
		} else {
			var maxHeight = Math.floor(20.0 / width);
			var circuitHeight = 0;
			
			for (var i = 0; i < Math.floor(height / maxHeight); i++) {
				list.push({
					number: i+1 + offsetNumber,
					width: width,
					height: maxHeight,
					startX: circuitOffset,
					startY: i * maxHeight,
				});
				
				circuitHeight += maxHeight;
			}
			
			if (circuitHeight < height) {
				list.push({
					number: list.length + 1 + offsetNumber,
					width: width,
					height: height - circuitHeight,
					startX: circuitOffset,
					startY: list.length * maxHeight,
				});
			}
		} 
	} else if (height > width) {
		if (height % 2 === 0 && height / 2 * width <= 20) {
			list.push({
				number: 1 + offsetNumber,
				width: width,
				height: height / 2,
				startX: 0,
				startY: circuitOffset,
			});
			
			list.push({
				number: 2 + offsetNumber,
				width: width,
				height: height / 2,
				startX: 0,
				startY: circuitOffset + height / 2,
			});
		} else {
			var maxWidth = Math.floor(20.0 / height);
			var circuitWidth = 0;
			
			for (var i = 0; i < Math.floor(width / maxWidth); i++) {
				list.push({
					number: i+1 + offsetNumber,
					width: maxWidth,
					height: height,
					startX: i * maxWidth,
					startY: circuitOffset,
				});
				
				circuitWidth += maxWidth;
			}
			
			if (circuitWidth < width) {
				list.push({
					number: list.length + 1 + offsetNumber,
					width: width - circuitWidth,
					height: height,
					startX: list.length * maxWidth,
					startY: circuitOffset,
				});
			}
		}
	} 
	
	console.log("circuit list", list);

	return list;
}

function setDesignMode(el, mode) {
	var opt = $(el);
	
	$(".work-table").attr("design-mode", mode);
	$("footer .specs .setting-auto").hide();
	
	if (mode === "manual") {
		$("footer .tools .overlay").remove();
	} else {
		$("footer .specs .setting-auto[rel=" + opt.attr("rel") + "]").show();
		
		if ($("footer .tools .overlay").length === 0) {
			$("<div />")
				.addClass("overlay")
				.appendTo($("footer .tools"));
		}
	}
}

function createCircuits(defs) {
	var lastX = 0;
	var lastY = 0;
	
	for (var i = 0, circuit; (circuit = defs[i]); i++) {
		lastX = Math.max(lastX, circuit.startX + circuit.width);
		lastY = Math.max(lastY, circuit.startY + circuit.height);
	}

	var placePowerSupply = function(circuit) {
		var selectedTile = { x: 0, y: 0 };
		
		if (circuit.startX === circuit.startY === 0) {
			if (circuit.height >= circuit.width) {
				selectedTile = { x: 0, y: Math.floor(circuit.height / 2)};
			} else {
				selectedTile = { y: 0, x: Math.floor(circuit.width / 2)};
			}
		} else if (circuit.startY === 0) {
			selectedTile = { x: circuit.startX + Math.floor(circuit.width / 2), y: 0};
		} else if (circuit.height + circuit.startY === lastY) {
			selectedTile = { x: circuit.startX + Math.floor(circuit.width / 2), y: circuit.startY + circuit.height - 1 };
		} else if (circuit.startX === 0) {
			selectedTile = { x: 0, y: circuit.startY + Math.floor(circuit.height / 2)};
		} else if (circuit.startX + circuit.width === lastX) {
			selectedTile = { x: circuit.startX + circuit.width - 1, y: circuit.startY + Math.floor(circuit.height / 2) };
		} else {
			return;
		}
		
		console.log("place ps", circuit, selectedTile)

		var ps = $("<img />").attr("rel", "power");
		
		if (selectedTile.x === 0) {
			ps
			.addClass("power power-left power-center")
			.attr("src", "assets/img/powersupply/ps-right.png");
		} else if (selectedTile.y === 0) {
			ps
			.addClass("power power-top power-down")
			.attr("src", "assets/img/powersupply/ps-down.png");
		} else if (selectedTile.x === circuit.startX + circuit.width - 1) {
			ps
			.addClass("power power-right power-center")
			.attr("src", "assets/img/powersupply/ps-left.png");
		} else if (circuit.width > circuit.height) {
			ps
			.addClass("power power-bottom power-up")
			.attr("src", "assets/img/powersupply/ps-up.png");
		} else {
			ps
			.addClass("power power-right power-center")
			.attr("src", "assets/img/powersupply/ps-left.png");
		}
		
		ps.click(selectComponentForDeletion);
		
		$(".tile-row[y=" + selectedTile.y + "] > .tile-slot[x=" + selectedTile.x + "] > .tile").append(ps);
	};

	var distributeHarnesses = function (rows, cells) {
		var harness = function() {
			
			return $("<img />")
				.attr({ src: "./assets/img/tile/harness_180x22.png" })
				.css({ zIndex: 2 })
				.click(selectComponentForDeletion);
	
		};
		
		for (var y = 0; y < rows.length; y++) {
			var row = $(".tile-row[y=" + rows[y] + "]");
	
			for (var x = 0; x < cells.length; x++) {
				var tile = row.find(".tile-slot[x=" + cells[x] + "] > .tile");
	
				if (y < rows.length - 1) {
					tile.find(".bottom").append(harness());
				}
				
				if (x < cells.length - 1 && (y === 0 || y === rows.length - 1)) {
					tile.find(".right").append(harness());
				}
			}
		}
	};

	for (var i = 0, circuit; circuit = defs[i]; i++) {
		var number = circuit.number;
		var startX = circuit.startX;
		var startY = circuit.startY;
		var width = circuit.width;
		var height = circuit.height;
		
		var circuitColor = CIRCUIT_COLOR[i];

		for (var y = 0; y < height; y++) {
			var row = $(".work-table").find(".tile-row[y=" + (y + startY) + "]");
	
			for (var x = 0; x < width; x++) {
				var slot = row.find(".tile-slot[x=" + (x + startX) + "]");
				
		 	 	var tile = $(' \
		 	 		<div class="tile"> \
				 		<div class="zone right"></div> \
				 		<div class="zone bottom"></div> \
				 	</div> \
				')
				.attr("src", "./assets/img/tile/illumitile_252x252.png")
				.attr("circuit", number)
				.click(selectComponentForDeletion)
				.appendTo(slot);
		
				slot
					.addClass("tile-circuit")
					.css({borderColor: circuitColor});
			}
			
		}
		
		var rows= [];
		var cells = [];
		
		for (var y = 0; y < height; y++) {
			rows.push(startY + y);
		}	
		
		for (var x = 0; x < width; x++) {
			cells.push(startX + x);
		}
		
		distributeHarnesses(rows, cells);
		placePowerSupply(circuit);
		addToCircuitPanel(number, circuitColor);
		updateSystemSpecs(number);
	}
	
}

function testCircuit(number, enabled) {
	if (!enabled) {
		$(".tile[circuit=" + number + "]")
			.removeAttr("tested")
			.siblings(".test-pass, .test-fail")
			.remove();

		return;
	}
	
	var circuit = $(".work-table .tile[circuit=" + number + "]");
	var source = circuit.find(".power").parent(".tile");
	
	var checkForPower = function(tile, circuit) {
		return tile.attr("circuit") === circuit && tile.siblings(".test-pass").length > 0;
	};
	
	var passTile = function(tile) {
		var retest = tile.attr("tested") === "1" && tile.siblings(".test-fail").length > 0;
		
		tile
			.parents(".tile-slot")
			.append($("<div />").addClass("test-pass").addClass("tile-temperature-" + Project.active.configuration.temperature))
			.find(".test-fail, .test-pass:gt(0)")
			.remove();
			
		if (retest) {
			testNeighbor(tile);
		}
	}

	var testNeighbor = function(key) {
		if (key.length === 0) return;
		
		var map = tilePosition(key);
		var keyCircuit = key.attr("circuit");

		key.attr("tested", "1");

		if (checkForPower(key, keyCircuit) ||
			key.find(".power").length > 0 ||
			(checkForPower(map.fore, keyCircuit) && map.fore.find(".zone.right img").length > 0) ||
			(checkForPower(map.above, keyCircuit) && map.above.find(".zone.bottom img").length > 0) ||
			(checkForPower(map.aft, keyCircuit) && key.find(".zone.right img").length > 0) ||
			(checkForPower(map.below, keyCircuit) && key.find(".zone.bottom img").length > 0)) 
		{

			passTile(key);

			if (map.fore.find(".zone.right img").length > 0) {
				passTile(map.fore);
			}

			if (map.above.find(".zone.bottom img").length > 0) {
				passTile(map.above);
			}

			if (key.find(".zone.right img").length > 0) {
				passTile(map.aft);
			}

			if (key.find(".zone.bottom img").length > 0) {
				passTile(map.below);
			}
		}

		if (map.fore.attr("circuit") === key.attr("circuit") && map.fore.attr("tested") !== "1") {
			testNeighbor(map.fore); 
		}

		if (map.aft.attr("circuit") === key.attr("circuit") && map.aft.attr("tested") !== "1") {
			testNeighbor(map.aft); 
		}

		if (map.above.attr("circuit") === key.attr("circuit") && map.above.attr("tested") !== "1") {
			testNeighbor(map.above); 
		}

		if (map.below.attr("circuit") === key.attr("circuit") && map.below.attr("tested") !== "1") {
			testNeighbor(map.below); 
		}
	};

	circuit.parents(".tile-slot").append($("<div />").addClass("test-fail"));
	
	testNeighbor(source); 
}

function joinCircuit(number, circuitKey) {
	if (!circuitKey || circuitKey.length === 0 || circuitKey.attr("circuit-set")) return;
	
	var circuit = $(".work-table .tile[circuit=" + number + "]");
	var circuitColor = CIRCUIT_COLOR[number - 1];
	
	var go = function(key) {
		if (!key || key.length === 0 || key.attr("circuit-set")) return;
	
		key.attr("circuit", number);
		key.attr("circuit-set", "1");
		
		key.parents(".tile-slot")
			.addClass("tile-circuit")
			.css({borderColor: circuitColor});
		
		var row = key.parents(".tile-row");
		var cell = key.parents(".tile-slot");
		var x = parseInt(cell.attr("x"));
		var y = parseInt(row.attr("y"));
	
		var fore = key.parents(".tile-row[y=" + y + "]").find(".tile-slot[x=" + (x - 1) + "] .tile");
		var aft = key.parents(".tile-row[y=" + y + "]").find(".tile-slot[x=" + (x + 1) + "] .tile");
		var above = $(".work-table .tile-row[y=" + (y - 1) + "]").find(".tile-slot[x=" + x + "] .tile");
		var below = $(".work-table .tile-row[y=" + (y + 1) + "]").find(".tile-slot[x=" + x + "] .tile");

		if (fore.find(".zone.right img").length > 0)  {
			fore.attr("circuit", number);
			go(fore);
		}
		
		if (above.find(".zone.bottom img").length > 0)  {
			above.attr("circuit", number);
			go(above);
		}
		
		if (key.find(".zone.bottom img").length > 0)  {
			below.attr("circuit", number);
			go(below);
		}
		
		if (key.find(".zone.right img").length > 0)  {
			aft.attr("circuit", number);
			go(aft);
		}
	}
	
	if (circuit.length === 0) {
		circuit = circuitKey;
		addToCircuitPanel(number, circuitColor);
	} else {
		circuitColor = $(".circuit-panel .circuit-button[rel=" + number + "] .circuit-button-title").css("backgroundColor");
	}

	go(circuitKey);
	
	$(".work-table .tile[circuit=" + number + "]")
	.removeAttr("circuit-set")
	.find("img[rel=power]").each(function(i, el) {
		if (i > 0) {
			$(el).remove();
		}
	});
	
	cleanupCircuitPanel();
	updateSystemSpecs(number);
	buildComponentList();
}

function adjustCircuit(number) {
	var circuit = $(".work-table .tile[circuit=" + number + "]");
	var startRow = 999;
	var startCol = 999;
	var pass = 0;
	var doAdjustment = false;

	circuit
		.removeAttr("circuit")
		.parents(".tile-slot")
			.removeClass("tile-circuit")
			.css({borderColor: ""});
			
	$(".circuit-panel .circuit-button[rel=" + number + "]").remove();
	
	do {
		doAdjustment = false;
		startRow = 999;
		startCol = 999;
		
		circuit.each(function(i, el) {
			var tile = $(el);

			if (!tile.attr("circuit")) {
				startCol = Math.min(startCol, parseInt(tile.parents(".tile-slot").attr("x")));
				startRow = Math.min(startRow, parseInt(tile.parents(".tile-row").attr("y")));
				doAdjustment = true;
			}
		});

		if (doAdjustment) {
			console.log("adjusting: pass", pass);
			console.log("starting at", startCol, startRow);
			joinCircuit(number, $(".work-table .tile-row[y=" + startRow + "] .tile-slot[x=" + startCol + "] .tile"));
			number = parseInt($(".circuit-panel .circuit-button:last").attr("rel")) + 1;
		}
		
		pass++;
	} while (doAdjustment && pass < 5);
	
	cleanupCircuitPanel();
}

function cleanupCircuitPanel() {
	$(".circuit-panel .circuit-button:gt(0)").each(function(i, el) {
		var button = $(el);
		
		if ($(".work-table .tile[circuit=" + button.attr("rel") + "]").length === 0) {
			button.remove();
		}
	})
}

function selectComponentForDeletion(ev) {
	var i = -1;
	var el = $(this);

	if (selectingComponents) {
		if ((i = selected.indexOf(this)) >= 0) {
			el
				.css({backgroundColor: "transparent"})
				.find(".highlight").remove();
				
			selected.splice(i, 1);
		} else {
			if (el.hasClass("tile")) {
				el.append($("<div />").addClass("highlight"));
			} else {
				el.css({backgroundColor: "yellow"});
			}
			
			selected.push(this);
			
			removeComponents();
		}
	}

	ev.stopPropagation();
}

function tilePosition(tile) {
	var pos = {
		x: parseInt(tile.parents(".tile-slot").attr("x")),
		y: parseInt(tile.parents(".tile-row").attr("y")),
	};
	
	return {
		point: pos,
		fore: $(".work-table .tile-row[y=" + pos.y  + "] .tile-slot[x=" + (pos.x - 1) + "] .tile"),
		aft: $(".work-table .tile-row[y=" + pos.y  + "] .tile-slot[x=" + (pos.x + 1) + "] .tile"),
		above: $(".work-table .tile-row[y=" + (pos.y - 1)  + "] .tile-slot[x=" + pos.x + "] .tile"),
		below: $(".work-table .tile-row[y=" + (pos.y + 1)  + "] .tile-slot[x=" + pos.x + "] .tile"),
	};
}

function addToCircuitPanel(number, circuitColor) {
	var circuitName = [
		"All", 
		"One", 
		"Two", 
		"Three", 
		"Four", 
		"Five", 
		"Six", 
		"Seven", 
		"Eight", 
		"Nine", 
		"Ten", 
		"Eleven", 
		"Tweleve"
	];
	
	$(".circuit-panel .circuit-button[rel=" + number + "]").remove();
	
	var button = $("<div />")
		.addClass("circuit-button")
		.attr("rel", number)
		.append(
			$("<div />")
				.addClass("drop-shadow")
		)
		.append(
			$("<div />")
				.addClass("circuit-button-title")
				.css({backgroundColor: circuitColor, borderColor: circuitColor})
				.text("Circuit " + circuitName[number])
		)
		.append(
			$("<div />")
				.addClass("circuit-button-specs")
				.append(
					$("<div />")
						.append($("<span />").text("Current "))
						.append($("<span />").attr("rel", "current"))
						.append($("<span />").text(" Amps"))
				)
				.append(
					$("<div />")
						.append($("<span />").text("Power "))
						.append($("<span />").attr("rel", "power"))
						.append($("<span />").text(" Watts"))
				)
		)
		.append(
			$("<div />")
				.addClass("circuit-test-button")
				.append($("<div />").addClass("drop-shadow"))
				.append($("<button />").addClass("button-secondary").text("Test"))
		)
		.click(function() {
			if (number === 0) return;
			
			var button = $(this);
			var circuit = $(".work-table .tile[circuit=" + number + "]");
			var testing = !button.hasClass("circuit-button-test");
			var testTempClass = "test-temperature-" + Project.active.configuration.temperature;

			button.toggleClass("circuit-button-test");
			button.removeClass("test-fail");
			button.removeClass("test-pass");
			button.removeClass(testTempClass);
			
			testCircuit(number, testing);
			
			if (testing) {
				if (circuit.hasClass("test-fail")) {
					button.addClass("test-fail");
				} else {
					button
						.addClass("test-pass")
						.addClass(testTempClass);
				}
			}
		})
		.appendTo($(".circuit-panel"));
		
	if (number === 0) {
		button.click(function() {
			var buttons = $(".circuit-panel .circuit-button:not([rel=0])");

			if (buttons.filter(".circuit-button-test").length === buttons.length) {
				buttons.click();				
			} else {
				buttons.filter(":not(.circuit-button-test)").click();
			}
		});
	}
}

function navigateWizard(step) {
	$(".wizard").hide()
		.siblings("[rel=" + step + "]").show();
}

function setWizardWorkMode(mode) {
	$(".wizard").find("[rel=auto-area],[rel=auto-size],[rel=manual]").hide();
	
	if (mode && mode.length > 0) {
		$(".wizard").find("[rel=" + mode + "]").show();
	}
}

function prepareWizard() {
	var project = Project.active;
	
	project.configuration = project.configuration || {};

	$(".wizard[rel=temperature] input[name=temperature]").prop("checked", false);
	$(".wizard[rel=work-mode] input[name=configuration]").prop("checked", false);

	if (project.configuration.temperature && project.configuration.temperature.length > 0) {
		$(".wizard[rel=temperature] input[name=temperature][value=" + project.configuration.temperature + "]").prop("checked", true);
	}
	
	if (project.configuration.workMode && project.configuration.workMode.length > 0) {
		$(".wizard[rel=work-mode] input[name=configuration][value=" + project.configuration.workMode + "]").prop("checked", true);
	}

	if (project.configuration.workMode === "auto-area") {
		$(".wizard[rel=auto-config] input[name=work-table-width]").val(project.configuration.areaWidth);
		$(".wizard[rel=auto-config] input[name=work-table-height]").val(project.configuration.areaHeight);

		if ($("footer .tools .overlay").length === 0) {
			$("<div />")
				.addClass("overlay")
				.appendTo($("footer .tools"));
		}
	} else {
		$(".wizard[rel=auto-config] input[name=work-table-width]").val("");
		$(".wizard[rel=auto-config] input[name=work-table-height]").val("");
	}
	
	if (project.configuration.workMode === "auto-size") {
		$(".wizard[rel=auto-config] input[name=tile-count-width]").val(project.configuration.tileWidth);
		$(".wizard[rel=auto-config] input[name=tile-count-height]").val(project.configuration.tileHeight);
		
		if ($("footer .tools .overlay").length === 0) {
			$("<div />")
				.addClass("overlay")
				.appendTo($("footer .tools"));
		}
	} else {
		$(".wizard[rel=auto-config] input[name=tile-count-width]").val("");
		$(".wizard[rel=auto-config] input[name=tile-count-height]").val("");
	}

	if (project.configuration.workMode === "manual") {
		$("footer .tools .overlay").remove();
	}
	
	setWizardWorkMode(project.configuration.workMode);
}

function saveWizard() {
	var project = Project.active;
	
	project.configuration = project.configuration || {};
	
	project.configuration.temperature = $(".wizard[rel=temperature] input[name=temperature]:checked").val();
	project.configuration.workMode = $(".wizard[rel=work-mode] input[name=configuration]:checked").val();
	
	if (project.configuration.workMode === "auto-area") {
		project.configuration.areaWidth = $(".wizard[rel=auto-config] input[name=work-table-width]").val();
		project.configuration.areaHeight = $(".wizard[rel=auto-config] input[name=work-table-height]").val();

		dimensionWorkTable(Math.floor(parseFloat(project.configuration.areaWidth) / 4.0), Math.floor(parseFloat(project.configuration.areaHeight) / 4.0));

		if ($("footer .tools .overlay").length === 0) {
			$("<div />")
				.addClass("overlay")
				.appendTo($("footer .tools"));
		}
	} else {
		project.configuration.areaWidth = "";
		project.configuration.areaHeight = "";
	}
	
	if (project.configuration.workMode === "auto-size") {
		project.configuration.tileWidth = $(".wizard[rel=auto-config] input[name=tile-count-width]").val();
		project.configuration.tileHeight = $(".wizard[rel=auto-config] input[name=tile-count-height]").val();
		
		dimensionWorkTable(parseFloat(project.configuration.tileWidth), parseFloat(project.configuration.tileHeight));

		if ($("footer .tools .overlay").length === 0) {
			$("<div />")
				.addClass("overlay")
				.appendTo($("footer .tools"));
		}
	} else {
		project.configuration.tileWidth = "";
		project.configuration.tileHeight = "";
	}

	if (project.configuration.workMode === "manual") {
		$("footer .tools .overlay").remove();
	}

	displayConfiguration();	
	navigateWizard("_blank");
}

function exitWizard() {
	var project = Project.active;
	
	navigateWizard("_blank");
	
	project.configuration.temperature = "";
	project.configuration.workMode = "";
	project.configuration.areaWidth = "";
	project.configuration.areaHeight = "";
	project.configuration.tileWidth = "";
	project.configuration.tileHeight = "";	
}

function navigateHistory(direction, e) {
	var ws = undefined;
	
	switch (direction) {
		case "+" : ws = Project.stepForward(); break;
		case "-" : ws = Project.stepBackward(); break;
	}
	
	if (ws) {
		decompressWorkspace(ws);
		cleanupCircuitPanel();
	}
}

function rateCircuitPower(circuitNumber) {
	var specs = temperature[Project.active.configuration.temperature || "neutral"];
	var workTable = $(".work-table");
	var circuitTiles = workTable.find(`.tile[circuit=${circuitNumber}]`);
	var circuitHarnessCount = circuitTiles.find(".zone img").length;

	console.log(`rating circuit - ${circuitNumber}: ${circuitTiles.length} tiles, ${circuitHarnessCount} harnesses`);

	for (var i = 0, spec; (spec = specs[i]); i++) {
		if (spec.tiles == circuitTiles.length && spec.harnesses <= circuitHarnessCount) {
			var derate = parseFloat($("[rel=power-derate]").val());
			var power = spec.power;
			var rating = Math.ceil(power + power * derate);

			console.log(`power: ${spec.power}, derate: ${derate}, rating: ${rating}`);

			for (var y = 0, ps; (ps = POWER_SUPPLY[y]); y++) {
				if (ps.value >= rating) {
					return ps;
				}
			}
		}
	}	
}

function displayConfiguration() {
	var project = Project.active;
	
	$(".specs .setting [rel=work-mode]").text(configModeOptions[project.configuration.workMode]);
	$(".specs .setting [rel=temperature]").text(temperatureOptions[project.configuration.temperature]);

}