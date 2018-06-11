
var selectingComponents = true;
var selected = [];

var workspaces = [];

var WORK_MODE_SELECT = 10;
var WORK_MODE_BROWSE = 20;

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

var workingProject = {
	temperature: "",
	workMode: "",
	areaWidth: "",
	areaHeight: "",
	tileWidth: "",
	tileHeight: "",
};

var temperatureOptions = [];

temperatureOptions["cool"] = "Cool (6000K CCT)";
temperatureOptions["neutral"] = "Neutral (4500K CCT)";
temperatureOptions["warm"] = "Warm (3000K CCT)";

$( function() {
	resetWorkTable();

	$("#footerHandle").on("click", function() {
		var footer = $("footer");
		var handle = $("#footerHandle");

		if (footer.hasClass("closed")) {
			footer.animate({bottom: 0}, 300, "easeInBack");
			footer.removeClass("closed");
			handle.switchClass("ion-arrow-up-a", "ion-arrow-down-a");
		} else {
			footer.animate({bottom: footer.outerHeight() * -1 + 35}, 300, "easeInBack");
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
			case "saveProject" : saveProject(); break;
			case "export" : exportProject(); break;
			case "closeProject" : closeProject(); break;
			case "print" : printProject(); break;
			default : break;
		}
		
		menu.val("");
	});

	var ws = null;
	
	if ((ws = Cookies.get("_ws"))) {
		decompressWorkspace(ws);
	} 

	if (Cookies.get("_save")) {
		 saveProject();		
	} 

	if (Cookies.get("auth")) {
		loadProjects(function(resp) {
			if (Cookies.get("_open")) {
				 openProject();		
			} else if ((ws = Cookies.get("ws"))) {
				for (var i = 0, project; project = resp.data[i]; i++) {
					if (project.handle === ws) {
						var saveDialog = $(".saveProject");
						var saveTitle = saveDialog.find("[name=projectTitle]");
						var saveDescription = saveDialog.find("[name=projectDescription]");
						
						decompressWorkspace(project.content);
						saveTitle.val(project.title);
						saveDescription.val(project.description);
					}
				}
			} 
		})
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

	if (window.localStorage) {
		$(window)
			.on("unload", function() {
				window.localStorage.lastProject = JSON.stringify({ html: compressWorkspace(), project: workingProject });
			});
			
		if (window.localStorage.lastProject) {
			var p = JSON.parse(window.localStorage.lastProject);
			
			workingProject = p.project;
			decompressWorkspace(p.html);
			prepareWizard();
		} else {
			prepareWizard();
		}
	} else {
		prepareWizard();
	}

	setTimeout(function() {
		downloadProject();
	}, 500);
});

function setWorkMode(mode, ev) {
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
				.css({cursor: "move"})
				.draggable("option", "disabled", false);
				
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
	
	$(".main-toolbar .button-place").removeClass("button-active");
	
	$(ev.target)
		.blur()
		.parent()
		.addClass("button-active");
}

function closeProject() {
	resetWorkTable(); 

	Cookies.remove("ws");
	Cookies.remove("_ws");
}

function resetWorkTable() {
	$(".work-table")
		.empty()
		.draggable({ disabled: true, })
		.css({ transform: "scale(1.0)"})
		.attr({ scale: "1.0" });

	$(".circuit-panel .circuit-button").remove();
	$(".sub-title[rel=project-title]").text("");

	addToCircuitPanel(0, "black");
	addTileRow(0);
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
	createProject(function() {
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
		Cookies.remove("_open");
		dialog.show();
	} else {
		Cookies.set("_open", 1);
		window.location = "/account.html";
	}
}

function downloadProject() {
	html2canvas(document.body, {
		backgroundColor: "#3f3f3f"
	})
		.then(function(canvas) {
			canvas.toBlob(function(blob) {
				var url = window.URL.createObjectURL(blob);

				window.location = url;
			});
		});		
}

function saveProject() {
	var ws = compressWorkspace();
	
	console.log("compressed to", ws);
	
	Cookies.remove("_ws");
	Cookies.remove("_save");
	
	var token = Cookies.get("auth");
	var user = Cookies.get("user");

    var doSave = function(handle) {
        var title = $("[name=projectTitle]").val();
        var description = $("[name=projectDescription").val();

		$.ajax({
			url: "/project/" + handle,
			method: "PUT",
			
            headers: {
            	"Authorization": token,
            	"x-configurator-user": user,
            },

			data: JSON.stringify({
				title: title,
				description: description,
				content: ws,
			}),
			
			success: function() {
				dialog.hide();
			}
		})
		.fail(function (resp) {
            var response = resp.responseJSON && resp.responseJSON.response;
            var message = (response && response.status < 500 && response.statusMessage) || "There was a problem saving your project. Please try again later.";

            window.alert(message);
		});
    };

	if (token) {
		var dialog = $(".saveProject")
		
		dialog.show();
		dialog.find("input").focus();
		
		dialog.find("button[action=save]").click(function() {
			Cookies.remove("_save");
			
			var handle = Cookies.get("ws");

			if (handle && handle.length > 0) {
				doSave(handle);
			} else {
				createProject(
					function(resp) { 
						doSave(resp.data.handle);
					},
					function(resp) {
			            var response = resp.responseJSON && resp.responseJSON.response;
			            var message = (response && response.status < 500 && response.statusMessage) || "There was a problem saving your project. Please try again later.";
			
			            window.alert(message);
					}
				);
			}
			
			dialog.find("button[action=save]").unbind("click");
		});

		dialog.find("button[action=close]").click(function() {
			dialog.find("button[action=save]").unbind("click");
			dialog.hide();
		});
	} else {
		Cookies.set("_ws", ws);
		Cookies.set("_save", 1);
		
		window.location = "/account.html";
	}

}

function exportProject() {
	
}

function printProject() {
	
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
}

function loadProjects(next) {
	var token = Cookies.get("auth");
	var user = Cookies.get("user");

	console.log("loading projects");

    $.ajax({
        url: "/project/",
        method: "GET",
        
        headers: {
        	"Authorization": token,
        	"x-configurator-user": user,
        },

		success: function(resp) {
			var projectList = $(".project-list");

			for (var i = 0, project; project = resp.data[i]; i++) {
				var content = project.content;
				
				$("<div />")
					.append(
						$("<a />")
							.text(project.title)
							.attr("href", "javascript:void(0)")
							.attr("rel", i)
							.click(function() { 
								var project = resp.data[$(this).attr("rel")];

								Cookies.set("ws", project.handle);
								decompressWorkspace(project.content);
								$(".sub-title[rel=project-title]").text(project.title);

								$(".openProject").hide();
							})
					)
					.append(
						$("<span />")
							.text(project.description)
					)
					.appendTo(projectList);
			}

			if (next) {
				next(resp);
			}
		},	
    })
    .fail(function(resp) {
        var response = resp.responseJSON && resp.responseJSON.response;
        var message = (response && response.status < 500 && response.statusMessage) || "There was a problem retrieving your projects. Please try again later.";

        window.alert(message);
    });
}

function updateSystemSpecs(circuitNumber) {
	var selectedTemperature = workingProject.temperature;
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
	components.find("[rel=temperature]").text(temperatureOptions[selectedTemperature]);

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
		
		row.append(slot);
	}

	workTable.append(row);

	return row;
}

function scaleCanvas(direction, ev) {
	var canvas = $(".work-table");
	var button = $(ev.target);
	var scale = parseFloat(canvas.attr("scale") || 1.0);
	var step = 0.10;
	var max = 1.5;
	
	if (isNaN(scale)) {
		scale = 1.0;
	}
	
	button.parent().addClass("button-active");
	setTimeout(function() { button.parent().removeClass("button-active"); }, 200);
	button.blur();
	
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
	
	var translateX = canvas.width() * scale * -0.5;
	var translateY = canvas.height() * scale * -0.5;
	
	canvas.css("transform", "scale(" + scale + ")");
	canvas.attr("scale", scale);
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
			.removeClass("test-pass")
			.removeClass("test-fail")
			.removeAttr("tested");
			
		return;
	}
	
	var circuit = $(".work-table .tile[circuit=" + number + "]");
	var source = circuit.find(".power").parent(".tile");

	var testNeighbor = function(key) {
		if (key.length === 0) return;
		
		var map = tilePosition(key);

		key.attr("tested", "1");

		if (key.hasClass("test-pass") ||
			key.find(".power").length > 0 ||
			(map.fore.attr("circuit") === key.attr("circuit") && map.fore.hasClass("test-pass") && map.fore.find(".zone.right img").length > 0) ||
			(map.above.attr("circuit") === key.attr("circuit") && map.above.hasClass("test-pass") && map.above.find(".zone.bottom img").length > 0) ||
			(map.aft.attr("circuit") === key.attr("circuit") && map.aft.hasClass("test-pass") && key.find(".zone.right img").length > 0) ||
			(map.below.attr("circuit") === key.attr("circuit") && map.below.hasClass("test-pass") && key.find(".zone.bottom img").length > 0)) 
		{
			key.addClass("test-pass");
			key.removeClass("test-fail");
			
			if (key.find(".zone.right img").length > 0) {
				map.aft.addClass("test-pass");
				map.aft.removeClass("test-fail");
			}

			if (key.find(".zone.bottom img").length > 0) {
				map.below.addClass("test-pass");
				map.below.removeClass("test-fail");
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

	circuit.addClass("test-fail");
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
				.text("Test")
		)
		.click(function() {
			if (number === 0) return;
			
			var button = $(this);
			var circuit = $(".work-table .tile[circuit=" + number + "]");
			var testing = !button.hasClass("circuit-button-test");

			button.toggleClass("circuit-button-test");
			button.removeClass("test-fail");
			button.removeClass("test-pass");
			
			testCircuit(number, testing);
			
			if (testing) {
				if (circuit.hasClass("test-fail")) {
					button.addClass("test-fail");
				} else {
					button.addClass("test-pass");
				}
			}
		})
		.appendTo($(".circuit-panel"));
		
	if (number === 0) {
		button.click(function() {
			$(".circuit-panel .circuit-button:not([rel=0])").each(function(i, el) {
				var button = $(el);
				
				if (!button.hasClass("circuit-button-test")) {
					button.click();
				}
			});
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
	$(".wizard[rel=temperature] input[name=temperature]").prop("checked", false);
	$(".wizard[rel=work-mode] input[name=configuration]").prop("checked", false);

	if (workingProject.temperature && workingProject.temperature.length > 0) {
		$(".wizard[rel=temperature] input[name=temperature][value=" + workingProject.temperature + "]").prop("checked", true);
	}
	
	if (workingProject.workMode && workingProject.workMode.length > 0) {
		$(".wizard[rel=work-mode] input[name=configuration][value=" + workingProject.workMode + "]").prop("checked", true);
	}

	if (workingProject.workMode === "auto-area") {
		$(".wizard[rel=auto-config] input[name=work-table-width]").val(workingProject.areaWidth);
		$(".wizard[rel=auto-config] input[name=work-table-height]").val(workingProject.areaHeight);

		if ($("footer .tools .overlay").length === 0) {
			$("<div />")
				.addClass("overlay")
				.appendTo($("footer .tools"));
		}
	} else {
		$(".wizard[rel=auto-config] input[name=work-table-width]").val("");
		$(".wizard[rel=auto-config] input[name=work-table-height]").val("");
	}
	
	if (workingProject.workMode === "auto-size") {
		$(".wizard[rel=auto-config] input[name=tile-count-width]").val(workingProject.tileWidth);
		$(".wizard[rel=auto-config] input[name=tile-count-height]").val(workingProject.tileHeight);
		
		if ($("footer .tools .overlay").length === 0) {
			$("<div />")
				.addClass("overlay")
				.appendTo($("footer .tools"));
		}
	} else {
		$(".wizard[rel=auto-config] input[name=tile-count-width]").val("");
		$(".wizard[rel=auto-config] input[name=tile-count-height]").val("");
	}

	if (workingProject.workMode === "manual") {
		$("footer .tools .overlay").remove();
	}
	
	setWizardWorkMode(workingProject.workMode);
}

