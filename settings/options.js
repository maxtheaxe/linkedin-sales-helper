function saveOptions(e) {
	e.preventDefault();
	browser.storage.sync.set({
		zoomManual: document.getElementById("zoominfo-manual").checked,
	});
	console.log("saved");
}

function restoreOptions() {

	function setCurrentChoice(result) {
		document.getElementById(
			"zoominfo-manual").checked = result.zoomManual;
	}

	function onError(error) {
		console.log(`Error: ${error}`);
	}

	let getting = browser.storage.sync.get("zoomManual");
	getting.then(setCurrentChoice, onError);
}

document.addEventListener("DOMContentLoaded", restoreOptions);
document.querySelector("form").addEventListener("submit", saveOptions);
