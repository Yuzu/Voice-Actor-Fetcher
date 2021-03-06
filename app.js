function seiyuuSearch() {
    
    let seiyuuName = document.getElementById("name").value;
    //console.log(seiyuuName);
    
    // 2 pages should be fine for our purposes.

    // TODO - The issue with my original approach was that the results of a fetch were only retrievable in the then() scope of each fetch. The issue there
    // was that with multiple fetch calls (ie multiple pages), we wouldn't be able to keep track of everything properly. Maybe I'll learn a better way of doing
    // this in the future.
    let staffQuery_1 = produceQuery(seiyuuName, 1);
    
    let staffQuery_2 = produceQuery(seiyuuName, 2);

    //console.log(staffQuery)
    
    // Taken from https://anilist.gitbook.io/anilist-apiv2-docs/overview/graphql/getting-started
    // Define the config we'll need for our Api request
    let url_1 = 'https://graphql.anilist.co',
        options_1 = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                query: staffQuery_1,
            })
        };

    
    let url_2 = 'https://graphql.anilist.co',
        options_2 = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                query: staffQuery_2,
            })
        };

    requests = [[url_1, options_1], [url_2, options_2]];
    Promise.all(requests.map(u=>fetch(u[0], u[1])))
    .then(status)
    .then(responses =>
        Promise.all(responses.map(res => res.json()))
    )
    .then(json => {
        console.log('Request succeeded with JSON response', json);
        document.getElementById('errorname').innerHTML=""; 
        teardown();
        //console.log(JSON.stringify(json[0], null, 2));
        //console.log(JSON.stringify(json[1], null, 2));
        console.log(json);
        return json;
    })
    .then(buildPage)
    .catch(function(error) {
        //alert("Error, person not found.");
        document.getElementById('errorname').innerHTML="Invalid Search: No results found."; 
        console.log('Request failed', error);
     })
    ;

    return true;
}


// Excerpt taken from https://developers.google.com/web/updates/2015/03/introduction-to-fetch
// Edited to properly use promises.all by me.
function status(response) {
    //console.log(response);
    for (let i = 0; i < response.length; i++) {
        if (response[i].status >= 200 && response[i].status < 300) {
            //return Promise.resolve(response)
            continue;
        }
        else {
            return Promise.reject(new Error(response[i].statusText));
          }
    }
    return Promise.resolve(response);
  }

// Clean up the page.
function teardown() {
    console.log("Cleaning up");
    let all = document.querySelectorAll('[id=container]');
    for (let i = 0; i < all.length; i++) {
        all[i].remove();
    }
}

function buildPage(data) {
    
    console.log(data);

    let info = data[0].data.Staff;

    let name = info.name.full;
    let nativeName = info.name.native;
    let seiyuuPic = info.image.large;
    let seiyuuURL = info.siteUrl;

    const roles = [];

    // search for main roles.
    for (let i = 0; i < data.length; i++) {
        if (roles.length == 10) {
            break;
        }
        let shows = data[i].data.Staff.characterMedia.edges;
        populateArray(roles, shows, main=true);
    }

    // search for supporting roles
    for (let i = 0; i < data.length; i++) {
        if (roles.length == 10) {
            break;
        }
        let shows = data[i].data.Staff.characterMedia.edges;
        populateArray(roles, shows, main=false, supporting=true);
    }

    for (let i = 0; i < data.length; i++) {
        if (roles.length == 10) {
            break;
        }
        let shows = data[i].data.Staff.characterMedia.edges;
        populateArray(roles, shows, main=false, supporting=false);
    }

    console.log(roles);
    console.log('FINAL ROLES FOR:', name, "(", nativeName, ")", roles.length);
    for (let i = 0; i < roles.length; i++) {
        console.log(roles[i].node.title.romaji, "-> ", roles[i].characters[0].name.full, "(", roles[i].characterRole, ")");
    }

    // Now we can properly build the page.
    var seiyuu_img = document.getElementById("seiyuu_img");
    seiyuu_img.src = seiyuuPic;

    var seiyuu_img_link = document.getElementById("seiyuu_img_link");
    seiyuu_img_link.href = seiyuuURL;

    var seiyuu_name = document.getElementById("seiyuu_name");
    seiyuu_name.innerText = `${name}\n(${nativeName})`;
    seiyuu_name.href = seiyuuURL;

    var anchor = document.getElementById("anchor");
    var current = anchor;

    for (let i = 0; i < roles.length; i++) {

        if (roles[i].node.title.english === null) {
            var animeName = roles[i].node.title.romaji;
        }
        else {
            var animeName = roles[i].node.title.english;
        }
        let animeName_native = roles[i].node.title.native;
        let animeImage = roles[i].node.coverImage.large;
        let animeURL = roles[i].node.siteUrl;

        let characterName = roles[i].characters[0].name.full;
        let characterName_native = roles[i].characters[0].name.native;
        let characterImage = roles[i].characters[0].image.large;
        let characterURL = roles[i].characters[0].siteUrl;

        let template = createTemplate(animeName, animeName_native, animeImage, animeURL, characterName, characterName_native, characterImage, characterURL);
        //console.log(template);
        anchor.insertAdjacentHTML("beforeend", template);
    }
}

