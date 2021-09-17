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
	 * collect all leads from lead list page
	 */
	function collectLeads() {
		// verify that all leads have complete accounts, profile info
		let missingAccounts = document.querySelectorAll(
			"span.list-detail-account-matching__text");
		if (missingAccounts.length > 0) {
			// there's obv a better way to do multiline
			window.alert(
				"Some leads were missing info, so they were hidden and " +
				"excluded from the collection."
				);
			// return "error: incomplete info";
			// remove leads with missing info
			for (let i = 0; i < missingAccounts.length; i++) {
				// delete problematic lead (doesn't actually remove from linkedin)
				missingAccounts[i].parentNode.parentNode.parentNode.parentNode.remove();
			}
		}
		// identify names of all leads listed on page
		let leadNames = document.querySelectorAll(
			"[data-anonymize='person-name']");
		// identify titles of all leads listed on page
		let leadTitles = document.querySelectorAll(
			"[data-anonymize='job-title']");
		// identify companies of all leads listed on page
		// number of co names is dynamically sliced to number
		// of ppl names (since it's double)
		// if errors are caused, might need to delete extras assoc w missing accs
		let leadCompanies = Array.from(document.querySelectorAll(
			"[data-anonymize='company-name'")).slice(0, leadNames.length);
		let leadsInfo = []; // extracted info about each lead
		// extract, collect data about each lead (and clean up)
		for (let i = 0; i < leadNames.length; i++) {
			// extract name, remove whitespace/qualifications
			let name = leadNames[i].textContent.trim().split(",")[0]
			// extract title
			let title = leadTitles[i].textContent
			// extract company
			let company = leadCompanies[i].textContent
			// append info per lead to main list
			leadsInfo.push([name, title, company]);
		}
		// retrieve previously collected data from session storage
		let retrievedStorage = JSON.parse(
			window.sessionStorage.getItem('collected_leads'));
		let unparsedStorage = window.sessionStorage.getItem('collected_leads');
		// if there was previously collected data, extend it w/o dupes
		if (retrievedStorage !== null) {
			for (let i = 0; i < leadsInfo.length; i++) {
				// if not dupe, extend old list
				// (checks if name is substring of unparsed JSON)
				if (!unparsedStorage.includes(leadsInfo[i][0])) {
					retrievedStorage.push(leadsInfo[i]);
				}
			}
			leadsInfo = retrievedStorage; // save extended list to leadsInfo
		}
		// save collected data to session storage as JSON
		window.sessionStorage.setItem('collected_leads',
			JSON.stringify(leadsInfo));
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
	 * reset all collected info leads
	 */
	function resetLeads() {
		// clear data stored in session storage
		window.sessionStorage.setItem('collected_leads', null);
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
