
var selectingComponents = false;
var selected = [];

var workspaces = [];

var tileZoneConfig = {
 	accept: "[rel=harness]",
 	drop: function(e, ui) {
 		var zone = $(this);

		zone.empty();

		$("<img />")
			.attr({ src: ui.helper.attr("src") })
			.css({ zIndex: 2 })
			.click(function(ev) {
				var i = -1;

				if (selectingComponents) {
					if ((i = selected.indexOf(this)) >= 0) {
						$(this).css({backgroundColor: "transparent"});
						selected.splice(i, 1);
					} else {
						$(this).css({backgroundColor: "yellow"});
						selected.push(this);
					}
				}

				ev.stopPropagation();
			})
			.appendTo(zone);

		zone
			.droppable("option", "disabled", true)
			.css({zIndex: 2});
			
		updateSystemSpecs();
 	},
 	over: function(e, ui) {
 		var target = $(this);
 		if (target.hasClass("bottom")) {
 			ui.helper.css({
 				transform: "rotate(90deg)",
 				left: (target.offset().left - 500) + "px",
 				top: (target.offset().top + 1000) + "px",
 			});
 		}
 	},
 	out: function(e, ui) {
 		var target = $(this);
 		if (target.hasClass("bottom")) {
 			ui.helper.css({transform: "rotate(0deg)", left: "0px", top: "0px"});
 		}
 	}
};

