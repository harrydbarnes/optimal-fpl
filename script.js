// Global variables to store FPL data
let allPlayersData = [];
let allTeamsData = [];
let allElementTypesData = []; // For storing player position/type data
let currentGameweek = null;

// New Dashboard Variables
let leagueIdInput, myTeamIdInput, loadLeagueBtn, leagueTable, threatList, statsBody, statsSort;

// Constants
const TOP_RIVALS_TO_ANALYZE = 10;
const TOP_THREATS_TO_DISPLAY = 5;
const TOP_PLAYERS_TO_DISPLAY = 20;

const FPL_BOOTSTRAP_URL = 'https://fantasy.premierleague.com/api/bootstrap-static/';
const CORS_PROXY_URL = '/api/fplproxy?url=';

// --- Team Planner Constants & Variables ---
const MAX_PLAYERS = 15;
const MAX_BUDGET = 1000; // Represents 100.0m
// Adjusted to use singular_name_short from API for consistency
const PLAYERS_PER_POSITION = { 'GKP': 2, 'DEF': 5, 'MID': 5, 'FWD': 3 };
const MAX_PLAYERS_FROM_TEAM = 3;

let currentSquad = [];
let currentBudget = MAX_BUDGET;

// --- DOM Element References ---
// Analysis Section
let teamIdInput, fetchTeamButton, loadingIndicator, userTeamSquad, userTeamEpNext, suggestionsContent;
let rivalTeamIdInput, compareTeamButton, rivalLoadingIndicator, comparisonResults; 

// Team Planner Section
let positionFilter, playerListTbody, budgetRemainingEl, totalPlayersSelectedEl;
let squadGoalkeepersUl, squadDefendersUl, squadMidfieldersUl, squadForwardsUl;
let gkCountEl, defCountEl, midCountEl, fwdCountEl;
let resetSquadButton;


document.addEventListener('DOMContentLoaded', () => {
    // User team analysis elements
    teamIdInput = document.getElementById('teamIdInput');
    fetchTeamButton = document.getElementById('fetchTeamButton');
    loadingIndicator = document.getElementById('loadingIndicator');
    // Analysis Section Elements
    teamIdInput = document.getElementById('teamIdInput');
    fetchTeamButton = document.getElementById('fetchTeamButton');
    loadingIndicator = document.getElementById('loadingIndicator');
    userTeamSquad = document.getElementById('userTeamSquad');
    userTeamEpNext = document.getElementById('userTeamEpNext');
    suggestionsContent = document.getElementById('suggestionsContent');
    rivalTeamIdInput = document.getElementById('rivalTeamIdInput');
    compareTeamButton = document.getElementById('compareTeamButton');
    rivalLoadingIndicator = document.getElementById('rivalLoadingIndicator');
    comparisonResults = document.getElementById('comparisonResults');

    // New Dashboard Elements
    leagueIdInput = document.getElementById('leagueIdInput');
    myTeamIdInput = document.getElementById('myTeamIdInput');
    loadLeagueBtn = document.getElementById('loadLeagueBtn');
    if (document.getElementById('leagueTable')) {
        leagueTable = document.getElementById('leagueTable').querySelector('tbody');
    }
    threatList = document.getElementById('threatList');
    statsBody = document.getElementById('statsBody');
    statsSort = document.getElementById('statsSort');

    if (loadLeagueBtn) {
        loadLeagueBtn.addEventListener('click', handleLeagueAnalysis);
    }
    if (statsSort) {
        statsSort.addEventListener('change', () => renderPlayerStats(statsSort.value));
    }
    
    // Rival comparison elements
    // Team Planner Section Elements
    positionFilter = document.getElementById('position-filter');
    playerListTbody = document.getElementById('player-list-tbody'); // Used in initializeTeamPlanner, populatePlayerTable
    budgetRemainingEl = document.getElementById('budget-remaining'); // Used in updateSquadDisplay
    totalPlayersSelectedEl = document.getElementById('total-players-selected'); // Used in updateSquadDisplay
    squadGoalkeepersUl = document.getElementById('squad-goalkeepers'); // Used in updateSquadDisplay
    squadDefendersUl = document.getElementById('squad-defenders'); // Used in updateSquadDisplay
    squadMidfieldersUl = document.getElementById('squad-midfielders'); // Used in updateSquadDisplay
    squadForwardsUl = document.getElementById('squad-forwards'); // Used in updateSquadDisplay
    gkCountEl = document.getElementById('gk-count'); // Used in updateSquadDisplay
    defCountEl = document.getElementById('def-count'); // Used in updateSquadDisplay
    midCountEl = document.getElementById('mid-count'); // Used in updateSquadDisplay
    fwdCountEl = document.getElementById('fwd-count'); // Used in updateSquadDisplay
    resetSquadButton = document.getElementById('reset-squad-button'); // Used in initializeTeamPlanner

    // Event listeners for Analysis page
    if (fetchTeamButton) {
        fetchTeamButton.addEventListener('click', handleAnalyseTeamClick);
    }
    if (compareTeamButton) {
        compareTeamButton.addEventListener('click', handleCompareTeamClick);
    }

    // Team planner specific listeners are primarily set up in initializeTeamPlanner,
    // which is called after data loading in initializeApp.
    // No direct listeners here unless they don't depend on fetched data.
});


