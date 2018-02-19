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
        
        var uname = $("#username").val();
        var pwd = $("#password").val();
        var captcha = $("#g-recaptcha-response") .val();
        
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