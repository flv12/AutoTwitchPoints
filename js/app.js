/**
 * Error display
 * @param {*} error 
 */
function onError(error) {
	console.error(`Error: ${error}`);
}

/**
 * Check for points storage existence and if not, set points to 0
 */
function initPoints() {
    
    browser.storage.sync.get("points")
    .then( function(data) {
        
        if(!data.points) {

            browser.storage.sync.set({points: 0});

        }

    }, onError);

}

/**
 * Get the actual amount of points and adds 50
 */
function addPoints() {

    browser.storage.sync.get("points")
    .then(function(data) {

        browser.storage.sync.set({

            points: parseFloat(data.points)+50
            
        });

    });
}

/**
 * Start point
 */
initPoints();

setInterval(function() {
    let finding = document.getElementsByClassName("claimable-bonus__icon");
    
    if (finding.length != 0) {

        finding[0].click();
        console.log("[AutoTwitchPoints] +50");
        
        addPoints();

    }

}, 10000);