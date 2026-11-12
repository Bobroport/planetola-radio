# Ответ на Guideline 2.1 — Information Needed (версия 1.0)

Текст ниже вставляется целиком в поле Notes раздела App Review Information на странице версии.
Видео прикладывается в поле Attachment там же (или ссылкой в п. 1, если файл не принимается).

---

1. SCREEN RECORDING
A screen recording from a physical iPhone running the latest iOS is attached to this submission (see Attachment). It starts with launching the app and shows the typical user flow: spinning the globe, tapping a city, choosing a station, playback with the current track title, liking a track, starring a station, the search filters, the profile settings and background playback with the screen locked. The app has no account registration, login or account deletion, no user-generated content and no paid content or features, so none of these flows exist.

2. PURPOSE AND TARGET AUDIENCE
Planetola Radio FM is an internet radio player. It lets anyone listen to live radio stations from around the world by spinning a 3D globe and tapping a city. The catalog contains about 3,600 stations from 208 of the largest cities and capitals. The target audience is general listeners of any age who want to hear local radio from other cities and countries: travelers, expats, language learners and music fans. The problem it solves is discovery: instead of knowing a station by name, the user picks a place on the map and hears what is on air there right now.

3. HOW TO ACCESS THE MAIN FEATURES
No login, credentials, sample files or setup are required. Everything is available immediately after launch:
- Cities tab: spin the globe with one finger, pinch to zoom, tap an orange city marker to open its station list. Tap a station to start playback. The player bar at the bottom shows the station, the current artist/track title (when the station broadcasts it) and a stop button.
- Heart button in the player bar saves the current track title to the Tracks tab; the copy button there copies the title to the clipboard.
- Star button in a station row saves the station to the Stations tab.
- Search tab: search by station name, city or country, with filters by tag, language, codec and bitrate.
- Profile tab: display name, interface language (28 languages) and the screen that opens at launch.
- Playback continues in the background and with the screen locked (standard "audio" background mode).

4. EXTERNAL SERVICES
- Radio station streams: audio is streamed over HTTPS directly from each station's own server, using the stream URL the station published. The app reads the standard ICY "StreamTitle" metadata from the same stream to show the current track title.
- Radio Browser (https://www.radio-browser.info): an open, community-maintained directory of internet radio stations. The station catalog bundled in the app was generated from it. At runtime the app sends one anonymous "station started" counter request to the Radio Browser API when playback begins (no user identifier is sent).
- No authentication services, payment processors, analytics, advertising SDKs or AI services are used. The app does not collect or transmit any personal data; favorites and settings are stored only on the device.

5. REGIONAL DIFFERENCES
The app functions identically in all countries and regions. The station catalog, features and interface are the same everywhere; only the interface language follows the user's choice. Individual stations may geo-restrict their own streams on their side, in which case that station simply does not play, as in any radio player.

6. THIRD-PARTY MATERIAL
The app does not host, download, record or redistribute any audio. It plays publicly available internet radio streams exactly as a web browser or any generic media player would, at the URLs the stations themselves make public and list in the open Radio Browser directory. Each station keeps full control of its own stream and can stop or geo-restrict it at any time. The app shows the station's name, homepage and logo as provided in the directory. We are not operating in a regulated industry and hold no additional licenses; should any station object to being listed, it will be removed in the next update.
