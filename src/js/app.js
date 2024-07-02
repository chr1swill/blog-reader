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
                    throw new Error(`Failed to fetch data from endpoint: ${urlToFetch}`);
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
                const arr = body.split("")
                console.log("Charater count: ", arr.length);
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
