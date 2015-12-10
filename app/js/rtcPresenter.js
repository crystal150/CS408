'use strict';


var sendChannel;
var sendTextarea = document.getElementById("dataChannelSend");
var receiveTextarea = document.getElementById("dataChannelReceive");
// 2015. 12. 8 // deletes everylines which relate to sendMessage form.

var isChannelReady;
var isInitiator;
var isStarted;
var localStream;
var pc;
var remoteStream;
var turnReady;
var turn;

var pc_config = webrtcDetectedBrowser === 'firefox' ?
  {'iceServers':[{'url':'stun:23.21.150.121'}]} : // number IP
  {'iceServers': [{'url': 'stun:stun.l.google.com:19302'}]};

var pc_constraints = {
  'optional': [
    {'DtlsSrtpKeyAgreement': true},
    {'RtpDataChannels': true}
  ]};

// Set up audio and video regardless of what devices are present.
var sdpConstraints = {'mandatory': {
  'OfferToReceiveAudio':true,
  'OfferToReceiveVideo':true }};

/////////////////////////////////////////////

// 2015. 11. 25 // Document preprocess.

// 2015. 11. 25 // appends URL in PresenterView.html for easy copy.
$("#url").append("<center id=\"link\">" + location.href + "</center>");

// 2015. 11. 25 // provides easy copy button.
function copyToClipboard(element) {
  console.log("copyToClipboard");
	var $temp = $("<input>");
  $("body").append($temp);
  $temp.val($(element).text()).select();
  document.execCommand("copy");
  $temp.remove();
}

// 2015. 11. 25 // appends new audiences.
function user_return(name, comment, numClient) {
	return '<tr id="line' + numClient +'">\n'
					+ '<td class="number_td">' + numClient + '</td>\n'
					+ '<td class="name_td">' + name + '</td>\n'
					+ '<td class="comm_td">' + comment + '</td>\n'
					+ '<td class="butt_td">'
					+ '<input type="image" id="grant' + numClient + '" onclick="grantClient(' + numClient + '); $(this).hide(); $(\'#granted' + numClient + '\').show();"'
					+ 'src="../images/grant_button.png">\n'
					+ '<input type="image" id="granted' + numClient + '" src="../images/granted_button.png"></td>\n'
				+ '</tr>';
}

// 2015. 11. 25 // grants specific audience.
function grantClient(numClient) {
	handleRemoteHangup();
	$('#granted' + turn).hide();
	$('#grant' + turn).show();
	turn = numClient;
	socket.emit('grant', room, numClient);
}

/////////////////////////////////////////////

// from https://github.com/johnpmayer/webrtc-codelab.
// modified many times.

var room = location.pathname.substring(1);

var socket = io.connect();

if (room !== '') {
  console.log('Create or join room', room);
  socket.emit('create or join', room);
}

socket.on('created', function (room){
  console.log('Created room ' + room);
  isInitiator = true;
	console.log('Getting user media with constraints', constraints);
});

socket.on('full', function (room){
  console.log('Room ' + room + ' is full');
});

// 2015. 11. 25 // when someone joins, appends audience's data to table.
socket.on('join', function (room, numClients, name, comment){
  console.log('Another peer made a request to join room ' + room + ' turn ' + numClients);
	if (isInitiator) {
    $('table').append(user_return(name, comment, numClients));
		$("#granted" + numClients).hide();
	}
  isChannelReady = true;
});

socket.on('joined', function (room, numClients){
  console.log('This peer has joined room ' + room);
	turn = numClients;
  isChannelReady = true;
});

socket.on('log', function (array){
  console.log.apply(console, array);
});

////////////////////////////////////////////////

function sendMessage(message){
	console.log('Sending message: ', message);
  socket.emit('message', room, message, turn);
}

socket.on('message', function (message, numClient){
  console.log('Received message:', message, numClient);
  if (message === 'got user media') {
  	maybeStart();
  } else if (message.type === 'offer') {
    if (!isInitiator && !isStarted) {
      maybeStart();
    }
    pc.setRemoteDescription(new RTCSessionDescription(message));
    doAnswer();
  } else if (message.type === 'answer' && isStarted) {
    pc.setRemoteDescription(new RTCSessionDescription(message));
  } else if (message.type === 'candidate' && isStarted) {
    var candidate = new RTCIceCandidate({sdpMLineIndex:message.label,
      candidate:message.candidate});
    pc.addIceCandidate(candidate);

	// 2015. 11. 25 // when speaking audience is gone, hangs up remote video and hide.
  } else if (message === 'bye' && isStarted && turn == numClient) {
    handleRemoteHangup();
		$("#line" + numClient).hide();
	// 2015. 11. 30 // when audience who is not speaking is gone, hide those data from table.
  } else if (message === 'bye') {
		$("#line" + numClient).hide();
	}
});

