/**
 * CLAUDE.AI BOOKMARKLET — generator + raw source
 *
 * The bookmarklet runs INSIDE the claude.ai page context (the user clicks
 * it while looking at a chat). It:
 *   1. Scrapes the LAST assistant message DOM
 *   2. Extracts plain text + conversation title
 *   3. gzip-compresses + base64-encodes to keep the payload short
 *   4. Opens the MICS app with `?import=<payload>` in the URL
 *
 * The MICS app's importHandler reads the URL param, gunzips, and routes
 * to the AIBriefPaste view with the textarea pre-filled and parsed.
 *
 * SELECTOR ROBUSTNESS:
 *   Claude.ai's DOM has shifted multiple times. We try several known
 *   message-content selectors in order. If all fail, we fall back to
 *   the largest visible text block on the page.
 */

/**
 * Build the absolute import URL the bookmarklet should open.
 * Lives here (not in the bookmarklet source) so it picks up the
 * current deploy origin and base path automatically.
 */
export function importUrlBase(): string {
  // import.meta.env.BASE_URL ends with a slash, e.g. "/mics-social-media-engine/"
  return `${window.location.origin}${import.meta.env.BASE_URL}`;
}

/**
 * Source of the bookmarklet. Returned as a single-line `javascript:` URL
 * ready to be assigned to an <a href="...">. The MICS settings page
 * exposes a draggable link with this href.
 *
 * Keep the code small: bookmarklets often have a ~2 KB practical cap in
 * some browsers' bookmark UIs. This stays well under that.
 */
export function buildBookmarkletHref(targetOrigin: string): string {
  // The IIFE body. We compress + base64 the message, then redirect.
  // String operations are written defensively for old browser quirks
  // (some Safari versions don't have CompressionStream — we fall back
  // to plain base64 in that case).
  const code = `
(async()=>{
  try{
    var sels=['[data-testid="message-content"]','[data-testid="assistant-message"]','.font-claude-message','.prose','.font-styrene'];
    var msgs=[];
    for(var s of sels){var n=document.querySelectorAll(s);if(n.length){msgs=Array.from(n);break;}}
    if(!msgs.length){
      var blocks=Array.from(document.querySelectorAll('div,article,section'))
        .map(function(el){return {el:el,len:(el.innerText||'').length};})
        .filter(function(x){return x.len>200&&x.len<50000;})
        .sort(function(a,b){return b.len-a.len;});
      if(blocks.length)msgs=[blocks[0].el];
    }
    if(!msgs.length){alert('MICS: No Claude message found on this page.');return;}
    var last=msgs[msgs.length-1];
    var text=(last.innerText||'').trim();
    if(text.length<30){alert('MICS: Message looks empty.');return;}
    var title=(document.title||'Claude chat').replace(/ - Claude.*$/,'').replace(/^Claude - /,'').trim().slice(0,120);
    var payload;
    if(typeof CompressionStream!=='undefined'){
      var cs=new CompressionStream('gzip');
      var buf=await new Response(new Blob([text]).stream().pipeThrough(cs)).arrayBuffer();
      var bin='';var u8=new Uint8Array(buf);for(var i=0;i<u8.length;i++)bin+=String.fromCharCode(u8[i]);
      payload='g:'+btoa(bin);
    }else{
      payload='p:'+btoa(unescape(encodeURIComponent(text)));
    }
    var url='${targetOrigin}'+'?import='+encodeURIComponent(payload)+'&title='+encodeURIComponent(title)+'&model=sonnet-4.6&v=1';
    if(url.length>30000){alert('MICS: message too large to import via bookmarklet (>30KB). Use manual paste.');return;}
    window.open(url,'_blank');
  }catch(e){alert('MICS bookmarklet error: '+e.message);}
})();
  `
    .trim()
    .replace(/\s+/g, ' ')        // collapse whitespace
    .replace(/;\s+/g, ';')       // tighten after semicolons
    .replace(/\s*([{}();,])\s*/g, '$1'); // tighten around punctuation

  return `javascript:${code}`;
}

/** Display-friendly version for users who want to inspect / paste manually */
export function bookmarkletReadable(targetOrigin: string): string {
  return buildBookmarkletHref(targetOrigin).replace(/^javascript:/, '');
}
