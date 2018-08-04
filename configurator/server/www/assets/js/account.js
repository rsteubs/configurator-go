$(function() {
    $("[rel=sign-up]").hide();
    $(".accountDialog").show();
        
    $(".accountDialog button").click(function() {
        var el = $(this);

        switch (el.attr("action")) {
            case "signIn" : { signIn(); break; }
            
            case "register" : { 
                $("[rel=sign-in]").hide(); 
                $("[rel=sign-up]").show(); 
                $(".title").text("Sign Up");
                break; 
            }
            
            case "createAccount" : { createAccount(); break; }
            
            case "backToSignIn" : { 
                $("[rel=sign-in]").show(); 
                $("[rel=sign-up]").hide(); 
                $(".title").text("Sign In");
                break; 
            }
        }
    });
    
    function signIn() {
        event.preventDefault();

        var uname = $("#username").val();
        var pwd = $("#password").val();
        var captcha = $("#g-recaptcha-response").val();
        
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
                    var expires = new Date(data.expiration);

                    Cookies.set("user", data.handle);
                    Cookies.set("auth", data.token, {expires: expires});

                    window.location = "/";
                } else {
                    window.alert("Your username or password were not accepted. Please try again, or create a new account.");
                }
            }
        )
        .fail(function(resp) {
            var response = resp.responseJSON && resp.responseJSON.response;
            var message = (resp.status < 500 && resp.responseJSON && resp.responseJSON.message) || "Your username or password were not accepted. Please try again, or create a new account.";


            window.alert(message);
        });
    }

    function createAccount() {
//         event.preventDefault();
        
// 		var createPanel = $(".createAccount")
		
// 		if (createPanel.height() < 250) {
//     		createPanel.animate({height: "250px"}, 300, "easeInBack");
//     		$("#signIn").hide();
//     		return; 
// 		}

        var uname = $("#username").val();
        var name = $("#name").val();
        var pwd = $("#password").val();
        var verify = $("#verify").val();
        var company = $("#company").val();
        var captcha = $("#g-recaptcha-response") .val();
        
        if (uname === "" || pwd === "") {
            alert("Please provide both a username and a password.");
            return;
        }
        
        if (name === "") {
            alert("Please provide your full name.");
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
                name: name,
                company: company,
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
            console.log("message", resp)
            var message = (resp.status < 500 && resp.responseJSON && resp.responseJSON.message) || "There was an issue creating your account. Please try again.";

            window.alert(message);
            grecaptcha.reset();
        });
    }
});