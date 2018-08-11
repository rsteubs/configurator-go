/* HOME */

/* global 
	$ 
	Cookies 
*/

$( function() {
	if (!Cookies.get("auth")) {
		window.location = "/account.html";
		return;
	} else {
		window.location = "/workspace/";
		return;
	}
});
