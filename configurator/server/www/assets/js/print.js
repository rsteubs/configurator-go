/*
	global
	$
	Cookies
	temperature
	html2canvas
*/

var selectingComponents = true;
var selected = [];

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

	var ws = null;
	
	if ((ws = Cookies.get("_ws"))) {
		decompressWorkspace(ws);
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
		});
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
		if (window.localStorage.lastProject) {
			var p = JSON.parse(window.localStorage.lastProject);
			
			workingProject = p.project;
			decompressWorkspace(p.html);
		}
	}

	setTimeout(function() {
		downloadProject();
	}, 500);
});

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

function openProject() {
	var token = Cookies.get("auth");
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


function exportProject() {
	
}

function printProject() {
	
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
			updateSystemSpecs(i);
		}
	}
	
	updateSystemSpecs();
}

function loadProjects(next) {
	var token = Cookies.get("auth");
	var user = Cookies.get("x-configurator-user") || Cookies.get("user");

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


