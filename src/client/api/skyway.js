import { SkyWayContext, SkyWayRoom, SkyWayStreamFactory } from '@skyway-sdk/room';
import { htmlspecialchars } from './utils/escape.js';
import { hideShowElements } from './utils/hideshow.js'

(async () => {
    const csrfTokenInput = document.getElementById('_csrf');
    const localVideo = document.getElementById("local-video");
    const buttonArea = document.getElementById("button-area");
    const remoteMediaArea = document.getElementById("remote-media-area");
    const roomNameInput = document.getElementById("room-name");
    const memberNameInput = document.getElementById("user-name");

    const myId = document.getElementById("my-id");
    const joinButton = document.getElementById("join");
    const leaveButton = document.getElementById("leave");

    const toggleVideoButton = document.getElementById('toggle-video');
    const toggleAudioButton = document.getElementById('toggle-audio');
    const logArea = document.getElementById('log-area');

    const videoSelect = document.getElementById('video-select');
    const audioSelect = document.getElementById('audio-select');

    const videoDeviceBlock = document.getElementById('video-device-block');
    const audioDeviceBlock = document.getElementById('audio-device-block');
    const idBlock = document.getElementById('id-block');
    const roomBlock = document.getElementById('room-block');

    hideShowElements(videoDeviceBlock, audioDeviceBlock, idBlock, toggleAudioButton, toggleVideoButton);

    const log = (message) => {
        const logEntry = document.createElement("p");
        logEntry.textContent = message;
        // logArea.appendChild(logEntry);
        logArea.prepend(logEntry);
    };

    async function populateDeviceLists() {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        const audioDevices = devices.filter(device => device.kind === 'audioinput');

        videoSelect.innerHTML = '';
        audioSelect.innerHTML = '';

        videoDevices.forEach(device => {
            const option = document.createElement('option');
            option.value = device.deviceId;
            option.text = device.label || `Camera ${videoSelect.length + 1}`;
            videoSelect.appendChild(option);
        });

        audioDevices.forEach(device => {
            const option = document.createElement('option');
            option.value = device.deviceId;
            option.text = device.label || `Microphone ${audioSelect.length + 1}`;
            audioSelect.appendChild(option);
        });
    }

    await populateDeviceLists();

    let isVideoOn = false;
    let isAudioOn = false;
    let videoStream, audioStream;
    let videoPublication, audioPublication;
    let me;

    joinButton.onclick = async () => {
        const roomName = roomNameInput.value;
        const memberName = memberNameInput.value;
        const csrfToken = csrfTokenInput.value;
        if (roomName === "" || memberName === "" || csrfToken === "") return;

        const response = await fetch('./api/auth/skyway', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sessionToken: 'nAWV8tD7CExAu9iQpgJL6EsWrY4oCwCK',
                roomName,
                memberName,
                _csrf: csrfToken,
            })
        });

        if (!response.ok) {
            alert('Request failed: ', response.statusText);
        }

        const credential = await response.json();

        try {
            const token = credential.authToken;

            const context = await SkyWayContext.Create(token);

            const room = await SkyWayRoom.FindOrCreate(context, {
                type: "p2p",
                name: htmlspecialchars(roomName),
            });

            const joinOptions = {
                name: htmlspecialchars(memberName)
            };

            me = await room.join(joinOptions);

            myId.textContent = `${me.name} (${me.id})`;
            log(`${me.name}がルームに参加しました。`);

            const subscribeAndAttach = (publication) => {
                if (publication.publisher.id === me.id) return;

                const subscribeButton = document.createElement("button");
                subscribeButton.id = `subscribe-button-${publication.id}`;
                subscribeButton.textContent = `${publication.publisher.name}: ${publication.contentType}`;

                switch (publication.contentType) {
                    case 'audio':
                        log(`${publication.publisher.name}がマイクをONにしました。`);
                        break;
                    case 'video':
                        log(`${publication.publisher.name}がカメラをONにしました。`)
                        break;
                }
                buttonArea.appendChild(subscribeButton);

                subscribeButton.onclick = async () => {
                    const { stream } = await me.subscribe(publication.id);

                    let newMedia;
                    switch (stream.track.kind) {
                        case "video":
                            newMedia = document.createElement("video");
                            newMedia.playsInline = true;
                            newMedia.autoplay = true;
                            break;
                        case "audio":
                            newMedia = document.createElement("audio");
                            newMedia.controls = true;
                            newMedia.autoplay = true;
                            break;
                        default:
                            return;
                    }
                    newMedia.id = `media-${publication.id}`;
                    stream.attach(newMedia);
                    remoteMediaArea.appendChild(newMedia);
                };
            };

            room.publications.forEach(subscribeAndAttach);
            room.onStreamPublished.add((e) => subscribeAndAttach(e.publication));

            leaveButton.onclick = async () => {
                log(`${me.name}がルームから退出しました。`);
                await me.leave();
                await room.dispose();

                myId.textContent = "";
                buttonArea.replaceChildren();
                remoteMediaArea.replaceChildren();
            };

            room.onStreamUnpublished.add((e) => {
                document.getElementById(`subscribe-button-${e.publication.id}`)?.remove();
                document.getElementById(`media-${e.publication.id}`)?.remove();
            });

            room.onMemberJoined.add((e) => {
                log(`${e.member.name}がルームに参加しました。`);
            });

            room.onMemberLeft.add((e) => {
                log(`${e.member.name}がルームから退出しました。`);
            });

            toggleVideoButton.onclick = async () => {
                if (!isVideoOn) {
                    try {
                        const selectedDeviceId = videoSelect.value;
                        videoStream = await SkyWayStreamFactory.createCameraVideoStream({ video: { deviceId: { exact: selectedDeviceId } } });
                        videoStream.attach(localVideo);
                        await localVideo.play();
                        videoPublication = await me.publish(videoStream);
                        isVideoOn = true;
                        toggleVideoButton.textContent = 'カメラをOFFにする';
                        log(`${me.name}がカメラをONにしました。`);
                    } catch (err) {
                        console.error('カメラの取得に失敗しました: ', err);
                    }
                } else {
                    if (videoPublication) {
                        await me.unpublish(videoPublication);
                        videoPublication = null;
                        isVideoOn = false;
                        toggleVideoButton.textContent = 'カメラをONにする';
                        log(`${me.name}がカメラをOFFにしました。`);
                    }
                }
            };

            toggleAudioButton.onclick = async () => {
                if (!isAudioOn) {
                    try {
                        const selectedDeviceId = audioSelect.value;
                        audioStream = await SkyWayStreamFactory.createMicrophoneAudioStream({ audio: { deviceId: { exact: selectedDeviceId } } });
                        audioPublication = await me.publish(audioStream);
                        isAudioOn = true;
                        toggleAudioButton.textContent = 'ボイスチャットをOFFにする';
                        log(`${me.name}がボイスチャットをONにしました。`);
                    } catch (err) {
                        console.error('マイクの取得に失敗しました: ', err);
                    }
                } else {
                    if (audioPublication) {
                        await me.unpublish(audioPublication);
                        audioPublication = null;
                        isAudioOn = false;
                        toggleAudioButton.textContent = 'ボイスチャットをONにする';
                        log(`${me.name}がボイスチャットをOFFにしました。`);
                    }
                }
            };

            hideShowElements(videoDeviceBlock, audioDeviceBlock, idBlock, toggleAudioButton, toggleVideoButton, roomBlock);
        } catch (error) {
            console.error('Error joining room:', error);
            log('ルームへの参加に失敗しました。');
        }
    };
})();