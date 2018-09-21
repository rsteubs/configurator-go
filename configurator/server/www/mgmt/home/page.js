/* ADMIN HOME */
/* global 
    $ 
    Cookies 
*/

var ACTIVE = "active";
var PENDING = "pending";
var SUSPENDED = "suspended";
var ARCHIVED = "archived";
var ALL = "all";

$(function() {
    
	if (!Cookies.get("auth")) {
		window.location = "/account.html";
		return;
	}
    
   getAccountList(function(l) {
        var pendingCount = 0;
        var activeCount = 0;
        
        pendingCount = l.filter(function(x) {
            return x.status === PENDING;
        }).length;
        
        activeCount = l.filter(function(x) {
            return x.status === ACTIVE;
        }).length;

        $(".portal-action-item[rel=accounts] .sub")
            .text(`${pendingCount} Pending | ${activeCount} Active`);
   });
   
   $(".portal-action-item")
    .click(function() {
        var action = $(this);
        
        switch (action.attr("rel")) {
            case "accounts": {
                window.location = "../user-account/";
                break;
            }
            
            case "projects": {
                window.location = "../../workspace/";
                break;
            }
            
            case "logout": {
                Cookies.remove("auth");
                window.location = "/";
                break;
            }
        }
    });
    
    Cookies.remove("x-configurator-user");
});

function getAccountList(next) {
    $.ajax({
        url: "/admin/all-accounts",
        method: "GET",
        headers: {
        	"Authorization": Cookies.get("auth")
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
