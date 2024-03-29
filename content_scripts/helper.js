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
	function collectLeadsList() {
		console.log("using rebuilt lead list collector");
		// identify all people in lead list (each has own row)
		let leadRows = document.querySelectorAll('tr[data-x--people-list--row]');
		let missingData = false; // if this is changed later, we know to notify user
		let leadsInfo = []; // extracted info about each lead
		// extract, clean, collect data about each lead
		for (let i = 0; i < leadRows.length; i++) {
			// identify all elements containing relevant data
			// identify names of all leads listed on page
			let leadName = leadRows[i].querySelector(
				"[data-anonymize='person-name']");
			// identify titles of all leads listed on page
			let leadTitle = leadRows[i].querySelector(
				"[data-anonymize='job-title']");
			// identify company of given lead
			let leadCompany = leadRows[i].querySelector(
				"[data-anonymize='company-name']");
			if ([leadName, leadTitle, leadCompany].includes(null)) {
				missingData = true; // we found a contact with missing data
				continue; // don't add contact info to list
			}
			// extract name, remove whitespace/qualifications
			let name = leadName.textContent.trim().split(",")[0];
			// **should add general non alpha stripping later**
			name = name.split("(")[0].trim(); // non alphanumeric chars don't work
			// extract title (with commas stripped for csv later)
			let title = leadTitle.textContent.trim().replaceAll(",", "");
			title = title.replaceAll("–", "-"); // causes problems in excel
			// extract company (with commas stripped for csv later)
			let company = leadCompany.textContent.trim().replaceAll(",", "");
			// append info per lead to main list
			leadsInfo.push([name, title, company]);
		}
		if (missingData) {
			window.alert( // there's obv a better way to do multiline
				"Some leads were missing info, so they were " +
				"excluded from the collection."
				);
		}
		setLeads(leadsInfo); // save any new leads to storage
	}

	/**
	 * add counter element to linkedin page to reflect number leads collected
	 */
	function addLeadCounter(numLeads) {
		// if count element already exists on page, remove it
		if (document.getElementById("helper-counter")) {
			document.getElementById("helper-counter").remove();
		}
		// create element, add to page
		var leadCounter = document.createElement("div");
		leadCounter.id = "helper-counter";
		// borrow linkedin styling
		leadCounter.classList = `
			linkedin-sales-helper
			artdeco-button
			artdeco-button--2
			artdeco-button--primary
			ember-view
			lists-nav-inline-action-buttons__share`;
		leadCounter.textContent = `${numLeads} Collected`;
		leadCounter.style.cssText = "background-color: red;";
		// identify appropriate parent menu (where the hell are enums in js)
		// linkedin sales navigator lead list
		if (window.location.href.includes('https://www.linkedin.com/sales/lists/people/')) {
			var targetMenu = document.querySelector(".mlA");
			leadCounter.classList.add("ml2", "mr2", "mt2"); // styling specific to page
		}
		// normal linkedin profile
		else if (window.location.href.includes('https://www.linkedin.com/in/')) {
			var targetMenu = document.querySelector(".pvs-profile-actions");
		}
		// normal linkedin search page
		else if (window.location.href.includes('https://www.linkedin.com/search/results/people/')) {
			var targetMenu = document.getElementById('search-reusables__filters-bar');
		}
		targetMenu.appendChild(leadCounter);
		// add event listener, so we can allow more collection via click
		let addedButton = document.getElementById("helper-counter");
		addedButton.addEventListener('click', function() {
			collectSwitcher(); // call appropriate collect method
		});
	}

	/**
	 * collects information from a linkedin profile page
	 */
	function collectPerson() {
		// ** add setting for collecting most recent job if not employed
		// ** stripping needs to be done in a cleaner way, all at once (code is duped)
		// should probably move to csv exporter
		// extract name, remove whitespace/qualifications
		var name = document.querySelector(
			'.text-heading-xlarge'
			).innerText.trim().split(",")[0];
		// **should add general non alpha stripping later**
		name = name.split("(")[0].trim(); // non alphanumeric chars don't work
		// get last job listed (either current or last one before unemployment)
		// apparently linkedin profiles are displayed differently depending on user
		// could be based on account age or number of connections--it's unclear
		// the new account definitely has a more obscured source
		window.scroll(0,1000); // scroll down to make sure experience section loads
		if (document.querySelector('.pv-profile-section__section-info--has-more')) {
			var lastJob = document.querySelector(
				'.pv-profile-section__section-info--has-more').children[0];
		}
		else {
			console.log("detected an alternately-styled profile");
			// see if it's an alternately-styled profile (as mentioned above)
			var sectionList = document.getElementsByClassName('artdeco-card ember-view break-words');
			for (let i = 0; i < sectionList.length; i++) {
				// random sub-div (containing nothing) identifying xp section
				if (sectionList[i].querySelector('div[id="experience"]')) {
					var xpSection = sectionList[i]; // more focused target section
					// call function for handling new styling
					return collectNewPerson(name, xpSection);
				}
			}
			alert("something went wrong - please verify that this person has work experience");
			return; // alert is self explanatory
		}
		// extract title (with commas stripped for csv later)
		var title = lastJob.getElementsByClassName(
			't-16 t-black t-bold')[0].innerText.trim().replaceAll(",", "");
		title = title.replaceAll("–", "-");
		// check if currently employed or not (according to prof jobs)
		var employed = lastJob.getElementsByClassName(
			'pv-entity__date-range t-14 t-black--light t-normal'
			)[0].children[1].innerText.includes("Present");
		// extract company (with commas stripped for csv later)
		var company = lastJob.getElementsByClassName(
			'pv-entity__secondary-title t-14 t-black t-normal'
			)[0].innerText.trim().replaceAll(",", "");
		browser.storage.sync.get("settings", function(result) {
			if (result.settings === undefined) {
				var mostRecentJob = false;
			}
			else {
				var mostRecentJob = result.settings.mostRecentJobSetting;
			}
			if ((!employed) && (!mostRecentJob)) {
				// can either use title listed at top of profile or none at all
				title = document.querySelector('div.text-body-medium').innerText;
				// title = "not employed";
				company = "not employed";
			}
			var leadsInfo = []; // formatted so storage func can use it
			leadsInfo.push([name, title, company]);
			// console.log(`collected person: ${leadsInfo}`)
			setLeads(leadsInfo); // store newly collected person in browser
		});
	}

	/**
	 * collects information from a linkedin profile page viewed with a new account
	 */
	function collectNewPerson(name, xpSection) {
		// collect last job
		var lastJob = xpSection.querySelector('ul:nth-child(1) > li:nth-child(1)');
		// extract title (with commas stripped for csv later)
		// first, check for multiple positions/titles at most recent company
		var lastJobTitles = lastJob.getElementsByClassName('t-bold mr1');
		if (lastJobTitles.length > 1) { // true: multiple positions at this co
			// if multiple, first is co name, second is most recent position
			var title = lastJobTitles[1].children[0];
			// update with more specific last job location (really last position)
			// grab employment status at given company
			// work backwards from title, given multiplse positions
			var employment = title.parentNode.parentNode.children[0].children[0];
			// grab current company info (using first title we found before)
			var company = lastJobTitles[0].children[0];
		} else { // false: just one position listed at most recent company
			var title = lastJobTitles[0].children[0];
			// work backwards from title for subsequent pieces of info
			// grab employment status at given company
			var employment = 
				title.parentNode.parentNode.parentNode.children[2].children[0];
			// grab current company info
			var company = title.parentNode.parentNode.parentNode.children[1].children[0];
		}
		// extract text from elements and clean up
		var titleText = title.innerText;
		var companyText = company.innerText.split("·")[0]; // strip type indicator
		// check if currently employed or not (according to prof jobs)
		var employed = employment.innerText.includes("Present");
		browser.storage.sync.get("settings", function(result) {
			if (result.settings === undefined) {
				var mostRecentJob = false;
			}
			else {
				var mostRecentJob = result.settings.mostRecentJobSetting;
			}
			if ((!employed) && (!mostRecentJob)) {
				// can either use title listed at top of profile or none at all
				titleText = document.querySelector('div.text-body-medium').innerText;
				// title = "not employed";
				companyText = "not employed";
			}
			var collectedInfo = [name, titleText, companyText]
			// clean up extracted text all at once
			for (let i = 0; i < collectedInfo.length; i++) {
				collectedInfo[i] = collectedInfo[i].trim(
					).replaceAll(",", "");
				collectedInfo[i] = collectedInfo[i].replaceAll("–", "-");
			}
			var leadsInfo = []; // formatted so storage func can use it
			leadsInfo.push(collectedInfo);
			// console.log(`collected person: ${leadsInfo}`)
			setLeads(leadsInfo); // store newly collected person in browser
		});
	}

	/**
	 * collects information of people/results in linkedin search
	 */
	function collectSearch() {
		// ** add setting for allowing "guessing" company
		// identify all people results
		var results = document.getElementsByClassName('reusable-search__result-container');
		// loop over all results
		var leadsInfo = []; // extracted info about each lead
		browser.storage.sync.get("settings", function(result) {
			if (result.settings === undefined) {
				var guessCompany = false;
			}
			else {
				var guessCompany = result.settings.guessCompanySetting;
			}
			// extract, collect data about each lead (and clean up)
			for (let i = 0; i < results.length; i++) {
				// extract name, remove whitespace/qualifications
				// ** possibly add setting to include hidden members to results
				if (results[i].innerText.includes("LinkedIn Member")) {
					console.log("skipping hidden profile");
					continue;
				}
				else {
					var name = results[i].querySelector(
					'[dir="ltr"]'
					).children[0].innerText.trim().split(",")[0];
					// **should add general non alpha stripping later**
					name = name.split("(")[0].trim(); // non alphanumeric chars don't work
				}
				// extract title (with commas stripped for csv later)
				if (results[i].getElementsByClassName(
					'entity-result__primary-subtitle t-14 t-black t-normal'
					).length !== 0) { // handle no title given
					var title = results[i].getElementsByClassName(
						'entity-result__primary-subtitle t-14 t-black t-normal'
						)[0].innerText.trim().replaceAll(",", "");
					title = title.replaceAll("–", "-"); // causes problems in excel
				}
				else {
					var title = ""; // no title given (future: maybe grab current job title?)
				}
				if (guessCompany) {
					// check if using linkedin title convention
					if (title.includes(" at ")) {
						var separatedInfo = title.split(" at ");
						title = separatedInfo[0]; // new title (title before "at")
						var company = separatedInfo[1]; // guessed company (title after "at")
					}
					else {
						var company = "not extractable";
					}
				}
				else {
					var company = "";
				}
				// append info per lead to main list
				leadsInfo.push([name, title, company]);
			}
			setLeads(leadsInfo); // save any new leads to storage
		});
	}

	/**
	 * opens step menu on zoominfo page
	 */
	function addSearchMenu() {
		console.log("adding menu");
		// check if clear button exists
		if (document.querySelector("a.xxsmall-12")) {
			document.querySelector("a.xxsmall-12").click(); // click if so
		}
		// check if buttons/porthole already exist
		if (document.getElementsByClassName("linkedin-sales-helper").length !== 0) {
			console.log("deleting old elements");
			document.getElementById("helper-menu").remove();
			document.getElementById("helper-porthole").remove();
			document.getElementById("helper-skip").remove();
		} // re(?) add it
		// identify parent menu
		let menu = document.querySelector('.content-title-row-right');
		// create button
		let advance = document.createElement("button");
		advance.id = "helper-menu";
		advance.classList = "linkedin-sales-helper";
		advance.textContent = "Next Step";
		advance.style.cssText = `
			background-color: red;
			padding: 5pt;
			border-radius: 10pt;
			color: white;
		`;
		// create update "porthole"
		let porthole = document.createElement("p");
		porthole.id = "helper-porthole";
		porthole.classList = "linkedin-sales-helper";
		porthole.textContent = "Current Contact";
		porthole.style.cssText = `
			background-color: red;
			padding: 5pt;
			padding-right: 25pt;
			padding-left: 25pt;
			margin-right: 50pt;
			border-radius: 10pt;
			border: 2pt solid black;
			color: white;
		`;
		// skip button
		let skip = document.createElement("button");
		skip.id = "helper-skip";
		skip.classList = "linkedin-sales-helper";
		skip.textContent = "Skip";
		skip.style.cssText = `
			background-color: orange;
			padding: 5pt;
			border-radius: 10pt;
			color: white;
		`;
		// add new items to menu
		menu.appendChild(skip);
		menu.appendChild(advance);
		menu.prepend(porthole);
		// add event listeners, so we know when new buttons are clicked
		let addedButton = document.getElementById("helper-menu");
		addedButton.addEventListener('click', function() {
			browser.storage.sync.get("settings", function(result) {
				if (result.settings === undefined) {
					var zoomManual = false;
				}
				else {
					var zoomManual = result.settings.zoomManualSetting;
				}
				// call relevant search automation function
				if (zoomManual) {
					autoZoom();
				}
				else {
					fullAutoZoom();
				}
			});
		});
		let skipButton = document.getElementById("helper-skip");
		skipButton.addEventListener('click', function() {
			console.log("skipping this lead");
			skipLead(); // used if stuck on a lead
		});
		console.log("menu added");
	}

	/**
	 * semi-automates zoominfo search process
	 */
	function autoZoom() {
		console.log("zooming!"); // remove
		// retrieve previously collected data from local storage
		browser.storage.local.get("leadsInfo", function(result) {
			let retrievedStorage = result.leadsInfo;
			console.log(retrievedStorage); // see currently saved stuff
			// let unparsedStorage = window.localStorage.getItem('collected_leads');
			// if there was no previously collected data, notify user and exit
			if (isEmpty(retrievedStorage)) {
				window.alert("no collected leads found—please get them from linkedin first");
				return;
			}
			// identify next contact
			// loop until finding a lead with no contact info
			var leadIndex = null; // in case none are found
			for (let i = 0; i < retrievedStorage.length; i++) {
				// if list length is less than 5, need contact info
				if (retrievedStorage[i].length < 5) {
					leadIndex = i; // identify current lead
					// console.log(`current lead: ${retrievedStorage[leadIndex]}`)
					document.getElementById("helper-porthole").textContent = 
						retrievedStorage[leadIndex][0];
					break; // exit loop
				}
			}
			// check if we've finished collecting contacts
			if (leadIndex === null) {
				window.alert("search complete");
				return;
			}
			// check if we've started a search
			// can also check if at any point a contact is opened, skip to collection process
			// should also check if there are zero (or just one) left at any point
			if (window.location.href.includes("query")) { // if query in url
				// if contact details are visible, save 'em
				if (document.querySelector(
					".contact-details-grid-col-left > div:nth-child(1)")) {
					// if phone exists (there exists at least one num in phone section)
					var phoneNumbers = document.querySelectorAll(
						".phone-section zi-text.data-column [class*='phone']"
						);
					if (phoneNumbers.length > 0) {
						var hqNumber = null; // in case it's only option
						var phone = null;
						for (let i = 0; i < phoneNumbers.length; i++) {
							if (phoneNumbers[i].innerText.includes("HQ")) {
								// we'd rather have a direct number,
								// but just in case it's not available
								hqNumber = phoneNumbers[i].children[0].href.slice(4);
							}
							else {
								phone = phoneNumbers[i].children[0].href.slice(4);
								break;
							}
						}
						if ((phone === null) && (hqNumber !== null)) {
							phone = hqNumber; // grab hq number, it's better than nothing
						}
						else if ((phone === null) && (hqNumber === null)) {
							// shouldn't get here, but likely means no number exists
							phone = "not found";
						}
						// alert user to slow down if clicking too fast to load
						if (phone === "Phone") {
							document.querySelector("a.xxsmall-12").click(); // click clear button
							alert("slow down!");
						}
						// console.log(`Phone: ${phone}`); // debugging
					} // otherwise, save "not found"
					else {
						var phone = "not found";
					}
					// if email exists
					if (document.querySelector(".email-link")) { // save it
						var email = document.querySelector(".email-link").title;
						// alert user to slow down if clicking too fast to load
						if (email === "Email") {
							document.querySelector("a.xxsmall-12").click(); // click clear button
							alert("slow down!");
						}
					} // otherwise, save "not found"
					else {
						var email = "not found";
					}
					// add 'em to current info list
					retrievedStorage[leadIndex].push(phone);
					retrievedStorage[leadIndex].push(email);
					// reset in prep for next search
					document.querySelector("a.xxsmall-12").click();
					// save new data to local storage
					leadsInfo = retrievedStorage;
					browser.storage.local.set({"leadsInfo": leadsInfo});
					// console.log(leadsInfo);
				}
				// technically, we can assume that if we've started a search,
				// then we've entered a contact name, but let's be sure
				// here we check to see if the filter for contact name appears at the top
				else if (document.querySelector("[automationid*='Contact Name']")) {
					// check if we've also entered a company name (does filter exist?)
					if (document.querySelector("[automationid*='Company Name']")) {
						// if no-one was found, save "not found" to contact, move on
						if ((document.querySelector(".no-results")) ||
							(document.querySelector(".brief-no-results"))) {
							// add em to current info list
							retrievedStorage[leadIndex].push("not found");
							retrievedStorage[leadIndex].push("not found");
							// reset in prep for next search
							document.querySelector("a.xxsmall-12").click();
							// save new data to local storage
							leadsInfo = retrievedStorage;
							browser.storage.local.set({"leadsInfo": leadsInfo});
						}
						// if we have, select the first (hopefully only) contact
						document.querySelector("zi-row-contact-logo").click();
					}
					else {
						// add current co name filter to search
						var companySuccess = enterLeadCompany(
							retrievedStorage[leadIndex][2]);
						if (!companySuccess) {
							window.alert(
								'no company collected for the given contact: ' +
								'select contact manually or skip to the next one\n\n' +
								'next time, try "guess company from' +
								' title" setting before collection');
						}
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
				enterLeadName(retrievedStorage[leadIndex][0]); // add current name filter to search
			}
		});
	}

	/**
	 * fully automates zoominfo search process
	 */
	function fullAutoZoom() { // get rid of code duplication here
		console.log("full auto zooming!"); // remove
		// **should move all storage operations to new function(s)**
		// **needs general refactoring**
		// retrieve previously collected data from local storage
		browser.storage.local.get("leadsInfo", function(result) {
			let retrievedStorage = result.leadsInfo;
			console.log(retrievedStorage); // see currently saved stuff
			// let unparsedStorage = window.localStorage.getItem('collected_leads');
			// if there was no previously collected data, notify user and exit
			if (isEmpty(retrievedStorage)) {
				window.alert("no collected leads found—please get them from linkedin first");
				return;
			}
			// identify next contact
			// loop until finding a lead with no contact info
			var leadIndex = null; // in case none are found
			for (let i = 0; i < retrievedStorage.length; i++) {
				// if list length is less than 5, need contact info
				if (retrievedStorage[i].length < 5) {
					leadIndex = i; // identify current lead
					// console.log(`current lead: ${retrievedStorage[leadIndex]}`)
					document.getElementById("helper-porthole").textContent = 
						retrievedStorage[leadIndex][0];
					break; // exit loop
				}
			}
			// check if we've finished collecting contacts
			if (leadIndex === null) {
				window.alert("search complete");
				return;
			}
			// check if we've started a search
			// can also check if at any point a contact is opened, skip to collection process
			// should also check if there are zero (or just one) left at any point
			if (window.location.href.includes("query")) { // if query in url
				// if contact details are visible, save 'em
				if (document.querySelector(
					".contact-details-grid-col-left > div:nth-child(1)")) {
					// if phone exists (there exists at least one num in phone section)
					var phoneNumbers = document.querySelectorAll(
						".phone-section zi-text.data-column [class*='phone']"
						);
					if (phoneNumbers.length > 0) {
						var hqNumber = null; // in case it's only option
						var phone = null;
						for (let i = 0; i < phoneNumbers.length; i++) {
							if (phoneNumbers[i].innerText.includes("HQ")) {
								// we'd rather have a direct number,
								// but just in case it's not available
								hqNumber = phoneNumbers[i].children[0].href.slice(4);
							}
							else {
								phone = phoneNumbers[i].children[0].href.slice(4);
								break;
							}
						}
						if ((phone === null) && (hqNumber !== null)) {
							phone = hqNumber; // grab hq number, it's better than nothing
						}
						else if ((phone === null) && (hqNumber === null)) {
							// shouldn't get here, but likely means no number exists
							phone = "not found";
						}
						// if phone number hasn't loaded in
						if (phone === "Phone") {
							var targetArea = document.querySelector(
								"zi-text.data-column:nth-child(2) > div:nth-child(1) > a:nth-child(1)");
							zoomWatcher(targetArea, true); // watch att change
							// // just call self again, hope element has now loaded
							// if (!overload) {
							// 	fullAutoZoom();
							// }
						}
					} // otherwise, save "not found"
					else {
						var phone = "not found";
					}
					// if email exists
					if (document.querySelector(".email-link")) { // save it
						var email = document.querySelector(".email-link").title;
						// // if email hasn't loaded in
						// if (email === "Email") {
						// 	document.querySelector("a.xxsmall-12").click(); // click clear button
						// 	alert("please consider switching to manual mode--your page isn't loading fast enough.");
						// }
						// if email hasn't loaded in
						if (email === "Email") {
							var targetArea = document.querySelector(".email-link");
							zoomWatcher(targetArea, true); // watch att change
						}
					} // otherwise, save "not found"
					else {
						var email = "not found";
					}
					// add 'em to current info list
					retrievedStorage[leadIndex].push(phone);
					retrievedStorage[leadIndex].push(email);
					// watch main content area for changes, move on
					var targetArea = document.querySelector(".content-main-scrollable");
					zoomWatcher(targetArea);
					// reset in prep for next search
					document.querySelector("a.xxsmall-12").click();
					// save new data to local storage
					leadsInfo = retrievedStorage;
					browser.storage.local.set({"leadsInfo": leadsInfo});
					// console.log(leadsInfo);
				}
				// technically, we can assume that if we've started a search,
				// then we've entered a contact name, but let's be sure
				// here we check to see if the filter for contact name appears at the top
				else if (document.querySelector("[automationid*='Contact Name']")) {
					// check if we've also entered a company name (does filter exist?)
					if (document.querySelector("[automationid*='Company Name']")) {
						// if no-one was found, save "not found" to contact, move on
						if ((document.querySelector(".no-results")) ||
							(document.querySelector(".brief-no-results"))) {
							// add em to current info list
							retrievedStorage[leadIndex].push("not found");
							retrievedStorage[leadIndex].push("not found");
							// watch main content area for changes, move on
							var targetArea = document.querySelector(".content-main-scrollable");
							zoomWatcher(targetArea);
							// reset in prep for next search
							document.querySelector("a.xxsmall-12").click();
							// save new data to local storage
							leadsInfo = retrievedStorage;
							browser.storage.local.set({"leadsInfo": leadsInfo});
						}
						// watch table area for changes, move on
						var targetArea = document.querySelector(
							"tbody.p-datatable-tbody:nth-child(2)");
						zoomWatcher(targetArea);
						// if we have, select the first (hopefully only) contact
						document.querySelector("zi-row-contact-logo").click();
					}
					else {
						// watch filter area for changes, move on
						var targetArea = document.querySelector(".chips-container");
						zoomWatcher(targetArea);
						// add current co name filter to search
						var companySuccess = enterLeadCompany(
							retrievedStorage[leadIndex][2]);
						if (!companySuccess) {
							window.alert(
								'no company collected for the given contact: ' +
								'select contact manually or skip to the next one\n\n' +
								'next time, try "guess company from' +
								' title" setting before collection');
						}
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
				// watch main content area for changes, move on
				var targetArea = document.querySelector(".content-main-scrollable");
				zoomWatcher(targetArea);
				// add current name filter to search
				enterLeadName(retrievedStorage[leadIndex][0]);
			}
		});
	}

	/**
	 * watch children of given target area, move to next step upon mutation
	 */
	function zoomWatcher(watchArea, att = false) {
		// start observing content area
		var targetArea = watchArea;
		// allow code to be reused for watching contact info load
		if (att === false) {
			console.log("now watching the children");
			var config = { childList: true };
		}
		else {
			console.log("now watching the attributes");
			var config = { attribute: true }
		}
		var observer = new MutationObserver(function() {
			// log and return if so
			console.log("they changed!");
			// dunno if this is how js works
			this.disconnect();
			fullAutoZoom(); // call self again to move to next step
		});
		observer.observe(targetArea, config);
	}

	/**
	 * enter next lead name in zoominfo adv search page
	 */
	function enterLeadName(leadName) {
		// open person drop down
		document.querySelector(
			"[automationid='Contacts-icon-closed'").click();
		// open person name search
		document.getElementById(
			"contact-name-filter-header").children[0].click();
		// type in person name
		document.getElementById(
			"full-name-freetext-filter").value = leadName;
		// show search button
		document.getElementById(
			"full-name-freetext-filter").parentNode.children[1].classList.add('show-icon');
		// click search button
		document.getElementById(
			"full-name-freetext-filter").parentNode.children[1].click();
		// close contact dropdown
		document.querySelector(
			"[automationid='Contacts-icon-opened'").click();
	}

	/**
	 * enter next lead's company name
	 */
	function enterLeadCompany(leadCompany) {
		// double check that there is a company actually provided
		if (leadCompany === "" || leadCompany === "not extractable") {
			return false; // no search possible without company given
		}
		// open company drop down
		document.querySelector(
			"[automationid='Companies-icon-closed'").click();
		// open company name search
		document.getElementById(
			"company-name-filter-header").children[0].click();
		// type in company name
		document.getElementById(
			"company-name-freetext-filter").value = leadCompany;
		// show search button
		document.getElementById(
			"company-name-freetext-filter").parentNode.children[1].classList.add('show-icon');
		// click search button
		document.getElementById(
			"company-name-freetext-filter").parentNode.children[1].click();
		// close company dropdown
		document.querySelector(
			"[automationid='Companies-icon-opened'").click();
		return true; // we think a company was successfully entered/searched
	}

	/**
	 * skips current lead if stuck
	 */
	function skipLead() {
		// retrieve current lead
		// retrieve previously collected data from local storage
		browser.storage.local.get("leadsInfo", function(result) {
			let retrievedStorage = result.leadsInfo;
			// console.log(retrievedStorage); // see currently saved stuff
			// let unparsedStorage = window.localStorage.getItem('collected_leads');
			// if there was no previously collected data, notify user and exit
			if (isEmpty(retrievedStorage)) {
				window.alert("no collected leads found—please get them from linkedin first");
				return;
			}
			// identify next contact
			// loop until finding a lead with no contact info
			var leadIndex = null; // in case none are found
			for (let i = 0; i < retrievedStorage.length; i++) {
				// if list length is less than 5, need contact info
				if (retrievedStorage[i].length < 5) {
					leadIndex = i; // identify current lead
					break; // exit loop
				}
			}
			// check if we've finished collecting contacts
			if (leadIndex === null) {
				window.alert("search complete");
				return;
			}
			// store "not found" for info
			retrievedStorage[leadIndex].push("skipped");
			retrievedStorage[leadIndex].push("skipped");
			console.log("pushed stuff"); // debugging
			// watch main content area for changes, move on (only fullauto)
			browser.storage.sync.get("settings", function(result) {
				if (result.settings === undefined) {
					var zoomManual = false;
				}
				else {
					var zoomManual = result.settings.zoomManualSetting;
				}
				// resume if in full auto mode
				if (!zoomManual) {
					var targetArea = document.querySelector(".content-main-scrollable");
					zoomWatcher(targetArea);
				}
			});
			// check if a search was already started
			if (document.querySelector("a.xxsmall-12")) {
				// reset it in prep for next search
				document.querySelector("a.xxsmall-12").click();
			}
			// save new data to local storage
			leadsInfo = retrievedStorage;
			browser.storage.local.set({"leadsInfo": leadsInfo});
		});
	}

	/**
	 * reset all collected info leads
	 */
	function resetLeads() {
		// clear data stored in local storage
		browser.storage.local.remove("leadsInfo", function() {
			console.log("reset stored leads");
			// if count element exists on page, update it
			if (document.getElementById("helper-counter")) {
				document.getElementById("helper-counter").textContent = "0 Collected";
			}
		});
	}

	/**
	 * stores new lead info
	 */
	function setLeads(leadsInfo) {
		// retrieve previously collected data from local storage
		browser.storage.local.get("leadsInfo", function(result) {
			let retrievedStorage = result.leadsInfo;
			// stringify for lazy dupe searching
			let unparsedStorage = JSON.stringify(retrievedStorage);
			// if there was previously collected data, extend it w/o dupes
			// verify these boolean statements, they seem sketchy
			if (!isEmpty(retrievedStorage)) {
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
			addLeadCounter(leadsInfo.length); // only for lead list page as of now
			// save collected data to local storage
			browser.storage.local.set({"leadsInfo": leadsInfo});
			console.log(leadsInfo);
		});
		console.log("leads successfully stored");
	}

	/**
	 * log errors related to storage of leads
	 */
	function onLeadsError(error) {
		console.log(`leads storage error:\n\n${error}`);
	}

	/**
	 * call correct collect method based on current page
	 */
	function collectSwitcher() {
		// check if we're on a lead list from sales navigator
		if (window.location.href.includes('https://www.linkedin.com/sales/lists/people/')) {
			console.log('collecting a lead list');
			// after a lot of storage f-ery, i think this handles it
			collectLeadsList();
		}
		// if on a linkedin profile
		else if (window.location.href.includes('https://www.linkedin.com/in/')) {
			console.log("collecting a single person's info");
			// collect the person's info
			collectPerson();
		}
		// if linkedin search results are visible
		else if (window.location.href.includes('https://www.linkedin.com/search/results/people/')) {
			console.log("collecting results of a search");
			// collect the visible info
			collectSearch();
		}
		// if on initial search result page
		else if (window.location.href.includes('https://www.linkedin.com/search/results/all/')) {
			document.querySelector(
				'div.ph0:nth-child(1) > div:nth-child(3) > a:nth-child(1)'
				).click(); // click "see all people results" button
			alert('redirecting to full search results (try again)');
		}
		else {
			// otherwise, don't collect anything
			alert('not on a page we can collect from');
		}
	}

	/**
	 * Listen for messages from the background script.
	 * Call appropriate method.
	*/
	browser.runtime.onMessage.addListener((message) => {
		if (message.command === "collect") {
			// choose appropriate collect method
			collectSwitcher();
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
			resetLeads();
		}
	});

})();