$( function() {
	clearWorkTable();
	prepareWorkTable();

	$("#footerHandle").on("click", function() {
		var footer = $("footer");
		var handle = $("#footerHandle");

		if (footer.hasClass("closed")) {
			footer.animate({bottom: 0}, 300, "easeInBack");
			footer.removeClass("closed");
			handle.switchClass("ion-arrow-up-a", "ion-arrow-down-a");
		} else {
			footer.animate({bottom: footer.outerHeight() * -1 + 20}, 300, "easeInBack");
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

	$("input[name=temperature]")
		.change(function() {
			updateSystemSpecs();				
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
			
			if (isNaN(val) || val < 4) {
				val = 4;
			}

			field.val(val.toFixed(1));
			
			dimensionWorkTable();
		});
		
	$("input[type=radio][name=configuration]")
		.click(function() {
			var option = $(this);
			var instruction = option.attr("rel");

			$(".instructions").hide();
			$(".instructions[rel=" + instruction + "]").show();
		})
		.first()
		.click();

});

function closeProject() {
	clearWorkTable(); 
	prepareWorkTable();	
	
	Cookies.remove("ws");
	Cookies.remove("_ws");
}

function clearWorkTable() {
	$(".work-table").empty();
	addTileRow(0);
}

function prepareWorkTable() {
	var workTable = $(".work-table");
	
	$(".drag-to-canvas")
	 	.draggable({
	 		containment: ".work-table",
	 		zIndex: $(this).attr("rel") == "harness" ? 2 : 0,
	 		snap: $(this).attr("rel") == "harness" ? ".zone" : ".tile-slot",
	 		snapMode: "inner",
	 		//snapTolerance: 50,
	 		helper: function() {
	 			var component = "";

	 			switch($(this).attr("rel")) {
	 				case "tile" 	: component = "./assets/img/tile/illumitile_252x252.png"; break;
	 				case "harness"	: component = "./assets/img/tile/harness_180x22.png"; break;
	 			}

	 			var helper = $("<img />")
	 				.attr({ src: component, rel: $(this).attr("rel") });

	 			return helper;
	 		},
	 	});

	 $(".tile-slot")
	 	.droppable({
	 		accept: "[rel=tile]",
	 		drop: function(e, ui) {
	 			var slot = $(this);
	 			var row = slot.parent();
	 			var nextIndex = parseInt(row.attr("y")) + 1;
	 			var nextRow = $(".tile-row[y=" + nextIndex + "]");

	 			if (nextRow.length === 0) {
	 				addTileRow(nextIndex);
	 			}

	 		 	var tile = $(' \
	 		 		<div class="tile"> \
				 		<div class="zone right"></div> \
				 		<div class="zone bottom"></div> \
				 	</div> \
				')
				.attr("src", ui.helper.attr("src"))
				.click(function() {
					var i = -1;

					if (selectingComponents) {
						if ((i = selected.indexOf(this)) >= 0) {
							$(this).children(".highlight").remove();
							selected.splice(i, 1);
						} else {
							$(this).append($("<div class='highlight'></div>"));
							selected.push(this);
						}
					}
				})
				.appendTo(slot);

				tile.children(".zone").droppable(tileZoneConfig);

				slot.droppable("option", "disabled", true);

				updateSystemSpecs();
	 		}
	 	});
	 	
	 	workTable
	 		.draggable({
	 			//containment: "parent",
	 			disabled: true,
	 			//axis: "x",
	 		});
}

function selectComponent(ev) {
	selectingComponents = !selectingComponents;

	if (selectingComponents) {
		$(".work-table").css({cursor: "pointer"});
	} else {
		$(".work-table").css({cursor: "default"});
	}
}

function removeComponents() {
	
	if (selectingComponents) {
		while (selected.length > 0) {
			var component = $(selected.pop());
	
			component.parent().droppable("option", "disabled", false);
			component.remove();
		}

		$(".tile-row:not(:has(.tile))").remove();
		addTileRow(1);
		
		$(".tile-row")
			.each(function(i, el) {
				$(el).attr("y", i);
			});
	}

	selectComponent();
}

function panWorkspace(ev) {
	var button = $(ev.target);
	var panning = (button.attr("enabled") || "false") === "false";

	if (panning) {
		$(".work-table")
			.css({cursor: "move"})
			.draggable("option", "disabled", false);
	} else {
		$(".work-table")
			.css({cursor: "default"})
			.draggable("option", "disabled", true);
	}
	
	button.attr("enabled", panning);
}

function startProject() {
	closeProject();
	createProject();
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
		});

		dialog.find("button[action=close]").click(function() {
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

	doc.html(lzstring.decompressFromBase64(b64));
	prepareWorkTable();
	$(".tile .zone").droppable(tileZoneConfig);

	$(".tile .zone img")
		.click(function(ev) {
			var i = -1;

			if (selectingComponents) {
				if ((i = selected.indexOf(this)) >= 0) {
					$(this).css({backgroundColor: "transparent"});
					selected.splice(i, 1);
				} else {
					$(this).css({backgroundColor: "yellow"});
					selected.push(this);
				}
			}

			ev.stopPropagation();
		});
		
	$(".tile")		
		.click(function() {
			var i = -1;

			if (selectingComponents) {
				if ((i = selected.indexOf(this)) >= 0) {
					$(this).children(".highlight").remove();
					selected.splice(i, 1);
				} else {
					$(this).append($("<div class='highlight'></div>"));
					selected.push(this);
				}
			}
		});

	
	updateSystemSpecs();
}

function createProject(next, err) {
	var token = Cookies.get("auth");
	var user = Cookies.get("user");

	Cookies.remove("ws");

    $.ajax({
        url: "/project",
        method: "POST",
        
        headers: {
        	"Authorization": token,
        	"x-configurator-user": user,
        },

        success: function(resp) {
        	var handle = resp.data.handle;
        	
        	Cookies.set("ws", handle);
        	
        	if (next) {
        		next(resp);
        	}
        }
    })
    .fail(function(resp) {
    	console.warn("error creating project", resp);
    	
    	if (err) {
    		err(resp);
    	}
    });
}

function loadProjects(next) {
	var token = Cookies.get("auth");
	var user = Cookies.get("user");

	console.log("loading projects");

    $.ajax({
        url: "/project",
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
	var selectedTemperature = $("[name=temperature]:checked").val() || "cool";
	var specs = temperature[selectedTemperature];
	var workTable = $(".work-table");
	var tiles = workTable.find(".tile[circuit=" + circuitNumber + "]");
	var harnessCount = tiles.find(".zone img").length;
	var fields = $(".circuit-panel [rel=" + circuitNumber + "]");
	var components = $(".components");

	for (var i = 0, spec; spec = specs[i]; i++) {
		if (spec.tiles == tiles.length && spec.harnesses <= harnessCount) {
			//fields.find("[rel=voltage]").text(spec.voltage);
			fields.find("[rel=current]").text(spec.current);
			fields.find("[rel=power]").text(spec.power);
			
			break;
		}
	}
	
	components.find("[rel=tileCount]").text(tiles.length);
	components.find("[rel=harnessCount]").text(harnessCount);
	
	var tiles = $(".tile");
	
	tiles.each(function(index) {
		$(this).attr("rel", index);	
	});
	
	// $(".tile .zone img")
	// 	.each(function(hix, el) {
	// 		var connections = 0;
	// 		var harness = $(el);

	// 		harness.attr("rel", hix);
			
	// 		tiles.each(function(index, el) {
	// 			var tile = $(el);
				
	// 			if (is_colliding(harness, tile)) {
					
	// 				connections++;
	// 			}
	// 		});
	// 		console.log("connections for 0" + index + ": ", connections);
	// 		if (connections === 2) {
	// 			harness.css({ background: "green", })
	// 		}
	// 	})
}

function addTileRow(index) {
	var workTable = $(".work-table");
	var orientation = workTable.attr("orientation");
	var cols = orientation === "portrait" ? 8 : 20;
	var row = $("<div></div>")
		.addClass("tile-row")
		.attr("y", index);

	for (var i = 0; i < cols; i++) {
		row.append($("<div />")
			.addClass("tile-slot")
			.attr("x", i)
		);
	}

	workTable.append(row);

	prepareWorkTable();
	
	return row;
}

function scaleCanvas(direction) {
	var canvas = $(".work-table");
	var scale = parseFloat(canvas.attr("scale") || 1.0);
	var step = 0.15;
	var max = 5;
	
	if (isNaN(scale)) {
		scale = 1.0;
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

function dimensionWorkTable() {
	var tileDimension = 4.0;
	var width = parseFloat($("[name=work-table-width]").val());
	var height = parseFloat($("[name=work-table-height]").val());
	var workspaceWidth = Math.floor(width / tileDimension);
	var workspaceHeight = Math.floor(height / tileDimension);
	var panningEnabled = !$(".work-table").draggable("option", "disabled");

	if (workspaceHeight > workspaceWidth) {
		$(".work-table").attr("orientation", "portrait");
	} else {
		$(".work-table").attr("orientation", "landscape");
	}
	
	$(".work-table")
		.empty()
		.css({
			transform: "scale(1.0)",
			top: "0px",
			left: "0px",
		})
		.attr("scale", "1.0");

	$(".circuit-panel").empty();
	
	for (var y = 0; y < workspaceHeight; y++) {
		addTileRow(y);
	}
	
	for (var i = 0, circuits = splitCircuit(workspaceWidth, workspaceHeight), circuit; circuit = circuits[i]; i++) {
		createCircuit(circuit.number, circuit.startX, circuit.startY, circuit.width, circuit.height);
	}

	prepareWorkTable();

	if (panningEnabled) {
		$(".work-table")
			.css({cursor: "move"})
			.draggable("option", "disabled", false);
	}
}

function splitCircuit(maxWidth, maxHeight) {
	if (maxWidth * maxHeight <= 20) {
		return [{
			number: 1,
			startX: 0,
			startY: 0,
			width: maxWidth,
			height: maxHeight,
		}];
	}
	
	var width = 0;
	var height = 0;
	var startX = 0;
	var startY = 0;
	var number = 1;
	var list = [];
	
	var circuitSize = 0;
	
	while (circuitSize < maxWidth * maxHeight) {
		while (width < maxWidth && height < maxHeight && width * height < 20 && width * height + circuitSize < maxWidth * maxHeight) {
			width += 1;
			
			if (width * height < 20 && width * height + circuitSize < maxWidth * maxHeight) {
				height += 1;
			}
		}
		
		list.push({
			number: number,
			width: width,
			height: height,
			startX: startX,
			startY: startY,
		});
		
		number += 1;
		
		if (startX + width < maxWidth) {
			startX += width;
		} else {
			startX = 0;
			startY += height;
		}
		
		circuitSize += (width * height);
		
		height = width = 0;
	}

	return list;
}

function setDesignMode(mode) {
	$(".work-table").attr("design-mode", mode);
}

function createCircuit(number, startX, startY, width, height) {
	var circuitColor = randomColor();

	var circuitName = [
		"None", 
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

	var placePowerSupply = function() {
		var selectedTile = { x: 0, y: 0 };
		
		if (startX === startY && startY === 0) {
			if (height >= width) {
				selectedTile = { x: 0, y: Math.floor(height / 2)};
			} else {
				selectedTile = { y: 0, x: Math.floor(width / 2)};
			}
		} else if (startY === 0) {
			selectedTile = { x: startX + Math.floor(width / 2), y: 0};
		} else if (startX === 0) {
			selectedTile = { x: 0, y: startY + Math.floor(height / 2)};
		} else {
			selectedTile = { x: startX + Math.floor(width / 2), y: startY + height - 1};
		}

		var ps = $("<img />");
		
		if (selectedTile.x === 0) {
			ps
			.addClass("power power-left power-center")
			.attr("src", "assets/img/powersupply/center-right.png");
		} else if (selectedTile.y === 0) {
			ps
			.addClass("power power-top power-down")
			.attr("src", "assets/img/powersupply/corner-down.png");
		} else if (width > height) {
			ps
			.addClass("power power-bottom power-up")
			.attr("src", "assets/img/powersupply/corner-up.png");
		} else {
			ps
			.addClass("power power-right power-center")
			.attr("src", "assets/img/powersupply/center-left.png");
		}
		
		$(".tile-row[y=" + selectedTile.y + "] > .tile-slot[x=" + selectedTile.x + "] > .tile").append(ps);
	};

	var distributeHarnesses = function (rows, cells) {
		var harness = function() {
			
			return $("<img />")
				.attr({ src: "./assets/img/tile/harness_180x22.png" })
				.css({ zIndex: 2 })
				.click(function(ev) {
					var i = -1;
	
					if (selectingComponents) {
						if ((i = selected.indexOf(this)) >= 0) {
							$(this).css({backgroundColor: "transparent"});
							selected.splice(i, 1);
						} else {
							$(this).css({backgroundColor: "yellow"});
							selected.push(this);
						}
					}
	
					ev.stopPropagation();
				});
	
		};
		
		for (var y = 0; y < rows.length; y++) {
			var row = $(".tile-row[y=" + rows[y] + "]");
	
			for (var x = 0; x < cells.length; x++) {
				var tile = row.find(".tile-slot[x=" + cells[x] + "] > .tile");
	
				if (y < rows.length - 1) {
					tile.find(".bottom").append(harness());
				}
				
				if (x < cells.length - 1) {
					tile.find(".right").append(harness());
				}
			}
		}
	};

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
			.click(function() {
				var i = -1;
	
				if (selectingComponents) {
					if ((i = selected.indexOf(this)) >= 0) {
						$(this).children(".highlight").remove();
						selected.splice(i, 1);
					} else {
						$(this).append($("<div class='highlight'></div>"));
						selected.push(this);
					}
				}
			})
			.appendTo(slot);
	
			slot
				.droppable("option", "disabled", true)
				.addClass("tile-circuit")
				.css({borderColor: circuitColor});
		}
		
	}
	
	var rows= [];
	var cells = [];
	
	for (var i = 0; i < height; i++) {
		rows.push(startY + i);
	}	
	
	for (var i = 0; i < width; i++) {
		cells.push(startX + i);
	}
	
	distributeHarnesses(rows, cells);
	placePowerSupply();
	
	$("<div />")
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
		.click(function() {
			var button = $(this);
			var testing = !button.hasClass("circuit-button-test");
			
			button.toggleClass("circuit-button-test");
			
			testCircuit(number, testing);
		})
		.appendTo($(".circuit-panel"));
		
	updateSystemSpecs(number);
	
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
		
		var row = key.parents(".tile-row");
		var cell = key.parents(".tile-slot");
		var x = parseInt(cell.attr("x"));
		var y = parseInt(row.attr("y"));

		var fore = circuit.parents(".tile-row[y=" + y + "]").find(".tile-slot[x=" + (x - 1) + "] .tile");
		var aft = circuit.parents(".tile-row[y=" + y + "]").find(".tile-slot[x=" + (x + 1) + "] .tile");
		var above = circuit.parents(".tile-row[y=" + (y - 1) + "]").find(".tile-slot[x=" + x + "] .tile");
		var below = circuit.parents(".tile-row[y=" + (y + 1) + "]").find(".tile-slot[x=" + x + "] .tile");
		
		key.attr("tested", "1");

		if (key.hasClass("test-pass") ||
			key.find(".power").length > 0 ||
			(fore.hasClass("test-pass") && fore.find(".zone.right img").length > 0) ||
			(above.hasClass("test-pass") && above.find(".zone.bottom img").length > 0) ||
			(below.hasClass("test-pass") && key.find(".zone.bottom img").length > 0) ||
			(aft.hasClass("test-pass") && key.find(".zone.right img").length > 0)) {
				
			key.addClass("test-pass");
			key.removeClass("test-fail");
			
			if (key.find(".zone.right img").length > 0) {
				aft.addClass("test-pass");
				aft.removeClass("test-fail");
			}

			if (key.find(".zone.bottom img").length > 0) {
				below.addClass("test-pass");
				below.removeClass("test-fail");
			}
		} 

		if (fore.attr("tested") !== "1") {
			testNeighbor(fore);
		}

		if (aft.attr("tested") !== "1") {
			testNeighbor(aft);
		}

		if (above.attr("tested") !== "1") {
			testNeighbor(above);
		}

		if (below.attr("tested") !== "1") {
			testNeighbor(below);
		}

	};
	
	circuit.addClass("test-fail");
	testNeighbor(source);

}
function joinCircuit(number, key) {
	if (key.length === 0) return;
	
	var circuit = $(".work-table .tile[circuit=" + key.attr("circuit") + "]");
	var row = key.parents(".tile-row");
	var cell = key.parents(".tile-slot");
	var x = parseInt(cell.attr("x"));
	var y = parseInt(row.attr("y"));

	var fore = circuit.parents(".tile-row[y=" + y + "]").find(".tile-slot[x=" + (x - 1) + "] .tile");
	var aft = circuit.parents(".tile-row[y=" + y + "]").find(".tile-slot[x=" + (x + 1) + "] .tile");
	var above = circuit.parents(".tile-row[y=" + (y - 1) + "]").find(".tile-slot[x=" + x + "] .tile");
	var below = circuit.parents(".tile-row[y=" + (y + 1) + "]").find(".tile-slot[x=" + x + "] .tile");
	
	if (fore.find(".zone.right img").length > 0) fore.attr("circuit", number);
	if (above.find(".zone.bottom img").length > 0) above.attr("circuit", number);
	if (key.find(".zone.bottom img").length > 0) fore.attr("circuit", number);
	if (key.find(".zone.right img").length > 0) fore.attr("circuit", number);
			
	joinCircuit(fore);
	joinCircuit(aft);
	joinCircuit(above);
	joinCircuit(below);

}