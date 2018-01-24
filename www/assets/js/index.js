
var selectingComponents = false;
var selected = [];

$( function() {

	var holder = $("<div></div>");
	for (var i = 0; i < 100; i++) {
		holder.append($("<div></div>").addClass("tile-slot"));
	}
	$(".work-table").append(holder.html());

	$(".drag-to-canvas")
	 	.draggable({
	 		containment: ".work-table",
	 		zIndex: $(this).attr("rel") == "harness" ? 2 : 0,
	 		snap: $(this).attr("rel") == "harness" ? ".zone" : ".tile-slot",
	 		snapMode: "inner",
	 		snapTolerance: 50,
	 		helper: function() {
	 			var component = "";

	 			switch($(this).attr("rel")) {
	 				case "tile" 	: component = "./assets/img/tile/illumitile_252x252.png"; break;
	 				case "harness"	: component = "./assets/img/tile/harness_180x22.png"; break;
	 			}

	 			var helper = $("<img />")
	 				.attr({ src: component, rel: $(this).attr("rel") });

	 			console.log("using helper", helper);
	 			return helper;
	 		},
	 	});

	 $(".tile-slot")
	 	.droppable({
	 		accept: "[rel=tile]",
	 		drop: function(e, ui) {
	 			var droppable = $(this);

 				var tile = $('	\
	 				<div class="tile"> \
						<div class="zone left"></div> \
						<div class="zone right"></div> \
						<div class="zone top"></div> \
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
				.appendTo(droppable);

				droppable.droppable("option", "disabled", true);
				configureTileDrops();
	 		}
	 	});

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


});

function selectComponent(ev) {
	selectingComponents = !selectingComponents;
	console.log("select mode", selectingComponents)
	if (selectingComponents) {
		$(".work-table").css({cursor: "pointer"});
	} else {
		$(".work-table").css({cursor: "default"});
	}
}

function removeComponents() {
	while (selected.length > 0) {
		var component = $(selected.pop());

		component.parent().droppable("option", "disabled", false);
		component.remove();
	}

	selectComponent();
}

function configureTileDrops() {
	$(".tile > .zone")
 	.droppable({
 		accept: "[rel=harness]",
 		drop: function(e, ui) {
 			var droppable = $(this);

			$("<img />")
				.attr({ src: ui.helper.attr("src") })
				.css({ zIndex: 2 })
				.appendTo(droppable);

			droppable
				.droppable("option", "disabled", true)
				.css({zIndex: 2});

			configureTileDrops();
 		},
 		over: function(e, ui) {
 			$(this).css({border: "3px solid blue"});
 		},
 		out: function(e, ui) {
 			$(this).css({border: "1px solid red"});
 		}
 	});

}