/*
	global
	$
	temperature
	html2canvas
	Project
*/

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

	if (Project.unstash()) {
		decompressWorkspace(Project.active.content);
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


