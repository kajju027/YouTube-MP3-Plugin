addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url);
  const songName = url.pathname.split('/').slice(1).join(' ');

  if (!songName) {
    return new Response(JSON.stringify({ error: 'Please provide a song name in the URL path' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(songName)}`;
    const searchResponse = await fetch(searchUrl);
    const searchHtml = await searchResponse.text();

    const dataRegex = /var ytInitialData = ({.*?});<\/script>/;
    const match = searchHtml.match(dataRegex);

    if (!match || !match[1]) {
      return new Response(JSON.stringify({ error: 'Failed to parse YouTube search data' }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = JSON.parse(match[1]);
    const contents = data.contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer.contents;
    const items = contents[0].itemSectionRenderer.contents;
    const video = items.find(item => item.videoRenderer);

    if (!video) {
      return new Response(JSON.stringify({ error: 'No video found' }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const videoId = video.videoRenderer.videoId;
    const title = video.videoRenderer.title.runs[0].text;
    const views = video.videoRenderer.viewCountText.simpleText;

    const mp3ApiUrl = `https://api.siputzx.my.id/api/d/ytmp3?url=https://www.youtube.com/watch?v=${videoId}`;
    const mp3Response = await fetch(mp3ApiUrl);
    const mp3Data = await mp3Response.json();

    let mp3Link = 'Could not generate MP3 link';
    if (mp3Data.status && mp3Data.data && mp3Data.data.url) {
      mp3Link = mp3Data.data.url;
    }

    const result = {
      title: title,
      views: views,
      video_id: videoId,
      mp3_link: mp3Link
    };

    return new Response(JSON.stringify(result, null, 2), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: 'Something went wrong', details: error.message }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
