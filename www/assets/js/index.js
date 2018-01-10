$( function() {

	 $(".drag-to-canvas")
	 	.draggable({
	 		//grid: [120, 120],
	 		containment: ".work-table",
	 		zIndex: $(this).attr("rel") == "harness" ? 2 : 1,
	 		snap: $(this).attr("rel") == "harness" ? ".zone" : null,
	 		helper: function() {
	 			var component = "";

	 			switch($(this).attr("rel")) {
	 				case "tile" 	: component = "./assets/img/tile/illumitile_252x252.png"; break;
	 				case "harness"	: component = "./assets/img/tile/harness_180x22.png"; break;
	 			}

	 			return $("<img />")
	 				.attr({ src: component, rel: $(this).attr("rel") });
	 		},
	 		stop: function(e, ui) {
	 			var board = $(".work-table");

	 			if (ui.helper.attr("rel") == "tile") {
	 				$('	\
		 				<div class="tile"> \
							<div class="zone top left"></div> \
							<div class="zone top right"></div> \
							<div class="zone bottom left"></div> \
							<div class="zone bottom right"></div> \
						</div> \
					')
					.attr("src", ui.helper.attr("src"))
					.addClass("drag-to-canvas component")
					.css({
						position: "absolute",
						left: ui.offset.left - board.offset().left,
						top: ui.offset.top - board.offset().top,
						zIndex: 2,
					})
					.draggable({
						grid: [135, 135],
	 					containment: ".work-table",
					})
					.appendTo($(".work-table"));
	 			} else if (ui.helper.attr("rel") == "harness") {
	 				$("<img />")
						.attr("src", ui.helper.attr("src"))
						.addClass("drag-to-canvas component")
						.css({
							position: "absolute",
							left: ui.offset.left - board.offset().left,
							top: ui.offset.top - board.offset().top,
							zIndex: 2,
						})
						.draggable({
							//grid: [20, 20],
		 					containment: ".work-table",
						})
						.appendTo($(".work-table"));
	 			}

	 		}
	 	});

	 $(".work-table")
	 	.droppable({
	 		accept: ".drag-to-canvas"
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