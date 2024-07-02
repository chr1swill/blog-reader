/**@type { HTMLInputElement | null } */
const searchBar = document.getElementById("site-search");

/**@type{HTMLFormElement | null} */
const searchForm = document.getElementById("search-form");

try {
    searchForm.onsubmit = function(e) {
        e.preventDefault()

        const urlToFetch = searchBar.value.trim()
        if (urlToFetch <= 1 || urlToFetch === null) return

        fetch(`http://localhost:3000?url=${urlToFetch}`)
            .then(function(response) {
                if (!response.ok) {
                    throw new Error(`Failed to fetch data from endpoint: ${searchBar.value.trim()}`);
                }

                return response.text()
            })
            .then(function(html) {
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                return doc.body.textContent || "";
            })
            .then(function(body) {
                console.assert("There was not body text return form the fetch", body);
                let chars = 0;
                const arr = body.split("")
                while (chars < arr.length) {
                    chars++;
                }

                console.log("total num of chars: ", chars);

                const synth = window.speechSynthesis;
                const utterThis = new SpeechSynthesisUtterance(body);

                synth.onvoiceschanged = () => {
                    const voices = synth.getVoices();
                    if (voices.length > 0) {
                        utterThis.voice = voices[0];
                        utterThis.pitch = '1';
                        utterThis.rate = '1';

                        console.log("text is being spoken 1: ", synth.speaking);
                        synth.speak(utterThis);
                        console.log("text is being spoken 2: ", synth.speaking);

                        utterThis.onend = function() {
                            console.log("utter ended");
                        };

                        utterThis.onpause = function() {
                            console.log("utter pause");
                        };

                        utterThis.onstart = function() {
                            console.log("utter started");
                        };

                        utterThis.onresume = function() {
                            console.log("utter resumed");
                        };

                        utterThis.onerror = function() {
                            console.error("utter errored");
                        };

                        utterThis.onmark = function() {
                            console.log("utter marked or whatever that means");
                        };
                    } else {
                        console.error("No voices available");
                    }
                };
                synth.onvoiceschanged();

                // Ensure the voices are loaded
                if (synth.getVoices().length > 0) {
                    console.log("running");
                    synth.onvoiceschanged();
                }
            })
            .catch(function(err) {
                console.error(err);
            })
    }
} catch (e) {
    console.error(e);
}

const INPUTS_URI = Object.freeze({
    NORMAL: "https://carbon-steel.github.io/jekyll/update/2024/06/19/abstractions.html",
    LARGE: "https://www.rfc-editor.org/rfc/rfc2616",
    ERR_BROKEN_LINK: "not-a-link"
})

searchBar.value = INPUTS_URI.LARGE
