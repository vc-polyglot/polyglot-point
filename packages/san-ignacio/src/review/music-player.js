import {esc} from './html.js';
import {musicTracks} from '../../assets/music-tracks.js';

const icon=body=>`<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">${body}</svg>`;
export function musicPlayer(){
 const first=musicTracks[0];
 return `<aside class="music-player" data-music-player data-playing="false" aria-label="Reproductor de música" hidden>
 <audio data-music-audio preload="none"></audio>
 <div class="music-player-copy"><span class="music-player-label">Música <span data-music-state>· apagada</span></span><span class="music-player-title" data-music-title title="${esc(first.title+' · '+first.detail)}">${esc(first.title)}</span></div>
 <div class="music-player-controls"><button type="button" data-music-prev aria-label="Pista anterior" title="Pista anterior">${icon('<path d="M6 5h2v14H6zm12 0v14L8 12z"/>')}</button><button type="button" class="music-player-toggle" data-music-toggle aria-label="Reproducir música" title="Reproducir música" aria-pressed="false"><span class="music-play-icon">${icon('<path d="m8 5 11 7-11 7z"/>')}</span><span class="music-pause-icon">${icon('<path d="M6 5h4v14H6zm8 0h4v14h-4z"/>')}</span></button><button type="button" data-music-next aria-label="Pista siguiente" title="Pista siguiente">${icon('<path d="M16 5h2v14h-2zM6 5l10 7-10 7z"/>')}</button></div>
 <span class="music-player-status" role="status" data-music-status></span></aside>`;
}
