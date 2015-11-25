$("#url").append("<center id=\"link\">" + location.href + "</center>");

function copyToClipboard(element) {
	console.log("copyToClipboard");
	var $temp = $("<input>");
	$("body").append($temp);
	$temp.val($(element).text()).select();
	document.execCommand("copy");
	$temp.remove();
}

