// csv_downloader.js for linkedin-sales-helper by maxtheaxe

browser.runtime.onMessage.addListener(handleMessage);


/**
 * handle messages "heard" by event listener
 */
function handleMessage(request, sender, sendResponse) {
	browser.storage.sync.get("settings", function(result) {
		// console.log(`namesplit: ${result.settings.nameSplitSetting}`);
		if (result.settings === undefined) {
			var nameSplit = false;
		}
		else {
			var nameSplit = result.settings.nameSplitSetting;
		}
		exportLeads(nameSplit);
	});
}


/**
 * export contact details collected for leads
 */
function exportLeads(nameSplit) {
	console.log("exporting!");
	browser.storage.local.get("leadsInfo", function(result) {
		let leadsInfo = result.leadsInfo;
		// setup csv data
		let now = new Date();
		// this is ridiculous--there must be a better way
		// to create valid filenames from dates
		let fileName = `sales-helper_${now.toISOString().slice(0,10)}_`;
		fileName += `${now.getHours()}-${now.getMinutes()}-${now.getSeconds()}.csv`;
		// allow splitting first word into "first name" based on arg (setting later)
		if (nameSplit) {
			var header = ["First Name", "Last Name", "Position",
				"Company Name", "Phone", "Email"].join(", ") + "\n";
		}
		else {
			var header = ["Full Name", "Position",
				"Company Name", "Phone", "Email"].join(", ") + "\n";
		}
		let csv = header;
		// build csv with headers
		for (let i = 0; i < leadsInfo.length; i++) {
			if (nameSplit) { // split on first space
				let names = leadsInfo[i][0].split(" ", 2);
				// replace full name with split names
				leadsInfo[i].splice(0, 1, names[0], names[1]);
			}
			// add each contact as a "row" to existing string
			csv += leadsInfo[i].join(", ") + "\n";
		}
		// build and download csv file
		let csvData = new Blob([csv], { type: "text/csv" });  
		let csvURL = window.URL.createObjectURL(csvData);
		console.log(csvURL);
		browser.downloads.download({
			url: csvURL,
			filename: fileName,
			saveAs: true
		},
		// revoking URL was causing problems
		// setTimeout(function() {
		// 	console.log("download finished");
		// 	window.URL.revokeObjectURL(url);
		// }, 5000)
		);
	});
}