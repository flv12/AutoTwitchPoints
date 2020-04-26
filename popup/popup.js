browser.storage.sync.get("points")
    .then(function (data) {

        const text = `<p>${data.points} points won without doing anything ! &#128077</p>`;
        
        /**
         * Warning FIX to pass firefox validator who doesnt likes .innerHTML
         */
        const parser = new DOMParser()
        const parsed = parser.parseFromString(text, `text/html`)
        const tags = parsed.getElementsByTagName(`p`);
        
        for (const tag of tags) {
            document.querySelector(".points").appendChild(tag);
        }
        
    });