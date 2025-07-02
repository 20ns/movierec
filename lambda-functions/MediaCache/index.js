// lambda/index.js

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand, PutCommand, BatchGetCommand } = require("@aws-sdk/lib-dynamodb");
const axios = require('axios');

const allowedOrigins = [
    'https://movierec.net',
    'https://www.movierec.net',
    'http://localhost:3000',
    'http://localhost:8080'
];

// Initialize the DynamoDB Document Client
const client = new DynamoDBClient({});
const dynamoDB = DynamoDBDocumentClient.from(client);

// Environment variables
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TABLE_NAME = 'MovieRecCache';

// Configuration
const CONFIG = {
    ITEMS_PER_TYPE: 60,
    SAVE_PROGRESS_EVERY: 10,
    MAX_RUNTIME_SEC: 240
};

// Main Lambda handler
exports.handler = async (event) => {
    const startTime = Date.now();
    console.log('Event received:', JSON.stringify(event));

    let origin = null;
    if (event.headers) {
        origin = event.headers.origin || event.headers.Origin;
    }

    const headers = {
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        "Access-Control-Allow-Methods": "GET,OPTIONS",
        "Access-Control-Allow-Credentials": "true"
    };

    if (origin && allowedOrigins.includes(origin)) {
        headers["Access-Control-Allow-Origin"] = origin;
    } else {
        // For credentialed requests, we must specify an exact origin, not '*'
        headers["Access-Control-Allow-Origin"] = allowedOrigins[2]; // Default to localhost:3000 for development
    }

    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ message: 'CORS preflight successful' })
        };
    }

    const isTimeRunningOut = () => {
        const runTime = (Date.now() - startTime) / 1000;
        console.log(`Runtime: ${runTime.toFixed(1)}s of ${CONFIG.MAX_RUNTIME_SEC}s`);
        return runTime > CONFIG.MAX_RUNTIME_SEC;
    };

    const isApiRequest = detectApiRequest(event);

    if (isApiRequest) {
        try {
            return await handleApiRequest(event, headers);
        } catch (error) {
            console.error('Error handling API request:', error);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ message: 'Error handling API request', error: error.message })
            };
        }
    } else {
        try {
            const result = await growCatalogWithTopRatedMedia(isTimeRunningOut);
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    message: 'Catalog growth completed',
                    status: result.status,
                    itemsProcessed: result.itemsProcessed
                })
            };
        } catch (error) {
            console.error('Error growing catalog:', error);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ message: 'Error growing catalog', error: error.message })
            };
        }
    }
};

function detectApiRequest(event) {
    if (event.httpMethod === 'GET' && event.path) {
        const path = event.path;
        if (path === '/media-recommendations' || path.endsWith('/media-recommendations')) {
            return true;
        }
    }
    if (event.requestContext && event.requestContext.http) {
        const method = event.requestContext.http.method;
        const path = event.requestContext.http.path;
        if (method === 'GET' && path && (path === '/media-recommendations' || path.includes('media-recommendations'))) {
            return true;
        }
    }
    if (event.resource && event.httpMethod) {
        if (event.httpMethod === 'GET' && (event.resource === '/media-recommendations' || event.resource.includes('media-recommendations'))) {
            return true;
        }
    }
    if (event.path && event.path.includes('media-recommendations') && (!event.httpMethod || event.httpMethod === 'GET')) {
        return true;
    }
    return false;
}

async function getProgressState() {
    try {
        const command = new GetCommand({
            TableName: TABLE_NAME,
            Key: {
                mediaId: "progress_tracker",
                mediaType: "system"
            }
        });
        const result = await dynamoDB.send(command);
        if (result.Item) {
            return result.Item;
        }
        return {
            mediaId: "progress_tracker",
            mediaType: "system",
            genre: "system",
            popularity: 0,
            movie: { currentPage: 0, totalPages: null, processedIds: [] },
            tv: { currentPage: 0, totalPages: null, processedIds: [] },
            lastUpdated: Date.now()
        };
    } catch (error) {
        console.error('Error getting progress state:', error);
        return {
            mediaId: "progress_tracker",
            mediaType: "system",
            genre: "system",
            popularity: 0,
            movie: { currentPage: 0, totalPages: null, processedIds: [] },
            tv: { currentPage: 0, totalPages: null, processedIds: [] },
            lastUpdated: Date.now()
        };
    }
}

async function updateProgressState(state) {
    try {
        const command = new PutCommand({
            TableName: TABLE_NAME,
            Item: {
                ...state,
                lastUpdated: Date.now()
            }
        });
        await dynamoDB.send(command);
        console.log('Progress state updated successfully');
    } catch (error) {
        console.error('Error updating progress state:', error);
    }
}

