// Global variables to store FPL data
let allPlayersData = [];
let allTeamsData = [];
let allElementTypesData = []; // For storing player position/type data
let currentGameweek = null;

const FPL_BOOTSTRAP_URL = 'https://fantasy.premierleague.com/api/bootstrap-static/';
// const CORS_PROXY_URL = '/api/fplproxy?url='; 

// --- DOM Element References ---
let teamIdInput, fetchTeamButton, loadingIndicator, userTeamSquad, userTeamEpNext, suggestionsContent;
let rivalTeamIdInput, compareTeamButton, rivalLoadingIndicator, comparisonResults; // For rival comparison

document.addEventListener('DOMContentLoaded', () => {
    // User team analysis elements
    teamIdInput = document.getElementById('teamIdInput');
    fetchTeamButton = document.getElementById('fetchTeamButton');
    loadingIndicator = document.getElementById('loadingIndicator');
    userTeamSquad = document.getElementById('userTeamSquad');
    userTeamEpNext = document.getElementById('userTeamEpNext');
    suggestionsContent = document.getElementById('suggestionsContent');
    
    // Rival comparison elements
    rivalTeamIdInput = document.getElementById('rivalTeamIdInput');
    compareTeamButton = document.getElementById('compareTeamButton');
    rivalLoadingIndicator = document.getElementById('rivalLoadingIndicator');
    comparisonResults = document.getElementById('comparisonResults');

    if (fetchTeamButton) {
        fetchTeamButton.addEventListener('click', handleAnalyseTeamClick);
    } else {
        console.error("Fetch Team Button not found on page load.");
    }

    if (compareTeamButton) {
        compareTeamButton.addEventListener('click', handleCompareTeamClick);
    } else {
        console.error("Compare Team Button not found on page load.");
    }
});


/**
 * Fetches the bootstrap data from the FPL API.
 * @returns {Promise<Object>} The parsed JSON data from the API.
 */