////////////////////////////////////////////////////

var localVideo = document.querySelector('#localVideo');
var remoteVideo = document.querySelector('#remoteVideo');

function handleUserMedia(stream) {
  localStream = stream;
  attachMediaStream(localVideo, stream);
  console.log('Adding local stream.');
  sendMessage('got user media');
  if (isInitiator) {
    maybeStart();
  }
}

function handleUserMediaError(error){
  console.log('getUserMedia error: ', error);
}

var constraints = {audio: true};

getUserMedia(constraints, handleUserMedia, handleUserMediaError);
// 2015. 11. 20 // deletes getUserMedia from original source.

function maybeStart() {
	console.log("BEFORE MAYBE START", isStarted, localStream, isChannelReady);
  if (!isStarted && localStream && isChannelReady) {
		console.log('MAYBE START');
    createPeerConnection();
    pc.addStream(localStream);
    isStarted = true;
    if (isInitiator) {
      doCall();
    }
  }
}

window.onbeforeunload = function(e){
	sendMessage('bye', 0);
}

/////////////////////////////////////////////////////////

function createPeerConnection() {
  try {
    pc = new RTCPeerConnection(pc_config, pc_constraints);
    pc.onicecandidate = handleIceCandidate;
    console.log('Created RTCPeerConnnection with:\n' +
      '  config: \'' + JSON.stringify(pc_config) + '\';\n' +
      '  constraints: \'' + JSON.stringify(pc_constraints) + '\'.');
  } catch (e) {
    console.log('Failed to create PeerConnection, exception: ' + e.message);
    alert('Cannot create RTCPeerConnection object.');
      return;
  }
  pc.onaddstream = handleRemoteStreamAdded;
  pc.onremovestream = handleRemoteStreamRemoved;

  if (isInitiator) {
    try {
      // Reliable Data Channels not yet supported in Chrome
      sendChannel = pc.createDataChannel("sendDataChannel",
        {reliable: false});
      sendChannel.onmessage = handleMessage;
      trace('Created send data channel');
    } catch (e) {
      alert('Failed to create data channel. ' +
            'You need Chrome M25 or later with RtpDataChannel enabled');
      trace('createDataChannel() failed with exception: ' + e.message);
    }
    sendChannel.onopen = handleSendChannelStateChange;
    sendChannel.onclose = handleSendChannelStateChange;
  } else {
    pc.ondatachannel = gotReceiveChannel;
  }
}

function gotReceiveChannel(event) {
  trace('Receive Channel Callback');
  sendChannel = event.channel;
  sendChannel.onmessage = handleMessage;
  sendChannel.onopen = handleReceiveChannelStateChange;
  sendChannel.onclose = handleReceiveChannelStateChange;
}

function handleMessage(event) {
  trace('Received message: ' + event.data);
  receiveTextarea.value = event.data;
}

function handleSendChannelStateChange() {
  var readyState = sendChannel.readyState;
  trace('Send channel state is: ' + readyState);
  enableMessageInterface(readyState == "open");
}

function handleReceiveChannelStateChange() {
  var readyState = sendChannel.readyState;
  trace('Receive channel state is: ' + readyState);
  enableMessageInterface(readyState == "open");
}

function enableMessageInterface(shouldEnable) {
    if (shouldEnable) {
    dataChannelSend.disabled = false;
    dataChannelSend.focus();
    dataChannelSend.placeholder = "";
  } else {
    dataChannelSend.disabled = true;
  }
}

// 2015. 12. 8 // deletes everylines which relate to sendMessage form.

function handleIceCandidate(event) {
  console.log('handleIceCandidate event: ', event);
  if (event.candidate) {
    sendMessage({
      type: 'candidate',
      label: event.candidate.sdpMLineIndex,
      id: event.candidate.sdpMid,
      candidate: event.candidate.candidate});
  } else {
    console.log('End of candidates.');
  }
}

function doCall() {
  var constraints = {'optional': [], 'mandatory': {'MozDontOfferDataChannel': true}};
  // temporary measure to remove Moz* constraints in Chrome
  if (webrtcDetectedBrowser === 'chrome') {
    for (var prop in constraints.mandatory) {
      if (prop.indexOf('Moz') !== -1) {
        delete constraints.mandatory[prop];
      }
     }
   }
  constraints = mergeConstraints(constraints, sdpConstraints);
  console.log('Sending offer to peer, with constraints: \n' +
    '  \'' + JSON.stringify(constraints) + '\'.');
  pc.createOffer(setLocalAndSendMessage, null, constraints);
}

function doAnswer() {
  console.log('Sending answer to peer.');
  pc.createAnswer(setLocalAndSendMessage, null, sdpConstraints);
}