async function getMediaList(listType, mediaType) {
    try {
        const command = new GetCommand({
            TableName: TABLE_NAME,
            Key: {
                mediaId: `list_${listType}`,
                mediaType: mediaType
            }
        });
        const result = await dynamoDB.send(command);
        return result.Item;
    } catch (error) {
        console.error(`Error getting media list ${listType}:${mediaType}:`, error);
        return null;
    }
}

async function updateMediaList(listType, mediaType, mediaIds) {
    let existingItem = await getMediaList(listType, mediaType);
    let existingIds = existingItem?.items || [];
    const combinedIds = [...new Set([...existingIds, ...mediaIds])];

    try {
        const command = new PutCommand({
            TableName: TABLE_NAME,
            Item: {
                mediaId: `list_${listType}`,
                mediaType: mediaType,
                genre: "list",
                popularity: 0,
                items: combinedIds,
                lastUpdated: Date.now()
            }
        });
        await dynamoDB.send(command);
        console.log(`Media list ${listType}:${mediaType} updated successfully with ${mediaIds.length} new items`);
    } catch (error) {
        console.error(`Error updating media list ${listType}:${mediaType}:`, error);
    }
}

async function mediaItemExists(mediaId, mediaType) {
    try {
        const command = new GetCommand({
            TableName: TABLE_NAME,
            Key: {
                mediaId: mediaId,
                mediaType: mediaType
            }
        });
        const result = await dynamoDB.send(command);
        return !!result.Item;
    } catch (error) {
        console.error(`Error checking if media item ${mediaId}:${mediaType} exists:`, error);
        return false;
    }
}

async function getMediaItems(items) {
    if (items.length === 0) return [];

    const chunks = [];
    for (let i = 0; i < items.length; i += 100) {
        chunks.push(items.slice(i, i + 100));
    }

    let allResults = [];
    for (const chunk of chunks) {
        try {
            const command = new BatchGetCommand({
                RequestItems: {
                    [TABLE_NAME]: {
                        Keys: chunk.map(item => ({
                            mediaId: item.id,
                            mediaType: item.type
                        }))
                    }
                }
            });
            const result = await dynamoDB.send(command);
            allResults = [...allResults, ...(result.Responses[TABLE_NAME] || [])];
        } catch (error) {
            console.error('Error in getMediaItems chunk:', error);
        }
    }
    return allResults;
}

async function storeMediaItem(mediaId, mediaType, details) {
    let genre = "unknown";
    if (details.genres && details.genres.length > 0) {
        genre = details.genres[0].name;
    }

    let popularity = 0;
    if (details.popularity) {
        popularity = details.popularity;
    }

    const item = {
        mediaId,
        mediaType,
        genre,
        popularity,
        details,
        title: details.title || details.name || "",
        overview: details.overview || "",
        releaseDate: details.release_date || details.first_air_date || "",
        lastUpdated: Date.now()
    };

    try {
        const command = new PutCommand({
            TableName: TABLE_NAME,
            Item: item
        });
        await dynamoDB.send(command);
        return true;
    } catch (error) {
        console.error(`Error storing media item ${mediaId}:${mediaType}:`, error);
        return false;
    }
}

async function fetchTopRatedMedia(mediaType, page) {
    try {
        const response = await axios.get(
            `https://api.themoviedb.org/3/${mediaType}/top_rated`,
            {
                params: {
                    api_key: TMDB_API_KEY,
                    page
                }
            }
        );
        return {
            results: response.data.results,
            totalPages: response.data.total_pages,
            currentPage: response.data.page
        };
    } catch (error) {
        console.error(`Error fetching top-rated ${mediaType} page ${page}:`, error);
        return { results: [], totalPages: 0, currentPage: page };
    }
}

async function fetchMediaDetails(mediaId, mediaType) {
    try {
        const response = await axios.get(
            `https://api.themoviedb.org/3/${mediaType}/${mediaId}`,
            {
                params: {
                    api_key: TMDB_API_KEY,
                    append_to_response: 'credits,keywords'
                }
            }
        );
        return response.data;
    } catch (error) {
        console.error(`Error fetching details for ${mediaType} ${mediaId}:`, error);
        return null;
    }
}

