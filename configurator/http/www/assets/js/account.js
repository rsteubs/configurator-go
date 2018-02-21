$(function() {
    $("#signIn").click(function() {
        event.preventDefault();

        var uname = $("#username").val();
        var pwd = $("#password").val();
        var captcha = $("#g-recaptcha-response") .val();
        
        $.post(
            "/auth", 

            JSON.stringify({
                username: uname, 
                password: pwd,
                captcha: captcha,
            }), 

            function(resp) {
                var response = resp.response;
                var data = resp.data;
                
                if (response.status == 200) {
                    document.cookie = "user=" + data.handle;
                    document.cookie = "token=" + data.token;
                    
                    window.location = "/";
                } else {
                    window.alert("Your username or password were not accepted. Please try again, or create a new account.");
                }
            }
        )
        .fail(function(resp) {
            var response = resp.responseJSON && resp.responseJSON.response;
            var message = (response && response.status < 500 && response.statusMessage) || "Your username or password were not accepted. Please try again, or create a new account.";

            window.alert(message);
            grecaptcha.reset();
        });
    });
    
    $("#showMore").click(function() {
        
    });
    
    $("#createAccount").click(function(ev) {
        event.preventDefault();
        
		var createPanel = $(".createAccount")
		
		if (createPanel.height() < 250) {
    		createPanel.animate({height: "250px"}, 300, "easeInBack");
    		$("#signIn").hide();
    		return; 
		}
        
        
        var uname = $("#username").val();
        var pwd = $("#password").val();
        var verify = $("#verify").val();
        var captcha = $("#g-recaptcha-response") .val();
        
        if (uname === "" || pwd === "") {
            alert("Please provide both a username and a password.");
            return;
        }
        
        if (pwd !== verify) {
            alert("The passwords entered do not appear to match.");
            return;
        }
        
        if (captcha === "") {
            alert("Please verify that you are not a robot.");
            return;
        }
        
        $.post(
            "/signup", 

            JSON.stringify({
                username: uname, 
                password: pwd,
                captcha: captcha,
            }), 

            function(resp) {
                var response = resp.response;
                var data = resp.data;
                
                if (response.status == 200) {
                    document.cookie = "user=" + data.handle;
                    document.cookie = "token=" + data.token;
                    
                    window.location = "/";
                }
            }
        )
        .fail(function(resp) {
            var response = resp.responseJSON && resp.responseJSON.response;
            var message = (response && response.status < 500 && response.statusMessage) || "There was an issue creating your account. Please try again.";

            window.alert(message);
        });
    });
});