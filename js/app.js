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

    var interval = setInterval( function() {

        var ptsWon = document.querySelector(".pulse-animation .tw-c-text-link").textContent;

        if (ptsWon) {

            clearInterval(interval);
            
            // Remove the plus sign in "+50 / +100"
            ptsWon = ptsWon.substring(1);

            browser.storage.sync.get("points")
            .then( function(data) {
                
                browser.storage.sync.set({

                    points: parseFloat(data.points) + parseFloat(ptsWon)
                    
                }).then( () => {
                    console.log(`[AutoTwitchPoints] +${ptsWon}`);
                });

            });

        }
    }, 1000);

}

/**
 * Start point
 */
initPoints();

setInterval(function() {
    let finding = document.querySelector(".claimable-bonus__icon");
    
    if (finding) {
        finding.click();        
        addPoints();
    }

}, 10000);