async function fetchBootstrapData() {
    const apiUrl = FPL_BOOTSTRAP_URL;
    console.log(`Fetching FPL bootstrap data from: ${apiUrl}`);
    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} while fetching ${apiUrl}`);
        }
        const data = await response.json();
        console.log("Successfully fetched FPL bootstrap data.");
        return data;
    } catch (error) {
        console.error("Error fetching FPL bootstrap data:", error);
        throw error;
    }
}

/**
 * Initializes the application by fetching and processing FPL bootstrap data.
 */
async function initializeApp() {
    console.log("Initializing FPL Optimised App...");
    try {
        const bootstrapData = await fetchBootstrapData();
        
        if (bootstrapData && bootstrapData.elements && bootstrapData.teams && bootstrapData.events && bootstrapData.element_types) {
            allPlayersData = bootstrapData.elements;
            allTeamsData = bootstrapData.teams;
            allElementTypesData = bootstrapData.element_types;
            
            const currentEvent = bootstrapData.events.find(event => event.is_current === true);
            if (currentEvent) {
                currentGameweek = currentEvent.id;
            } else {
                const upcomingEvents = bootstrapData.events.filter(event => event.is_finished === false);
                if (upcomingEvents.length > 0) {
                    currentGameweek = upcomingEvents.sort((a,b) => a.id - b.id)[0].id;
                }
            }
            
            if (currentGameweek) {
                console.log(`Bootstrap data loaded. Current/Upcoming Gameweek: ${currentGameweek}`);
            } else {
                console.warn("Could not determine current or upcoming gameweek.");
            }
            
            console.log(`Players loaded: ${allPlayersData.length}`);
            console.log(`Teams loaded: ${allTeamsData.length}`);
            console.log(`Element Types loaded: ${allElementTypesData.length}`);
        } else {
            console.error("Bootstrap data is not in the expected format or is missing key parts.", bootstrapData);
            throw new Error("Invalid bootstrap data structure.");
        }
        
    } catch (error) {
        console.error("Failed to initialize the application:", error);
        if(userTeamSquad) userTeamSquad.innerHTML = `<p class="error-message">Failed to load initial FPL data. Please try refreshing.</p>`;
    }
}

/**
 * Handles the click event for the "Analyse Team" button.
 */
async function handleAnalyseTeamClick() {
    const teamID = teamIdInput.value.trim();

    if (!teamID) {
        alert("Please enter your FPL Team ID.");
        return;
    }
    if (!currentGameweek) {
        alert("Gameweek data is not loaded yet. Please wait or refresh.");
        return;
    }

    fetchTeamButton.disabled = true;
    loadingIndicator.textContent = 'Fetching team data...';
    loadingIndicator.style.display = 'inline';
    userTeamSquad.innerHTML = ''; 
    userTeamEpNext.textContent = 'N/A';
    suggestionsContent.innerHTML = ''; 

    try {
        const teamData = await fetchUserTeam(teamID, currentGameweek);
        if (teamData && teamData.picks) {
            displayUserTeam(teamData.picks);
            displayBasicOptimisation(teamData.picks);
        } else {
            if (!teamData && userTeamSquad.innerHTML === '') { 
                 userTeamSquad.innerHTML = `<p class="error-message">Could not retrieve team data. Team ID might be invalid or private for the gameweek.</p>`;
            }
        }
    } catch (error) {
        if (userTeamSquad.innerHTML === '') { 
            userTeamSquad.innerHTML = `<p class="error-message">An error occurred while fetching team data.</p>`;
        }
        console.error("Error in handleAnalyseTeamClick:", error);
    } finally {
        loadingIndicator.style.display = 'none';
        loadingIndicator.textContent = 'Loading...'; // Reset text
        fetchTeamButton.disabled = false;
    }
}

/**
 * Fetches a user's team picks for a specific gameweek.
 * @param {string} teamID The FPL team ID.
 * @param {number} gameweekID The gameweek ID.
 * @returns {Promise<Object|null>} The team picks data or null on error.
 */
async function fetchUserTeam(teamID, gameweekID) {
    const fetchUrl = `https://fantasy.premierleague.com/api/entry/${teamID}/event/${gameweekID}/picks/`;
    console.log(`Fetching user team data from: ${fetchUrl}`);
    try {
        const response = await fetch(fetchUrl);
        if (!response.ok) {
            let message = `Error fetching team data (Status: ${response.status}).`;
            if(response.status === 404){
                 message = `Team ID ${teamID} not found or data is private for Gameweek ${gameweekID}.`;
            }
            
            // Display error in relevant area (user or rival) based on which loading indicator is visible
            if (loadingIndicator.style.display === 'inline') { // Check if it's the user team analysis
                 userTeamSquad.innerHTML = `<p class="error-message">${message}</p>`;
            } else if (rivalLoadingIndicator.style.display === 'inline') { // Check if it's the rival comparison
                 comparisonResults.innerHTML = `<p class="error-message">${message}</p>`;
            }
            
            throw new Error(`HTTP error! status: ${response.status} while fetching ${fetchUrl}`);
        }
        const data = await response.json();
        console.log(`Successfully fetched team data for ID ${teamID} in Gameweek ${gameweekID}.`);
        return data;
    } catch (error) {
        console.error(`Error fetching user team data for ID ${teamID}:`, error);
        // Generic message if not set by HTTP error, specific to context
        if (loadingIndicator.style.display === 'inline' && userTeamSquad.innerHTML === '') {
            userTeamSquad.innerHTML = `<p class="error-message">Failed to fetch team data for Team ID ${teamID}. Check ID and network.</p>`;
        } else if (rivalLoadingIndicator.style.display === 'inline' && comparisonResults.innerHTML === '') {
            // This case might be tricky if one team fetch fails in Promise.all for rival comparison
            // The Promise.all catch in handleCompareTeamClick should generally handle this.
            comparisonResults.innerHTML = `<p class="error-message">Failed to fetch data for one of the teams (ID: ${teamID}). Check ID and network.</p>`;
        }
        return null;
    }
}