/**
 * Fetches the bootstrap data from the FPL API.
 * @returns {Promise<Object>} The parsed JSON data from the API.
 */
async function fetchBootstrapData() {
    const apiUrl = CORS_PROXY_URL + encodeURIComponent(FPL_BOOTSTRAP_URL);
    console.log(`Fetching FPL bootstrap data from: ${apiUrl}`); // Updated console log
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

            // Initialize the team planner once data is ready
            // This function itself should be robust if planner elements are not on the page
            initializeTeamPlanner();

        } else {
            console.error("Bootstrap data is not in the expected format or is missing key parts.", bootstrapData);
            throw new Error("Invalid bootstrap data structure.");
        }
        
    } catch (error) {
        console.error("Failed to initialize the application:", error);
        // Display error on Analysis page elements if they exist
        if (userTeamSquad) {
            userTeamSquad.innerHTML = `<p class="error-message">Failed to load initial FPL data: ${error.message}. Please try refreshing.</p>`;
        }
        // Display error on Planner page elements if they exist
        if (playerListTbody) {
            playerListTbody.innerHTML = `<tr><td colspan="7" class="error-message">Failed to load player data: ${error.message}. Please try refreshing.</td></tr>`;
        }
    }
}

/**
 * Handles the click event for the "Analyse Team" button.
 */
async function handleAnalyseTeamClick() {
    if (!teamIdInput || !fetchTeamButton || !loadingIndicator || !userTeamSquad || !userTeamEpNext || !suggestionsContent) {
        console.error("One or more analysis DOM elements are missing for handleAnalyseTeamClick.");
        return;
    }

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
            displayUserTeam(teamData.picks); // This function also needs to be robust
            displayBasicOptimisation(teamData.picks); // This function also needs to be robust
        } else {
            if (!teamData && userTeamSquad.innerHTML === '') { 
                 userTeamSquad.innerHTML = `<p class="error-message">Could not retrieve team data. Team ID might be invalid or private for the gameweek.</p>`;
            }
        }
    } catch (error) {
        if (userTeamSquad.innerHTML === '') { 
            userTeamSquad.innerHTML = `<p class="error-message">An error occurred while fetching team data: ${error.message}.</p>`;
        }
        console.error("Error in handleAnalyseTeamClick:", error);
    } finally {
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
            loadingIndicator.textContent = 'Loading...'; // Reset text
        }
        if (fetchTeamButton) {
            fetchTeamButton.disabled = false;
        }
    }
}

/**
 * Fetches a user's team picks for a specific gameweek.
 * @param {string} teamID The FPL team ID.
 * @param {number} gameweekID The gameweek ID.
 * @returns {Promise<Object|null>} The team picks data or null on error.
 */
