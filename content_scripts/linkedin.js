(function() {
	/**
	 * Check and set a global guard variable.
	 * If this content script is injected into the same page again,
	 * it will do nothing next time.
	 */
	if (window.hasRun) {
		return;
	}
	window.hasRun = true;

	/**
	 * collect all leads from page
	 */
	function collectLeads() {
		// identify all lead items listed on page
		let leads = document.querySelectorAll(
			'.org-people-profile-card__profile-title'
			);
		let leadsInfo = []; // extracted info about each lead
		// extract, collect name of each lead
		for (let person of leads) { // I assume this is like a py foreach loop
			leadsInfo.push(person.textContent); // append name of lead to info arr
		}
		return leadsInfo;
	}

	/**
	 * retrieves contact info for collected leads
	 */
	function retrieveContactInfo(leadsInfo) {
		let leadsPlusEmails = [];
		// loop over all leads
		for (let person of leadsInfo) {

			leadsPlusEmails.push(person.textContent); // append name of lead to info arr
		}
		return leadsInfo;
	}

	/**
	 * searches for contact info for collected leads
	 */
	function searchTest(leads) { // sb_form_q search_icon b_results
		// base case
		if (leads.length === 0) {
			return [];
		}
		let leadsExtra = [];
		// search for name
		document.getElementById('sb_form_q').value = leads[0];
		document.getElementById('sb_form_go').click();
		// record content preview of first result
		let preview = document.getElementById(
			'b_results'
			).children[0].children[1].children[1].textContent;
		window.onload = (event) => {
			console.log(preview);
			leadsExtra.push([leads[0], preview]); // append name and preview
		}
		return leadsExtra.concat(
			searchTest(leads.slice(1))
		);
	}

	/**
	 * calls zoom info to retrieve contact info
	 */
	async function retrieveZoomInfo(firstName, lastName, title, company) {
		zoomAPI = "" // zoom info api endpoint
		// const response = await fetch()
	}

	/**
	 * export contact details collected for leads
	 * https://seegatesite.com/tutorial-read-and-write-csv-file-with-javascript/
	 */
	function exportContacts(contactInfo) {
		// setup csv data
		let now = new Date();
		// this is ridiculous--there must be a better way
		// to create valid filenames from dates
		let fileName = `sales-helper_${now.toISOString().slice(0,10)}
			_${now.getHours()}-${now.getMinutes()}-${now.getSeconds()}.csv`;
		let header = ["First Name", "Last Name",
			"Email", "Company Name"].join(", ") + '\n';
		let csv = header;
		contactInfo.forEach( obj => {
			let row = [];
			for (key in obj) {
				if (obj.hasOwnProperty(key)) {
					row.push(obj[key]);
				}
			}
			csv += row.join(delimiter)+"\n";
		});
		// build and download csv file
		let csvData = new Blob([csv], { type: 'text/csv' });  
		let csvURL = URL.createObjectURL(csvData);
		browser.downloads.download({url: csvURL, filename: fileName})
		URL.revokeObjectURL(csvURL)
	}

	/**
	 * Listen for messages from the background script.
	 * Call appropriate method.
	*/
	browser.runtime.onMessage.addListener((message) => {
		if (message.command === "collect") {
			// if (document.URL.contains("https://*.linkedin.com/")) { // sales url
			// 	console.log("all good")
			// }
			// else {
			// 	console.log("wrong page, bro")
			// }
			// insertBeast(message.beastURL);
			// console.log(message.currentURL)
			var leadsInfo = collectLeads();
			console.log(leadsInfo)
			// .then() export maybe??
		}
		else if (message.command === "search") {
			console.log("searching...")
			let leads = ["red", "yellow", "green"]
			let results = searchTest(leads);
			console.log(results)
		}
		else if (message.command === "reset") {
			// removeExistingBeasts();
			console.log("reset")
		}
	});

})();
