var accountList = [];
var ACTIVE = "active";
var PENDING = "pending";
var SUSPENDED = "suspended";
var ARCHIVED = "archived";
var ALL = "all";

var activeStatus = PENDING;

$(function() {
    $(".tab-bar button")
        .click(function() {
            activeStatus = $(this).attr("rel");
            
            if (activeStatus === ALL) {
                renderAccountList(accountList);
            } else {
                renderAccountList(getAccounts(activeStatus));
            }
        });
        
    $("button[rel=refresh]")
        .click(function() {
            getAccountList(function(l) {
                accountList = l;
    
                if (activeStatus === ALL) {
                    renderAccountList(accountList);
                } else {
                    renderAccountList(getAccounts(activeStatus));
                }
            })
        })
        
    getAccountList(function(l) {
        accountList = l;
        renderAccountList(getAccounts(PENDING));
    });
});

function getAccountList(next) {
    $.ajax({
        url: "/admin/all-accounts",
        method: "GET",
        headers: {
        	"Authorization": Cookies.get("auth"),
        	"x-configurator-user": Cookies.get("user"),
        	"x-configurator-auth": Cookies.get("user")+":"+Cookies.get("auth"),
        },
        
        success: function(resp) {
            if (next) {
                next(resp.data.accounts);
            }
        }
    }).fail(function(resp) {
        var response = resp.responseJSON && resp.responseJSON.response;
        var message = (response && response.status < 500 && response.statusMessage) || "There was a problem retrieving user accounts. Please try again later.";

        window.alert(message);
    });
}

function getAccounts(status) {
    var l = [];

    accountList.forEach(function(x) {
        if (x.status === status) {
            l.push(x);
        }
    });
    
    return l;
}

function renderAccountList(list) {
	var ui = [];
	console.log("rendering", list)
	var panel = function() {
		return $("<div />")
			.addClass("action-panel")
			.append($("<button />").attr("rel", "view").text("View").addClass("open"))
			.append($("<button />").attr("rel", "approve").addClass("icon ion-checkmark"))
			.append($("<button />").attr("rel", "deny").addClass("icon ion-close"))
	};
	
	var info = function(account) {
		return $("<div />")
			.addClass("account-info")
			.append(
				$("<label />").text(account.name)
			)
			.append(
				$("<p />").text(account.username)
			)
			.append(
			    $("<div />")
			        .addClass("badge")
			        .text(account.status)
			);
	};
    
    list.forEach(function(x) {
        ui.push(
            $("<div />")
                .addClass("account-item")
    			.attr({ 
    			    rel: x.handle, 
    			    status: x.status, 
    			})
                .append(panel())
                .append(info(x))
        ); 
    });
    
    $(".account-list .content-list")
        .empty()
        .append(ui);
        
    $(".account-list .content-list .action-panel button")
        .click(function() {
           var button = $(this);
           var item = button.parents(".account-item");
           var handle = item.attr("rel");
           var status = item.attr("status");

            switch (button.attr("rel")) {
                case "approve" :
                    if (status != ACTIVE) {
                        activateAccount(handle, function() {
                            item.remove();
                            
                            accountList.forEach( x => {
                                if (x.handle === handle) {
                                    x.status = ACTIVE;
                                }
                            });
                        });
                    }
                    break;
                    
                case "deny" :
                    if (status == ACTIVE) {
                        suspendAccount(handle, function() {
                            item.remove();
                            
                            accountList.forEach( x => {
                                if (x.handle === handle) {
                                    x.status = SUSPENDED;
                                }
                            });
                        });
                    } else {
                        archiveAccount(handle, function() {
                            item.remove();
                            
                            accountList.forEach( x => {
                                if (x.handle === handle) {
                                    x.status = ARCHIVED;
                                }
                            });
                        });
                    }
            }
        });
}

function activateAccount(h, next) {
    $.ajax({
        url: `/admin/approve/${h}`,
        method: "PUT",
        headers: {
        	"Authorization": Cookies.get("auth"),
        	"x-configurator-user": Cookies.get("user"),
        	"x-configurator-auth": Cookies.get("user")+":"+Cookies.get("auth"),
        },
        
        success: function(resp) {
            if (next) {
                next();
            }
        }
    }).fail(function(resp) {
        var response = resp.responseJSON && resp.responseJSON.response;
        var message = (response && response.status < 500 && response.statusMessage) || "There was a problem updating this user account. Please try again later.";

        window.alert(message);
    });
}

function suspendAccount(h, next) {
    $.ajax({
        url: `/admin/suspend/${h}`,
        method: "PUT",
        headers: {
        	"Authorization": Cookies.get("auth"),
        	"x-configurator-user": Cookies.get("user"),
        	"x-configurator-auth": Cookies.get("user")+":"+Cookies.get("auth"),
        },
        
        success: function(resp) {
            if (next) {
                next();
            }
        }
    }).fail(function(resp) {
        var response = resp.responseJSON && resp.responseJSON.response;
        var message = (response && response.status < 500 && response.statusMessage) || "There was a problem updating this user account. Please try again later.";

        window.alert(message);
    });
}

function archiveAccount(h, next) {
    $.ajax({
        url: `/admin/deny/${h}`,
        method: "PUT",
        headers: {
        	"Authorization": Cookies.get("auth"),
        	"x-configurator-user": Cookies.get("user"),
        	"x-configurator-auth": Cookies.get("user")+":"+Cookies.get("auth"),
        },
        
        success: function(resp) {
            if (next) {
                next();
            }
        }
    }).fail(function(resp) {
        var response = resp.responseJSON && resp.responseJSON.response;
        var message = (response && response.status < 500 && response.statusMessage) || "There was a problem updating this user account. Please try again later.";

        window.alert(message);
    });
}