async function fetchUserTeam(teamID, gameweekID) {
    const baseApiUrl = `https://fantasy.premierleague.com/api/entry/${teamID}/event/${gameweekID}/picks/`;
    const fetchUrl = CORS_PROXY_URL + encodeURIComponent(baseApiUrl);
    console.log(`Fetching user team data from: ${fetchUrl}`); // Updated console log
    try {
        const response = await fetch(fetchUrl);
        if (!response.ok) {
            let message = `Error fetching team data (Status: ${response.status} for ${fetchUrl}).`;
            if(response.status === 404){
                 message = `Team ID ${teamID} not found or data is private for Gameweek ${gameweekID}.`;
            }
            
            // Display error in relevant area (user or rival) based on which loading indicator is visible
            if (loadingIndicator && loadingIndicator.style.display === 'inline' && userTeamSquad) {
                 userTeamSquad.innerHTML = `<p class="error-message">${message}</p>`;
            } else if (rivalLoadingIndicator && rivalLoadingIndicator.style.display === 'inline' && comparisonResults) {
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
        if (loadingIndicator && loadingIndicator.style.display === 'inline' && userTeamSquad && userTeamSquad.innerHTML === '') {
            userTeamSquad.innerHTML = `<p class="error-message">Failed to fetch team data for Team ID ${teamID}: ${error.message}. Check ID and network.</p>`;
        } else if (rivalLoadingIndicator && rivalLoadingIndicator.style.display === 'inline' && comparisonResults && comparisonResults.innerHTML === '') {
            comparisonResults.innerHTML = `<p class="error-message">Failed to fetch data for one of the teams (ID: ${teamID}): ${error.message}. Check ID and network.</p>`;
        }
        return null;
    }
}

/**
 * Displays the user's FPL team in the UI.
 * @param {Array} teamPicks Array of player picks from fetchUserTeam.
 */
function displayUserTeam(teamPicks) {
    if (!userTeamSquad || !userTeamEpNext) {
        console.error("Missing DOM elements for displayUserTeam.");
        return;
    }
    userTeamSquad.innerHTML = ''; 
    let totalEpNext = 0;

    if (!allPlayersData.length || !allElementTypesData.length) {
        userTeamSquad.innerHTML = `<p class="error-message">Player data not loaded. Please refresh.</p>`;
        return;
    }

    const squadList = document.createElement('ul');

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
    if (!suggestionsContent) {
        console.error("Missing DOM element for displayBasicOptimisation.");
        return;
    }
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
        suggestionsContent.innerHTML = "<p>No alternative players available for suggestion based on current filters.</p>";
        return;
    }

    availablePlayers.sort((a, b) => (parseFloat(b.ep_next) || 0) - (parseFloat(a.ep_next) || 0));
    const bestAlternative = availablePlayers[0];

    if (bestAlternative) {
        const teamName = allTeamsData.find(t => t.id === bestAlternative.team)?.name || 'N/A';
        const suggestionEl = document.createElement('div'); 
        suggestionEl.innerHTML = `
            <h4>Top Available Player Suggestion:</h4>
            <p>Consider adding: <strong>${bestAlternative.web_name}</strong> (Team: ${teamName})</p>
            <p>Expected Points (Next GW): <strong>${(parseFloat(bestAlternative.ep_next) || 0).toFixed(1)}</strong></p>
            <p>Price: £${(bestAlternative.now_cost / 10).toFixed(1)}m</p>
        `;
        suggestionsContent.appendChild(suggestionEl);
    } else {
        suggestionsContent.innerHTML = "<p>Could not find a suitable player suggestion at this time.</p>";
    }
}

// --- Rival Comparison Logic ---

/**
 * Handles the click event for the "Compare" button.
 */
async function handleCompareTeamClick() {
    if (!teamIdInput || !rivalTeamIdInput || !compareTeamButton || !rivalLoadingIndicator || !comparisonResults) {
        console.error("One or more comparison DOM elements are missing for handleCompareTeamClick.");
        return;
    }

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
    comparisonResults.innerHTML = ''; 

    try {
        const [userTeamData, rivalTeamData] = await Promise.all([
            fetchUserTeam(userTeamID, currentGameweek), 
            fetchUserTeam(rivalTeamID, currentGameweek)
        ]);

        if (userTeamData && userTeamData.picks && rivalTeamData && rivalTeamData.picks) {
            generateComparisonSuggestions(userTeamData.picks, rivalTeamData.picks); // This function also needs to be robust
        } else {
            if (comparisonResults.innerHTML === '') { 
                 comparisonResults.innerHTML = `<p class="error-message">Could not retrieve data for one or both teams. Please check IDs and try again.</p>`;
            }
        }
    } catch (error) {
        console.error("Error in handleCompareTeamClick:", error);
        if (comparisonResults.innerHTML === '') { 
            comparisonResults.innerHTML = `<p class="error-message">An error occurred while comparing teams: ${error.message}.</p>`;
        }
    } finally {
        if(rivalLoadingIndicator) {
            rivalLoadingIndicator.style.display = 'none';
            rivalLoadingIndicator.textContent = 'Loading rival...'; 
        }
        if(compareTeamButton) {
            compareTeamButton.disabled = false;
        }
    }
}

/**
 * Generates and displays comparison suggestions between user's and rival's teams.
 * @param {Array} userPicks Array of user's player picks.
 * @param {Array} rivalPicks Array of rival's player picks.
 */
function generateComparisonSuggestions(userPicks, rivalPicks) {
    if (!comparisonResults) {
        console.error("Missing DOM element for generateComparisonSuggestions.");
        return;
    }
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


// --- Team Planner Functions ---

/**
 * Maps FPL API element_type IDs to the short names used in the filter ('GKP', 'DEF', 'MID', 'FWD').
 * And vice-versa. Also maps filter values ('All', 'GK', 'DEF', 'MID', 'FWD') to API element_type IDs or 'all'.
 */
const positionMap = {
    // Mapping from element_type ID to singular_name_short (used internally)
    1: 'GKP',
    2: 'DEF',
    3: 'MID',
    4: 'FWD',
    // Mapping from filter value to element_type ID (or 'all')
    'all': 'all', // Special case for filter
    'GK': 1,  // User-friendly filter value 'GK' maps to 'GKP' (element_type 1)
    'DEF': 2,
    'MID': 3,
    'FWD': 4,
    // Mapping from singular_name_short to element_type ID (for convenience)
    'GKP': 1,
    'DEFF': 2, // Typo, should be DEF
    'MIDD': 3, // Typo, should be MID
    'FWDD': 4  // Typo, should be FWD
};

// Correcting typos in positionMap
positionMap['DEF'] = 2;
positionMap['MID'] = 3;
positionMap['FWD'] = 4;


/**
 * Initializes the team planner section.
 * Sets up event listeners and populates the initial player table.
 */
function initializeTeamPlanner() {
    if (!allPlayersData.length || !allElementTypesData.length || !allTeamsData.length) {
        console.error("Team planner cannot initialize: FPL data not fully loaded.");
        if (playerListTbody) playerListTbody.innerHTML = `<tr><td colspan="7" class="error-message">Player data could not be loaded for the planner. Try refreshing.</td></tr>`;
        return;
    }

    if (positionFilter) {
        positionFilter.addEventListener('change', populatePlayerTable);
    } else {
        console.error("Position filter element not found for planner.");
    }

    if (resetSquadButton) {
        resetSquadButton.addEventListener('click', resetSquad);
    } else {
        console.error("Reset squad button not found for planner.");
    }
    
    populatePlayerTable(); // Initial population
    updateSquadDisplay();  // Initial UI update for budget, counts etc.
    console.log("Team Planner Initialized.");
}

/**
 * Populates the player list table based on selected filters.
 */
function populatePlayerTable() {
    if (!playerListTbody || !allPlayersData.length || !allElementTypesData.length || !allTeamsData.length) {
        console.error("Cannot populate player table: missing elements or data.");
        if (playerListTbody) playerListTbody.innerHTML = '<tr><td colspan="7">Error loading player data.</td></tr>';
        return;
    }
    playerListTbody.innerHTML = ''; // Clear existing rows

    const selectedFilterValue = positionFilter ? positionFilter.value : 'all'; // e.g., 'GK', 'DEF', 'all'
    
    let filteredPlayers = allPlayersData;

    if (selectedFilterValue !== 'all') {
        const targetElementTypeId = positionMap[selectedFilterValue]; // Get the numeric ID (1, 2, 3, 4)
        if (targetElementTypeId) {
            filteredPlayers = allPlayersData.filter(player => player.element_type === targetElementTypeId);
        } else {
            console.warn(`Unknown position filter value: ${selectedFilterValue}`);
        }
    }

    // Further sort by total_points (desc) as a default sorting for the table
    filteredPlayers.sort((a, b) => (b.total_points || 0) - (a.total_points || 0));


    filteredPlayers.forEach(player => {
        const team = allTeamsData.find(t => t.id === player.team);
        const teamShortName = team ? team.short_name : 'N/A';
        
        // Get the API's short name for position (GKP, DEF, MID, FWD)
        const positionApiShortName = positionMap[player.element_type]; 

        const price = (player.now_cost / 10).toFixed(1);
        const totalPointsLastSeason = player.total_points || 0;
        const recentPoints = player.form || '0'; // Use form for "Recent Pts*"

        const row = playerListTbody.insertRow();
        row.innerHTML = `
            <td>${player.web_name}</td>
            <td>${teamShortName}</td>
            <td>${positionApiShortName}</td> 
            <td>${price}</td>
            <td>${totalPointsLastSeason}</td>
            <td>${recentPoints}</td>
            <td><button class="player-add-button" data-player-id="${player.id}">Add</button></td>
        `;
        const addButton = row.querySelector('.player-add-button');
        if (addButton) {
            addButton.addEventListener('click', () => addPlayerToSquad(player.id));
            // Disable button if player is already in squad
            if (currentSquad.find(p => p.id === player.id)) {
                addButton.disabled = true;
                addButton.textContent = 'Added';
            }
        }
    });
    if(filteredPlayers.length === 0 && playerListTbody){
        playerListTbody.innerHTML = `<tr><td colspan="7">No players found for position: ${selectedFilterValue}.</td></tr>`;
    }
}

/**
 * Updates the squad display (budget, player counts, lists).
 */
function updateSquadDisplay() {
    if (budgetRemainingEl) {
        budgetRemainingEl.textContent = (currentBudget / 10).toFixed(1);
    }
    if (totalPlayersSelectedEl) {
        totalPlayersSelectedEl.textContent = currentSquad.length;
    }

    // Clear current lists
    if(squadGoalkeepersUl) squadGoalkeepersUl.innerHTML = '';
    if(squadDefendersUl) squadDefendersUl.innerHTML = '';
    if(squadMidfieldersUl) squadMidfieldersUl.innerHTML = '';
    if(squadForwardsUl) squadForwardsUl.innerHTML = '';

    const positionCounts = { 'GKP': 0, 'DEF': 0, 'MID': 0, 'FWD': 0 };

    currentSquad.forEach(player => {
        const playerDetails = getPlayerDetailsById(player.id); // Ensure we use the full player object from allPlayersData
        if (!playerDetails) return;

        const positionApiShortName = positionMap[playerDetails.element_type]; // 'GKP', 'DEF', etc.
        positionCounts[positionApiShortName]++;

        const listItem = document.createElement('li');
        listItem.innerHTML = `
            <span class="player-name">${playerDetails.web_name}</span> 
            (<span class="player-price">£${(playerDetails.now_cost / 10).toFixed(1)}m</span>)
            <button class="remove-player-btn" data-player-id="${playerDetails.id}">X</button>
        `;
        
        const removeButton = listItem.querySelector('.remove-player-btn');
        if (removeButton) {
            removeButton.addEventListener('click', () => removePlayerFromSquad(playerDetails.id));
        }

        switch (positionApiShortName) {
            case 'GKP': squadGoalkeepersUl.appendChild(listItem); break;
            case 'DEF': squadDefendersUl.appendChild(listItem); break;
            case 'MID': squadMidfieldersUl.appendChild(listItem); break;
            case 'FWD': squadForwardsUl.appendChild(listItem); break;
        }
    });

    if (gkCountEl) gkCountEl.textContent = positionCounts['GKP'];
    if (defCountEl) defCountEl.textContent = positionCounts['DEF'];
    if (midCountEl) midCountEl.textContent = positionCounts['MID'];
    if (fwdCountEl) fwdCountEl.textContent = positionCounts['FWD'];

    // Refresh player table to update "Add" button states
    // This is important if a player is removed, their "Add" button should be re-enabled.
    if (playerListTbody && positionFilter) { // Only call if planner elements are likely there
        populatePlayerTable();
    }
}

/**
 * Adds a player to the current squad if validation checks pass.
 * @param {number} playerId The ID of the player to add.
 */
function addPlayerToSquad(playerId) {
    const player = getPlayerDetailsById(playerId);
    if (!player) {
        console.error(`Player with ID ${playerId} not found.`);
        return;
    }

    // --- Validations ---
    // 1. Squad full
    if (currentSquad.length >= MAX_PLAYERS) {
        alert("Squad is full (15 players max).");
        return;
    }
    // 2. Budget
    if (currentBudget < player.now_cost) {
        alert(`Not enough budget. Remaining: £${(currentBudget / 10).toFixed(1)}m, Player cost: £${(player.now_cost / 10).toFixed(1)}m`);
        return;
    }
    // 3. Player already in squad
    if (currentSquad.find(p => p.id === playerId)) {
        alert(`${player.web_name} is already in your squad.`);
        return;
    }

    const playerPositionApiShortName = positionMap[player.element_type]; // 'GKP', 'DEF', etc.
    
    // 4. Max players for this position
    const playersInPosition = currentSquad.filter(p => p.element_type === player.element_type);
    if (playersInPosition.length >= PLAYERS_PER_POSITION[playerPositionApiShortName]) {
        alert(`Max players for position ${playerPositionApiShortName} (${PLAYERS_PER_POSITION[playerPositionApiShortName]}) reached.`);
        return;
    }

    // 5. Max players from the same team
    const playersFromSameTeam = currentSquad.filter(p => p.team === player.team);
    if (playersFromSameTeam.length >= MAX_PLAYERS_FROM_TEAM) {
        alert(`Max ${MAX_PLAYERS_FROM_TEAM} players from the same team (${allTeamsData.find(t => t.id === player.team)?.name || 'N/A'}).`);
        return;
    }

    // --- Add player ---
    currentSquad.push(player); // Store the full player object
    currentBudget -= player.now_cost;
    
    console.log(`${player.web_name} added to squad. Budget remaining: ${(currentBudget / 10).toFixed(1)}m`);
    updateSquadDisplay(); // This will also call populatePlayerTable to update button states
}

/**
 * Removes a player from the current squad.
 * @param {number} playerId The ID of the player to remove.
 */
function removePlayerFromSquad(playerId) {
    const playerIndex = currentSquad.findIndex(p => p.id === playerId);
    if (playerIndex > -1) {
        const player = currentSquad[playerIndex];
        currentBudget += player.now_cost;
        currentSquad.splice(playerIndex, 1);
        
        console.log(`${player.web_name} removed from squad. Budget remaining: ${(currentBudget / 10).toFixed(1)}m`);
        updateSquadDisplay(); // This will also call populatePlayerTable to re-enable the Add button
    } else {
        console.warn(`Player with ID ${playerId} not found in current squad for removal.`);
    }
}


/**
 * Resets the current squad to empty and full budget.
 */
function resetSquad() {
    console.log("Resetting squad...");
    currentSquad = [];
    currentBudget = MAX_BUDGET;
    updateSquadDisplay(); // This will call populatePlayerTable, which handles button states
    console.log("Squad has been reset.");
}


// --- New Dashboard Functions ---

async function handleLeagueAnalysis() {
    const leagueId = leagueIdInput.value;
    const myTeamId = myTeamIdInput.value;
    const statusMsg = document.getElementById('statusMsg');

    if (!leagueId) {
        statusMsg.textContent = "Please enter a League ID";
        return;
    }

    // Add check for currentGameweek
    if (!currentGameweek) {
        statusMsg.textContent = "Data is still loading, please wait a moment.";
        return;
    }

    statusMsg.textContent = "Fetching League Standings...";

    try {
        // 1. Fetch League Standings
        const leagueUrl = CORS_PROXY_URL + encodeURIComponent(`https://fantasy.premierleague.com/api/leagues-classic/${leagueId}/standings/`);
        const res = await fetch(leagueUrl);
        const data = await res.json();

        const standings = data.standings.results;
        renderLeagueTable(standings);

        // 2. Analyze Threats
        statusMsg.textContent = "Analyzing Rivals' Teams (this may take a moment)...";
        await analyzeThreats(standings.slice(0, TOP_RIVALS_TO_ANALYZE), myTeamId);

        // 3. Render General Stats
        renderPlayerStats('expected_goal_involvements');

        statusMsg.textContent = "Analysis Complete.";
    } catch (e) {
        console.error(e);
        statusMsg.textContent = "Error fetching data. Check ID.";
    }
}

function renderLeagueTable(standings) {
    if (!leagueTable) return;
    leagueTable.innerHTML = standings.map(s => `
        <tr class="league-table-row">
            <td class="league-table-cell">${s.rank}</td>
            <td class="league-table-cell"><strong>${s.entry_name}</strong><br><span class="manager-name">${s.player_name}</span></td>
            <td class="league-table-cell">${s.total}</td>
        </tr>
    `).join('');
}

async function analyzeThreats(topRivals, myTeamId) {
    const playerCounts = {};
    let myPlayers = [];

    // Fetch My Team if ID provided
    if (myTeamId) {
        const myData = await fetchUserTeam(myTeamId, currentGameweek);
        if (myData) myPlayers = myData.picks.map(p => p.element);
    }

    // Fetch Rival Teams Parallelly
    const promises = topRivals.map(rival => fetchUserTeam(rival.entry, currentGameweek));
    const rivalTeams = await Promise.all(promises);

    rivalTeams.forEach(team => {
        if (team && team.picks) {
            team.picks.forEach(pick => {
                playerCounts[pick.element] = (playerCounts[pick.element] || 0) + 1;
            });
        }
    });

    // Convert to Array, Filter out my players, Sort
    const threats = Object.entries(playerCounts)
        .map(([id, count]) => ({ id: parseInt(id), count }))
        .filter(p => !myPlayers.includes(p.id)) // Remove players I own
        .sort((a, b) => b.count - a.count)
        .slice(0, TOP_THREATS_TO_DISPLAY);

    // Render
    if (threatList) {
        threatList.innerHTML = threats.map(t => {
            const player = getPlayerDetailsById(t.id);
            const team = allTeamsData.find(tm => tm.id === player.team);
            return `
            <li class="threat-item">
                <div class="threat-header">
                    <strong>${player.web_name}</strong>
                    <span class="threat-badge">Owned by ${t.count} rivals</span>
                </div>
                <div class="threat-meta">
                    ${team.short_name}
                </div>
            </li>`;
        }).join('');
    }
}

function renderPlayerStats(sortKey) {
    // Filter: Available and meaningful minutes
    let players = allPlayersData.filter(p => p.status !== 'u' && p.minutes > 0);

    // Sort
    players.sort((a, b) => parseFloat(b[sortKey]) - parseFloat(a[sortKey]));

    // Take top 20
    if (statsBody) {
        statsBody.innerHTML = players.slice(0, TOP_PLAYERS_TO_DISPLAY).map(p => {
            const team = allTeamsData.find(t => t.id === p.team);
            return `
            <tr class="stats-table-row">
                <td class="stats-table-cell"><strong>${p.web_name}</strong></td>
                <td class="stats-table-cell">${team.short_name}</td>
                <td class="stats-table-cell">-</td>
                <td class="stats-table-cell">${p.form}</td>
                <td class="stats-table-cell">${p.expected_goals}</td>
                <td class="stats-table-cell">${p.expected_assists}</td>
                <td class="stats-table-cell">£${(p.now_cost / 10).toFixed(1)}</td>
            </tr>`;
        }).join('');
    }
}

// Call initializeApp when the script loads
initializeApp();
