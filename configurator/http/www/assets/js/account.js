$(function() {
    $("#signIn").click(function() {
        var uname = $("#username").val();
        var pwd = $("#password").val();
        
        $.post(
            "/auth", 
            JSON.stringify({username: uname, password: pwd}), 
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
        });
    });
    
    $("#createAccount").click(function() {
        
    });
});