/**
 * Displays the user's FPL team in the UI.
 * @param {Array} teamPicks Array of player picks from fetchUserTeam.
 */
function displayUserTeam(teamPicks) {
    userTeamSquad.innerHTML = ''; 
    let totalEpNext = 0;

    if (!allPlayersData.length || !allElementTypesData.length) {
        userTeamSquad.innerHTML = `<p class="error-message">Player data not loaded. Please refresh.</p>`;
        return;
    }

    const squadList = document.createElement('ul');
    // squadList.style.listStyleType = 'none'; // Moved to CSS
    // squadList.style.padding = '0'; // Moved to CSS

    teamPicks.forEach(pick => {
        const playerDetails = getPlayerDetailsById(pick.element);
        if (!playerDetails) {
            console.warn(`Player with ID ${pick.element} not found in allPlayersData.`);
            return; 
        }

        const playerPositionType = allElementTypesData.find(et => et.id === playerDetails.element_type);
        const positionShortName = playerPositionType ? playerPositionType.singular_name_short : 'UNK';
        
        let epNextValue = parseFloat(playerDetails.ep_next) || 0;
        totalEpNext += epNextValue * pick.multiplier;

        const listItem = document.createElement('li');
        // listItem.style.marginBottom = '0.5rem'; // Moved to CSS
        // listItem.style.padding = '0.5rem'; // Moved to CSS
        // listItem.style.border = '1px solid #eee'; // Moved to CSS
        // listItem.style.borderRadius = '4px'; // Moved to CSS
        
        let captaincyInfo = '';
        if (pick.is_captain) captaincyInfo = ' (C)';
        if (pick.is_vice_captain) captaincyInfo = ' (VC)';

        listItem.innerHTML = `
            <strong>${playerDetails.web_name}</strong> (${positionShortName})${captaincyInfo}<br>
            Expected Points (Next GW): ${epNextValue.toFixed(1)}
            ${pick.multiplier > 1 ? `(Points Multiplied: x${pick.multiplier})` : ''}
        `;
        squadList.appendChild(listItem);
    });

    userTeamSquad.appendChild(squadList);
    userTeamEpNext.textContent = totalEpNext.toFixed(1);
}

/**
 * Displays a basic optimisation suggestion.
 * @param {Array} currentPicks Array of player picks from the user's current team.
 */
function displayBasicOptimisation(currentPicks) {
    suggestionsContent.innerHTML = ''; 

    if (!allPlayersData.length) {
        suggestionsContent.innerHTML = `<p class="error-message">Player data not loaded for suggestions.</p>`;
        return;
    }

    const currentPlayerIds = currentPicks.map(p => p.element);
    const availablePlayers = allPlayersData.filter(player => 
        !currentPlayerIds.includes(player.id) && isPlayerAvailable(player)
    );

    if (!availablePlayers.length) {
        suggestionsContent.innerHTML = "<p>No alternative players available for suggestion based on current filters.</p>"; // Not an error, but info
        return;
    }

    availablePlayers.sort((a, b) => (parseFloat(b.ep_next) || 0) - (parseFloat(a.ep_next) || 0));
    const bestAlternative = availablePlayers[0];

    if (bestAlternative) {
        const teamName = allTeamsData.find(t => t.id === bestAlternative.team)?.name || 'N/A';
        const suggestionEl = document.createElement('div'); // Using div as per CSS styling for direct p
        suggestionEl.innerHTML = `
            <h4>Top Available Player Suggestion:</h4>
            <p>Consider adding: <strong>${bestAlternative.web_name}</strong> (Team: ${teamName})</p>
            <p>Expected Points (Next GW): <strong>${(parseFloat(bestAlternative.ep_next) || 0).toFixed(1)}</strong></p>
            <p>Price: £${(bestAlternative.now_cost / 10).toFixed(1)}m</p>
        `;
        suggestionsContent.appendChild(suggestionEl);
    } else {
        suggestionsContent.innerHTML = "<p>Could not find a suitable player suggestion at this time.</p>"; // Not an error
    }
}

