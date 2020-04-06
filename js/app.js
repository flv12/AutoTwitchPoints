setInterval(findPoints, 5000);

function findPoints() {
	let finding = document.getElementsByClassName("claimable-bonus__icon");

	if (finding.length != 0) {
		finding[0].click();
		console.log("[AutoTwitchPoints] +50");
	}
}
