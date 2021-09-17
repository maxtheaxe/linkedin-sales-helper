/**
 * CSS to hide everything on the page,
 * except for elements that have the "beastify-image" class.
 */
const hidePage = `body > :not(.beastify-image) {
	display: none;
}`;

/**
 * Listen for clicks on the buttons, and send the appropriate message to
 * the content script in the page.
 */
function listenForClicks() {
	document.addEventListener("click", (e) => {

		/**
		 * send a "collect" message to the content script in the active tab.
		 */
		function collect(tabs) {
			browser.tabs.sendMessage(tabs[0].id, {
				command: "collect"
			});
		}

		/**
		 * send a "search" message to the content script in the active tab.
		 */
		function search(tabs) {
			browser.tabs.sendMessage(tabs[0].id, {
				command: "search"
			});
		}

		/**
		 * Remove the page-hiding CSS from the active tab,
		 * send a "reset" message to the content script in the active tab.
		 */
		function reset(tabs) {
			browser.tabs.removeCSS({code: hidePage}).then(() => {
				browser.tabs.sendMessage(tabs[0].id, {
					command: "reset",
				});
			});
		}

		/**
		 * Just log the error to the console.
		 */
		function reportError(error) {
			console.error(`Could not complete requested operation: ${error}`);
		}

		/**
		 * Get the active tab,
		 * then call appropriate method.
		 */
		if (e.target.id === "collect") {
			browser.tabs.query({active: true, currentWindow: true})
				.then(collect)
				.catch(reportError);
		}
		else if (e.target.id === "search") {
			browser.tabs.query({active: true, currentWindow: true})
				.then(search)
				.catch(reportError);
		}
		else if (e.target.id === "reset") {
			browser.tabs.query({active: true, currentWindow: true})
				.then(reset)
				.catch(reportError);
		}
	});
}

/**
 * There was an error executing the script.
 * Display the popup's error message, and hide the normal UI.
 */
function reportExecuteScriptError(error) {
	document.querySelector("#popup-content").classList.add("hidden");
	document.querySelector("#error-content").classList.remove("hidden");
	console.error(`Failed to execute sales helper content script: ${error.message}`);
}

/**
 * When the popup loads, inject a content script into the active tab,
 * and add a click handler.
 * If we couldn't inject the script, handle the error.
 */
browser.tabs.executeScript({file: "/content_scripts/linkedin.js"})
.then(listenForClicks)
.catch(reportExecuteScriptError);