// --- Rival Comparison Logic ---

/**
 * Handles the click event for the "Compare" button.
 */
async function handleCompareTeamClick() {
    const userTeamID = teamIdInput.value.trim();
    const rivalTeamID = rivalTeamIdInput.value.trim();

    if (!userTeamID || !rivalTeamID) {
        alert("Please enter both your FPL Team ID and the Rival's FPL Team ID.");
        return;
    }
    if (userTeamID === rivalTeamID) {
        alert("User and Rival Team IDs cannot be the same.");
        return;
    }
    if (!currentGameweek) {
        alert("Gameweek data is not loaded yet. Please wait or refresh.");
        return;
    }

    compareTeamButton.disabled = true;
    rivalLoadingIndicator.textContent = 'Comparing teams...';
    rivalLoadingIndicator.style.display = 'inline';
    comparisonResults.innerHTML = ''; // Clear previous results, show loading text via indicator

    try {
        // Important: Ensure fetchUserTeam sets error messages in the correct container
        // (userTeamSquad for initial analysis, comparisonResults for rival comparison)
        // The logic inside fetchUserTeam attempts this by checking which indicator is visible.
        const [userTeamData, rivalTeamData] = await Promise.all([
            fetchUserTeam(userTeamID, currentGameweek), // Context for error display is tricky here
            fetchUserTeam(rivalTeamID, currentGameweek)  // Context for error display is tricky here
        ]);

        if (userTeamData && userTeamData.picks && rivalTeamData && rivalTeamData.picks) {
            generateComparisonSuggestions(userTeamData.picks, rivalTeamData.picks);
        } else {
            if (comparisonResults.innerHTML === '') { // Only set if fetchUserTeam didn't already set an error
                 comparisonResults.innerHTML = `<p class="error-message">Could not retrieve data for one or both teams. Please check IDs and try again.</p>`;
            }
        }
    } catch (error) {
        console.error("Error in handleCompareTeamClick:", error);
        if (comparisonResults.innerHTML === '') { // Fallback error
            comparisonResults.innerHTML = `<p class="error-message">An error occurred while comparing teams.</p>`;
        }
    } finally {
        rivalLoadingIndicator.style.display = 'none';
        rivalLoadingIndicator.textContent = 'Loading rival...'; // Reset text
        compareTeamButton.disabled = false;
    }
}

/**
 * Generates and displays comparison suggestions between user's and rival's teams.
 * @param {Array} userPicks Array of user's player picks.
 * @param {Array} rivalPicks Array of rival's player picks.
 */
