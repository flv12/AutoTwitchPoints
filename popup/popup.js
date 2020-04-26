
browser.storage.sync.get("points")
    .then(function (data) {
        document.querySelector(".points").innerHTML = `${data.points} points won without doing anything ! &#128077`;
    });