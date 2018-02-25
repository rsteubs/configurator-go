
var selectingComponents = false;
var selected = [];

var workspaces = [];

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

				tile.children(".zone")
			 	.droppable({
			 		accept: "[rel=harness]",
			 		drop: function(e, ui) {
			 			var zone = $(this);

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
			 	});

				slot.droppable("option", "disabled", true)
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

	$("#projectMenu").on("change", function() {
		console.log("menu changed");
		var menu = $(this);
		var val = menu.val();
		console.log("selected", val);
		switch(val) {
			case "newProject" : createProject(); break;
			case "openProject" : openProject(); break;
			case "saveProject" : saveProject(); break;
			case "export" : exportProject(); break;
			case "closeProject" : clearProject(); break;
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
						decompressWorkspace(project.content);
					}
				}
			} 
		})
	}

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

function createProject() {
	$(".work-table").empty();	
}

function openProject() {
	var token = Cookies.get("auth");
	var user = Cookies.get("user");
	var dialog = $(".openProject");
	var close = dialog.find("[action=close]");
	
	close.click(function() {
		dialog.hide();
	})
	
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
    }

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
				)
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

function clearProject() {
	$(".work-table").empty();	
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

			for (var x = 0; x < 10; x++) {
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
						.appendTo(projectList)
				}
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