function generateComparisonSuggestions(userPicks, rivalPicks) {
    comparisonResults.innerHTML = ''; 

    const userPlayerIds = new Set(userPicks.map(p => p.element));
    const rivalPlayerIds = new Set(rivalPicks.map(p => p.element));

    let suggestionsHTML = '<h3>Comparison Analysis:</h3>';

    suggestionsHTML += '<h4>🛡️ Protect Your Rank:</h4>';
    let keyRivalPlayersSuggestions = '';
    const rivalPlayersDetails = rivalPicks.map(p => getPlayerDetailsById(p.element)).filter(p => p);
    rivalPlayersDetails.sort((a, b) => (parseFloat(b.ep_next) || 0) - (parseFloat(a.ep_next) || 0)); 

    rivalPlayersDetails.slice(0, 5).forEach(rivalPlayer => { 
        if (rivalPlayer && !userPlayerIds.has(rivalPlayer.id) && isPlayerAvailable(rivalPlayer)) {
            const teamName = allTeamsData.find(t => t.id === rivalPlayer.team)?.name || 'N/A';
            keyRivalPlayersSuggestions += `<p>- Consider covering Rival's player: <strong>${rivalPlayer.web_name}</strong> (${teamName}, EP Next: ${(parseFloat(rivalPlayer.ep_next) || 0).toFixed(1)})</p>`;
        }
    });
    if (keyRivalPlayersSuggestions) {
        suggestionsHTML += '<h5>Key Rival Players You Don\'t Own:</h5>' + keyRivalPlayersSuggestions;
    } else {
        suggestionsHTML += '<p>You own most of your rival\'s key high EP players or they are unavailable.</p>';
    }

    suggestionsHTML += '<hr><h4>🚀 Gain Rank Opportunities:</h4>';
    let differentialSuggestions = '';
    const potentialDifferentials = allPlayersData.filter(player =>
        !userPlayerIds.has(player.id) &&
        !rivalPlayerIds.has(player.id) &&
        isPlayerAvailable(player) &&
        (parseFloat(player.selected_by_percent) || 0) < 10 
    ).sort((a, b) => (parseFloat(b.ep_next) || 0) - (parseFloat(a.ep_next) || 0));

    potentialDifferentials.slice(0, 2).forEach(diffPlayer => { 
        const teamName = allTeamsData.find(t => t.id === diffPlayer.team)?.name || 'N/A';
        differentialSuggestions += `<p>- Differential Pick: <strong>${diffPlayer.web_name}</strong> (${teamName}, EP Next: ${(parseFloat(diffPlayer.ep_next) || 0).toFixed(1)}, Selected: ${diffPlayer.selected_by_percent}%)</p>`;
    });
     if (differentialSuggestions) {
        suggestionsHTML += '<h5>Potential Differential Picks (Low Ownership, High EP):</h5>' + differentialSuggestions;
    } else {
        suggestionsHTML += '<p>No standout differential picks found with current criteria.</p>';
    }

    let rivalOutperformersSuggestions = '';
    rivalPlayersDetails.forEach(rivalPlayer => { 
        if (rivalPlayer && !userPlayerIds.has(rivalPlayer.id) && isPlayerAvailable(rivalPlayer) && (parseFloat(rivalPlayer.ep_next) || 0) > 4.0) { 
            if (!keyRivalPlayersSuggestions.includes(rivalPlayer.web_name)) {
                 const teamName = allTeamsData.find(t => t.id === rivalPlayer.team)?.name || 'N/A';
                 rivalOutperformersSuggestions += `<p>- Rival's High EP Player: <strong>${rivalPlayer.web_name}</strong> (${teamName}, EP Next: ${(parseFloat(rivalPlayer.ep_next) || 0).toFixed(1)})</p>`;
            }
        }
    });
    if (rivalOutperformersSuggestions) {
        suggestionsHTML += '<h5>Rival\'s High EP Players You Could Match:</h5>' + rivalOutperformersSuggestions;
    }

    comparisonResults.innerHTML = suggestionsHTML;
}


/**
 * Helper function to get player details by ID.
 * @param {number} playerId The ID of the player.
 * @returns {Object|undefined} The player object or undefined if not found.
 */
function getPlayerDetailsById(playerId) {
    return allPlayersData.find(p => p.id === playerId);
}

/**
 * Helper function to check if a player is available for suggestion.
 * @param {Object} playerObject The player object from allPlayersData.
 * @returns {boolean} True if player is considered available, false otherwise.
 */
function isPlayerAvailable(playerObject) {
    if (!playerObject) return false;
    const isAvailableStatus = playerObject.status === 'a';
    const isDoubtfulButMaybePlays = playerObject.status === 'd' && (playerObject.chance_of_playing_next_round === null || playerObject.chance_of_playing_next_round >= 50);
    return isAvailableStatus || isDoubtfulButMaybePlays;
}

// Call initializeApp when the script loads
initializeApp();
