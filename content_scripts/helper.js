// helper.js for linkedin-sales-helper by maxtheaxe

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
	 * returns boolean of whether obj is empty
	 */
	function isEmpty(obj) {
		for(var key in obj) {
			if(obj.hasOwnProperty(key))
				return false;
		}
		return true;
	}

	/**
	 * collect all leads from lead list page, extends given existing stored leads
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
		// retrieve previously collected data from local storage
		browser.storage.local.get("leadsInfo", function(result) {
			let retrievedStorage = result.leadsInfo;
			// stringify for lazy dupe searching
			let unparsedStorage = JSON.stringify(retrievedStorage);
			// if there was previously collected data, extend it w/o dupes
			if ((!isEmpty(retrievedStorage)) || 
				(retrievedStorage === "undefined") || (retrievedStorage === null)) {
				for (let i = 0; i < leadsInfo.length; i++) {
					// if not dupe, extend old list
					// (checks if name is substring of unparsed JSON)
					if (!unparsedStorage.includes(leadsInfo[i][0])) {
						// console.log(`here: ${typeof(retrievedStorage)}`);
						// console.log(`here: ${(retrievedStorage)}`)
						retrievedStorage.push(leadsInfo[i]);
					}
				}
				leadsInfo = retrievedStorage; // save extended list to leadsInfo
			}
			// save collected data to local storage
			browser.storage.local.set({"leadsInfo": leadsInfo});
			console.log(leadsInfo);
		});
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
	 * opens step menu on zoominfo page
	 */
	function addSearchMenu() {
		console.log("adding button");
		// check if button already exists
		if (document.getElementById("helper-menu")) {
			console.log("button already here");
			return; // exit
		} // otherwise, add it
		// identify parent menu
		let menu = document.querySelector('.content-title-row-right');
		// create button
		let advance = document.createElement("button");
		advance.id = "helper-menu";
		advance.textContent = "Next Step";
		advance.style.cssText = `
			background-color: red;
			padding: 5pt;
			border-radius: 10pt;
			color: white;
		`;
		// add new button to menu
		menu.appendChild(advance);
		// add event listener, so we know when new button is clicked
		let addedButton = document.getElementById("helper-menu");
		addedButton.addEventListener('click', function() {
			autoZoom(); // call search automation function
		});
		console.log("button added");
	}

	/**
	 * automates zoominfo search process
	 */
	function autoZoom() {
		console.log("zooming!"); // remove
		// retrieve previously collected data from local storage
		let retrievedStorage = JSON.parse(
			window.localStorage.getItem('collected_leads'));
		let unparsedStorage = window.localStorage.getItem('collected_leads');
		// if there was no previously collected data, notify user and exit
		if (retrievedStorage === null) {
			window.alert("no collected leads found—please get them from linkedin first");
			return;
		}
		// identify next contact
		// loop until finding a lead with no contact info
		for (let i = 0; i < retrievedStorage.length; i++) {
			// if list length is less than 5, need contact info
			if (retrievedStorage[i].length <= 5) {
				var currentLead = retrievedStorage[i];
				break; // exit loop
			}
		}
		// check if we've started a search
		// can also check if at any point a contact is opened, skip to collection process
		// should also check if there are zero (or just one) left at any point
		if (window.location.href.includes('query')) { // if query in url
			if (document.querySelector(".email-link")) {
				// collect em and store em
			}
			// technically, we can assume that if we've started a search,
			// then we've entered a contact name, but let's be sure
			else if (document.querySelector("[automationid='Contact Name']")) {
				// check if we've also entered a company name
				if (document.querySelector("[automationid='Company Name']")) {
					// if we have, select the first (hopefully only) contact
					document.querySelector("[automation-id='visitorRow']").click();
				}
				else {
					enterLeadCompany(currentLead[2]); // add current co name filter to search
				}
			}
			else {
				// shouldn't get here--there should be no query without contact name
				document.querySelector("a.xxsmall-12").click(); // click clear button
				window.alert("something went wrong—please try again");
				return;
			}
		}
		else {
			enterLeadName(currentLead[0]); // add current name filter to search
		}
		// // save collected data to local storage as JSON (should only do so if modified)
		// window.localStorage.setItem('collected_leads',
		// 	JSON.stringify(leadsInfo));
	}

	/**
	 * enter next lead name
	 */
	function enterLeadName(leadName) {
		// enter deets
		return;
	}

	/**
	 * enter next lead's company name
	 */
	function enterLeadCompany(leadCompany) {
		// enter deets
		return;
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
		// clear data stored in local storage
		window.localStorage.setItem('collected_leads', null);
	}

	/**
	 * on successful storage of lead info
	 */
	function setLeads() {
		console.log("leads successfully stored");
	}

	/**
	 * log errors related to storage of leads
	 */
	function onLeadsError(error) {
		console.log(`leads storage error:\n\n${error}`);
	}

	/**
	 * Listen for messages from the background script.
	 * Call appropriate method.
	*/
	browser.runtime.onMessage.addListener((message) => {
		if (message.command === "collect") {
			// after a lot of storage f-ery, i think this handles it
			collectLeads();
		}
		else if (message.command === "search") {
			console.log("navigating to search page...");
			// if not already there
			if (window.location.href.includes('https://app.zoominfo.com/#/apps/search/v2')) {
				console.log("already here!");
			}
			else {
				// navigate to zoominfo advanced search page
				window.location.href = 'https://app.zoominfo.com/#/apps/search/v2';
			}
			addSearchMenu(); // open search menu
			// let leads = ["red", "yellow", "green"]
			// let results = searchTest(leads);
			// console.log(results);
		}
		else if (message.command === "reset") {
			// removeExistingBeasts();
			console.log("reset")
		}
	});

})();
