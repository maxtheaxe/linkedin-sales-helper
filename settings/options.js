const zoomManual = document.querySelector("#zoominfo-manual");
const nameSplit = document.querySelector("#namesplit");
const mostRecentJob = document.querySelector("#mostrecentjob");
const guessCompany = document.querySelector("#guesscompany");

function saveOptions(e) {
	e.preventDefault();
	browser.storage.sync.set({
		settings: {
			zoomManualSetting: zoomManual.checked,
			nameSplitSetting: nameSplit.checked,
			mostRecentJobSetting: mostRecentJob.checked,
			guessCompanySetting: guessCompany.checked
		}
	});
	console.log("saved");
}

function restoreOptions() {

	function setCurrentChoice(result) {
		if (result.settings === undefined) {
			// console.log("undefined", "undefined", "undefined");
			zoomManual.checked = false;
			nameSplit.checked = false;
			mostRecentJob.checked = false;
			guessCompany.checked = false;
		}
		else {
			// console.log(result.settings.zoomManualSetting, result.settings.nameSplitSetting);
			zoomManual.checked = result.settings.zoomManualSetting;
			nameSplit.checked = result.settings.nameSplitSetting;
			mostRecentJob.checked = result.settings.mostRecentJobSetting;
			guessCompany.checked = result.settings.guessCompanySetting;
		}
	}

	function onError(error) {
		console.log(`Error: ${error}`);
	}

	let getting = browser.storage.sync.get("settings");
	getting.then(setCurrentChoice, onError);
}

document.addEventListener("DOMContentLoaded", restoreOptions);
document.querySelector("form").addEventListener("submit", saveOptions);