function mergeConstraints(cons1, cons2) {
  var merged = cons1;
  for (var name in cons2.mandatory) {
    merged.mandatory[name] = cons2.mandatory[name];
  }
  merged.optional.concat(cons2.optional);
  return merged;
}

function setLocalAndSendMessage(sessionDescription) {
  // Set Opus as the preferred codec in SDP if Opus is present.
  sessionDescription.sdp = preferOpus(sessionDescription.sdp);
  pc.setLocalDescription(sessionDescription);
  sendMessage(sessionDescription);
}

function requestTurn(turn_url) {
  var turnExists = false;
  for (var i in pc_config.iceServers) {
    if (pc_config.iceServers[i].url.substr(0, 5) === 'turn:') {
      turnExists = true;
      turnReady = true;
      break;
    }
  }
  if (!turnExists) {
    console.log('Getting TURN server from ', turn_url);
    // No TURN server. Get one from computeengineondemand.appspot.com:
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function(){
      if (xhr.readyState === 4 && xhr.status === 200) {
        var turnServer = JSON.parse(xhr.responseText);
      	console.log('Got TURN server: ', turnServer);
        pc_config.iceServers.push({
          'url': 'turn:' + turnServer.username + '@' + turnServer.turn,
          'credential': turnServer.password
        });
        turnReady = true;
      }
    };
    xhr.open('GET', turn_url, true);
    xhr.send();
  }
}

function handleRemoteStreamAdded(event) {
  console.log('Remote stream added.');
 // reattachMediaStream(miniVideo, localVideo);
  attachMediaStream(remoteVideo, event.stream);
  remoteStream = event.stream;
//  waitForRemoteVideo();
}
function handleRemoteStreamRemoved(event) {
  console.log('Remote stream removed. Event: ', event);
}

function hangup() {
  console.log('Hanging up.');
  stop();
  sendMessage('bye', 0);
}

function handleRemoteHangup() {
  console.log('Session terminated.');
  stop();
//  isInitiator = false;
}

function stop() {
	// 2015. 11. 25 // for next granting, closes current peer connection.
  try {
		pc.close();
  	pc = null;
	} catch (e) {
	}
  isStarted = false;
	getUserMedia(constraints, handleUserMedia, handleUserMediaError);
}

///////////////////////////////////////////

// Set Opus as the default audio codec if it's present.
function preferOpus(sdp) {
  var sdpLines = sdp.split('\r\n');
  var mLineIndex;
  // Search for m line.
  for (var i = 0; i < sdpLines.length; i++) {
      if (sdpLines[i].search('m=audio') !== -1) {
        mLineIndex = i;
        break;
      }
  }
  if (mLineIndex === null) {
    return sdp;
  }

  // If Opus is available, set it as the default in m line.
  for (i = 0; i < sdpLines.length; i++) {
    if (sdpLines[i].search('opus/48000') !== -1) {
      var opusPayload = extractSdp(sdpLines[i], /:(\d+) opus\/48000/i);
      if (opusPayload) {
        sdpLines[mLineIndex] = setDefaultCodec(sdpLines[mLineIndex], opusPayload);
      }
      break;
    }
  }

  // Remove CN in m line and sdp.
  sdpLines = removeCN(sdpLines, mLineIndex);

  sdp = sdpLines.join('\r\n');
  return sdp;
}

function extractSdp(sdpLine, pattern) {
  var result = sdpLine.match(pattern);
  return result && result.length === 2 ? result[1] : null;
}

// Set the selected codec to the first in m line.
function setDefaultCodec(mLine, payload) {
  var elements = mLine.split(' ');
  var newLine = [];
  var index = 0;
  for (var i = 0; i < elements.length; i++) {
    if (index === 3) { // Format of media starts from the fourth.
      newLine[index++] = payload; // Put target payload to the first.
    }
    if (elements[i] !== payload) {
      newLine[index++] = elements[i];
    }
  }
  return newLine.join(' ');
}

// Strip CN from sdp before CN constraints is ready.
function removeCN(sdpLines, mLineIndex) {
  var mLineElements = sdpLines[mLineIndex].split(' ');
  // Scan from end for the convenience of removing an item.
  for (var i = sdpLines.length-1; i >= 0; i--) {
    var payload = extractSdp(sdpLines[i], /a=rtpmap:(\d+) CN\/\d+/i);
    if (payload) {
      var cnPos = mLineElements.indexOf(payload);
      if (cnPos !== -1) {
        // Remove CN payload from m line.
        mLineElements.splice(cnPos, 1);
      }
      // Remove CN line in sdp
      sdpLines.splice(i, 1);
    }
  }

  sdpLines[mLineIndex] = mLineElements.join(' ');
  return sdpLines;
}

