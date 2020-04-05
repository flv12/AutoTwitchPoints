var search = setInterval(function () {
	var finding = $(".claimable-bonus__icon");

	if (finding.length != 0) {
		finding.trigger("click");
		console.log("[AutoTwitchPoints]" + " +50");
	}
}, 5000);
