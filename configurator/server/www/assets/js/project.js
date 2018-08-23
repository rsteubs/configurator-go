/*
    global
    $
*/

var Units = {
    IN: { label: "Inches", symbol: "in." },
    CM: { label: "Centimeters", symbol: "cm." },
};

window.Project = {
    active: null,
    
    cookies: window.Cookies,
    
    projectList: [],
    steps: [],
    step: -1,
    
    new: function() {
        return {
            handle: "",
            title: "",
            description: "",
            content: "",
    
            configuration: {
        		temperature: "",
        		workMode: "",
        		areaWidth: "",
        		areaHeight: "",
        		tileWidth: "",
        		tileHeight: "",
        		derate: 0.1,
            },
            
            settings: {
                showDimensions: false,
                showLightArea: false,
                showPS: false,
                showTooltips: false,
                units: Units.IN,
            }
        };        
    },

    find: function(h) {
        return this.projectList.find(function(x) { return x.handle === h });
    },

    open: function(h, next, fail) {
        var sender = this;

        var found = sender.projectList.find(function(x) { return x.handle === h });
            
        if (found) {
            sender.active = found;
            sender.clearHistory();
            
            if (next) {
                next(found);
            }
        } else if (fail) {
            fail();
        }   
    },
    
    close: function() {
        this.active = null;
        this.clearHistory();
    },
    
    refreshList: function(next, fail) {
        var sender = this;
        
        $.ajax({
            url: "/project/",
            method: "GET",
            
            headers: {
            	"Authorization": sender.cookies.get("auth"),
            	"x-configurator-user": sender.cookies.get("x-configurator-user") || sender.cookies.get("user"),
            },
            
            success: function(resp) {
                resp.data.forEach(function(x) {
                    var meta = {};
                    
                    if (x.meta && x.meta.length > 0) {
                        meta = JSON.parse(x.meta);
                        console.log("meta", meta);
                    }
                    
                    sender.projectList.push({
                        handle: x.handle,
                        title: x.title,
                        description: x.description,
                        content: x.content,
                        configuration: meta.configuration,
                        settings: meta.settings,
                    });
                });

                if (next) {
                    next(sender.projectList);
                }
            }
        })
        .fail(function(resp) {
            var response = resp.responseJSON && resp.responseJSON.response;
            var message = (response && response.status < 500 && response.statusMessage) || "There was a problem retrieving your projects. Please try again later.";
            
            if (fail) {
                fail(message);
            }
        });    
    },
    
    create: function(next, fail) {
        var sender = this;

        sender.close();        

        $.ajax({
            url: "/project/",
            method: "POST",
            
            headers: {
            	"Authorization": sender.cookies.get("auth"),
            	"x-configurator-user": sender.cookies.get("x-configurator-user") || sender.cookies.get("user"),
            },
    
            success: function(resp) {
            	var handle = resp.data.handle;
                var project = sender.new();
                
                project.handle = handle;
                sender.projectList.push(project);

                sender.open(handle, next, fail);
            }
        })
        .fail(function(resp) {
            var response = resp.responseJSON && resp.responseJSON.response;
            var message = (response && response.status < 500 && response.statusMessage) || "There was a problem creating your project. Please try again later.";

            if (fail) {
                fail(message);
            }
        });
    },
    
    save: function(p, next, fail) {
        var sender = this;

		$.ajax({
			url: "/project/" + p.handle,
			method: "PUT",
			
            headers: {
            	"Authorization": sender.cookies.get("auth"),
            	"x-configurator-user": sender.cookies.get("x-configurator-user") || sender.cookies.get("user"),
            },

			data: JSON.stringify({
			    title: p.title,
			    description: p.description,
			    content: p.content,
			    meta: JSON.stringify({
			        settings: p.settings,
			        configuration: p.configuration,
			    }),
			}),
			
			success: function() {
				if (next) {
				    next(p);
				}
			}
		})
		.fail(function (resp) {
            var response = resp.responseJSON && resp.responseJSON.response;
            var message = (response && response.status < 500 && response.statusMessage) || "There was a problem saving your project. Please try again later.";

            if (fail) {
                fail(message);
            }
		});
    },

    delete: function(h, next, fail) {
        var sender = this;

		$.ajax({
			url: "/project/" + h,
			method: "DELETE",
			
            headers: {
            	"Authorization": sender.cookies.get("auth"),
            	"x-configurator-user": sender.cookies.get("x-configurator-user") || sender.cookies.get("user"),
            },

			success: function() {
				if (next) {
				    var i = sender.projectList.findIndex(function(x) {
				        x.handle === h;
				    })
				    
				    if (i >= 0) {
				        sender.projectList.splice(i, 1);
				    }
				    
				    next();
				}
			}
		})
		.fail(function (resp) {
            var response = resp.responseJSON && resp.responseJSON.response;
            var message = (response && response.status < 500 && response.statusMessage) || "There was a problem removing your project. Please try again later.";

            if (fail) {
                fail(message);
            }
		});
    },

    stash: function(ws) {
        this.active.content = ws;
        
        if (window.localStorage) {
            window.localStorage.lastProject = JSON.stringify(this.active);
        } else {
            this.cookies.set("lastproject", JSON.stringify(this.active));
        }
    },
    
    unstash: function() {
        var p;
        
        if (window.localStorage) {
            if (window.localStorage.lastProject) {
                p = JSON.parse(window.localStorage.lastProject);
            }
        } else {
            var json = this.cookies.get("lastproject");
            
            if (json) {
                p = JSON.parse(json);
            }
        }
        
        if (p) {
            this.active = p;
            
            return p;
        }
    },
    
	recordStep: function(ws) {
		if (this.step < this.steps.length - 1) {
			this.steps = this.steps.splice(0, this.step + 1);
		}
		
		this.steps.push(ws);
		this.step = this.steps.length - 1;

		console.log("project history - steps", this.steps.length);
		console.log("project history - current step", this.step);
		
		return this.step;
	},
	
	stepBackward: function() {
		if (this.step > 0) {
			this.step--;
		} else {
			return undefined;
		}
		
		console.log("project history - reverse to", this.step);
		
		return this.steps[this.step];
	},
	
	stepForward: function() {
		if (this.step < this.steps.length - 1) {
			this.step++;
		} else {
			return undefined;
		}
		
		console.log("project history - forward to", this.step);
		
		return this.steps[this.step];
	},
	
	clearHistory: function() {
		this.steps = [];
		this.step = -1;
	},
    
};