// roles = current running list of roles
// shows = shows to add to array
function populateArray(roles, shows, main=true, supporting=false) {
    console.log("shows:", shows);
    console.log("roles:", roles);
    console.log('ORIGINAL', shows.length);
    for (let i = 0; i < shows.length; i++) {
        if (shows[i].characters[0] === null) {
            console.log(shows[i].node.title.romaji, " -> NULL (Thanks Anilist API!!!)");
            continue;
        }
        console.log(shows[i].node.title.romaji, " -> ", shows[i].characters[0].name.full);
    }

    let shows_deduped = [];
    let obj = {};
    for (let i = 0; i < shows.length; i++) {
        if (shows[i].characters[0] === null) {
            continue;
        }
        let characterName = shows[i].characters[0].name.full;

        // If we have the same character, we don't want to overwrite the name since this dupe has a lower popularity.
        // IE: attack on titan s1 is (probably) more popular than s2. If we have the same character that means that we've hit s2,
        // but we don't want to replace s1 with s2 since s1 is more popular so we just continue.
        if (obj[characterName] != undefined) {
            continue;
        }
        // There's a chance that this could be the non-first page. we need to make sure that we don't add a character that's already added from another page.
        else {
            let dupe = false;
            for (let j = 0; j < roles.length; j++) {
                if (shows[i].characters[0] === null) {
                    continue;
                }
                if (roles[j].characters[0].name.full === characterName) {
                    dupe = true;
                    break;
                }
            }
            if (dupe) {
                continue;
            }
        }
        obj[characterName] = shows[i];
    }

    for (i in obj) {
        shows_deduped.push(obj[i]);
    }

    console.log('DEDUPED', shows_deduped.length);
    for (let i = 0; i < shows_deduped.length; i++) {
        console.log(shows_deduped[i].node.title.romaji, "-> ", shows_deduped[i].characters[0].name.full);
    }

    // Now we want to extract the roles and populate the given array.
    for (let i = 0; i < shows_deduped.length; i++) {
        if (roles.length == 10) {
            break;
        }

        if (main && !supporting) {
            console.log("Populating with main");
            if (shows_deduped[i].characterRole === "MAIN") {
                roles.push(shows_deduped[i]);
            }
        }
        else if (!main && supporting) {
            // if main == false && supporting=true, that means we're only considering supporting roles here.
            console.log("Populating with supporting");
            if (shows_deduped[i].characterRole === "SUPPORTING") {
                roles.push(shows_deduped[i]);
            }
        }
        else {
            console.log("Populating with background");
            if (shows_deduped[i].characterRole === "BACKGROUND") {
                roles.push(shows_deduped[i]);
            }
        }
    }

    console.log('ROLES after populateArray', roles.length);
    for (let i = 0; i < roles.length; i++) {
        console.log(roles[i].node.title.romaji, "-> ", roles[i].characters[0].name.full);
    }
}

function produceQuery(seiyuuName, pageNum) {
    return `
    query {
        Staff (search: "${seiyuuName}") {
            siteUrl
            id
            name {
                full
                native
            }
            image {
                large
            }
            characterMedia (page: ${pageNum} sort: POPULARITY_DESC perPage:25) {
                pageInfo {
                    total
                    perPage
                    currentPage
                    lastPage
                    hasNextPage
                  }
                  edges  {
                    characterRole
                    node {
                      coverImage {
                        large
                      }
                      title {
                        english
                        romaji
                        native
                      }
                      siteUrl
                    }
                    characters {
                      name {
                        full
                        native
                      }
                      image {
                        large
                      }
                      siteUrl
                    }
                  }
                }
              }
            }
`;
}

function createTemplate(animeName, animeName_native, animeImage, animeURL, characterName, characterName_native, characterImage, characterURL){
    return `
        <div id="container">
            <div class="anime" style="display: inline-block;">
                <a id="animeName" class="animeName" target="_blank" href="${animeURL}">${animeName}<br>(${animeName_native})</a>
                <a id="animeImage_link" class="animeImage_link" target="_blank" href="${animeURL}">
                    <img id="animeImage" src="${animeImage}"/>
                </a>
            </div>

            <div class="character" style="display: inline-block;">
                <a id="characterName" class="characterName" target="_blank" href="${characterURL}">${characterName}<br>(${characterName_native})</a>
                <a id="characterImage_link" class="characterImage_link" target="_blank" href="${characterURL}">
                    <img id="characterImage" src="${characterImage}"/>
                </a>
            </div>

            <hr class="rounded">
        </div>
    ` 
}