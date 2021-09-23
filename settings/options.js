function saveOptions(e) {
	e.preventDefault();
	browser.storage.sync.set({
		zoomUsername: document.querySelector("#zoominfo-username").value,
		zoomPassword: document.querySelector("#zoominfo-password").value
	});
}

function restoreOptions() {

	function setCurrentChoice(result) {
		document.querySelector(
			"#zoominfo-username").value = result.zoomUsername || null;
		document.querySelector(
			"#zoominfo-password").value = result.zoomPassword || null;
	}

	function onError(error) {
		console.log(`Error: ${error}`);
	}

	let getting = browser.storage.sync.get("color");
	getting.then(setCurrentChoice, onError);
}

document.addEventListener("DOMContentLoaded", restoreOptions);
document.querySelector("form").addEventListener("submit", saveOptions);