async function growCatalogWithTopRatedMedia(isTimeRunningOut) {
    const mediaTypes = ['movie', 'tv'];
    let totalItemsProcessed = 0;
    let status = "completed";

    let progressState = await getProgressState();

    for (const mediaType of mediaTypes) {
        console.log(`Processing top-rated ${mediaType}s`);
        let newMediaIds = [];
        let itemsProcessed = 0;
        const processedIdsSet = new Set(progressState[mediaType].processedIds);

        while (itemsProcessed < CONFIG.ITEMS_PER_TYPE) {
            if (isTimeRunningOut()) {
                console.log(`Time is running out, stopping...`);
                status = "timeout";
                break;
            }

            const nextPage = progressState[mediaType].currentPage + 1;
            if (progressState[mediaType].totalPages !== null && nextPage > progressState[mediaType].totalPages) {
                console.log(`End of ${mediaType}s at page ${nextPage - 1}`);
                break;
            }

            console.log(`Fetching ${mediaType} top-rated page ${nextPage}`);
            const { results, totalPages, currentPage } = await fetchTopRatedMedia(mediaType, nextPage);

            if (progressState[mediaType].totalPages === null) {
                progressState[mediaType].totalPages = totalPages;
            }
            progressState[mediaType].currentPage = currentPage;
            await updateProgressState(progressState);

            const newItems = results.filter(item => !processedIdsSet.has(item.id.toString()));
            if (newItems.length === 0) break;

            for (const item of newItems) {
                if (isTimeRunningOut()) {
                    status = "timeout";
                    break;
                }
                const idStr = item.id.toString();
                const exists = await mediaItemExists(idStr, mediaType);
                if (exists) {
                    progressState[mediaType].processedIds.push(idStr);
                    processedIdsSet.add(idStr);
                    continue;
                }
                const details = await fetchMediaDetails(idStr, mediaType);
                if (details) {
                    const success = await storeMediaItem(idStr, mediaType, details);
                    if (success) {
                        newMediaIds.push(idStr);
                        progressState[mediaType].processedIds.push(idStr);
                        processedIdsSet.add(idStr);
                        itemsProcessed++;
                        totalItemsProcessed++;
                        if (itemsProcessed % CONFIG.SAVE_PROGRESS_EVERY === 0) {
                            await updateProgressState(progressState);
                            if (newMediaIds.length) {
                                await updateMediaList('top_rated', mediaType, [...newMediaIds]);
                                newMediaIds = [];
                            }
                        }
                    }
                }
                if (itemsProcessed >= CONFIG.ITEMS_PER_TYPE) break;
                await new Promise(r => setTimeout(r, 200));
            }
            if (status === "timeout" || itemsProcessed >= CONFIG.ITEMS_PER_TYPE) break;
        }
        if (newMediaIds.length) {
            await updateMediaList('top_rated', mediaType, newMediaIds);
        }
        if (status === "timeout") break;
    }
    await updateProgressState(progressState);
    return { status, itemsProcessed: totalItemsProcessed };
}

async function handleApiRequest(event, headers) {
    const queryParams = event.queryStringParameters || {};
    const listType = queryParams.listType || 'trending';
    const mediaType = queryParams.mediaType || 'movie';
    const limit = parseInt(queryParams.limit || 10, 10);
    const excludeIds = queryParams.excludeIds ? queryParams.excludeIds.split(',') : [];

    let listItem = await getMediaList(listType, mediaType);
    if (!listItem) {
        let mediaIds;
        if (listType === 'trending') mediaIds = await fetchTrendingMediaList(mediaType, 1);
        else mediaIds = await fetchPopularMediaList(mediaType, 1);
        await updateMediaList(listType, mediaType, mediaIds);
        listItem = { items: mediaIds };
    }

    const filteredIds = listItem.items.filter(id => !excludeIds.includes(id));
    const selected = filteredIds.slice(0, limit);
    let mediaItems = await getMediaItems(selected.map(id => ({ id, type: mediaType })));
    const existingSet = new Set(mediaItems.map(item => item.mediaId));
    for (const id of selected.filter(id => !existingSet.has(id))) {
        const details = await fetchMediaDetails(id, mediaType);
        if (details) {
            await storeMediaItem(id, mediaType, details);
            mediaItems.push({ mediaId: id, mediaType, details });
        }
    }
    return {
        statusCode: 200,
        headers,
        body: JSON.stringify(mediaItems.map(item => item.details))
    };
}

async function fetchTrendingMediaList(mediaType, pages = 3) {
    const ids = [];
    for (let p = 1; p <= pages; p++) {
        try {
            const res = await axios.get(`https://api.themoviedb.org/3/trending/${mediaType}/week`, {
                params: { api_key: TMDB_API_KEY, page: p }
            });
            ids.push(...res.data.results.map(i => i.id.toString()));
        } catch (e) {
            console.error(`Error fetching trending page ${p}:`, e);
        }
    }
    return ids;
}

async function fetchPopularMediaList(mediaType, pages = 3) {
    const ids = [];
    for (let p = 1; p <= pages; p++) {
        try {
            const res = await axios.get(`https://api.themoviedb.org/3/${mediaType}/popular`, {
                params: { api_key: TMDB_API_KEY, page: p }
            });
            ids.push(...res.data.results.map(i => i.id.toString()));
        } catch (e) {
            console.error(`Error fetching popular page ${p}:`, e);
        }
    }
    return ids;
}
